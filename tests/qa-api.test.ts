import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

let directory: string;
let POST: typeof import("../src/app/api/ask/route").POST;
let prisma: typeof import("../src/lib/prisma").prisma;
const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };
let calls = 0;
let cookie: string;

before(async () => {
  directory = await mkdtemp(join(tmpdir(), "takenotes-qa-test-"));
  process.env.DATABASE_URL = `file:${join(directory, "test.db")}`;
  process.env.DEEPSEEK_API_KEY = "test-only-not-a-real-key";
  process.env.DEEPSEEK_MODEL = "deepseek-v4-flash";
  process.env.DEEPSEEK_BASE_URL = "https://api.deepseek.com";
  process.env.ADMIN_USERNAME = "admin";
  process.env.ADMIN_PASSWORD_HASH = await (await import("../src/lib/auth/password")).hashPassword("test-password-only-123");
  process.env.SESSION_SECRET = "test-session-secret-not-for-production-123456789";
  process.env.APP_URL = "http://localhost:3000";
  ({ prisma } = await import("../src/lib/prisma"));
  await prisma.$executeRawUnsafe(`CREATE TABLE "Note" (
    "id" TEXT PRIMARY KEY NOT NULL, "title" TEXT NOT NULL, "content" TEXT NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '', "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )`);
  const migration = await readFile(new URL("../prisma/migrations/20260915120000_private_history/migration.sql", import.meta.url), "utf8");
  for (const statement of migration.split(";").filter((part) => part.trim())) await prisma.$executeRawUnsafe(statement);
  await prisma.note.create({ data: {
    id: "fixture-react", title: "React useEffect", tags: "React",
    content: "useEffect 的清理函数在依赖变化后的重新设置之前执行，也在组件卸载时执行。",
  } });
  ({ POST } = await import("../src/app/api/ask/route"));
  cookie = `takenotes-session=${(await (await import("../src/lib/auth/session")).createAdminSession()).token}`;
  globalThis.fetch = async () => { throw new Error("测试不允许真实联网"); };
});

beforeEach(async () => { await prisma.requestBudget.deleteMany(); });

after(async () => {
  globalThis.fetch = originalFetch;
  for (const key of ["DATABASE_URL", "DEEPSEEK_API_KEY", "DEEPSEEK_MODEL", "DEEPSEEK_BASE_URL", "ADMIN_USERNAME", "ADMIN_PASSWORD_HASH", "SESSION_SECRET", "APP_URL"]) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
  await prisma?.$disconnect();
  if (directory) await rm(directory, { recursive: true, force: true });
});

function request(question: unknown, signal?: AbortSignal) {
  return new Request("http://localhost:3000/api/ask", {
    method: "POST", headers: { "Content-Type": "application/json", cookie, origin: "http://localhost:3000" },
    body: JSON.stringify({ question }), signal,
  });
}

function installModel() {
  globalThis.fetch = async (_url, options) => {
    calls++;
    const input = JSON.parse(options?.body as string);
    assert.equal(input.stream, true);
    assert.ok(JSON.stringify(input.messages).includes("清理函数"));
    const parts = ["清理函数在重新设置前", "以及卸载时执行。[1](#source-1)"];
    const packets = parts.map((content) => ({
      id: "test", object: "chat.completion.chunk", created: 1, model: "deepseek-v4-flash",
      choices: [{ index: 0, delta: { content }, finish_reason: null }],
    }));
    const finish = {
      id: "test", object: "chat.completion.chunk", created: 1, model: "deepseek-v4-flash",
      choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
      usage: { prompt_tokens: 30, completion_tokens: 20, total_tokens: 50 },
    };
    return new Response([...packets, finish].map((part) => `data: ${JSON.stringify(part)}\n\n`).join("") + "data: [DONE]\n\n", {
      headers: { "Content-Type": "text/event-stream" },
    });
  };
}

test("接口拒绝无效问题与跨站请求", async () => {
  assert.equal((await POST(request(" "))).status, 400);
  assert.equal((await POST(request("x".repeat(301)))).status, 400);
  assert.equal((await POST(new Request("http://localhost:3000/api/ask", {
    method: "POST", headers: { origin: "https://other.example", "Content-Type": "application/json", cookie },
    body: JSON.stringify({ question: "useEffect" }),
  }))).status, 403);
});

test("无检索结果时不调用模型", async () => {
  installModel();
  const before = calls;
  const response = await POST(request("量子纠缠实验装置"));
  const events = (await response.text()).trim().split("\n").map((line) => JSON.parse(line));
  assert.equal(calls, before);
  assert.deepEqual(events[0].sources, []);
  assert.equal(events.at(-1).noContext, true);
});

