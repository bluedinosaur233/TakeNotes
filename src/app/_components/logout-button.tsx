"use client";
import { useState } from "react";

export function LogoutButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    setPending(true); setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error();
      try { for (const key of Object.keys(sessionStorage)) if (key.startsWith("takenotes-answer")) sessionStorage.removeItem(key); } catch {}
      try { localStorage.setItem("takenotes-logout", String(Date.now())); } catch {}
      window.location.replace("/login");
    } catch { setError("退出失败，请重试。"); setPending(false); }
  }
  return <span><button type="button" onClick={logout} disabled={pending} className="auth-nav-button">{pending ? "退出中…" : "退出"}</button><span role="alert" className="ask-muted">{error}</span></span>;
}
