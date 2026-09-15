// 浏览器与服务端共用的数据格式；这里不导入数据库或 API 密钥。
export type NoteSource = {
  number: number;
  id: string;
  title: string;
  excerpt: string;
};

export type AnswerEvent =
  | { type: "sources"; sources: NoteSource[]; keywords: string[] }
  | { type: "delta"; text: string }
  | { type: "done"; noContext: boolean; truncated: boolean }
  | { type: "error"; message: string };

export const MAX_QUESTION_LENGTH = 300;

export function validateQuestion(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length < 2) {
    return "请输入至少 2 个字符的问题。";
  }
  if (value.trim().length > MAX_QUESTION_LENGTH) {
    return `问题请控制在 ${MAX_QUESTION_LENGTH} 个字符以内。`;
  }
  return null;
}
