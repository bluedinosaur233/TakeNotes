import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DeleteButton } from "../_components/delete-button";
import { MarkdownRenderer } from "../_components/markdown-renderer";
import { NoteOutline } from "../_components/note-outline";

type NoteDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: NoteDetailPageProps): Promise<Metadata> {
  await connection();
  const { id } = await params;
  const note = await prisma.note.findUnique({ where: { id } });

  return {
    title: note?.title ?? "笔记不存在",
    description: note ? `${note.title} - TakeNotes` : "找不到这条学习笔记。",
  };
}

export default async function NoteDetailPage({
  params,
}: NoteDetailPageProps) {
  await connection();
  const { id } = await params;
  const note = await prisma.note.findUnique({ where: { id } });

  if (!note) {
    notFound();
  }

  const tags = note.tags
    .replaceAll("，", ",")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  return (
    <main className="note-detail-main mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-12 lg:px-8">
      <div className="note-back-link mx-auto w-full max-w-3xl">
        <Link
          href="/notes"
          className="text-sm font-medium text-[#787774] hover:text-[#37352f]"
        >
          ← 返回笔记列表
        </Link>
      </div>
      <div className="note-reading-shell">
        <NoteOutline key={note.id + note.updatedAt.toISOString()} bodyId="note-body" />
        <article className="note-article rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-10">
        <header className="border-b border-gray-200 pb-6">
          <p className="accent-text text-sm font-semibold">LEARNING NOTE</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#37352f] sm:text-4xl">
            {note.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-500">
            <time dateTime={note.updatedAt.toISOString()}>
              更新于 {note.updatedAt.toLocaleString("zh-CN")}
            </time>
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-[#f1f0ed] px-2.5 py-1 text-xs font-medium text-[#787774]"
              >
                {tag}
              </span>
            ))}
          </div>
        </header>
        <div id="note-body" className="mt-8 min-w-0">
          <MarkdownRenderer content={note.content} />
        </div>
        <div className="mt-10 flex gap-3 border-t border-gray-200 pt-6">
          <Link
            href={`/notes/${note.id}/edit`}
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-[#37352f] px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-[#2f2f2f]"
          >
            编辑
          </Link>
          <DeleteButton id={note.id} />
        </div>
        </article>
      </div>
    </main>
  );
}
