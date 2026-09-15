"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function deleteHistory(form: FormData) {
  await requireAdmin();
  const id = form.get("id");
  if (typeof id !== "string" || !id || id.length > 128) throw new Error("记录 ID 不正确。");
  await prisma.qaHistory.deleteMany({ where: { id } });
  revalidatePath("/ask/history");
  redirect("/ask/history");
}
