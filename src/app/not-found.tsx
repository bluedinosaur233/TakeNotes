import Link from "next/link";

export default function GlobalNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-20 text-center lg:px-8">
      <p className="text-sm font-semibold text-[#787774]">404</p>
      <h1 className="mt-3 text-3xl font-bold text-[#37352f]">页面不存在</h1>
      <p className="mt-3 text-gray-600">你访问的页面不存在或已经被移除。</p>
      <Link
        href="/"
        className="mt-7 rounded-md bg-[#37352f] px-5 py-3 text-sm font-medium text-white transition-colors duration-150 hover:bg-[#2f2f2f]"
      >
        返回首页
      </Link>
    </main>
  );
}
