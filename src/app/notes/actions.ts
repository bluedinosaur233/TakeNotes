"use server";
//增 删 改

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";

export type CreateNoteState = {
  errors?: {
    title?: string;
    content?: string;
    tags?: string;
  };
  message?: string;
};

export type NoteFormValues = {
  title: string;
  content: string;
  tags: string;
};

function getFieldValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function createNote(
  _previousState: CreateNoteState,
  formData: FormData,
): Promise<CreateNoteState> {
  await requireAdmin();
  const title = getFieldValue(formData, "title");
  const content = getFieldValue(formData, "content");
  const tags = getFieldValue(formData, "tags");

  const errors: CreateNoteState["errors"] = {};

  if (!title) {
    errors.title = "请输入笔记标题。";
  } else if (title.length > 100) {
    errors.title = "标题不能超过 100 个字符。";
  }

  if (!content) {
    errors.content = "请输入笔记正文。";
  } else if (content.length > 10000) {
    errors.content = "正文不能超过 10000 个字符。";
  }

  if (tags.length > 200) {
    errors.tags = "标签不能超过 200 个字符。";
  }

  if (Object.keys(errors).length > 0) {
    return { errors, message: "请修正表单中的错误。" };
  }

  const note = await prisma.note.create({
    data: { title, content, tags },
  });

  revalidatePath("/notes");
  redirect(`/notes/${note.id}`);
}

export async function updateNote(
  _previousState: CreateNoteState,
  formData: FormData,
): Promise<CreateNoteState> {
  await requireAdmin();
  const id = getFieldValue(formData, "id");
  const title = getFieldValue(formData, "title");
  const content = getFieldValue(formData, "content");
  const tags = getFieldValue(formData, "tags");
  const errors: CreateNoteState["errors"] = {};

  if (!id) return { message: "缺少笔记 ID，无法保存。" };
  if (!title) errors.title = "请输入笔记标题。";
  else if (title.length > 100) errors.title = "标题不能超过 100 个字符。";
  if (!content) errors.content = "请输入笔记正文。";
  else if (content.length > 10000) errors.content = "正文不能超过 10000 个字符。";
  if (tags.length > 200) errors.tags = "标签不能超过 200 个字符。";

  if (Object.keys(errors).length > 0) {
    return { errors, message: "请修正表单中的错误。" };
  }

  const note = await prisma.note.update({
    where: { id },
    data: { title, content, tags },
  });
  revalidatePath("/notes");
  revalidatePath(`/notes/${note.id}`);
  redirect(`/notes/${note.id}`);
}

export async function deleteNote(formData: FormData) {
  await requireAdmin();
  const id = getFieldValue(formData, "id");
  if (!id) throw new Error("缺少笔记 ID，无法删除。");
  await prisma.note.delete({ where: { id } });
  revalidatePath("/notes");
  redirect("/notes");
}
