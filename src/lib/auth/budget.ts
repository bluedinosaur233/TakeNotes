import "server-only";
import { prisma } from "@/lib/prisma";

export class BudgetExceeded extends Error {}

// UPDATE 的条件与递增在同一条 SQL 中执行，避免并发请求越过限制。
export async function consumeBudget(name: string, limit: number, windowMs: number) {
  const period = Math.floor(Date.now() / windowMs);
  const prefix = `${name}:`;
  const key = `${prefix}${period}`;
  // 只清理更早的窗口，不能用“不是当前窗口”：跨窗口的迟到请求会误删新计数。
  await prisma.$executeRaw`DELETE FROM "RequestBudget"
    WHERE substr("key", 1, ${prefix.length}) = ${prefix}
      AND CAST(substr("key", ${prefix.length + 1}) AS INTEGER) < ${period - 1}`;
  await prisma.$executeRaw`INSERT OR IGNORE INTO "RequestBudget" ("key", "count") VALUES (${key}, 0)`;
  const changed = await prisma.requestBudget.updateMany({ where: { key, count: { lt: limit } }, data: { count: { increment: 1 } } });
  if (!changed.count) throw new BudgetExceeded("请求过于频繁");
}

export function dailyAiLimit() {
  const value = Number(process.env.AI_DAILY_LIMIT || 50);
  return Number.isInteger(value) && value >= 1 && value <= 1000 ? value : 50;
}

export async function acquireAiLease() {
  const key = "ai-lease";
  const now = Math.floor(Date.now() / 1000);
  const expires = now + 60;
  await prisma.$executeRaw`INSERT OR IGNORE INTO "RequestBudget" ("key", "count") VALUES (${key}, 0)`;
  const result = await prisma.requestBudget.updateMany({ where: { key, count: { lte: now } }, data: { count: expires } });
  if (!result.count) throw new BudgetExceeded("已有回答正在生成，请稍后重试。");
  return async () => {
    await prisma.requestBudget.updateMany({ where: { key, count: expires }, data: { count: 0 } });
  };
}