test("代理内部地址不影响匹配配置的公开来源", async () => {
  const response = await POST(new Request("http://localhost:3012/api/ask", {
    method: "POST", headers: { host: "127.0.0.1:3012", origin: "http://localhost:3000", "Content-Type": "application/json", cookie },
    body: JSON.stringify({ question: "量子纠缠实验装置" }),
  }));
  assert.equal(response.status, 200);
});

test("缺少密钥给出可操作提示，不返回密钥", async () => {
  delete process.env.DEEPSEEK_API_KEY;
  try {
    const response = await POST(request("useEffect"));
    assert.equal(response.status, 503);
    assert.ok((await response.text()).includes(".env.local"));
  } finally {
    process.env.DEEPSEEK_API_KEY = "test-only-not-a-real-key";
  }
});

test("真实 SDK 解析模拟 DeepSeek 流：来源、增量文本、完成事件", async () => {
  installModel();
  const response = await POST(request("useEffect"));
  assert.match(response.headers.get("content-type") ?? "", /ndjson/);
  const events = (await response.text()).trim().split("\n").map((line) => JSON.parse(line));
  assert.equal(events[0].type, "sources");
  assert.equal(events[0].sources[0].id, "fixture-react");
  assert.equal(events.filter((event) => event.type === "delta").length, 2);
  assert.equal(events.at(-1).type, "done", JSON.stringify(events));
  assert.equal(events.at(-1).noContext, false);
  const saved = await prisma.qaHistory.findFirst({ where: { question: "useEffect", status: "done" } });
  assert.ok(saved?.answer.includes("清理函数"));
  assert.equal(JSON.parse(saved!.sources)[0].id, "fixture-react");
});

test("供应商错误转为提示，隐藏原始响应", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: "secret-provider-detail" } }), {
    status: 401, headers: { "Content-Type": "application/json" },
  });
  const response = await POST(request("useEffect"));
  const text = await response.text();
  assert.ok(text.includes("密钥不可用"), text);
  assert.ok(!text.includes("secret-provider-detail"));
  assert.ok(!text.includes("test-only-not-a-real-key"));
  assert.ok(!text.includes('"type":"done"'));
  assert.ok(await prisma.qaHistory.findFirst({ where: { status: "error", error: { contains: "密钥不可用" } } }));
});

test("请求取消会中止模型调用", async () => {
  let wasAborted = false;
  globalThis.fetch = async (_url, options) => new Promise<Response>((_resolve, reject) => {
    const onAbort = () => {
      wasAborted = true;
      reject(new DOMException("Aborted", "AbortError"));
    };
    if (options?.signal?.aborted) onAbort();
    else options?.signal?.addEventListener("abort", onAbort, { once: true });
  });
  const controller = new AbortController();
  const response = await POST(request("useEffect", controller.signal));
  controller.abort();
  await response.text();
  assert.equal(wasAborted, true);
  assert.ok(await prisma.qaHistory.findFirst({ where: { status: "stopped" } }));
});

test("未登录和伪造 Cookie 无法调用 AI 或读取来源", async () => {
  for (const value of ["", "takenotes-session=forged"]) {
    const response = await POST(new Request("http://localhost:3000/api/ask", { method: "POST", headers: { cookie: value, origin: "http://localhost:3000", "Content-Type": "application/json" }, body: JSON.stringify({ question: "useEffect" }) }));
    assert.equal(response.status, 401);
    assert.ok(!(await response.text()).includes("fixture-react"));
  }
});

