import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { NoteCard } from "./_components/note-card";
import { Pagination } from "./_components/pagination";
import { SearchForm } from "./_components/search-form";

export const metadata: Metadata = {
  title: "学习笔记",
  description: "浏览和管理学习笔记。",
};

type NotesPageProps = {
  searchParams: Promise<{
    query?: string;
    tag?: string;
    page?: string;
  }>;
};

const PAGE_SIZE = 6;

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function NotesPage({ searchParams }: NotesPageProps) {
  await connection();
  const params = await searchParams;
  const query = getSingleParam(params.query).trim();
  const tag = getSingleParam(params.tag).trim();
  const parsedPage = Number.parseInt(getSingleParam(params.page), 10);
  const requestedPage = Number.isNaN(parsedPage) ? 1 : parsedPage;
  const page = Math.max(1, requestedPage);

  const where = {
    ...(query
      ? {
          OR: [
            { title: { contains: query } },
            { content: { contains: query } },
            { tags: { contains: query } },
          ],
        }
      : {}),
    ...(tag ? { tags: { contains: tag } } : {}),
  };

  const [notes, totalCount, allTagRows] = await Promise.all([
    prisma.note.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.note.count({ where }),
    prisma.note.findMany({
      select: { tags: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const allTags = Array.from(
    new Set(
      allTagRows.flatMap((note) =>
        note.tags
          .replaceAll("，", ",")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    ),
  ).sort((a, b) => a.localeCompare(b, "zh-CN"));
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-12 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-600">NOTES</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            学习笔记
          </h1>
          <p className="mt-3 text-slate-600">
            共 {totalCount} 条结果，每页显示 {PAGE_SIZE} 条。
          </p>
        </div>
        <Link
          href="/notes/new"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          新增笔记
        </Link>
      </div>

      <SearchForm query={query} tag={tag} tags={allTags} />

      {notes.length === 0 ? (
        <section className="mt-6 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <h2 className="text-xl font-bold text-slate-900">
            {query || tag ? "没有匹配的笔记" : "还没有笔记数据"}
          </h2>
          <p className="mt-2 text-slate-600">
            {query || tag ? "试试其他关键词或清除筛选条件。" : "下一步通过表单创建第一条学习笔记。"}
          </p>
          {query || tag ? (
            <Link href="/notes" className="mt-5 font-semibold text-blue-600 hover:text-blue-700">
              清除筛选
            </Link>
          ) : null}
        </section>
      ) : (
        <>
          <section className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {notes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </section>
          <Pagination page={safePage} totalPages={totalPages} query={query} tag={tag} />
        </>
      )}
    </main>
  );
}
