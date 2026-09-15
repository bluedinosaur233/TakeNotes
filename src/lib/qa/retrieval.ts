import type { NoteSource } from "./types";

type SearchNote = { id: string; title: string; content: string; tags: string };
const STOP_WORDS = new Set([
  "什么", "怎么", "怎样", "如何", "为什么", "哪些", "哪个", "一个", "一下",
  "请问", "请", "帮我", "可以", "是否", "解释", "介绍", "讲解", "告诉", "关于",
  "笔记", "知识库", "里面", "记录", "相关", "区别", "使用", "需要", "应该", "什么时候", "作用",
  "the", "a", "an", "is", "are", "was", "what", "why", "how", "to", "of",
  "in", "and", "or", "for", "please", "explain", "does", "do", "my", "notes",
]);
// 通用中文分词器可能把“组件”拆成单字，优先保留这个知识库常见的技术短语。
// 只是词典补充，不做语义推断；长短语必须排在短词之前。
const TECH_TERMS = /服务端组件|客户端组件|服务端渲染|客户端渲染|清理函数|懒加载|数据库|主题色|服务端|客户端|组件|防抖|分包|闭包|副作用|事务|大纲/g;

function normalize(text: string) {
  return text.normalize("NFKC").toLowerCase();
}

// 中文按词切分；保留 useEffect、Next.js 等英文标识。不是语义检索。
export function extractKeywords(question: string): string[] {
  const text = normalize(question);
  const latin = text.match(/[a-z][a-z0-9]*(?:[.+#_-][a-z0-9]+)*/g) ?? [];
  const technical = text.match(TECH_TERMS) ?? [];
  const segmenter = new Intl.Segmenter("zh-CN", { granularity: "word" });
  const chinese = [...segmenter.segment(text.replace(TECH_TERMS, " "))]
    .filter((part) => part.isWordLike && /\p{Script=Han}/u.test(part.segment))
    .map((part) => part.segment);
  return [...new Set([...latin, ...technical, ...chinese])]
    .filter((term) => term.length >= 2 && !STOP_WORDS.has(term))
    .slice(0, 12);
}

function hasTerm(text: string, term: string) {
  if (/^[a-z]/.test(term)) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?<![a-z0-9_])${escaped}(?![a-z0-9_])`, "i").test(text);
  }
  return text.includes(term);
}

function chunks(content: string) {
  const result: { text: string; offset: number }[] = [];
  // 有重叠的窗口让长文末尾也能命中，不只截取开头。
  for (let offset = 0; offset < content.length; offset += 650) {
    result.push({ text: content.slice(offset, offset + 800), offset });
  }
  return result;
}

export function rankNotes(notes: SearchNote[], keywords: string[]): NoteSource[] {
  if (!keywords.length) return [];
  // 常见于很多候选笔记的词降低权重，标题和标签匹配增加权重。
  const weights = keywords.map((term) => {
    const frequency = notes.filter((note) =>
      hasTerm(normalize(`${note.title}\n${note.tags}\n${note.content}`), term),
    ).length;
    return 1 + Math.log(1 + notes.length / (1 + frequency));
  });

  return notes.map((note) => {
    const title = normalize(note.title);
    const tags = normalize(note.tags);
    const content = normalize(note.content);
    const matched = keywords.filter((term) => hasTerm(`${title}\n${tags}\n${content}`, term));
    // 技术标识必须命中，且至少覆盖 60% 的词，避免用泛词替代用户问的概念。
    if (keywords.some((term) => /^[a-z]/.test(term) && !matched.includes(term))) return null;
    if (matched.length < Math.max(1, Math.ceil(keywords.length * 0.6))) return null;
    const scoreText = (text: string) => keywords.reduce(
      (sum, term, index) => sum + (hasTerm(text, term) ? weights[index] : 0), 0,
    );
    const best = chunks(note.content)
      .map((chunk) => ({ ...chunk, score: scoreText(normalize(chunk.text)) }))
      .sort((a, b) => b.score - a.score || a.offset - b.offset)[0];
    if (!best) return null;
    return {
      id: note.id,
      title: note.title,
      excerpt: best.text.trim(),
      score: scoreText(title) * 4 + scoreText(tags) * 2 + best.score,
    };
  })
    .filter((item) => item !== null)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, 4)
    .map(({ id, title, excerpt }, index) => ({ number: index + 1, id, title, excerpt }));
}
