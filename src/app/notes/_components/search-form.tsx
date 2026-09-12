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
      className="mt-8 grid gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_auto_auto] sm:items-end"
    >
      <div>
        <label htmlFor="query" className="block text-sm font-semibold text-[#37352f]">
          搜索笔记
        </label>
        <input
          id="query"
          name="query"
          type="search"
          defaultValue={query}
          placeholder="搜索标题、正文或标签"
          className="mt-2 block min-h-11 w-full rounded-md border border-gray-200 bg-white px-4 py-2 text-gray-900 outline-none placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-blue-500/30"
        />
      </div>
      <div>
        <label htmlFor="tag" className="block text-sm font-semibold text-[#37352f]">
          标签筛选
        </label>
        <select
          id="tag"
          name="tag"
          defaultValue={tag}
          className="mt-2 min-h-11 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-gray-900 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500/30 sm:w-44"
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
        className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#37352f] px-5 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-[#2f2f2f] active:bg-[#1f1f1f]"
      >
        筛选
      </button>
    </form>
  );
}
