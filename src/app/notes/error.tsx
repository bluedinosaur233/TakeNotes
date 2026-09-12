"use client";

import { useEffect } from "react";

export default function NotesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-20 text-center lg:px-8">
      <p className="text-sm font-semibold text-red-600">ERROR</p>
      <h1 className="mt-3 text-3xl font-bold text-[#37352f]">笔记加载失败</h1>
      <p className="mt-3 text-gray-600">暂时无法读取笔记，请稍后再试。</p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-7 rounded-md bg-[#37352f] px-5 py-3 text-sm font-medium text-white transition-colors duration-150 hover:bg-[#2f2f2f]"
      >
        重新加载
      </button>
    </main>
  );
}
