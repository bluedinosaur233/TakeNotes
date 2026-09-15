import { mkdir, open } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export async function ensureSQLiteFile() {
  const url = process.env.DATABASE_URL;
  if (!url?.startsWith("file:") || url === "file:") throw new Error("需要 SQLite DATABASE_URL");
  const path = url.startsWith("file://") ? fileURLToPath(url) : resolve(url.slice(5));
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  try {
    // Prisma migrate deploy 需要目标文件存在。排他创建，绝不截断已有数据库。
    const handle = await open(path, "ax", 0o600);
    await handle.close();
  } catch (error) { if (error.code !== "EEXIST") throw error; }
}
