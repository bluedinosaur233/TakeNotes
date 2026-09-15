import "server-only";
import { prisma } from "@/lib/prisma";
import { extractKeywords, rankNotes } from "./retrieval";

export async function searchNotes(question: string) {
  const keywords = extractKeywords(question);
  if (!keywords.length) return { keywords, sources: [] };

  // 先由 SQLite 筛选，再在有限候选中排序。小型个人知识库的词法检索基线。
  const candidates = await prisma.note.findMany({
    where: {
      OR: keywords.flatMap((term) => [
        { title: { contains: term } },
        { tags: { contains: term } },
        { content: { contains: term } },
      ]),
    },
    select: { id: true, title: true, content: true, tags: true },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    take: 120,
  });

  return { keywords, sources: rankNotes(candidates, keywords) };
}
