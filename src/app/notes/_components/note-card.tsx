import Link from "next/link";
import type { Note } from "@/generated/prisma/client";

type NoteCardProps = {
  note: Note;
};

export function NoteCard({ note }: NoteCardProps) {
  const preview =
    note.content.length > 120 ? `${note.content.slice(0, 120)}…` : note.content;
  const tags = note.tags
    .replaceAll("，", ",")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
      <div className="flex-1">
        <h2 className="text-xl font-bold text-slate-900">
          <Link href={`/notes/${note.id}`} className="hover:text-blue-600">
            {note.title}
          </Link>
        </h2>
        <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-600">
          {preview}
        </p>
      </div>
      <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        {tags.length > 0 ? (
          tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
            >
              {tag}
            </span>
          ))
        ) : (
          <span className="text-xs text-slate-400">未添加标签</span>
        )}
        <time
          dateTime={note.updatedAt.toISOString()}
          className="ml-auto text-xs text-slate-400"
        >
          {note.updatedAt.toLocaleDateString("zh-CN")}
        </time>
      </div>
    </article>
  );
}
