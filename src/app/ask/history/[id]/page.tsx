import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { historySnapshot, settleInterruptedHistory } from "@/lib/qa/history";
import { AnswerMarkdown } from "../../_components/answer-markdown";
import { DeleteHistoryButton } from "../delete-history-button";

export const metadata = { title: "历史回答", robots: { index: false, follow: false } };
export default async function HistoryDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  await settleInterruptedHistory();
  const { id } = await params;
  const row = await prisma.qaHistory.findUnique({ where: { id } });
  if (!row) notFound();
  const snapshot = historySnapshot(row);
  const sources = snapshot?.sources ?? [];
  const existing = new Set((await prisma.note.findMany({ where: { id: { in: sources.map((item) => item.id) } }, select: { id: true } })).map((note) => note.id));
  const status = row.status === "generating" ? "生成中，可稍后刷新查看" : row.status === "done" ? "已完成" : row.status === "empty" ? "资料不足" : row.status === "stopped" ? "已停止，内容可能不完整" : "未完成";
  return <main className="ask-page">
    <Link href="/ask/history" className="ask-inline-link">← 返回问答历史</Link>
    <section className="ask-result"><div className="ask-result-heading"><p className="ask-eyebrow">历史回答</p><h1>{row.question}</h1>
      <p className="ask-muted">{row.createdAt.toLocaleString("zh-CN")} · {status}</p></div>
      {row.answer ? <AnswerMarkdown text={row.answer} sources={sources} /> : <p className="ask-muted">此记录暂无回答内容。</p>}
      {row.error && <p className="ask-notice">{row.error}</p>}
      {row.truncated && <p className="ask-notice">回答达到长度上限，可能不完整。</p>}
    </section>
    {sources.length > 0 && <section className="ask-sources"><h2>当时的来源</h2><p className="ask-muted">以下为提问时保存的摘录，原笔记之后可能已修改。</p><ol>
      {sources.map((source) => <li key={source.number} id={`source-${source.number}`}>
        <div className="ask-source-title"><span>{source.number}</span>{existing.has(source.id)
          ? <Link href={`/notes/${encodeURIComponent(source.id)}?from=ask&history=${encodeURIComponent(row.id)}`}>{source.title} ↗</Link>
          : <span>{source.title}（原笔记已删除）</span>}</div>
        <details><summary>查看当时的片段</summary><p className="ask-excerpt">{source.excerpt}</p></details>
      </li>)}
    </ol></section>}
    <div className="ask-composer-footer"><Link href="/ask" className="ask-inline-link">发起新提问 →</Link><DeleteHistoryButton id={row.id} /></div>
  </main>;
}
