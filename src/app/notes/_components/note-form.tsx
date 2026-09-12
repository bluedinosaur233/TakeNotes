"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  createNote,
  type CreateNoteState,
  type NoteFormValues,
} from "../actions";
import { MarkdownEditor } from "./markdown-editor";

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
        <label htmlFor="title" className="block text-sm font-semibold text-[#37352f]">
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
          className="mt-2 block w-full rounded-md border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-blue-500/30"
        />
        {state.errors?.title ? (
          <p id="title-error" className="mt-2 text-sm text-red-600">
            {state.errors.title}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="content" className="block text-sm font-semibold text-[#37352f]">
          正文
        </label>
        <MarkdownEditor
          defaultValue={initialValues?.content}
          error={state.errors?.content}
        />
      </div>

      <div>
        <label htmlFor="tags" className="block text-sm font-semibold text-[#37352f]">
          标签 <span className="font-normal text-gray-500">（用逗号分隔）</span>
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
          className="mt-2 block w-full rounded-md border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-blue-500/30"
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

      <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:justify-end">
        <Link
          href={cancelHref}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-gray-200 bg-transparent px-5 py-3 text-sm font-medium text-gray-700 transition-colors duration-150 hover:bg-[#efedea] active:bg-[#e3e1db]"
        >
          取消
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#37352f] px-5 py-3 text-sm font-medium text-white transition-colors duration-150 hover:bg-[#2f2f2f] active:bg-[#1f1f1f] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "保存中……" : submitLabel}
        </button>
      </div>
    </form>
  );
}
