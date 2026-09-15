import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { settleInterruptedHistory } from "@/lib/qa/history";

export const metadata = { title: "问答历史", robots: { index: false, follow: false } };
const labels: Record<string, string> = { done: "已完成", generating: "生成中", stopped: "已停止", error: "未完成", empty: "资料不足" };

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireAdmin();
  await settleInterruptedHistory();
  const count = await prisma.qaHistory.count();
  const totalPages = Math.max(1, Math.ceil(count / 10));
  const requested = Number((await searchParams).page || 1);
  const page = Number.isSafeInteger(requested) ? Math.max(1, Math.min(totalPages, requested)) : 1;
  const history = await prisma.qaHistory.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * 10, take: 10,
    select: { id: true, question: true, createdAt: true, status: true } });
  return <main className="ask-page">
    <Link href="/ask" className="ask-inline-link">← 返回问问笔记</Link>
    <header className="ask-intro"><h1>问答历史</h1><p>共 {count} 次提问。保留当时的回答与来源，方便继续回顾。</p></header>
    {!history.length ? <div className="ask-result"><p>还没有问答记录。</p><Link href="/ask" className="ask-inline-link">开始提问 →</Link></div> :
      <ol className="history-list">{history.map((item) => <li key={item.id}>
        <Link href={`/ask/history/${item.id}`}><h2>{item.question}</h2>
          <span className="ask-muted">{item.createdAt.toLocaleString("zh-CN")} · {labels[item.status] || "未完成"}</span>
        </Link>
      </li>)}</ol>}
    <nav aria-label="历史分页" className="ask-composer-footer">
      {page > 1 ? <Link href={`/ask/history?page=${page - 1}`}>← 上一页</Link> : <span />}
      <span className="ask-muted">{page} / {totalPages}</span>
      {page < totalPages ? <Link href={`/ask/history?page=${page + 1}`}>下一页 →</Link> : <span />}
    </nav>
  </main>;
}
