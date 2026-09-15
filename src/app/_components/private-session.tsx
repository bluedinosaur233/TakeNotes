"use client";
import { useEffect } from "react";

// 其他标签页退出时清除当前标签页的可见私人内容与暂存。
export function PrivateSession() {
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== "takenotes-logout") return;
      try { for (const key of Object.keys(sessionStorage)) if (key.startsWith("takenotes-answer")) sessionStorage.removeItem(key); } catch {}
      window.location.replace("/login");
    }
    function onPageShow(event: PageTransitionEvent) {
      // 浏览器前进/后退缓存可能复活退出前的整页，重新向服务端确认权限。
      if (event.persisted) window.location.reload();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);
  return null;
}
