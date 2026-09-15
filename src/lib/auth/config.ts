import "server-only";
import { credentialVersion, validPasswordHash } from "./password";

export const SESSION_COOKIE = "takenotes-session";
export const SESSION_TTL = 60 * 60 * 24 * 7;

export function authConfig() {
  const username = process.env.ADMIN_USERNAME?.trim() || "admin";
  const passwordHash = process.env.ADMIN_PASSWORD_HASH || "";
  const secret = process.env.SESSION_SECRET || "";
  let origin: string;
  try {
    const url = new URL(process.env.APP_URL || "http://localhost:3000");
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    // 非本机 HTTP 不允许承载登录密码。反向代理下 APP_URL 填公开 HTTPS 地址。
    if (url.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return null;
    origin = url.origin;
  } catch { return null; }
  if (username.length > 64 || !validPasswordHash(passwordHash) || secret.length < 32) return null;
  return { username, passwordHash, secret, origin, secure: origin.startsWith("https:"),
    version: credentialVersion(username, passwordHash) };
}

export function sameOrigin(request: Request) {
  const config = authConfig();
  return Boolean(config && request.headers.get("origin") === config.origin);
}
