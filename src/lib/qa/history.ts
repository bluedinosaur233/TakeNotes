import "server-only";
import { prisma } from "@/lib/prisma";
import { parseAnswerSnapshot } from "./session";
import type { NoteSource } from "./types";

export function createHistory(question: string, sources: NoteSource[], keywords: string[], model: string) {
  return prisma.qaHistory.create({ data: { question, sources: JSON.stringify(sources), keywords: JSON.stringify(keywords), model } });
}

export async function saveHistory(id: string, answer: string, status: string, error = "", truncated = false) {
  // 用户可在别的标签页删除记录，不用 upsert，防止已删除记录被流式回调重新创建。
  await prisma.qaHistory.updateMany({ where: { id }, data: { answer, status, error, truncated } });
}

export async function settleInterruptedHistory() {
  // 程序意外退出无法执行 finally，超过请求最长时间的记录标为中断。
  await prisma.qaHistory.updateMany({
    where: { status: "generating", updatedAt: { lt: new Date(Date.now() - 90_000) } },
    data: { status: "stopped", error: "请求曾中断，保留最后保存的内容。" },
  });
}

export function historySnapshot(row: {
  question: string; answer: string; sources: string; keywords: string;
  status: string; error: string; truncated: boolean;
}) {
  try {
    return parseAnswerSnapshot(JSON.stringify({ question: row.question, submittedQuestion: row.question,
      answer: row.answer, sources: JSON.parse(row.sources), keywords: JSON.parse(row.keywords),
      status: row.status, error: row.error, truncated: row.truncated }));
  } catch { return null; }
}
