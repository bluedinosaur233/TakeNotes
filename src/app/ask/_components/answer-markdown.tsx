"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { NoteSource } from "@/lib/qa/types";

export function AnswerMarkdown({ text, sources }: { text: string; sources: NoteSource[] }) {
  const allowed = new Set(sources.map((source) => `#source-${source.number}`));
  return (
    <div className="markdown-body ask-answer-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        allowedElements={["p", "strong", "em", "del", "h1", "h2", "h3", "h4", "ul", "ol", "li", "blockquote", "pre", "code", "a", "hr", "br", "table", "thead", "tbody", "tr", "th", "td"]}
        components={{
          // 模型只能跳到本次检索结果；不允许自造外链、图片请求或笔记地址。
          a: ({ href, children }) => allowed.has(href ?? "")
            ? <a href={href} className="ask-citation" aria-label={`查看来源 ${href?.replace("#source-", "")}`}>{children}</a>
            : <span title="未验证的引用">{children}</span>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
