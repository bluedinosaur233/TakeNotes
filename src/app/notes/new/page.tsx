import type { Metadata } from "next";
import Link from "next/link";
import { NoteForm } from "../_components/note-form";

export const metadata: Metadata = {
  title: "新增笔记",
  description: "创建一条新的学习笔记。",
};

export default function NewNotePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-12 lg:px-8">
      <Link href="/notes" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
        ← 返回笔记列表
      </Link>
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-semibold text-blue-600">NEW NOTE</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
          新增学习笔记
        </h1>
        <p className="mt-3 leading-7 text-slate-600">
          写下今天学到的内容，保存后会自动进入笔记详情页。
        </p>
        <div className="mt-8">
          <NoteForm />
        </div>
      </div>
    </main>
  );
}
