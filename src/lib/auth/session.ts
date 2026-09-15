import "server-only";
import { cookies } from "next/headers";
import { sealData, unsealData } from "iron-session";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { authConfig, SESSION_COOKIE, SESSION_TTL } from "./config";

export async function getAdmin(request?: Request) {
  // 构建镜像时不提供秘密配置。先读取请求 Cookie，确保页面按请求动态渲染，
  // 不能在缺配置时提前返回，把“未配置/未登录”永久预生成为静态页面。
  const token = request
    ? request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1)
    : (await cookies()).get(SESSION_COOKIE)?.value;
  const config = authConfig();
  if (!config) return null;
  if (!token) return null;
  let data: { id?: string };
  try { data = await unsealData<{ id: string }>(token, { password: config.secret, ttl: SESSION_TTL }); }
  catch { return null; }
  if (typeof data.id !== "string") return null;
  const session = await prisma.adminSession.findUnique({ where: { id: data.id } });
  if (!session || session.expiresAt.getTime() <= Date.now() || session.credentialVersion !== config.version) return null;
  return { id: session.id, username: config.username,
    // 非凭证的命名空间。不同登录会话不会自动恢复之前的浏览器草稿。
    scope: createHash("sha256").update(session.id).digest("hex").slice(0, 24) };
}

export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) {
    const { redirect } = await import("next/navigation");
    return redirect("/login");
  }
  return admin;
}

export async function createAdminSession() {
  const config = authConfig();
  if (!config) throw new Error("管理员配置不完整");
  await prisma.adminSession.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  const session = await prisma.adminSession.create({ data: {
    credentialVersion: config.version, expiresAt: new Date(Date.now() + SESSION_TTL * 1000),
  } });
  const token = await sealData({ id: session.id }, { password: config.secret, ttl: SESSION_TTL });
  return { token, session };
}

export function sessionCookieOptions() {
  return { httpOnly: true, secure: authConfig()?.secure ?? true, sameSite: "lax" as const,
    path: "/", maxAge: SESSION_TTL };
}
