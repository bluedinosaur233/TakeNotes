"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { MAX_QUESTION_LENGTH, validateQuestion, type AnswerEvent, type NoteSource } from "@/lib/qa/types";
import { ANSWER_SESSION_KEY, parseAnswerSnapshot, type AnswerStatus } from "@/lib/qa/session";

const AnswerMarkdown = dynamic(() => import("./answer-markdown").then((mod) => mod.AnswerMarkdown), {
  ssr: false,
  loading: () => <p className="ask-muted">正在排版回答…</p>,
});

const statusLabels: Record<AnswerStatus, string> = {
  idle: "单轮问答；本标签页暂存最近一次内容，返回或刷新可恢复。",
  searching: "正在查找相关笔记…",
  generating: "正在根据笔记整理回答…",
  done: "回答完成，请结合来源核对。",
  empty: "未找到足够相关的笔记。",
  stopped: "已停止，已生成的内容保留在下方。",
  error: "本次回答未完成。",
};
const examples = ["服务端组件和客户端组件有什么区别？", "useEffect 的清理函数什么时候执行？", "Prisma 中如何定义数据模型？"];

export function AskForm({ sessionScope }: { sessionScope: string }) {
  const storageKey = `${ANSWER_SESSION_KEY}:${sessionScope}`;
  const [question, setQuestion] = useState("");
  const [submittedQuestion, setSubmittedQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<NoteSource[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [status, setStatus] = useState<AnswerStatus>("idle");
  const [error, setError] = useState("");
  const [truncated, setTruncated] = useState(false);
  const [ready, setReady] = useState(false);
  const [storageWarning, setStorageWarning] = useState("");
  const controllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const busy = status === "searching" || status === "generating";

  useEffect(() => () => controllerRef.current?.abort(), []);

  useEffect(() => {
    // 挂载后恢复，避免服务端 HTML 与客户端首次渲染不一致。
    const frame = requestAnimationFrame(() => {
      try {
        const saved = parseAnswerSnapshot(sessionStorage.getItem(storageKey));
        if (saved) {
          setQuestion(saved.question);
          setSubmittedQuestion(saved.submittedQuestion);
          setAnswer(saved.answer);
          setSources(saved.sources);
          setKeywords(saved.keywords);
          setStatus(saved.status);
          setError(saved.error);
          setTruncated(saved.truncated);
        }
      } catch {
        setStorageWarning("浏览器暂存不可用，离开或刷新后可能无法恢复回答。");
      }
      setReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [storageKey]);

  useEffect(() => {
    if (!ready) return; // 不能让初始空状态覆盖尚未读取的记录。
    try {
      if (!question && !submittedQuestion) {
        sessionStorage.removeItem(storageKey);
      } else {
        sessionStorage.setItem(storageKey, JSON.stringify({
          question, submittedQuestion, answer, sources, keywords, status, error, truncated,
        }));
      }
    } catch {
      const frame = requestAnimationFrame(() => setStorageWarning("浏览器暂存失败，离开或刷新后可能无法恢复回答。"));
      return () => cancelAnimationFrame(frame);
    }
  }, [storageKey, ready, question, submittedQuestion, answer, sources, keywords, status, error, truncated]);

  async function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || controllerRef.current) return;
    const invalid = validateQuestion(question);
    if (invalid) {
      setError(invalid);
      inputRef.current?.focus();
      return;
    }
    const controller = new AbortController();
    controllerRef.current = controller;
    setStatus("searching");
    setSubmittedQuestion(question.trim());
    setError("");
    setAnswer("");
    setSources([]);
    setKeywords([]);
    setTruncated(false);

    let completed = false;
    function receive(line: string) {
      if (!line.trim() || controller.signal.aborted) return;
      const event = JSON.parse(line) as AnswerEvent;
      if (event.type === "sources") {
        setSources(event.sources);
        setKeywords(event.keywords);
        setStatus(event.sources.length ? "generating" : "searching");
      } else if (event.type === "delta") {
        setAnswer((previous) => previous + event.text);
      } else if (event.type === "done") {
        completed = true;
        setTruncated(event.truncated);
        setStatus(event.noContext ? "empty" : "done");
      } else if (event.type === "error") {
        throw new Error(event.message);
      }
    }

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim() }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(typeof data?.error === "string" ? data.error : "请求失败，请稍后重试。");
      }
      if (!response.body) throw new Error("浏览器没有收到回答，请重试。");
      const reader = response.body.getReader();
      // 网络包可能从一个汉字或一行 JSON 的中间断开，所以分别保留解码与行缓冲。
      const decoder = new TextDecoder();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let end: number;
          while ((end = buffer.indexOf("\n")) !== -1) {
            receive(buffer.slice(0, end));
            buffer = buffer.slice(end + 1);
          }
        }
        buffer += decoder.decode();
        if (buffer.trim()) receive(buffer);
      } finally {
        await reader.cancel().catch(() => {});
        reader.releaseLock();
      }
      if (!completed && !controller.signal.aborted) throw new Error("连接提前结束，回答可能不完整。请重试。");
    } catch (cause) {
      if (controller.signal.aborted) return;
      setStatus("error");
      setError(cause instanceof Error ? cause.message : "网络异常，请稍后重试。");
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }

  function stop() {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setStatus("stopped");
  }

  function clearAnswer() {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setQuestion("");
    setSubmittedQuestion("");
    setAnswer("");
    setSources([]);
    setKeywords([]);
    setStatus("idle");
    setError("");
    setTruncated(false);
    inputRef.current?.focus();
  }

  return (
    <>
      <form onSubmit={ask} className="ask-composer">
        <label htmlFor="question" className="ask-label">你想了解什么？</label>
        <textarea
          ref={inputRef}
          id="question"
          name="question"
          rows={3}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={MAX_QUESTION_LENGTH}
          disabled={busy || !ready}
          placeholder="例如：useEffect 的清理函数什么时候执行？"
          aria-describedby="ask-privacy ask-status ask-error"
          required
        />
        <div className="ask-composer-footer">
          <span className="ask-muted">{question.length} / {MAX_QUESTION_LENGTH}</span>
          {busy ? (
            <button type="button" className="ask-secondary" onClick={stop}>停止回答</button>
          ) : (
            <button type="submit" className="ask-primary" disabled={!ready}>问问笔记 <span aria-hidden="true">↗</span></button>
          )}
        </div>
        <p id="ask-privacy" className="ask-disclosure">问题和命中的片段会发送给 DeepSeek。问答及来源将保存到此实例的历史记录，可单独删除；清空当前页面不会删除历史。</p>
      </form>

      {ready && !submittedQuestion && (
        <div className="ask-examples" aria-label="示例问题">
          {examples.map((example) => (
            <button key={example} type="button" onClick={() => {
              setQuestion(example);
              inputRef.current?.focus();
            }}>{example}</button>
          ))}
        </div>
      )}

      <div className="ask-composer-footer">
        <p id="ask-status" className="ask-status" role="status">{ready ? statusLabels[status] : "正在恢复本次问答…"}</p>
        {ready && !busy && (question || submittedQuestion) && <button type="button" className="ask-secondary" onClick={clearAnswer}>清空本次问答</button>}
      </div>
      {storageWarning && <p className="ask-notice" role="status">{storageWarning}</p>}
      <div id="ask-error" role="alert">{error && <p className="ask-error">{error}</p>}</div>

      {submittedQuestion && (
        <section className="ask-result" aria-label="本次回答" aria-busy={busy}>
          <div className="ask-result-heading">
            <span className="ask-eyebrow">本次提问</span>
            <h2>{submittedQuestion}</h2>
          </div>
          {answer ? <AnswerMarkdown text={answer} sources={sources} /> : busy ? (
            <p className="ask-muted">{sources.length ? `找到 ${sources.length} 篇相关笔记，正在整理…` : "正在寻找答案的线索…"}</p>
          ) : null}
          {truncated && <p className="ask-notice">回答达到长度上限，可能尚未完整。可以缩小问题范围后再次提问。</p>}
          {status === "empty" && <Link href="/notes/new" className="ask-inline-link">补充一篇笔记 →</Link>}
        </section>
      )}

      {sources.length > 0 && (
        <section className="ask-sources" aria-labelledby="sources-heading">
          <div className="ask-source-heading">
            <h2 id="sources-heading">参考笔记 <span>{sources.length}</span></h2>
            <p>这些片段已提供给 AI，展开可核对依据。</p>
          </div>
          <p className="ask-keywords">检索词：{keywords.join(" · ")}</p>
          <ol>
            {sources.map((source) => (
              <li key={source.id} id={`source-${source.number}`}>
                <div className="ask-source-title">
                  <span className="ask-source-number">{source.number}</span>
                  <Link href={`/notes/${encodeURIComponent(source.id)}?from=ask`} onClick={() => { if (busy) stop(); }}>{source.title}<span aria-hidden="true"> ↗</span></Link>
                </div>
                <details>
                  <summary>查看提供给 AI 的片段</summary>
                  <p className="ask-excerpt">{source.excerpt}</p>
                </details>
              </li>
            ))}
          </ol>
          <p className="ask-disclosure">引用方便回查，不代表答案一定正确。当前按关键词检索，换一种说法可能得到不同结果。</p>
        </section>
      )}
    </>
  );
}
