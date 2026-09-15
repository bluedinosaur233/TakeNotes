import type { NoteSource } from "./types";

export type AnswerStatus = "idle" | "searching" | "generating" | "done" | "empty" | "stopped" | "error";
export type AnswerSnapshot = {
  question: string;
  submittedQuestion: string;
  answer: string;
  sources: NoteSource[];
  keywords: string[];
  status: AnswerStatus;
  error: string;
  truncated: boolean;
};
export const ANSWER_SESSION_KEY = "takenotes-answer-v1";

// sessionStorage 也属于外部输入：旧格式或损坏的数据不应该让问答页面崩溃。
export function parseAnswerSnapshot(raw: string | null): AnswerSnapshot | null {
  if (!raw || raw.length > 100_000) return null;
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    for (const field of ["question", "submittedQuestion", "answer", "error"]) {
      if (typeof data[field] !== "string") return null;
    }
    if (data.question.length > 300 || data.submittedQuestion.length > 300) return null;
    if (!Array.isArray(data.keywords) || data.keywords.length > 12 ||
      !data.keywords.every((word: unknown) => typeof word === "string")) return null;
    if (!Array.isArray(data.sources) || data.sources.length > 4 || !data.sources.every(
      (source: NoteSource, index: number) => source && source.number === index + 1 &&
        typeof source.id === "string" && typeof source.title === "string" && typeof source.excerpt === "string",
    )) return null;
    if (!["idle", "searching", "generating", "done", "empty", "stopped", "error"].includes(data.status) ||
      typeof data.truncated !== "boolean") return null;
    return {
      question: data.question, submittedQuestion: data.submittedQuestion,
      answer: data.answer, sources: data.sources, keywords: data.keywords,
      // 页面离开后请求已取消，恢复片段不能伪装成仍在生成或已完整回答。
      status: data.status === "searching" || data.status === "generating" ? "stopped" : data.status,
      error: data.error, truncated: data.truncated,
    };
  } catch {
    return null;
  }
}
