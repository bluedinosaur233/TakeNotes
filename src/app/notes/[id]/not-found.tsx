import Link from "next/link";

export default function NoteNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-20 text-center lg:px-8">
      <p className="text-sm font-semibold text-blue-600">404</p>
      <h1 className="mt-3 text-3xl font-bold text-slate-950">笔记不存在</h1>
      <p className="mt-3 text-slate-600">这条笔记可能已经被删除，或者链接中的 ID 不正确。</p>
      <Link
        href="/notes"
        className="mt-7 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
      >
        返回笔记列表
      </Link>
    </main>
  );
}
