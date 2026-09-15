"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "takenotes-theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(STORAGE_KEY);
    const preferredTheme: Theme =
      savedTheme === "dark" ||
      (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)
        ? "dark"
        : "light";

    const frame = window.requestAnimationFrame(() => {
      setTheme(preferredTheme);
      document.documentElement.dataset.theme = preferredTheme;
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  function toggleTheme() {
    const nextTheme: Theme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);//更新状态
    document.documentElement.dataset.theme = nextTheme;//修改页面根元素
    window.localStorage.setItem(STORAGE_KEY, nextTheme);//把选择保存在localStorage
  }

  return (
    <span className="ml-2 border-l border-gray-200 pl-2">
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={theme === "light" ? "切换到夜间模式" : "切换到浅色模式"}
        aria-pressed={theme === "dark"}
        title={theme === "light" ? "夜间模式" : "浅色模式"}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-500 transition-colors duration-150 hover:bg-[#efedea] hover:text-[#37352f] active:bg-[#e3e1db]"
      >
        {theme === "light" ? (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-1.5">
            <path d="M12 3v2m0 14v2M3 12h2m14 0h2m-4.36-6.64-1.42 1.42M6.78 17.22l-1.42 1.42m0-13.28 1.42 1.42m10.44 10.44 1.42 1.42" />
            <circle cx="12" cy="12" r="3.5" />
          </svg>
        ) : (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-1.5">
            <path d="M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5 8.5 8.5 0 1 0 20.5 15.2Z" />
          </svg>
        )}
      </button>
    </span>
  );
}
