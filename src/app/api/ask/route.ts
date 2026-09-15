import { createDeepSeek } from "@ai-sdk/deepseek";
import { APICallError, streamText } from "ai";
import { searchNotes } from "@/lib/qa/search";
import { ANSWER_INSTRUCTIONS, buildAnswerPrompt } from "@/lib/qa/prompt";
import { validateQuestion, type AnswerEvent } from "@/lib/qa/types";
import { getAdmin } from "@/lib/auth/session";
import { sameOrigin } from "@/lib/auth/config";
import { acquireAiLease, BudgetExceeded, consumeBudget, dailyAiLimit } from "@/lib/auth/budget";
import { createHistory, saveHistory } from "@/lib/qa/history";
import { readJson } from "@/lib/read-json";

export const runtime = "nodejs";
export const maxDuration = 60;

const encoder = new TextEncoder();
const encodeEvent = (event: AnswerEvent) => encoder.encode(`${JSON.stringify(event)}\n`);
const streamHeaders = {
  "Content-Type": "application/x-ndjson; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Accel-Buffering": "no",
};

function errorMessage(error: unknown) {
  if (APICallError.isInstance(error)) {
    if (error.statusCode === 401 || error.statusCode === 403) return "DeepSeek 密钥不可用，请检查本地配置。";
    if (error.statusCode === 402) return "DeepSeek 余额不足，请检查账户余额。";
    if (error.statusCode === 429) return "DeepSeek 当前请求较多，请稍后再试。";
    if (error.statusCode === 400 || error.statusCode === 404) return "模型配置不可用，请检查 DEEPSEEK_MODEL。";
  }
  return "暂时无法完成回答，请稍后重试。";
}

// 限制请求体本身，不仅检查解析后的问题长度。
async function readQuestion(request: Request): Promise<unknown> {
  const data = await readJson(request, 8192);
  return data && typeof data === "object" && "question" in data ? data.question : undefined;
}

