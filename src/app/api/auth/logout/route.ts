import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sameOrigin, SESSION_COOKIE } from "@/lib/auth/config";
import { getAdmin, sessionCookieOptions } from "@/lib/auth/session";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "请求来源不匹配。" }, { status: 403 });
  const admin = await getAdmin(request);
  if (admin) await prisma.adminSession.deleteMany({ where: { id: admin.id } });
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return response;
}
