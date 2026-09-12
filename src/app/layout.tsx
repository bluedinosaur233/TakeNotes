import type { Metadata } from "next";
import { SiteHeader } from "./_components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "TakeNotes - 个人学习知识库",
    template: "%s | TakeNotes",
  },
  description: "记录、整理和搜索你的学习笔记。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="flex min-h-screen flex-col bg-slate-50 text-slate-950 antialiased">
        <SiteHeader />
        {children}
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-6 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
            <p>TakeNotes · 个人学习知识库</p>
            <p>Built while learning Next.js App Router</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
