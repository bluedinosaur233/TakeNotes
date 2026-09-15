import "dotenv/config";
import { createRequire } from "node:module";
import { mkdir, access, chmod } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const url = process.env.DATABASE_URL;
if (!url?.startsWith("file:")) throw new Error("需要 SQLite DATABASE_URL");
const source = url.startsWith("file://") ? fileURLToPath(url) : resolve(url.slice(5));
const target = resolve(process.argv[2] || `backups/takenotes-${new Date().toISOString().replaceAll(":", "-")}.db`);
if (source === target) throw new Error("备份路径不能与数据库相同");
try { await access(target); throw new Error("备份目标已存在，拒绝覆盖"); }
catch (error) { if (error.code !== "ENOENT") throw error; }
await mkdir(dirname(target), { recursive: true, mode: 0o700 });
const require = createRequire(pathToFileURL(resolve("package.json")));
const driverRequire = createRequire(require.resolve("@prisma/adapter-better-sqlite3"));
const Database = driverRequire("better-sqlite3");
const db = new Database(source, { readonly: true, fileMustExist: true });
try {
  await db.backup(target);
  await chmod(target, 0o600);
  console.log(`数据库快照已保存到 ${target}`);
} finally { db.close(); }
