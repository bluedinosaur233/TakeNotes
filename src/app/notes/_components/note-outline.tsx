"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { CSSProperties } from "react";

type OutlineItem = { id: string; text: string; level: number };
type SyncSource = "body" | "outline";
const MAX_MARKERS = 9;

function clampProgress(value: number) {
  return Math.min(1, Math.max(0, value));
}

function getDocumentScrollProgress() {
  const maxScroll = Math.max(
    0,
    document.documentElement.scrollHeight - window.innerHeight,
  );
  if (maxScroll === 0) return 0;

  return clampProgress(window.scrollY / maxScroll);
}

function scrollDocumentToProgress(progress: number) {
  const maxDocumentScroll = Math.max(
    0,
    document.documentElement.scrollHeight - window.innerHeight,
  );
  window.scrollTo({
    top: maxDocumentScroll * clampProgress(progress),
    behavior: "auto",
  });
}

function getMarkerItems(items: OutlineItem[]) {
  if (items.length <= MAX_MARKERS) return items;

  // 长笔记只展示固定数量的索引线，但从全文均匀取样，避免只代表开头几节。
  return Array.from({ length: MAX_MARKERS }, (_, index) => {
    const sourceIndex = Math.round(
      (index * (items.length - 1)) / (MAX_MARKERS - 1),
    );
    return items[sourceIndex];
  });
}

export function NoteOutline({ bodyId }: { bodyId: string }) {
  const [items, setItems] = useState<OutlineItem[]>([]);
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState("");
  const containerRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const openRef = useRef(open);
  const syncLockRef = useRef<SyncSource | null>(null);
  const unlockFrameRef = useRef<number | null>(null);
  const panelId = useId();

  useEffect(() => {
    containerRef.current?.parentElement?.classList.toggle(
      "is-outline-open",
      open,
    );
  }, [open]);

  function setSyncLock(source: SyncSource) {
    syncLockRef.current = source;
    if (unlockFrameRef.current !== null) {
      cancelAnimationFrame(unlockFrameRef.current);
    }
    unlockFrameRef.current = requestAnimationFrame(() => {
      syncLockRef.current = null;
      unlockFrameRef.current = null;
    });
  }

  useEffect(() => {
    openRef.current = open;
    if (!open) return;

    const frame = requestAnimationFrame(() => {
      const list = listRef.current;
      if (!list) return;

      const maxListScroll = list.scrollHeight - list.clientHeight;
      if (maxListScroll <= 0) return;

      setSyncLock("body");
      list.scrollTop = getDocumentScrollProgress() * maxListScroll;
    });

    return () => cancelAnimationFrame(frame);
  }, [bodyId, open]);

  useEffect(() => {
    const selector = "h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]";
    let headings: HTMLElement[] = [];
    let frame: number | null = null;
    let observer: MutationObserver | null = null;
    let giveUpTimer: number | null = null;

    function updateActive() {
      let current = headings[0];
      for (const element of headings) {
        if (element.getBoundingClientRect().top > 140) break;
        current = element;
      }
      setActiveId(current?.id ?? "");
    }

    function syncOutlineToBody() {
      const list = listRef.current;
      if (!list || !openRef.current || syncLockRef.current === "outline") {
        return;
      }

      const maxListScroll = list.scrollHeight - list.clientHeight;
      if (maxListScroll <= 0) return;

      setSyncLock("body");
      list.scrollTop = getDocumentScrollProgress() * maxListScroll;
    }

    function stopWatching() {
      observer?.disconnect();
      observer = null;
      if (giveUpTimer !== null) {
        window.clearTimeout(giveUpTimer);
        giveUpTimer = null;
      }
    }

    function publish() {
      setItems(
        headings.map((element) => ({
          id: element.id,
          text: element.textContent?.trim() || "未命名标题",
          level: Number(element.tagName.slice(1)),
        })),
      );
      updateActive();
      syncOutlineToBody();
    }

    function scan() {
      const body = document.getElementById(bodyId);
      const found = Array.from(
        body?.querySelectorAll<HTMLElement>(selector) ?? [],
      );
      if (found.length === 0) return false;

      headings = found;
      stopWatching();
      publish();
      return true;
    }

    function scheduleScan() {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        scan();
      });
    }

    // 详情页正文可能是流式渲染后才进入文档的，此时首帧查不到标题。
    // 因此标题出现之前持续观察 DOM，而不是只查一次就放弃。
    if (!scan()) {
      observer = new MutationObserver(scheduleScan);
      observer.observe(document.body, { childList: true, subtree: true });
      giveUpTimer = window.setTimeout(stopWatching, 15000);
    }

    function onScroll() {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = null;
        updateActive();
        syncOutlineToBody();
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      stopWatching();
      if (frame !== null) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [bodyId]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function handleOutlineScroll() {
    const list = listRef.current;
    if (!openRef.current || !list || syncLockRef.current === "body") {
      return;
    }

    const maxListScroll = list.scrollHeight - list.clientHeight;
    if (maxListScroll <= 0) return;

    setSyncLock("outline");
    scrollDocumentToProgress(list.scrollTop / maxListScroll);
  }

  if (!items.length) return null;
  const minimumLevel = Math.min(...items.map((item) => item.level));
  const markerItems = getMarkerItems(items);
  const activeIndex = items.findIndex((item) => item.id === activeId);
  const activeMarkerIndex = activeIndex < 0
    ? -1
    : Math.min(
        markerItems.length - 1,
        Math.floor((activeIndex * markerItems.length) / items.length),
      );
  return (
    <aside
      ref={containerRef}
      className="note-outline"
      data-open={open}
      style={{ "--outline-marker-count": markerItems.length } as CSSProperties}
      aria-label="阅读导航"
    >
      <button
        ref={triggerRef}
        type="button"
        className="outline-trigger"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "收起本页目录" : `展开本页目录（${items.length} 个标题）`}
        title={`本页目录（${items.length} 个标题）`}
      >
        <span aria-hidden="true" className="outline-lines">
          {markerItems.map((item, markerIndex) => (
            <span
              key={`${item.id}-${markerIndex}`}
              className={markerIndex === activeMarkerIndex ? "is-active" : ""}
              style={{ width: item.level === minimumLevel ? 22 : 14 }}
            />
          ))}
        </span>
      </button>
      <nav
        id={panelId}
        aria-label="本页目录"
        aria-hidden={!open}
        className="outline-panel"
      >
        <div className="outline-panel-header">
          <span>本页目录 · {items.length}</span>
          <button
            type="button"
            tabIndex={open ? 0 : -1}
            aria-label="收起本页目录"
            onClick={() => {
              setOpen(false);
              triggerRef.current?.focus();
            }}
          >
            ×
          </button>
        </div>
        <ol ref={listRef} onScroll={handleOutlineScroll}>
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                tabIndex={open ? 0 : -1}
                aria-current={activeId === item.id ? "location" : undefined}
                style={{ paddingLeft: `${12 + (item.level - minimumLevel) * 12}px` }}
                onClick={() => {
                  document.getElementById(item.id)?.focus({ preventScroll: true });
                  setActiveId(item.id);
                  // 移动端跳转后关闭面板，桌面端保留面板便于继续浏览目录。
                  if (window.matchMedia("(max-width: 767px)").matches) {
                    setOpen(false);
                  }
                }}
              >
                {item.text}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </aside>
  );
}
