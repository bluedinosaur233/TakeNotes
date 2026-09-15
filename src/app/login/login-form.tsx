"use client";

import { useState, type FormEvent } from "react";

export function LoginForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    setPending(true); setError("");
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: data.get("username"), password: data.get("password") }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "登录失败。");
      // 新登录不沿用旧页面的客户端缓存或私人问答草稿。
      try { for (const key of Object.keys(sessionStorage)) if (key.startsWith("takenotes-answer")) sessionStorage.removeItem(key); } catch {}
      // 登录使用整页导航丢弃旧的路由缓存与私有状态。
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/notes");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "登录失败，请重试。"); setPending(false); }
  }
  return <form onSubmit={login} className="auth-form">
    <label htmlFor="username">用户名</label>
    <input id="username" name="username" autoComplete="username" required maxLength={64} disabled={pending} />
    <label htmlFor="password">密码</label>
    <input id="password" name="password" type="password" autoComplete="current-password" required maxLength={128} disabled={pending} aria-describedby="login-error" />
    <p id="login-error" role="alert">{error}</p>
    <button type="submit" className="ask-primary" disabled={pending}>{pending ? "正在登录…" : "登录"}</button>
  </form>;
}
