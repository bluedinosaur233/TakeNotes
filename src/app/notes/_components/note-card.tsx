import Link from "next/link";
import type { Note } from "@/generated/prisma/client";

type NoteCardProps = {
  note: Note;
};

function getMarkdownExcerpt(markdown: string, maxLength = 120) {
  const plainText = markdown
    .replace(/```[\s\S]*?(?:```|$)/g, " ")
    .replace(/(^|\s)`{1,3}[\w-]*(?=\s|$)/gm, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/`+/g, "")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/[\*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return plainText.length > maxLength
    ? `${plainText.slice(0, maxLength)}…`
    : plainText || "暂无正文摘要";
}

export function NoteCard({ note }: NoteCardProps) {
  const preview = getMarkdownExcerpt(note.content);
  const tags = note.tags
    .replaceAll("，", ",")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  return (
    <article className="group flex h-full flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-colors duration-150 hover:bg-[#efedea]">
      <div className="flex-1">
        <h2 className="text-xl font-semibold text-[#37352f]">
          <Link href={`/notes/${note.id}`} className="hover:text-[#787774]">
            {note.title}
          </Link>
        </h2>
        <p className="mt-3 leading-7 text-gray-600">
          {preview}
        </p>
      </div>
      <div className="mt-6 flex flex-wrap gap-2 border-t border-gray-200 pt-4">
        {tags.length > 0 ? (
          tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-[#f1f0ed] px-2.5 py-1 text-xs font-medium text-[#787774]"
            >
              {tag}
            </span>
          ))
        ) : (
          <span className="text-xs text-gray-400">未添加标签</span>
        )}
        <time
          dateTime={note.updatedAt.toISOString()}
          className="ml-auto text-xs text-gray-400"
        >
          {note.updatedAt.toLocaleDateString("zh-CN")}
        </time>
      </div>
    </article>
  );
}
