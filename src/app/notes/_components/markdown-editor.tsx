"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

// Markdown 解析器体积较大，只有切到预览时才需要，因此拆成异步 chunk 按需加载。
const MarkdownRenderer = dynamic(
  () => import("./markdown-renderer").then((mod) => mod.MarkdownRenderer),
  {
    ssr: false,//关闭服务端渲染
    loading: () => <p className="text-sm text-gray-400">正在加载预览…</p>,//加载展示文本
  },
);

type MarkdownEditorProps = {
  defaultValue?: string;
  error?: string;
};

type EditorMode = "edit" | "preview";

export function MarkdownEditor({
  defaultValue = "",
  error,
}: MarkdownEditorProps) {
  const [content, setContent] = useState(defaultValue);
  const [mode, setMode] = useState<EditorMode>("edit");

  return (
    <div>
      <div className="mt-2 overflow-hidden rounded-md border border-gray-200 bg-white focus-within:border-transparent focus-within:ring-2 focus-within:ring-gray-400/30">
        <div className="flex items-center gap-1 border-b border-gray-200 bg-[#f7f6f3] px-2 py-2">
          {(
            [
              ["edit", "编辑"],
              ["preview", "预览"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                mode === value
                  ? "bg-[#e3e1db] text-[#37352f]"
                  : "text-gray-500 hover:bg-[#efedea] hover:text-[#37352f]"
              }`}
            >
              {label}
            </button>
          ))}
          <span className="ml-auto px-2 text-xs text-gray-400">
            支持 Markdown
          </span>
        </div>

        <textarea
          id="content"
          name="content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          required={mode === "edit"}
          maxLength={10000}
          rows={14}
          placeholder="使用 Markdown 记录重点，例如：\n\n## 核心概念\n\n- 第一条要点\n- 第二条要点\n\n```ts\nconst answer = 42;\n```"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "content-error" : undefined}
          className={`block w-full resize-y border-0 px-4 py-3 leading-7 text-gray-900 outline-none placeholder:text-gray-400 ${
            mode === "preview" ? "hidden" : ""
          }`}
        />

        {mode === "preview" ? (
          <div className="min-h-80 px-4 py-3">
            {content.trim() ? (
              <MarkdownRenderer content={content} />
            ) : (
              <p className="text-gray-400">还没有内容，切换到编辑模式开始输入。</p>
            )}
          </div>
        ) : null}
      </div>
      {error ? (
        <p id="content-error" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      ) : null}
      <p className="mt-2 text-xs text-gray-500">
        可使用标题、列表、引用、链接、表格和代码块等 Markdown 语法。
      </p>
    </div>
  );
}
