import Link from "next/link";

const features = [
  {
    title: "快速记录",
    description: "用标题、正文和标签保存学习过程，不让知识只停留在短期记忆里。",
  },
  {
    title: "方便查找",
    description: "通过关键词、标签和分页快速找到过去记录的内容。",
  },
  {
    title: "编辑复盘",
    description: "随时修改已有笔记，让学习内容随着理解不断完善。",
  },
];

export default function HomePage() {
  return (
    <main className="flex-1">
      <section className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-24 lg:px-8 lg:py-32">
        <div>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl sm:leading-[1.1]">
            记录学到的知识，
            <span className="text-blue-600">也记录成长过程。</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            TakeNotes 是一个个人学习知识库。你可以创建、搜索、编辑和整理学习笔记，
            让重要内容更容易沉淀、回顾和复用。
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/notes"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              查看学习笔记
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-14 sm:grid-cols-3 lg:px-8">
          {features.map((feature, index) => (
            <article key={feature.title} className="rounded-2xl bg-slate-50 p-6">
              <span className="text-sm font-bold text-blue-600">
                0{index + 1}
              </span>
              <h2 className="mt-3 text-xl font-bold text-slate-900">
                {feature.title}
              </h2>
              <p className="mt-2 leading-7 text-slate-600">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>

    </main>
  );
}
