import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { updateNote } from "../../actions";
import { NoteForm } from "../../_components/note-form";

type EditNotePageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "编辑笔记",
  description: "修改学习笔记。",
};

export default async function EditNotePage({ params }: EditNotePageProps) {
  await requireAdmin();
  await connection();
  const { id } = await params;
  const note = await prisma.note.findUnique({ where: { id } });

  if (!note) notFound();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-12 lg:px-8">
      <Link href={`/notes/${note.id}`} className="text-sm font-medium text-[#787774] hover:text-[#37352f]">
        ← 返回笔记详情
      </Link>
      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-10">
        <p className="accent-text text-sm font-semibold">EDIT NOTE</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#37352f]">编辑学习笔记</h1>
        <p className="mt-3 leading-7 text-gray-600">修改内容后保存，更新时间会自动更新。</p>
        <div className="mt-8">
          <NoteForm
            action={updateNote}
            initialValues={{ title: note.title, content: note.content, tags: note.tags }}
            noteId={note.id}
            cancelHref={`/notes/${note.id}`}
            submitLabel="保存修改"
          />
        </div>
      </div>
    </main>
  );
}