test("登录校验、HttpOnly Cookie、退出撤销服务端会话", async () => {
  const login = (await import("../src/app/api/auth/login/route")).POST;
  const logout = (await import("../src/app/api/auth/logout/route")).POST;
  const { getAdmin } = await import("../src/lib/auth/session");
  const loginRequest = (password: string) => new Request("http://localhost:3000/api/auth/login", {
    method: "POST", headers: { origin: "http://localhost:3000", "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password }),
  });
  assert.equal((await login(loginRequest("wrong"))).status, 401);
  const response = await login(loginRequest("test-password-only-123"));
  assert.equal(response.status, 200);
  const header = response.headers.get("set-cookie")!;
  assert.match(header, /HttpOnly/i);
  assert.match(header, /SameSite=lax/i);
  const request = new Request("http://localhost:3000/api/auth/logout", { method: "POST", headers: { cookie: header.split(";")[0], origin: "http://localhost:3000" } });
  assert.ok(await getAdmin(request));
  assert.equal((await logout(request)).status, 200);
  assert.equal(await getAdmin(request), null);
});

test("密码变化与会话过期都会使旧 Cookie 失效", async () => {
  const { getAdmin, createAdminSession } = await import("../src/lib/auth/session");
  const old = process.env.ADMIN_PASSWORD_HASH;
  process.env.ADMIN_PASSWORD_HASH = await (await import("../src/lib/auth/password")).hashPassword("changed-password-only-123");
  assert.equal(await getAdmin(request("useEffect")), null);
  process.env.ADMIN_PASSWORD_HASH = old;
  const session = await createAdminSession();
  await prisma.adminSession.update({ where: { id: session.session.id }, data: { expiresAt: new Date(0) } });
  assert.equal(await getAdmin(new Request("http://localhost:3000", { headers: { cookie: `takenotes-session=${session.token}` } })), null);
});

test("登录次数与 AI 并发、每日限额在数据库中限制", async () => {
  const { consumeBudget, acquireAiLease } = await import("../src/lib/auth/budget");
  const results = await Promise.allSettled(Array.from({ length: 5 }, () => consumeBudget("fixture", 2, 60_000)));
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 2);
  const release = await acquireAiLease();
  await assert.rejects(acquireAiLease());
  await release();
  await (await acquireAiLease())();
});

test("历史快照独立于笔记修改；删除后流回调不会重建记录", async () => {
  const { createHistory, saveHistory, historySnapshot } = await import("../src/lib/qa/history");
  const row = await createHistory("问题", [{ number: 1, id: "deleted-note", title: "旧标题", excerpt: "旧正文" }], ["关键词"], "test");
  await saveHistory(row.id, "回答", "done");
  const saved = await prisma.qaHistory.findUniqueOrThrow({ where: { id: row.id } });
  assert.equal(historySnapshot(saved)?.sources[0].excerpt, "旧正文");
  await prisma.qaHistory.delete({ where: { id: row.id } });
  await saveHistory(row.id, "迟到的内容", "done");
  assert.equal(await prisma.qaHistory.findUnique({ where: { id: row.id } }), null);
});

test("登录拒绝跨站、非 JSON、坏数据及超长请求", async () => {
  const login = (await import("../src/app/api/auth/login/route")).POST;
  for (const [origin, type, body, status] of [
    ["https://other.example", "application/json", "{}", 403],
    ["http://localhost:3000", "text/plain", "{}", 415],
    ["http://localhost:3000", "application/json", "{", 400],
    ["http://localhost:3000", "application/json", JSON.stringify({ username: "中".repeat(1000), password: "x" }), 400],
  ] as const) {
    assert.equal((await login(new Request("http://localhost:3000/api/auth/login", {
      method: "POST", headers: { origin, "Content-Type": type }, body,
    }))).status, status);
  }
});

test("登录限额确实返回 429；HTTPS Cookie 与配置失败关闭", async () => {
  const login = (await import("../src/app/api/auth/login/route")).POST;
  const { consumeBudget } = await import("../src/lib/auth/budget");
  for (let i = 0; i < 10; i++) await consumeBudget("login", 10, 15 * 60_000);
  assert.equal((await login(new Request("http://localhost:3000/api/auth/login", {
    method: "POST", headers: { origin: "http://localhost:3000", "Content-Type": "application/json" }, body: "{}",
  }))).status, 429);
  const { sessionCookieOptions } = await import("../src/lib/auth/session");
  const { authConfig } = await import("../src/lib/auth/config");
  const original = process.env.APP_URL;
  try {
    process.env.APP_URL = "https://notes.example.com";
    assert.equal(sessionCookieOptions().secure, true);
    process.env.APP_URL = "http://notes.example.com";
    assert.equal(authConfig(), null);
    assert.equal((await POST(request("useEffect"))).status, 401);
  } finally { process.env.APP_URL = original; }
});

test("清理限流旧窗口不会删除新窗口；宕机中的历史会结算为停止", async () => {
  const { consumeBudget } = await import("../src/lib/auth/budget");
  const period = Math.floor(Date.now() / 60_000);
  const future = `window:${period + 1}`;
  await prisma.requestBudget.create({ data: { key: future, count: 7 } });
  await consumeBudget("window", 10, 60_000);
  assert.equal((await prisma.requestBudget.findUniqueOrThrow({ where: { key: future } })).count, 7);
  const row = await prisma.qaHistory.create({ data: { question: "中断测试", model: "test", answer: "已保存片段", updatedAt: new Date(0) } });
  await (await import("../src/lib/qa/history")).settleInterruptedHistory();
  const saved = await prisma.qaHistory.findUniqueOrThrow({ where: { id: row.id } });
  assert.equal(saved.status, "stopped");
  assert.equal(saved.answer, "已保存片段");
});
