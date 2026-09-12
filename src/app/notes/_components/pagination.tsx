import Link from "next/link";

type PaginationProps = {
  page: number;
  totalPages: number;
  query: string;
  tag: string;
};

function pageHref(page: number, query: string, tag: string) {
  const params = new URLSearchParams();
  if (query) params.set("query", query);
  if (tag) params.set("tag", tag);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `/notes?${search}` : "/notes";
}

export function Pagination({ page, totalPages, query, tag }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="笔记分页" className="mt-8 flex items-center justify-center gap-2">
      {page > 1 ? (
        <Link
          href={pageHref(page - 1, query, tag)}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
        >
          上一页
        </Link>
      ) : null}
      <span className="px-3 text-sm text-slate-500">
        第 {page} / {totalPages} 页
      </span>
      {page < totalPages ? (
        <Link
          href={pageHref(page + 1, query, tag)}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
        >
          下一页
        </Link>
      ) : null}
    </nav>
  );
}
