import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6 lg:px-8">
        <Link
          href="/"
          className="text-xl font-bold tracking-tight text-slate-950"
        >
          Take<span className="text-blue-600">Notes</span>
        </Link>
        <nav aria-label="主导航" className="flex items-center gap-1 sm:gap-3">
          <Link
            href="/"
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
          >
            首页
          </Link>
          <Link
            href="/notes"
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
          >
            学习笔记
          </Link>
          <Link
            href="/#roadmap"
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
          >
            项目设计
          </Link>
        </nav>
      </div>
    </header>
  );
}
