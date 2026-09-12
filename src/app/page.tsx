import Link from "next/link";

const features = [
  {
    title: "快速记录",
    description: "记录标题、正文和标签。",
  },
  {
    title: "方便查找",
    description: "按关键词和标签快速查找。",
  },
  {
    title: "编辑复盘",
    description: "随时修改，持续完善理解。",
  },
];

export default function HomePage() {
  return (
    <main className="flex-1">
      <section className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-24 lg:px-8 lg:py-32">
        <div>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-[#37352f] sm:text-6xl sm:leading-[1.1]">
            Take<span className="accent-text">Notes</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-gray-500">
            记录知识，持续成长。
          </p>
          <p className="mt-2 max-w-2xl text-lg leading-8 text-gray-600">
            个人学习知识库，记录、整理和回顾。
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/notes"
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#37352f] px-5 py-3 font-semibold text-white transition-colors duration-150 hover:bg-[#2f2f2f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#37352f]"
            >
              查看学习笔记
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-gray-200 bg-white">
        <div className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-14 sm:grid-cols-3 lg:px-8">
          {features.map((feature, index) => (
            <article key={feature.title} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <span className="accent-text text-sm font-bold">
                0{index + 1}
              </span>
              <h2 className="mt-3 text-xl font-semibold text-[#37352f]">
                {feature.title}
              </h2>
              <p className="mt-2 leading-7 text-gray-600">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>

    </main>
  );
}
