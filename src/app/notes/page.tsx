import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { NoteCard } from "./_components/note-card";
import { Pagination } from "./_components/pagination";
import { SearchForm } from "./_components/search-form";

export const metadata: Metadata = {
  title: "学习笔记",
  description: "浏览和管理学习笔记。",
};

type NotesPageProps = {
  searchParams: Promise<{
    query?: string;
    tag?: string;
    page?: string;
  }>;
};

const PAGE_SIZE = 6;

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
  //防御逻辑：1、三元运算符Array.isArray(value) ? xxx : xxx
  //2、是数组：直接取数组中第一个运算符。如果是空(undefined)就返回空字符串
  //3、不是数组：如果是空(undefined)就返回空字符串
}

export default async function NotesPage({ searchParams }: NotesPageProps) {
  await requireAdmin();
  await connection();
  const params = await searchParams;
  const query = getSingleParam(params.query).trim();
  const tag = getSingleParam(params.tag).trim();

  //防御逻辑：1、取参数列表的页面数转换成十进制数
  //2、转换失败会变成NaN 第二步判断是否是NaN，是的话变1，不是的话保存为requestedPage
  //3、若小于1就保存为1(保证不为0或负数)，大于等于1就保存为page
  const parsedPage = Number.parseInt(getSingleParam(params.page), 10);
  const requestedPage = Number.isNaN(parsedPage) ? 1 : parsedPage;
  const page = Math.max(1, requestedPage);

  //拼查询条件
  //query有值就拼OR: [
  //          { title: { contains: query } },
  //          { content: { contains: query } },
  //          { tags: { contains: query } },
  //         ],
  //表示在这三个字段里任意存在query值就算
  //tag有值就拼tags: { contains: tag }
  //没值就展开空对象拼进去=没拼
  const where = {
    ...(query
      ? {
          OR: [
            { title: { contains: query } },
            { content: { contains: query } },
            { tags: { contains: query } },
          ],
        }
      : {}),
    ...(tag ? { tags: { contains: tag } } : {}),
  };

  //Promise.all并行查询所有笔记的标签和当前筛选条件下的笔记、笔记总数
  const [notes, totalCount, allTagRows] = await Promise.all([
    prisma.note.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.note.count({ where }),
    prisma.note.findMany({
      select: { tags: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  //获取标签列表
  //由内至外：
  //1、对于取出的note 把tags(现在还是字符串)里的中文逗号替换成英文逗号，根据英文逗号分隔成数组，对于数组里的每项都去除首尾，清掉空字符串
  //2、allTagRows是查找出来的字符串数组，如果用map做第一步的话会变成个二维字符串数组，这里用flatMap可以拍回成一维数组
  //3、new Set()相当于创建集合，可以去重
  //4、用Array.from再转换回数组，这样可以用数组的排序方法
  //5、用.sort((a,b)=>a.localeCompare(b,"zh-CN"))按中文拼音排序
  //ps:如果列表里的笔记数量非常多的话该方案就得换了
  const allTags = Array.from(
    new Set(
      allTagRows.flatMap((note) =>
        note.tags
          .replaceAll("，", ",")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    ),
  ).sort((a, b) => a.localeCompare(b, "zh-CN"));
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  //防止越界超过总页数
  const safePage = Math.min(page, totalPages);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-12 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="accent-text text-sm font-semibold">NOTES</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#37352f] sm:text-4xl">
            学习笔记
          </h1>
          <p className="mt-3 text-gray-600">
            共 {totalCount} 条结果，每页显示 {PAGE_SIZE} 条。
          </p>
        </div>
        <Link
          href="/notes/new"
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#37352f] px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-[#2f2f2f] active:bg-[#1f1f1f]"
        >
          新增笔记
        </Link>
      </div>

      <SearchForm query={query} tag={tag} tags={allTags} />

      {notes.length === 0 ? (
        <section className="mt-6 flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
          <h2 className="text-xl font-semibold text-[#37352f]">
            {query || tag ? "没有匹配的笔记" : "还没有笔记数据"}
          </h2>
          <p className="mt-2 text-gray-600">
            {query || tag ? "试试其他关键词或清除筛选条件。" : "下一步通过表单创建第一条学习笔记。"}
          </p>
          {query || tag ? (
            <Link href="/notes" className="mt-5 font-medium text-[#787774] hover:text-[#37352f]">
              清除筛选
            </Link>
          ) : null}
        </section>
      ) : (
        <>
          <section className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {notes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </section>
          <Pagination page={safePage} totalPages={totalPages} query={query} tag={tag} />
        </>
      )}
    </main>
  );
}
