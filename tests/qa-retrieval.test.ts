import assert from "node:assert/strict";
import test from "node:test";
import { extractKeywords, rankNotes } from "../src/lib/qa/retrieval";
import { validateQuestion } from "../src/lib/qa/types";
import { buildAnswerPrompt } from "../src/lib/qa/prompt";
import { seedNotes } from "../prisma/seed-data";

test("问题校验覆盖空值、类型、空白与超长", () => {
  for (const value of [null, {}, "", " ", "a", "x".repeat(301)]) {
    assert.ok(validateQuestion(value));
  }
  assert.equal(validateQuestion("什么是 useEffect？"), null);
});

test("中英文分词保留代码标识并去掉问句词", () => {
  assert.deepEqual(extractKeywords("请问什么是 useEffect？"), ["useeffect"]);
  assert.ok(extractKeywords("Next.js 的服务端组件是什么？").includes("next.js"));
  assert.equal(extractKeywords("what is the").length, 0);
  assert.deepEqual(extractKeywords("服务端组件和客户端组件有什么区别？"), ["服务端组件", "客户端组件"]);
});

test("标题加权；真实种子笔记能命中常见学习问题", () => {
  const ranked = rankNotes(seedNotes, extractKeywords("Next.js App Router 是什么？"));
  assert.ok(ranked.length > 0);
  assert.ok(ranked[0].title.includes("Next.js"));
  assert.ok(ranked.length <= 4);
  assert.deepEqual(ranked.map((source) => source.number), ranked.map((_, i) => i + 1));
});

test("无关问题没有匹配；英文 react 不误匹配 reactive", () => {
  assert.deepEqual(rankNotes(seedNotes, extractKeywords("量子纠缠实验装置")), []);
  assert.deepEqual(rankNotes([{ id: "1", title: "Reactive", tags: "", content: "Reactive programming" }], ["react"]), []);
});

test("抽取长文末尾命中的片段并限制上下文长度", () => {
  const ranked = rankNotes([{
    id: "long", title: "长笔记", tags: "",
    content: "普通段落。".repeat(900) + "\n## useEffect\nuseEffect 的清理函数会释放事件监听。",
  }], ["useeffect"]);
  assert.equal(ranked.length, 1);
  assert.ok(ranked[0].excerpt.includes("清理函数"));
  assert.ok(ranked[0].excerpt.length <= 800);
});

test("多关键词不足时拒绝弱匹配", () => {
  assert.deepEqual(rankNotes([{ id: "1", title: "React", tags: "", content: "React 组件" }], ["react", "sqlite", "事务"]), []);
  assert.deepEqual(rankNotes([{ id: "2", title: "Prisma", tags: "", content: "Prisma 定义模型" }], ["prisma", "upsert"]), []);
});

test("提示只包含已选片段，不带数据库 id、凭证或任意整篇内容", () => {
  const prompt = JSON.parse(buildAnswerPrompt("解释 useEffect", [{
    number: 1, id: "private-db-id", title: "React", excerpt: "只发送这段内容",
  }]));
  assert.deepEqual(prompt.noteExcerpts, [{ source: 1, title: "React", excerpt: "只发送这段内容" }]);
});
