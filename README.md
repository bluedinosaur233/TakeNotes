# TakeNotes

TakeNotes 是一个使用 Next.js App Router 构建的个人学习知识库，用于记录、整理和回顾学习笔记。

## 当前功能

- 笔记列表、详情、创建、编辑和删除
- 标题、正文和标签管理
- 关键词搜索、标签筛选和分页
- Server Actions 服务端写入与表单校验
- loading、error、not-found 和提交 pending 状态
- 基础响应式页面和动态 Metadata

## 技术栈

- Next.js 16（App Router）
- React 19
- TypeScript
- Tailwind CSS 4
- Prisma 7
- SQLite
- pnpm

## 本地运行

环境要求：Node.js 20+、pnpm。

```bash
pnpm install
cp .env.example .env
pnpm prisma migrate dev
pnpm dev
```

打开 <http://localhost:3000>。

常用命令：

```bash
pnpm lint
pnpm build
pnpm db:validate
pnpm db:studio
```

## 项目结构

```text
src/app/              页面、路由和 Server Actions
src/app/notes/        笔记列表、详情及表单
src/app/_components/  全局共享组件
src/lib/              Prisma Client 等服务端工具
prisma/               数据模型和数据库迁移
```

## 数据库

开发环境使用项目根目录的 SQLite 数据库 `dev.db`。数据库文件和环境变量不会提交到 Git；仓库提供 `.env.example` 作为配置示例。
