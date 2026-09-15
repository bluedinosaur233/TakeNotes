import { NextResponse } from "next/server";
import { authConfig, sameOrigin, SESSION_COOKIE } from "@/lib/auth/config";
import { createAdminSession, sessionCookieOptions } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { BudgetExceeded, consumeBudget } from "@/lib/auth/budget";
import { readJson } from "@/lib/read-json";

export async function POST(request: Request) {
  const config = authConfig();
  if (!config) return Response.json({ error: "管理员尚未配置，请先运行部署配置工具。" }, { status: 503 });
  if (!sameOrigin(request)) return Response.json({ error: "请求来源不匹配，请检查 APP_URL。" }, { status: 403 });
  if (!request.headers.get("content-type")?.includes("application/json")) return Response.json({ error: "请使用 JSON 提交。" }, { status: 415 });
  try {
    // 单管理员实例采用全局窗口，不信任客户端自行填写的 X-Forwarded-For。
    await consumeBudget("login", 10, 15 * 60_000);
    let data: unknown;
    try { data = await readJson(request, 2048); }
    catch { return Response.json({ error: "请求格式不正确或请求过长。" }, { status: 400 }); }
    if (!data || typeof data !== "object" || !("username" in data) || !("password" in data) ||
      typeof data.username !== "string" || typeof data.password !== "string" || data.password.length > 128) {
      return Response.json({ error: "请输入用户名和密码。" }, { status: 400 });
    }
    const valid = await verifyPassword(data.password, config.passwordHash);
    if (!valid || data.username !== config.username) return Response.json({ error: "用户名或密码不正确。" }, { status: 401 });
    const { token } = await createAdminSession();
    const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof BudgetExceeded) return Response.json({ error: "登录尝试过多，请在 15 分钟后重试。" }, { status: 429, headers: { "Retry-After": "900" } });
    return Response.json({ error: "登录失败，请检查配置及数据库。" }, { status: 500 });
  }
}
