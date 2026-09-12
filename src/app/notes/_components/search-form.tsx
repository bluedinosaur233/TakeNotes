type SearchFormProps = {
  query: string;
  tag: string;
  tags: string[];
};

export function SearchForm({ query, tag, tags }: SearchFormProps) {
  return (
    <form
      method="get"
      action="/notes"
      className="mt-8 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end"
    >
      <div>
        <label htmlFor="query" className="block text-sm font-semibold text-slate-900">
          搜索笔记
        </label>
        <input
          id="query"
          name="query"
          type="search"
          defaultValue={query}
          placeholder="搜索标题、正文或标签"
          className="mt-2 block min-h-11 w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>
      <div>
        <label htmlFor="tag" className="block text-sm font-semibold text-slate-900">
          标签筛选
        </label>
        <select
          id="tag"
          name="tag"
          defaultValue={tag}
          className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-44"
        >
          <option value="">全部标签</option>
          {tags.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white transition hover:bg-blue-700"
      >
        筛选
      </button>
    </form>
  );
}
