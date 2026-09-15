// 生产构建上的 HTTP 集成验收：只使用临时数据库、虚构密码与本地模拟模型。
// 先 pnpm exec next build --webpack，再 pnpm test:smoke。不会读取或改写个人数据库。
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { scryptSync, randomBytes } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

const directory = await mkdtemp(join(tmpdir(), "takenotes-private-smoke-"));
const database = join(directory, "test.db");
const require = createRequire(import.meta.url);
const Database = createRequire(require.resolve("@prisma/adapter-better-sqlite3"))("better-sqlite3");
const password = "fixture-password-only-123";
const salt = randomBytes(16).toString("hex");
const hash = scryptSync(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }).toString("hex");
let server;
let db;
let logs = "";
let modelCalls = 0;
const model = createServer(async (req, res) => {
  for await (const chunk of req) { void chunk; /* 消费请求，不输出问题或凭证。 */ }
  modelCalls++;
  res.writeHead(200, { "Content-Type": "text/event-stream" });
  for (const [content, finish] of [["清理函数在重新设置前及卸载时执行。", null], ["[1](#source-1)", null], ["", "stop"]]) {
    res.write(`data: ${JSON.stringify({ id: "smoke", object: "chat.completion.chunk", created: 1, model: "fixture",
      choices: [{ index: 0, delta: { content }, finish_reason: finish }] })}\n\n`);
    await delay(30);
  }
  res.end("data: [DONE]\n\n");
});

