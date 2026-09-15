import { spawn } from "node:child_process";
import { once } from "node:events";
import { ensureSQLiteFile } from "./init-database.mjs";

const { ADMIN_PASSWORD_HASH = "", SESSION_SECRET = "", APP_URL = "" } = process.env;
if (!/^scrypt:[0-9a-f]{32}:[0-9a-f]{128}$/.test(ADMIN_PASSWORD_HASH) || SESSION_SECRET.length < 32) {
  throw new Error("管理员配置缺失。先生成 .env.docker，再启动；未配置时不会开放知识库。");
}
const url = new URL(APP_URL);
if (url.username || url.password || !["http:", "https:"].includes(url.protocol) ||
  (url.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) {
  throw new Error("APP_URL 必须是本机 HTTP 或公网 HTTPS 地址。");
}
let child;
let stopping = false;
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => { stopping = true; child?.kill(signal); });
await ensureSQLiteFile();
if (stopping) process.exit(1);
child = spawn(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy", "--config", "prisma7.config.ts"], { stdio: "inherit" });
let [code] = await once(child, "exit");
if (code !== 0 || stopping) process.exit(code || 1);
child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "0.0.0.0", "--port", process.env.PORT || "3000"], { stdio: "inherit" });
[code] = await once(child, "exit");
process.exitCode = code ?? 1;
