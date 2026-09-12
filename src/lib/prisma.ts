import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

//判断数据库地址是否配置
if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

function createPrismaClient(databaseUrl: string) {
  const adapter = new PrismaBetterSqlite3({ url: databaseUrl });

  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient(connectionString);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
