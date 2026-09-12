"use client";

import { deleteNote } from "../actions";
import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-10 items-center justify-center rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "删除中……" : "删除"}
    </button>
  );
}

export function DeleteButton({ id }: { id: string }) {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (!window.confirm("确定要删除这条笔记吗？删除后无法恢复。")) {
      event.preventDefault();
    }
  }

  return (
    <form action={deleteNote} onSubmit={handleSubmit}>
      <input type="hidden" name="id" value={id} />
      <SubmitButton />
    </form>
  );
}