export async function POST(request: Request) {
  if (!(await getAdmin(request))) return Response.json({ error: "登录已失效，请重新登录。" }, { status: 401 });
  if (!sameOrigin(request)) {
    return Response.json({ error: "不接受跨站问答请求。" }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return Response.json({ error: "请使用 JSON 提交问题。" }, { status: 415 });
  }

  let value: unknown;
  try {
    value = await readQuestion(request);
  } catch {
    return Response.json({ error: "问题格式不正确或请求过长。" }, { status: 400 });
  }
  const validation = validateQuestion(value);
  if (validation) return Response.json({ error: validation }, { status: 400 });
  const question = (value as string).trim();

  try { await consumeBudget("ask", 10, 60_000); }
  catch (error) {
    return Response.json({ error: error instanceof BudgetExceeded ? "提问过于频繁，请一分钟后重试。" : "暂时无法处理请求。" }, { status: error instanceof BudgetExceeded ? 429 : 500 });
  }

  let result: Awaited<ReturnType<typeof searchNotes>>;
  try {
    result = await searchNotes(question);
  } catch {
    return Response.json({ error: "暂时无法读取笔记，请检查数据库后重试。" }, { status: 500 });
  }

  const { sources, keywords } = result;
  if (!sources.length) {
    const message = "当前笔记中没有找到足够相关的资料。试试使用笔记里的术语提问，或先补充一篇相关笔记。本次没有调用 AI。";
    try {
      const history = await createHistory(question, [], keywords, "");
      await saveHistory(history.id, message, "empty");
    } catch { return Response.json({ error: "无法保存问答历史，请检查数据库。" }, { status: 500 }); }
    const events: AnswerEvent[] = [
      { type: "sources", sources, keywords },
      { type: "delta", text: message },
      { type: "done", noContext: true, truncated: false },
    ];
    return new Response(events.map((event) => JSON.stringify(event)).join("\n") + "\n", { headers: streamHeaders });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) {
    return Response.json({ error: "尚未配置 DeepSeek。请在 .env.local（Docker 使用 .env.docker）中填写 DEEPSEEK_API_KEY，然后重启或重建容器。" }, { status: 503 });
  }

  let releaseLease: (() => Promise<void>) | undefined;
  let historyId: string;
  const model = process.env.DEEPSEEK_MODEL || "deepseek-flash";
  try {
    releaseLease = await acquireAiLease();
    await consumeBudget("ai-day", dailyAiLimit(), 24 * 60 * 60_000);
    historyId = (await createHistory(question, sources, keywords, model)).id;
  } catch (error) {
    await releaseLease?.().catch(() => {});
    return Response.json({ error: error instanceof BudgetExceeded
      ? "已有回答正在生成，或本日 AI 请求额度已用完，请稍后再试。"
      : "无法保存问答历史，请检查数据库。" }, { status: error instanceof BudgetExceeded ? 429 : 500 });
  }

  const abort = new AbortController();
  const abortFromRequest = () => abort.abort();
  request.signal.addEventListener("abort", abortFromRequest, { once: true });
  if (request.signal.aborted) abort.abort();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    abort.abort();
  }, 45000);

  const cleanup = () => {
    clearTimeout(timeout);
    request.signal.removeEventListener("abort", abortFromRequest);
  };
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AnswerEvent) => {
        if (!cancelled) controller.enqueue(encodeEvent(event));
      };
      let answer = "";
      let finalStatus = "error";
      let finalMessage = "";
      let truncated = false;
      let lastSaved = Date.now();
      try {
        send({ type: "sources", sources, keywords });
        const deepseek = createDeepSeek({
          apiKey,
          baseURL: process.env.DEEPSEEK_BASE_URL || undefined,
        });
        const generation = streamText({
          model: deepseek(model),
          instructions: ANSWER_INSTRUCTIONS,
          prompt: buildAnswerPrompt(question, sources),
          maxOutputTokens: 1400,
          maxRetries: 0,
          providerOptions: { deepseek: { thinking: { type: "disabled" } } },
          abortSignal: abort.signal,
          onError: () => { /* 错误在下方统一转为安全提示，不输出密钥或供应商响应。 */ },
        });

        let hasText = false;
        let finished = false;
        for await (const part of generation.stream) {
          if (part.type === "text-delta") {
            hasText ||= Boolean(part.text.trim());
            answer += part.text;
            send({ type: "delta", text: part.text });
            if (Date.now() - lastSaved > 1000) {
              await saveHistory(historyId, answer, "generating");
              lastSaved = Date.now();
            }
          } else if (part.type === "error") {
            throw part.error;
          } else if (part.type === "abort") {
            throw new Error("aborted");
          } else if (part.type === "finish") {
            if (!hasText || !["stop", "length"].includes(part.finishReason)) throw new Error("incomplete response");
            finished = true;
            truncated = part.finishReason === "length";
          }
        }
        if (!finished) throw new Error("stream ended early");
        finalStatus = "done";
      } catch (error) {
        finalStatus = !timedOut && (cancelled || request.signal.aborted) ? "stopped" : "error";
        finalMessage = finalStatus === "stopped" ? "已停止，保留已生成的内容。" : timedOut ? "回答超时，已停止请求。请缩小问题范围后重试。" : errorMessage(error);
      } finally {
        cleanup();
        try { await saveHistory(historyId, answer, finalStatus, finalMessage, truncated); }
        catch { finalStatus = "error"; finalMessage = "回答历史保存失败，请检查数据库。当前页面内容仍可阅读。"; }
        await releaseLease?.().catch(() => {});
        if (!cancelled) {
          if (finalStatus === "done") send({ type: "done", noContext: false, truncated });
          else send({ type: "error", message: finalMessage });
          controller.close();
        }
      }
    },
    cancel() {
      cancelled = true;
      abort.abort();
      cleanup();
    },
  });

  return new Response(body, { headers: streamHeaders });
}
