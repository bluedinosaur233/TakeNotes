function NoteCardSkeleton() {
  return (
    <div className="h-48 animate-pulse rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="h-6 w-2/3 rounded-md bg-gray-200" />
      <div className="mt-4 h-4 w-full rounded-md bg-gray-100" />
      <div className="mt-2 h-4 w-5/6 rounded-md bg-gray-100" />
      <div className="mt-8 h-4 w-1/3 rounded-md bg-gray-100" />
    </div>
  );
}

export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-12 lg:px-8">
      <div className="h-4 w-20 animate-pulse rounded-md bg-gray-200" />
      <div className="mt-3 h-10 w-48 animate-pulse rounded-md bg-gray-200" />
      <div className="mt-3 h-5 w-80 max-w-full animate-pulse rounded-md bg-gray-100" />
      <div className="mt-8 h-24 animate-pulse rounded-lg border border-gray-200 bg-white" />
      <section className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <NoteCardSkeleton key={item} />
        ))}
      </section>
    </main>
  );
}
