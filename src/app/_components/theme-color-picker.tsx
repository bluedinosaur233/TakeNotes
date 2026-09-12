"use client";

import { useEffect, useState } from "react";

type AccentName = "stone" | "blue" | "green" | "amber" | "rose" | "purple";

const STORAGE_KEY = "takenotes-accent";

const accents: Array<{ name: AccentName; label: string; color: string }> = [
  { name: "stone", label: "石墨灰", color: "#787774" },
  { name: "blue", label: "雾蓝", color: "#5b8def" },
  { name: "green", label: "鼠尾草绿", color: "#5f9b8c" },
  { name: "amber", label: "琥珀棕", color: "#b08a3e" },
  { name: "rose", label: "灰玫瑰", color: "#b66b75" },
  { name: "purple", label: "灰紫", color: "#8066a8" },
];

export function ThemeColorPicker() {
  const [accent, setAccent] = useState<AccentName>("stone");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const savedAccent = window.localStorage.getItem(STORAGE_KEY) as AccentName | null;
    const initialAccent = accents.some((item) => item.name === savedAccent)
      ? savedAccent!
      : "stone";

    const frame = window.requestAnimationFrame(() => {
      setAccent(initialAccent);
      document.documentElement.dataset.accent = initialAccent;
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  function chooseAccent(nextAccent: AccentName) {
    setAccent(nextAccent);
    document.documentElement.setAttribute("data-accent", nextAccent);
    window.localStorage.setItem(STORAGE_KEY, nextAccent);
    setOpen(false);
  }

  const currentAccent = accents.find((item) => item.name === accent) ?? accents[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="选择主题色"
        aria-expanded={open}
        title="选择主题色"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-500 transition-colors duration-150 hover:bg-[#efedea] hover:text-[#37352f] active:bg-[#e3e1db]"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-1.5">
          <path d="M12 3a9 9 0 1 0 0 18h1.2a2 2 0 0 0 0-4H12a2 2 0 0 1 0-4h4a5 5 0 0 0 0-10h-4Z" />
          <circle cx="7.5" cy="10" r=".75" fill="currentColor" stroke="none" />
          <circle cx="9.5" cy="6.5" r=".75" fill="currentColor" stroke="none" />
          <circle cx="14" cy="6" r=".75" fill="currentColor" stroke="none" />
        </svg>
        <span
          aria-hidden="true"
          className="absolute bottom-1.5 right-1.5 h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: currentAccent.color }}
        />
      </button>

      {open ? (
        <div className="absolute right-0 top-11 z-20 w-48 rounded-lg border border-gray-200 bg-white p-2 shadow-md">
          <p className="px-2 py-1 text-xs font-medium text-gray-500">主题色</p>
          <div className="grid grid-cols-3 gap-1">
            {accents.map((item) => (
              <button
                key={item.name}
                type="button"
                onClick={() => chooseAccent(item.name)}
                aria-label={item.label}
                aria-pressed={accent === item.name}
                title={item.label}
                className="flex items-center gap-2 rounded-md px-2 py-2 text-xs text-gray-600 transition-colors duration-150 hover:bg-[#efedea] active:bg-[#e3e1db]"
              >
                <span
                  aria-hidden="true"
                  className="h-4 w-4 rounded-full border border-black/10"
                  style={{ backgroundColor: item.color }}
                />
                <span className="sr-only">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
