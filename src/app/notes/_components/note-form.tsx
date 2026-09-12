"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  createNote,
  type CreateNoteState,
  type NoteFormValues,
} from "../actions";

const initialState: CreateNoteState = {};

type NoteFormProps = {
  action?: (
    previousState: CreateNoteState,
    formData: FormData,
  ) => Promise<CreateNoteState>;
  initialValues?: NoteFormValues;
  noteId?: string;
  cancelHref?: string;
  submitLabel?: string;
};

export function NoteForm({
  action = createNote,
  initialValues,
  noteId,
  cancelHref = "/notes",
  submitLabel = "保存笔记",
}: NoteFormProps) {
  const [state, formAction, pending] = useActionState(
    action,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-6">
      {noteId ? <input type="hidden" name="id" value={noteId} /> : null}
      <div>
        <label htmlFor="title" className="block text-sm font-semibold text-slate-900">
          标题
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={100}
          placeholder="例如：Next.js Server Actions"
          defaultValue={initialValues?.title}
          aria-invalid={Boolean(state.errors?.title)}
          aria-describedby={state.errors?.title ? "title-error" : undefined}
          className="mt-2 block w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        {state.errors?.title ? (
          <p id="title-error" className="mt-2 text-sm text-red-600">
            {state.errors.title}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="content" className="block text-sm font-semibold text-slate-900">
          正文
        </label>
        <textarea
          id="content"
          name="content"
          required
          maxLength={10000}
          rows={12}
          placeholder="记录这次学习的重点、例子和自己的理解……"
          defaultValue={initialValues?.content}
          aria-invalid={Boolean(state.errors?.content)}
          aria-describedby={state.errors?.content ? "content-error" : undefined}
          className="mt-2 block w-full resize-y rounded-lg border border-slate-300 px-4 py-3 leading-7 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        {state.errors?.content ? (
          <p id="content-error" className="mt-2 text-sm text-red-600">
            {state.errors.content}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="tags" className="block text-sm font-semibold text-slate-900">
          标签 <span className="font-normal text-slate-500">（用逗号分隔）</span>
        </label>
        <input
          id="tags"
          name="tags"
          type="text"
          maxLength={200}
          placeholder="Next.js, React, TypeScript"
          defaultValue={initialValues?.tags}
          aria-invalid={Boolean(state.errors?.tags)}
          aria-describedby={state.errors?.tags ? "tags-error" : undefined}
          className="mt-2 block w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        {state.errors?.tags ? (
          <p id="tags-error" className="mt-2 text-sm text-red-600">
            {state.errors.tags}
          </p>
        ) : null}
      </div>

      {state.message ? (
        <p role="alert" className="text-sm text-red-600">
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
        <Link
          href={cancelHref}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
        >
          取消
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "保存中……" : submitLabel}
        </button>
      </div>
    </form>
  );
}
