export type SeedNote = {
  id: string;
  title: string;
  tags: string;
  content: string;
};

// 示例笔记内容。id 固定，因此脚本可以反复执行而不会产生重复记录。
export const seedNotes: SeedNote[] = [
  {
    id: "seed-nextjs-app-router",
    title: "Next.js App Router 学习笔记",
    tags: "Next.js, React, App Router",
    content: `# Next.js App Router 学习笔记

App Router 把路由、数据获取和渲染方式统一到文件系统里。这篇笔记记录我理解它的过程，重点放在服务端组件和客户端组件的边界上。

## 服务端组件与客户端组件

App Router 里的组件默认是服务端组件，它们在服务器上渲染，可以直接访问数据库，代码不会发送到浏览器。

### 什么时候需要 use client

只有需要浏览器能力时才把组件标记为客户端组件：

- 使用 useState、useEffect 这类 React 状态
- 绑定点击、输入等事件
- 读取 localStorage 或 window 这类浏览器 API

### 一个最小的服务端组件

\`\`\`tsx
export default async function NotesPage() {
  const notes = await prisma.note.findMany();

  return (
    <ul>
      {notes.map((note) => (
        <li key={note.id}>{note.title}</li>
      ))}
    </ul>
  );
}
\`\`\`

## 数据获取

页面需要数据时直接在组件里 await，不必再写 useEffect 加状态那一套。

\`\`\`ts
const notes = await prisma.note.findMany({
  orderBy: { updatedAt: "desc" },
  take: 20,
});
\`\`\`

## 常见陷阱

| 现象 | 原因 | 处理方式 |
| --- | --- | --- |
| 组件里不能用 useState | 默认是服务端组件 | 抽成客户端组件并加 use client |
| 数据库连接出现在前端代码里 | 在客户端组件里导入了服务端模块 | 把数据查询留在服务端组件 |

## 小结

> 先问这个组件需不需要浏览器能力，答案是否定的时候就留在服务端。
`,
  },
  {
    id: "seed-typescript-types",
    title: "TypeScript 常用类型",
    tags: "TypeScript, 基础",
    content: `# TypeScript 常用类型

类型不只是给变量加标注，更重要的是让编辑器提前发现数据流转中的不一致。

## 对象类型与类型别名

\`\`\`ts
type NoteSummary = {
  id: string;
  title: string;
  tags: string[];
  updatedAt: Date;
};
\`\`\`

## 联合类型与类型收窄

当一个值有多种可能时，用联合类型把它们都写出来，再用判断收窄到具体分支。

\`\`\`ts
type Result =
  | { ok: true; data: NoteSummary }
  | { ok: false; message: string };

function describe(result: Result): string {
  if (result.ok) return result.data.title;
  return \`失败：\${result.message}\`;
}
\`\`\`

## 泛型

泛型用来表达输入和输出之间的关系，函数既能处理笔记也能处理标签，不需要写两份实现。

\`\`\`ts
function first<T>(items: T[]): T | undefined {
  return items[0];
}
\`\`\`

## 速查

| 语法 | 作用 |
| --- | --- |
| \`type\` | 定义对象或联合结构 |
| \`keyof\` | 取出对象的键 |
| \`extends\` | 给泛型增加约束 |
`,
  },
  {
    id: "seed-sqlite-queries",
    title: "SQLite 查询速查",
    tags: "SQLite, SQL, Prisma",
    content: `# SQLite 查询速查

即使平时用 ORM 写查询，理解对应的 SQL 也有助于判断查询的成本和结果。

## 读取数据

\`\`\`sql
SELECT id, title, updatedAt
FROM Note
WHERE title LIKE '%Next%'
ORDER BY updatedAt DESC
LIMIT 20;
\`\`\`

LIMIT 限制返回数量。数据量继续增长时，偏移分页的成本会变高，可以考虑游标分页。

## 写入与更新

\`\`\`sql
UPDATE Note
SET title = '新的标题',
    updatedAt = CURRENT_TIMESTAMP
WHERE id = 'note_demo';
\`\`\`

更新和删除最需要检查的是 WHERE 条件，正式执行前先把同样的条件改成 SELECT 验证影响范围。

## 聚合

\`\`\`sql
SELECT tags, COUNT(*) AS total
FROM Note
GROUP BY tags
ORDER BY total DESC;
\`\`\`

## 与 Prisma 的对应关系

| Prisma 写法 | 对应的 SQL |
| --- | --- |
| findMany | SELECT 多行 |
| findUnique | 按唯一键查一行 |
| create | INSERT |
| update | UPDATE ... WHERE |
| delete | DELETE ... WHERE |
`,
  },
  {
    id: "seed-react-hooks",
    title: "React Hooks 使用心得",
    tags: "React, Hooks",
    content: `# React Hooks 使用心得

写组件时最常踩的坑不是语法，而是搞不清楚状态更新的时机和依赖的关系。

## useState 的更新是异步的

同一轮事件里连续调用两次 setCount，拿到的还是旧值。

\`\`\`tsx
setCount(count + 1);
setCount(count + 1); // 两次都基于旧的 count
\`\`\`

想基于上一次的值计算，就传函数：

\`\`\`tsx
setCount((value) => value + 1);
setCount((value) => value + 1);
\`\`\`

## useEffect 的三件事

- 依赖数组决定什么时候重新执行
- 返回的函数是清理逻辑，在组件卸载或依赖变化前执行
- 空依赖数组只跑一次，但不要用它来"初始化数据"

## useMemo 和 useCallback

只在确实有性能问题或需要稳定引用时才用。过早优化会让代码更难读，而 React 本身的重渲染通常没有想象中昂贵。

## 自定义 Hook

把重复的状态逻辑抽出来，命名以 use 开头，内部可以调用其他 Hook。

\`\`\`tsx
function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  const toggle = useCallback(() => setOn((value) => !value), []);
  return [on, toggle] as const;
}
\`\`\`
`,
  },
  {
    id: "seed-tailwind-css",
    title: "Tailwind CSS 4 使用笔记",
    tags: "Tailwind, CSS, 前端",
    content: `# Tailwind CSS 4 使用笔记

原子类的好处是把样式写在结构旁边，改动时不用在两个文件之间来回跳。

## 组合与可读性

一长串类名确实不好读，可以按位置分组：布局、间距、颜色、状态。顺序固定下来之后，扫一眼就能找到想改的部分。

## 用 CSS 变量接主题

主题色不用写死在类名里，把它定义成变量，再在样式中引用：

\`\`\`css
:root {
  --accent: #5279c7;
  --surface: #ffffff;
}
\`\`\`

切换主题时只改这几个变量，页面颜色整体跟着变。

## 响应式断点

从移动端往大屏写，默认样式给小屏，再用 sm、lg 这类前缀逐步增强。

## 常见坑

- 动态拼接类名会导致打包器扫描不到，类名要写完整
- 需要覆盖第三方组件样式时，用 \`@layer\` 控制优先级
- 深色模式用变量切换，比写两套类名更容易维护
`,
  },
  {
    id: "seed-prisma-modeling",
    title: "Prisma 数据建模笔记",
    tags: "Prisma, 数据库, TypeScript",
    content: `# Prisma 数据建模笔记

Prisma 把数据库结构写进 schema 文件，再用生成出来的类型约束查询，改字段时编译器会提醒所有需要调整的地方。

## schema 与迁移

\`\`\`prisma
model Note {
  id        String   @id @default(cuid())
  title     String
  content   String
  tags      String   @default("")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
\`\`\`

改完 schema 执行迁移，Prisma 会生成对应的 SQL 并记录在 migrations 目录里，团队里其他人拉下来执行同样的迁移就能得到一致的库结构。

## 查询写法

\`\`\`ts
const notes = await prisma.note.findMany({
  where: { title: { contains: query } },
  orderBy: { updatedAt: "desc" },
  skip: (page - 1) * PAGE_SIZE,
  take: PAGE_SIZE,
});
\`\`\`

只取需要的字段可以用 select，列表页不需要正文时就不要把它查出来。

## 开发环境的单例

热更新会反复执行模块代码，不加处理容易创建出很多客户端实例，把实例挂到 globalThis 上可以避免这个问题。
`,
  },
  {
    id: "seed-git-workflow",
    title: "Git 常用操作与协作流程",
    tags: "Git, 协作",
    content: `# Git 常用操作与协作流程

## 日常工作流

\`\`\`bash
git status
git add <file>
git commit -m "说明这次改了什么"
git push
\`\`\`

提交前先用 git diff 看一眼改动，能避免把调试代码和无关文件带进去。

## 分支

\`\`\`bash
git switch -c feature/outline
git switch main
git merge feature/outline
\`\`\`

一个分支只做一件事，合并时冲突会少很多。

## 提交信息

标题写清楚"做了什么"，正文补充"为什么"和影响范围。半年后回来看，能靠提交信息还原当时的判断。

## 回退

| 场景 | 命令 |
| --- | --- |
| 撤销工作区改动 | git restore <file> |
| 撤销暂存 | git restore --staged <file> |
| 修改最近一次提交 | git commit --amend |
| 找回误删的提交 | git reflog |

> 改动已经推送过再用 amend，需要 force-with-lease，并且提前确认没有别人基于这个分支工作。
`,
  },
  {
    id: "seed-http-cache",
    title: "缓存与 revalidate 机制",
    tags: "Next.js, 缓存, 性能",
    content: `# 缓存与 revalidate 机制

数据写入之后页面还显示旧内容，通常是缓存没刷新，而不是数据库没写进去。

## 缓存的几个层次

- 浏览器缓存：静态资源带 hash，可以长期缓存
- 路由缓存：客户端导航时复用已加载的页面
- 数据缓存：服务端保存查询结果，减少重复请求

## 写入后让页面失效

Server Action 里写完数据库，调用 revalidatePath 通知相关路由重新生成：

\`\`\`ts
await prisma.note.create({ data: { title, content, tags } });
revalidatePath("/notes");
redirect(\`/notes/\${note.id}\`);
\`\`\`

## 需要实时数据时

用 connection() 明确告诉框架这个页面依赖请求时刻的状态，不要再走静态优化。

## 调试方法

先在数据库里直接查一次确认数据写成功，再看页面是否命中缓存。区分清楚这两步，排查会快很多。
`,
  },
  {
    id: "seed-data-structure",
    title: "数据结构练习记录",
    tags: "算法, 数据结构, 基础",
    content: `# 数据结构练习记录

数据结构不是背下来的，而是动手实现一遍之后才能体会每种结构的取舍。

## 链表

链表擅长中间插入和删除，代价是失去随机访问能力。练习重点是处理头节点和断链时的顺序。

\`\`\`ts
function reverse(head: Node | null): Node | null {
  let prev = null;
  let current = head;
  while (current) {
    const next = current.next;
    current.next = prev;
    prev = current;
    current = next;
  }
  return prev;
}
\`\`\`

## 栈与队列

栈是后进先出，适合括号匹配、表达式求值；队列是先进先出，适合广度优先搜索和任务调度。

## 复杂度速查

| 操作 | 数组 | 链表 | 哈希表 |
| --- | --- | --- | --- |
| 随机访问 | O(1) | O(n) | O(1) |
| 头部插入 | O(n) | O(1) | O(1) |
| 查找元素 | O(n) | O(n) | O(1) |

## 练习清单

- 反转链表、判断环形链表
- 用两个栈实现队列
- 括号匹配与逆波兰表达式
- 二分查找的边界处理
`,
  },
  {
    id: "seed-long-outline",
    title: "长文：Next.js 全栈开发笔记",
    tags: "Next.js, 全栈, 长文, 大纲",
    content: `# 长文：Next.js 全栈开发笔记

这篇笔记记录我用 Next.js 做一个完整项目的全过程，从建项目到部署准备。内容按阶段组织，每个小节只写关键结论，方便以后当速查表用。因为标题层级多、篇幅长，它同时也用来验证阅读大纲和滚动同步。

## 一、项目初始化

开始之前先想清楚这个项目要解决什么问题，再决定技术选型，否则很容易在工具链上花掉大量时间。

### 1.1 创建项目

用官方的脚手架创建，选项里把 TypeScript、ESLint 和 Tailwind 都打开，后面就不用再补配置。

### 1.2 目录约定

页面放在 app 目录下，可复用的组件单独建 \`_components\` 目录，数据访问逻辑抽到 lib 里。下划线开头的目录不会被当成路由。

### 1.3 环境变量

敏感配置写进 \`.env\`，同时提供一份 \`.env.example\` 说明需要哪些变量，并把 \`.env\` 加进 gitignore。

## 二、路由系统

App Router 用文件夹表达 URL，用文件名表达用途，约定比配置更重要。

### 2.1 静态路由

一个文件夹加一个 \`page.tsx\` 就得到一个页面，地址就是文件夹路径。

### 2.2 动态路由

方括号包起来的文件夹接收动态参数，例如 \`notes/[id]\`。参数在服务端读取，必须校验，因为地址是用户可改的。

### 2.3 布局与嵌套

布局包裹同级的页面，切换页面时布局不会重新挂载，所以导航、主题这类跨页面共享的东西适合放在布局里。

### 2.4 路由组

用小括号包起来的文件夹只用于组织代码，不会出现在 URL 里，适合把不同区域的页面分开管理。

## 三、服务端组件与客户端组件

这是 App Router 最需要想清楚的一件事：哪些代码在服务器跑，哪些代码发到浏览器。

### 3.1 默认在服务端

组件默认在服务器执行，可以直接查数据库，不会把连接信息和依赖发送到浏览器。

### 3.2 use client 的边界

只有需要状态、事件或浏览器 API 的组件才加 use client，而且要把客户端组件放在叶子位置，避免整棵树都被拖进浏览器。

### 3.3 组合模式

客户端组件可以通过 children 接收服务端组件渲染好的内容，这样既有交互能力，又不用把数据逻辑搬到前端。

## 四、数据获取

数据在哪里查、什么时候查、查完缓存多久，这三个问题决定了页面的行为。

### 4.1 在服务端直接查询

\`\`\`ts
const notes = await prisma.note.findMany({
  orderBy: { updatedAt: "desc" },
  take: 20,
});
\`\`\`

### 4.2 并行请求

多个互不依赖的查询用 Promise.all 一起发，避免串行等待。

### 4.3 缓存与失效

写入之后调用 revalidatePath 让相关页面重新生成，需要实时数据时用 connection() 声明页面对请求的依赖。

## 五、表单与 Server Actions

表单提交不再需要自己写接口，Server Action 直接把表单和服务器函数连起来。

### 5.1 基本用法

action 接收 FormData，取出字段，校验，写库，然后决定跳转还是返回错误。

### 5.2 服务端校验

浏览器上的 required 只是体验层的提示，请求可以被绕过，服务端必须重新校验一次。

### 5.3 用 useActionState 处理错误

\`\`\`tsx
const [state, formAction, pending] = useActionState(createNote, {});
\`\`\`

返回的错误按字段组织，界面就能把提示挂在对应输入框下面。

### 5.4 提交状态

pending 为真时禁用按钮并改文案，用户就知道系统正在处理。

## 六、加载、错误与空状态

页面不只有成功一种结果，把这几种状态都设计出来，产品才算完整。

### 6.1 loading

在路由目录放 \`loading.tsx\`，数据还没准备好时先显示骨架。

### 6.2 error

\`error.tsx\` 捕获渲染过程中的异常，给出重试入口，而不是白屏。

### 6.3 not-found

查不到数据时调用 notFound()，让页面走 404 分支，语义比展示一个空列表清楚。

### 6.4 空列表

数据库里没有内容时给一句引导文案，比一片空白友好。

## 七、样式与主题

样式方案要能支撑以后换主题，所以颜色不能散落在各个组件里。

### 7.1 Tailwind 的定位

原子类适合快速搭结构，重复出现的组合再考虑抽成组件。

### 7.2 CSS 变量

把背景、文字、边框、强调色定义成语义变量，组件只引用变量名。

### 7.3 夜间模式

在根元素上切一个属性，再用选择器覆盖变量，不需要给每个元素写两套类名。

### 7.4 多套配色

再加一层属性表示当前配色，每个配色只覆盖几个变量，页面所有颜色自动联动。

## 八、Markdown 渲染

知识库类应用离不开 Markdown，渲染管线要考虑扩展性和安全性。

### 8.1 解析管线

react-markdown 负责解析，remark 插件扩展语法，rehype 插件处理生成的 HTML 树。

### 8.2 安全过滤

\`\`\`tsx
<ReactMarkdown rehypePlugins={[rehypeSanitize]}>{content}</ReactMarkdown>
\`\`\`

用户输入不能直接当 HTML 插入，过滤之后再渲染。

### 8.3 代码块

从类名里读语言标记显示在左上角，浅色模式用浅灰底，夜间模式换成深色底。

### 8.4 列表页的摘要

列表不需要完整渲染 Markdown，先把标记去掉再截断，界面更整齐也更省性能。

## 九、性能优化

优化之前先测量，不然很容易花时间在没有收益的地方。

### 9.1 懒加载

只在特定交互后才用到的组件改成动态导入，首屏就不会下载它们。

### 9.2 首屏体积

解析构建产物里的脚本清单，把所有 chunk 大小加起来，改动前后对比才有说服力。

### 9.3 高频事件

滚动这类高频事件用 requestAnimationFrame 合并成每帧一次，避免主线程被拖慢。

### 9.4 图片

用框架提供的图片组件，按需生成不同尺寸，避免把原图直接发给手机。

## 十、数据库与 Prisma

数据模型是项目的骨架，改动成本比其他部分都高。

### 10.1 建模

先写清楚实体和字段，再考虑查询方便不方便。

### 10.2 迁移

每次 schema 改动都生成一个迁移文件并提交，团队协作时才能得到一致的库结构。

### 10.3 查询

列表页只取需要的字段，详情页才读完整内容。

### 10.4 种子数据

准备一份示例数据脚本，让别人克隆下来就能看到有内容的界面。

## 十一、调试技巧

问题出现时，先定位在服务端还是客户端，再决定看哪一层的日志。

### 11.1 服务端日志

在服务端组件或 action 里打印，输出会出现在运行开发服务器的终端里。

### 11.2 浏览器控制台

客户端组件的问题看浏览器控制台，注意区分报错和警告。

### 11.3 网络面板

请求发了几次、返回多大、有没有命中缓存，网络面板都能直接看到。

### 11.4 数据库直查

怀疑数据没写进去时，先用命令行查一次数据库，能快速排除一半可能。

## 十二、部署准备

本地跑通不等于能上线，环境差异是主要风险。

### 12.1 环境变量

数据库地址、密钥这类配置从环境变量读，代码里不要出现真实值。

### 12.2 构建

上线前跑一次生产构建，很多类型和依赖问题只有构建时才会暴露。

### 12.3 数据文件

SQLite 适合本地和小规模使用，部署到无状态环境时要考虑数据持久化。

### 12.4 权限

单用户版本不需要登录，一旦公开访问就必须先加鉴权，否则任何人都能改数据。

## 十三、复盘

这一节记录做完项目之后回头看，哪些决定是对的，哪些地方可以改进。

### 13.1 做对的地方

先搭骨架再补细节，每个功能做完就跑一次构建，问题不会被积压到最后。

### 13.2 可以改进的地方

早期没有写测试，改动全靠手动验证；标签用逗号分隔文本保存，做统计和去重时会很别扭。

### 13.3 下一步计划

把标签拆成独立模型，加上术语表和导入导出，再考虑部署和鉴权。

## 十四、常用代码片段

这一节把项目里反复出现的写法整理成可以直接抄的片段。

### 14.1 分页查询

\`\`\`ts
const PAGE_SIZE = 6;

const [notes, total] = await Promise.all([
  prisma.note.findMany({
    orderBy: { updatedAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  }),
  prisma.note.count(),
]);

const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
\`\`\`

### 14.2 服务端字段校验

\`\`\`ts
function getFieldValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

const title = getFieldValue(formData, "title");

if (!title) {
  errors.title = "请输入笔记标题。";
} else if (title.length > 100) {
  errors.title = "标题不能超过 100 个字符。";
}
\`\`\`

### 14.3 Server Action 骨架

\`\`\`ts
"use server";

export async function createNote(
  previousState: CreateNoteState,
  formData: FormData,
): Promise<CreateNoteState> {
  const title = getFieldValue(formData, "title");
  if (!title) return { errors: { title: "请输入标题。" } };

  const note = await prisma.note.create({ data: { title } });
  revalidatePath("/notes");
  redirect(\`/notes/\${note.id}\`);
}
\`\`\`

### 14.4 合并高频滚动事件

\`\`\`ts
function onScroll() {
  if (frame !== null) cancelAnimationFrame(frame);

  frame = requestAnimationFrame(() => {
    frame = null;
    updateActiveHeading();
    syncOutline();
  });
}
\`\`\`

### 14.5 主题切换

\`\`\`tsx
function toggleTheme() {
  const next = theme === "light" ? "dark" : "light";
  setTheme(next);
  document.documentElement.dataset.theme = next;
  window.localStorage.setItem("takenotes-theme", next);
}
\`\`\`

### 14.6 按需加载组件

\`\`\`tsx
const MarkdownRenderer = dynamic(
  () => import("./markdown-renderer").then((mod) => mod.MarkdownRenderer),
  {
    ssr: false,
    loading: () => <p className="text-sm text-gray-400">正在加载预览…</p>,
  },
);
\`\`\`

### 14.7 Prisma 客户端单例

\`\`\`ts
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
\`\`\`

### 14.8 用变量组织主题

\`\`\`css
:root {
  --background: #f7f6f3;
  --foreground: #37352f;
  --surface: #ffffff;
  --accent: #5279c7;
}

[data-theme="dark"] {
  --background: #191918;
  --foreground: #e9e9e7;
  --surface: #252523;
}
\`\`\`

## 十五、常见报错与排查

把踩过的坑记下来，下次遇到同样的报错能省下不少时间。

### 15.1 Hydration failed

服务端渲染的 HTML 和客户端第一次渲染的结果不一致。常见来源是直接在渲染过程中读 localStorage、用 Date.now()、或者依赖随机数。这类值应该放到 useEffect 里读取。

### 15.2 Cannot find module

在 Node 里直接运行 TypeScript 文件时，无扩展名的相对导入会解析失败。用支持打包器解析规则的运行器，或者在导入时写全扩展名。

### 15.3 Prisma 唯一约束冲突

重复插入同一个主键会报错。写种子脚本时用 upsert 代替 create，让它变成幂等操作。

### 15.4 端口被占用

开发服务器起不来时先确认端口上是不是还有别的进程：

\`\`\`bash
lsof -i :3000
kill <pid>
\`\`\`

### 15.5 本地正常但构建失败

多半是类型不完整、大小写不一致，或者用到了只有开发环境才存在的变量。构建会做完整检查，本地开发服务器则是按需编译，所以有些问题只有构建时才暴露。

### 15.6 页面改完没变化

先确认浏览器加载的是不是最新代码，很多时候缓存和热更新会让人误以为改动没生效。强刷一次再判断。

## 十六、命令速查

| 目的 | 命令 |
| --- | --- |
| 启动开发服务器 | pnpm dev |
| 生产构建 | pnpm build |
| 代码检查 | pnpm lint |
| 类型检查 | pnpm exec tsc --noEmit |
| 执行迁移 | pnpm db:migrate |
| 写入示例数据 | pnpm db:seed |
| 打开数据库面板 | pnpm db:studio |

## 十七、上线前清单

### 17.1 功能

- 增删改查都验证过，包括错误输入
- 分页、搜索、筛选的结果符合预期
- 空列表和 404 都有对应页面
- 移动端宽度下没有横向滚动条

### 17.2 工程

- 生产构建通过
- 环境变量没有硬编码在代码里
- 敏感文件都在 gitignore 里
- 仓库里有一份示例数据

### 17.3 体验

- 提交表单时有 loading 反馈
- 错误提示指明是哪个字段的问题
- 主题和夜间模式能记住选择
- 长文页面滚动流畅

> 一个项目的价值不只在功能多少，更在于每个决定背后能不能说清楚理由。
`,
  },
];
