import type { Metadata } from "next";
import { AskForm } from "./_components/ask-form";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "问问笔记",
  description: "从已有学习笔记中寻找答案，并回到来源核对。",
};

export default async function AskPage() {
  const admin = await requireAdmin();
  return (
    <main className="ask-page">
      <header className="ask-intro">
        <p className="ask-eyebrow">TAKENOTES / ASK</p>
        <h1>问问笔记</h1>
        <p>把问题留在这里，从记录里找到答案。</p>
        <Link href="/ask/history" className="ask-inline-link">查看问答历史 →</Link>
      </header>
      <AskForm sessionScope={admin.scope} />
    </main>
  );
}