try {
  model.listen(0, "127.0.0.1");
  await once(model, "listening");
  const portProbe = createServer();
  portProbe.listen(0, "127.0.0.1");
  await once(portProbe, "listening");
  const port = portProbe.address().port;
  await new Promise((resolve) => portProbe.close(resolve));
  const origin = `http://localhost:${port}`;
  server = spawn(process.execPath, ["scripts/start-container.mjs"], { env: {
    ...process.env, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1", PORT: String(port),
    DATABASE_URL: `file:${database}`, ADMIN_USERNAME: "fixture", ADMIN_PASSWORD_HASH: `scrypt:${salt}:${hash}`,
    SESSION_SECRET: randomBytes(48).toString("hex"), APP_URL: origin, AI_DAILY_LIMIT: "50",
    DEEPSEEK_API_KEY: "fixture-not-a-real-key", DEEPSEEK_MODEL: "fixture",
    DEEPSEEK_BASE_URL: `http://127.0.0.1:${model.address().port}`,
  }, stdio: ["ignore", "pipe", "pipe"] });
  server.stdout.on("data", (chunk) => { logs += chunk; });
  server.stderr.on("data", (chunk) => { logs += chunk; });
  let ready = false;
  for (let i = 0; i < 120; i++) {
    try { if ((await fetch(`${origin}/api/health`)).ok) { ready = true; break; } } catch {}
    if (server.exitCode !== null) throw new Error(`应用启动失败：${logs}`);
    await delay(250);
  }
  assert.ok(ready, `应用启动超时：${logs}`);
  db = new Database(database);
  const title = "PRIVATE_FIXTURE_React_useEffect";
  db.prepare('INSERT INTO Note (id,title,content,tags,updatedAt) VALUES (?,?,?,?,?)')
    .run("fixture-react", title, "# React useEffect\n\nuseEffect 的清理函数在重新设置之前和卸载时执行。", "React", Date.now());
  for (const path of ["/notes", "/notes/new", "/notes/fixture-react", "/notes/fixture-react/edit", "/ask", "/ask/history", "/ask/history/anything"]) {
    const response = await fetch(origin + path, { redirect: "manual" });
    const html = await response.text();
    assert.ok(response.headers.get("location") === "/login" || html.includes('NEXT_REDIRECT') || html.includes('url=/login'), `未登录重定向：${path}`);
    assert.ok(!html.includes(title), `匿名响应泄露笔记：${path}`);
  }
  const json = (body, cookie) => ({ method: "POST", headers: { origin, "Content-Type": "application/json", ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) });
  assert.equal((await fetch(origin + "/api/ask", json({ question: "useEffect" }))).status, 401);
  assert.equal((await fetch(origin + "/api/auth/login", json({ username: "fixture", password: "wrong" }))).status, 401);
  const login = await fetch(origin + "/api/auth/login", json({ username: "fixture", password }));
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie").split(";")[0];
  assert.match(login.headers.get("set-cookie"), /HttpOnly/i);
  const get = (path) => fetch(origin + path, { headers: { cookie }, redirect: "manual" });
  const manifest = JSON.parse(await readFile(".next/server/server-reference-manifest.json", "utf8"));
  const action = async (name, path, fields, authenticated = true) => {
    // 模拟浏览器原生表单提交，不绕过 Next.js 的 Server Action 分发及来源校验。
    const entry = Object.entries(manifest.node).find(([, value]) => value.exportedName === name);
    assert.ok(entry, `构建中应包含 ${name}`);
    const body = new FormData();
    body.set(`$ACTION_ID_${entry[0]}`, "");
    for (const [key, value] of Object.entries(fields)) body.set(key, value);
    return fetch(origin + path, { method: "POST", headers: { origin, ...(authenticated ? { cookie } : {}) }, body, redirect: "manual" });
  };
  for (const name of ["createNote", "updateNote", "deleteNote"]) {
    const denied = await action(name, "/notes/fixture-react", { id: "fixture-react" }, false);
    assert.equal(denied.headers.get("location"), "/login", `未登录直接调用 ${name} 被拒绝`);
    await denied.text();
  }
  assert.ok((await (await get("/notes")).text()).includes(title));
  const generated = await fetch(origin + "/api/ask", json({ question: "useEffect" }, cookie));
  const events = (await generated.text()).trim().split("\n").map(JSON.parse);
  assert.equal(events.at(-1).type, "done", JSON.stringify(events));
  assert.equal(modelCalls, 1);
  const row = db.prepare("SELECT * FROM QaHistory WHERE status = 'done'").get();
  assert.ok(row.answer.includes("清理函数"));
  const snapshotPath = join(directory, "snapshot.db");
  const backup = spawn(process.execPath, ["scripts/backup.mjs", snapshotPath], {
    env: { ...process.env, DATABASE_URL: `file:${database}` }, stdio: "ignore",
  });
  assert.equal((await once(backup, "exit"))[0], 0, "在线备份成功");
  const snapshot = new Database(snapshotPath, { readonly: true, fileMustExist: true });
  assert.equal(snapshot.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
  assert.equal(snapshot.prepare("SELECT answer FROM QaHistory WHERE id = ?").get(row.id).answer, row.answer);
  snapshot.close();
  assert.ok((await (await get("/ask/history")).text()).includes(row.id));
  const detail = await (await get(`/ask/history/${row.id}`)).text();
  assert.ok(detail.includes("当时的来源"));
  assert.ok(detail.includes(`history=${row.id}`));
  assert.ok((await (await get(`/notes/fixture-react?from=ask&history=${row.id}`)).text()).includes(`/ask/history/${row.id}`));
  const deniedDelete = await action("deleteHistory", `/ask/history/${row.id}`, { id: row.id }, false);
  assert.equal(deniedDelete.headers.get("location"), "/login");
  await deniedDelete.text();
  assert.ok(db.prepare("SELECT id FROM QaHistory WHERE id = ?").get(row.id));
  const removedNote = await action("deleteNote", "/notes/fixture-react", { id: "fixture-react" });
  assert.equal(removedNote.headers.get("location"), "/notes");
  await removedNote.text();
  assert.equal(db.prepare("SELECT count(*) AS n FROM Note").get().n, 0);
  assert.ok((await (await get(`/ask/history/${row.id}`)).text()).includes("原笔记已删除"));
  const missing = await fetch(origin + "/api/ask", json({ question: "量子纠缠实验装置" }, cookie));
  assert.ok((await missing.text()).includes('"noContext":true'));
  assert.equal(modelCalls, 1);
  const removedHistory = await action("deleteHistory", `/ask/history/${row.id}`, { id: row.id });
  assert.equal(removedHistory.headers.get("location"), "/ask/history");
  await removedHistory.text();
  assert.equal(db.prepare("SELECT id FROM QaHistory WHERE id = ?").get(row.id), undefined);
  assert.equal(db.prepare("SELECT count(*) AS n FROM QaHistory").get().n, 1, "删除不影响另一条历史");
  assert.equal((await fetch(origin + "/api/auth/logout", json({}, cookie))).status, 200);
  assert.equal((await fetch(origin + "/api/ask", json({ question: "useEffect" }, cookie))).status, 401);
  assert.equal(db.prepare("SELECT count(*) AS n FROM AdminSession").get().n, 0);
  assert.equal((await get("/ask/history")).headers.get("location"), "/login");
  console.log("PASS：生产服务器迁移、匿名页面及所有写入动作保护、登录、流式问答、历史/来源返回、笔记删除后快照保留、历史删除互不影响、无结果不调用模型、退出撤销。");
} finally {
  if (server && server.exitCode === null) {
    server.kill("SIGTERM");
    const timer = setTimeout(() => server.kill("SIGKILL"), 10_000);
    await once(server, "exit"); clearTimeout(timer);
  }
  db?.close();
  await new Promise((resolve) => model.close(resolve));
  await rm(directory, { recursive: true, force: true });
}
