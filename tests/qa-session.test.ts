import assert from "node:assert/strict";
import test from "node:test";
import { parseAnswerSnapshot } from "../src/lib/qa/session";

const snapshot = {
  question: "useEffect 是什么？", submittedQuestion: "useEffect 是什么？",
  answer: "用于同步外部系统。[1](#source-1)",
  sources: [{ number: 1, id: "react", title: "React", excerpt: "useEffect" }],
  keywords: ["useeffect"], status: "done", error: "", truncated: false,
};

test("恢复问题、回答和真实来源，不需要重新调用模型", () => {
  assert.deepEqual(parseAnswerSnapshot(JSON.stringify(snapshot)), snapshot);
});

test("离开时生成中的回答恢复为停止状态", () => {
  for (const status of ["searching", "generating"]) {
    const result = parseAnswerSnapshot(JSON.stringify({ ...snapshot, status }));
    assert.equal(result?.status, "stopped");
    assert.equal(result?.answer, snapshot.answer);
  }
});

test("损坏或旧版本暂存安全回退，不渲染无效来源", () => {
  for (const value of [null, "{", "null", "{}", JSON.stringify({ ...snapshot, sources: [null] }),
    JSON.stringify({ ...snapshot, status: "unknown" }), JSON.stringify({ ...snapshot, answer: 1 })]) {
    assert.equal(parseAnswerSnapshot(value), null);
  }
});
