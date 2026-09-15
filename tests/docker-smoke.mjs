// 验证实际镜像与 Compose。只创建本脚本专用的容器、卷和虚构凭据，不读 .env*。
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomBytes, scryptSync } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createServer } from "node:net";
import { once } from "node:events";

const exec = promisify(execFile);
const directory = await mkdtemp(join(tmpdir(), "takenotes-docker-test-"));
const project = `takenotes-test-${randomBytes(5).toString("hex")}`;
const composePath = join(directory, "compose.yaml");
const password = randomBytes(24).toString("hex");
const salt = randomBytes(16).toString("hex");
const hash = scryptSync(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }).toString("hex");
const probe = createServer();
probe.listen(0, "127.0.0.1");
await once(probe, "listening");
const port = probe.address().port;
await new Promise((done) => probe.close(done));
const origin = `http://localhost:${port}`;
const compose = async (...args) => {
  try {
    return (await exec("docker", ["compose", "--project-name", project, "--env-file", join(directory, "test.env"), "-f", composePath, ...args], {
      timeout: 180_000, maxBuffer: 4 * 1024 * 1024,
    })).stdout;
  } catch (error) {
    // 不打印包含配置或测试凭据的命令参数。
    throw new Error(`Compose ${args[0]} 失败：${error.stderr || error.code}`);
  }
};
const node = (code) => compose("exec", "-T", "app", "node", "-e", code);
const dbPrefix = `const {createRequire}=require('node:module'); const D=createRequire(require.resolve('@prisma/adapter-better-sqlite3'))('better-sqlite3'); const db=new D('/app/data/takenotes.db');`;
const snapshot = async () => JSON.parse(await node(dbPrefix + `console.log(JSON.stringify({notes:db.prepare('SELECT * FROM Note ORDER BY id').all(),history:db.prepare('SELECT * FROM QaHistory ORDER BY id').all()}));db.close();`));

