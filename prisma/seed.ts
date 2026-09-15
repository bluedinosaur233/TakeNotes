import "dotenv/config";//让.env里的配置进入环境变量，使process.env能够读取
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
// 种子脚本在 Next 之外运行，因此使用相对路径而不是 @ 别名。
import { PrismaClient } from "../src/generated/prisma/client";
import { seedNotes } from "./seed-data";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: connectionString }),
});

async function main() {

  //transaction：要么全部成功要么全部撤销（原子性）
  await prisma.$transaction(
    seedNotes.map((note) =>
      //upsert:找到就更新，找不到就创建
      // 用 upsert 而不是 create，脚本重复执行也不会产生重复记录。
      prisma.note.upsert({
        where: { id: note.id },
        update: {
          title: note.title,
          content: note.content,
          tags: note.tags,
        },
        create: note,
      }),
    ),
  );

  const total = await prisma.note.count();
  console.log(
    `已写入 ${seedNotes.length} 条示例笔记，当前数据库共有 ${total} 条。`,
  );
}

main()
  .catch((error: unknown) => {
    console.error("写入示例笔记失败：", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
