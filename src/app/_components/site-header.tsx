import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import { ThemeColorPicker } from "./theme-color-picker";

export function SiteHeader() {
  return (
    <header className="border-b border-gray-200 bg-[#f7f6f3]">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6 lg:px-8">
        <Link
          href="/"
          className="text-xl font-bold tracking-tight text-[#37352f]"
        >
          Take<span className="accent-text">Notes</span>
        </Link>
        <nav aria-label="主导航" className="flex items-center gap-1 sm:gap-3">
          <Link
            href="/"
            className="rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition-colors duration-150 hover:bg-[#efedea] hover:text-[#37352f] active:bg-[#e3e1db]"
          >
            首页
          </Link>
          <Link
            href="/notes"
            className="rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition-colors duration-150 hover:bg-[#efedea] hover:text-[#37352f] active:bg-[#e3e1db]"
          >
            学习笔记
          </Link>
          <ThemeToggle />
          <ThemeColorPicker />
        </nav>
      </div>
    </header>
  );
}