try {
  const base = await readFile("compose.yaml", "utf8");
  // 沿用项目 Compose 的健康检查、非 root 用户、数据卷及安全设置；仅替换测试配置。
  const config = base.replace("build: .", `build: ${JSON.stringify(resolve("."))}`)
    .replace("env_file: .env.docker", `env_file: ${JSON.stringify(join(directory, "test.env"))}`)
    .replace("restart: unless-stopped", "restart: 'no'")
    .replace("\nvolumes:\n", `\n  model:\n    image: node:24-bookworm-slim\n    command: ["node", "/fixture/model.mjs"]\n    volumes:\n      - ${JSON.stringify(`${directory}:/fixture:ro`)}\n\nvolumes:\n`);
  await writeFile(composePath, config, { mode: 0o600 });
  await writeFile(join(directory, "test.env"), [
    `APP_PORT=${port}`, `APP_URL=${origin}`, "ADMIN_USERNAME=fixture",
    `ADMIN_PASSWORD_HASH=scrypt:${salt}:${hash}`, `SESSION_SECRET=${randomBytes(48).toString("hex")}`,
    "DEEPSEEK_API_KEY=fixture-not-real", "DEEPSEEK_MODEL=fixture", "DEEPSEEK_BASE_URL=http://model:8080", "AI_DAILY_LIMIT=50",
  ].join("\n"), { mode: 0o600 });
  await writeFile(join(directory, "model.mjs"), `import {createServer} from 'node:http';
createServer(async(req,res)=>{for await(const chunk of req){void chunk;}res.writeHead(200,{'Content-Type':'text/event-stream'});
for(const [content,finish] of [['这是容器测试的模拟回答。[1](#source-1)',null],['','stop']])res.write('data: '+JSON.stringify({id:'fixture',object:'chat.completion.chunk',created:1,model:'fixture',choices:[{index:0,delta:{content},finish_reason:finish}]})+'\\n\\n');res.end('data: [DONE]\\n\\n');}).listen(8080,'0.0.0.0');`);
  console.log(`隔离测试项目 ${project}，仅回环端口 ${port}；不会调用真实模型。`);
  await compose("up", "-d", "--no-build", "--wait", "--wait-timeout", "120");
  assert.equal((await snapshot()).notes.length, 0, "首次启动不自动植入笔记");
  const loginPage = await (await fetch(origin + "/login")).text();
  assert.ok(loginPage.includes('name="password"'), "无密钥构建的镜像，运行时配置后必须显示登录表单");
  assert.ok(!loginPage.includes("管理员配置尚未完成"));
  assert.equal((await node("console.log(process.getuid())")).trim(), "1000", "非 root 运行");
  await node(`const fs=require('node:fs');for(const p of ['.env','.env.local','.env.docker','dev.db','LEARNING.md'])if(fs.existsSync(p))throw Error('镜像含不应打包的文件:'+p);`);
  await compose("exec", "-T", "app", "node", "node_modules/tsx/dist/cli.mjs", "prisma/seed.ts");
  assert.equal((await snapshot()).notes.length, 10);
  for (const path of ["/notes", "/notes/new", "/notes/seed-nextjs-app-router", "/ask", "/ask/history"]) {
    const response = await fetch(origin + path, { redirect: "manual" });
    const html = await response.text();
    assert.ok(response.headers.get("location") === "/login" || html.includes("NEXT_REDIRECT"));
    assert.ok(!html.includes("Next.js App Router 学习笔记"));
  }
  const post = (body, cookie) => ({ method: "POST", headers: { origin, "Content-Type": "application/json", ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) });
  assert.equal((await fetch(origin + "/api/ask", post({ question: "useEffect" }))).status, 401);
  const response = await fetch(origin + "/api/auth/login", post({ username: "fixture", password }));
  assert.equal(response.status, 200);
  const cookie = response.headers.get("set-cookie").split(";")[0];
  const get = (path) => fetch(origin + path, { headers: { cookie }, redirect: "manual" });
  const notesPage = await get("/notes");
  assert.equal(notesPage.status, 200);
  assert.ok((await notesPage.text()).includes("学习笔记"));
  const answer = await fetch(origin + "/api/ask", post({ question: "useEffect" }, cookie));
  const events = (await answer.text()).trim().split("\n").map(JSON.parse);
  assert.equal(events.at(-1).type, "done", JSON.stringify(events));
  const original = await snapshot();
  const history = original.history[0];
  assert.equal(original.history.length, 1);
  assert.equal(history.status, "done");
  assert.ok((await (await get(`/ask/history/${history.id}`)).text()).includes("模拟回答"));
  console.log("通过：首次建库、非 root、种子脚本、登录保护、模拟流式问答与历史。");

  await compose("up", "-d", "--no-build", "--force-recreate", "--wait", "--wait-timeout", "120", "app");
  assert.deepEqual(await snapshot(), original, "重建容器保留所有笔记与问答字段");
  assert.equal((await get("/ask/history")).status, 200);
  console.log("通过：容器重建后数据与登录会话保留。");

  await compose("exec", "-T", "app", "node", "scripts/backup.mjs", "/app/data/backups/smoke.db");
  await compose("cp", "app:/app/data/backups/smoke.db", join(directory, "snapshot.db"));
  await node(dbPrefix + `db.prepare("UPDATE Note SET title='修改后的测试标题' WHERE id=?").run('seed-nextjs-app-router');db.close();`);
  assert.notDeepEqual(await snapshot(), original);
  await compose("stop", "app");
  await compose("run", "--rm", "--no-deps", "--entrypoint", "node", "app", "-e",
    `const fs=require('node:fs');const dir='/app/data/';for(const suffix of ['', '-wal','-shm'])if(fs.existsSync(dir+'takenotes.db'+suffix))fs.renameSync(dir+'takenotes.db'+suffix,dir+'before-restore.db'+suffix);fs.copyFileSync(dir+'backups/smoke.db',dir+'takenotes.db');`);
  await compose("up", "-d", "--no-build", "--wait", "--wait-timeout", "120", "app");
  assert.deepEqual(await snapshot(), original, "恢复快照与备份时所有数据完全一致");
  assert.equal((await node(dbPrefix + `console.log(db.prepare('PRAGMA integrity_check').get().integrity_check);db.close();`)).trim(), "ok");
  assert.equal((await fetch(origin + "/api/auth/logout", post({}, cookie))).status, 200);
  assert.equal((await fetch(origin + "/api/ask", post({ question: "useEffect" }, cookie))).status, 401);
  console.log("通过：在线备份、复制导出、停机恢复及完整性检查、退出后旧会话失效。");
  console.log("Docker Compose 验证全部通过。");
} finally {
  // 只清理本次随机项目名创建的测试卷；绝不操作用户已有 Compose 项目或真实数据。
  try {
    await compose("down", "--volumes", "--remove-orphans");
    await rm(directory, { recursive: true, force: true });
    console.log("已清理本次隔离测试容器、数据卷和虚构配置；保留构建镜像。");
  } catch {
    process.exitCode = 1;
    console.error(`测试清理未完成，保留配置以便手动检查：${composePath}，项目名 ${project}`);
  }
}
