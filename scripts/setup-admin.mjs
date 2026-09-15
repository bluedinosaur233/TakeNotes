import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { randomBytes, scryptSync } from "node:crypto";
import { chmod, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// 在部署者自己的终端输入密码，不将密码放入命令历史，不打印明文。
if (!process.stdin.isTTY) throw new Error("请在交互式终端运行此配置工具。");
let hidden = false;
const output = new Writable({ write(chunk, _encoding, done) { if (!hidden) process.stdout.write(chunk); done(); } });
const rl = createInterface({ input: process.stdin, output, terminal: true });
try {
  const targetName = process.argv.includes("--docker") ? ".env.docker" : ".env.local";
  const target = resolve(targetName);
  let existing = "";
  try { existing = await readFile(target, "utf8"); } catch (error) { if (error.code !== "ENOENT") throw error; }
  if (/^ADMIN_PASSWORD_HASH=.+/m.test(existing)) {
    const confirmation = await rl.question(`${targetName} 已有管理员配置。输入 RESET 才更换密码并注销旧会话：`);
    if (confirmation !== "RESET") { console.log("已取消。"); process.exit(0); }
  }
  const username = (await rl.question("管理员用户名（默认 admin）：")).trim() || "admin";
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(username)) throw new Error("用户名只允许英文字母、数字、下划线和连字符。");
  const appUrl = new URL((await rl.question("访问地址（本地默认 http://localhost:3000，公网必须 https）：")).trim() || "http://localhost:3000");
  if (appUrl.username || appUrl.password || !["http:", "https:"].includes(appUrl.protocol) ||
    (appUrl.protocol === "http:" && !["localhost", "127.0.0.1", "[::1]"].includes(appUrl.hostname))) throw new Error("公网部署请使用 HTTPS 地址。");
  process.stdout.write("设置密码（12–128 个字符，输入不回显）："); hidden = true;
  const password = await rl.question("");
  hidden = false; process.stdout.write("\n再次输入密码："); hidden = true;
  const repeated = await rl.question("");
  hidden = false; process.stdout.write("\n");
  if (password.length < 12 || password.length > 128 || password !== repeated) throw new Error("密码长度不符或两次输入不一致。");
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }).toString("hex");
  const values = { ADMIN_USERNAME: username, ADMIN_PASSWORD_HASH: `scrypt:${salt}:${hash}`,
    SESSION_SECRET: randomBytes(48).toString("hex"), APP_URL: appUrl.origin };
  for (const [key, value] of Object.entries(values)) {
    const line = `${key}="${value}"`;
    const pattern = new RegExp(`^${key}=.*$`, "m");
    existing = pattern.test(existing) ? existing.replace(pattern, line) : `${existing.trimEnd()}\n${line}\n`;
  }
  if (targetName === ".env.docker" && !/^DEEPSEEK_API_KEY=/m.test(existing)) existing += 'DEEPSEEK_API_KEY=""\nDEEPSEEK_MODEL="deepseek-flash"\nAI_DAILY_LIMIT="50"\n';
  await writeFile(target, existing.trimStart(), { mode: 0o600 });
  await chmod(target, 0o600);
  console.log(`已更新 ${targetName}（保留其他配置），密码只保存为 scrypt 哈希。迁移数据库并重启服务后登录。`);
} finally { hidden = false; rl.close(); }
