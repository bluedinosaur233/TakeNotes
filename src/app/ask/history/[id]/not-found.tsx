import Link from "next/link";
export default function MissingHistory() {
  return <main className="ask-page"><h1>这条记录不存在或已删除</h1><Link href="/ask/history" className="ask-inline-link">返回问答历史 →</Link></main>;
}
