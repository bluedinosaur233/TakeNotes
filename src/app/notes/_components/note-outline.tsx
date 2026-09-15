"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { CSSProperties } from "react";

//大纲目录每一项的数据结构
type OutlineItem = { id: string; text: string; level: number };
//同步来源：正文/目录
type SyncSource = "body" | "outline";
//标记线最大数量：9
const MAX_MARKERS = 9;

//工具函数：限制数字在0-1之间，用于计算滚动进度
function clampProgress(value: number) {
  return Math.min(1, Math.max(0, value));
}

//计算正文当前滚动进度
function getDocumentScrollProgress() {
  const maxScroll = Math.max(
    0,
    document.documentElement.scrollHeight - window.innerHeight,
  );
  if (maxScroll === 0) return 0;

  return clampProgress(window.scrollY / maxScroll);
}

//滚动正文到指定进度
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

//标题太多时均匀取标记线
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

//大纲组件
export function NoteOutline({ bodyId }: { bodyId: string }) {
  //状态管理
  const [items, setItems] = useState<OutlineItem[]>([]);//标题列表
  const [open, setOpen] = useState(false);//面板展开状态
  const [activeId, setActiveId] = useState("");//当前滚动到的高亮标题

  //各种Ref，用于直接操作DOM 或者 保存不要触发渲染的变量
  const containerRef = useRef<HTMLElement>(null); //整个组件的容器
  const triggerRef = useRef<HTMLButtonElement>(null); //展开收起按钮
  const listRef = useRef<HTMLOListElement>(null); //目录列表
  const openRef = useRef(open); //用在从闭包获取最新值，避免重新绑定事件
  const syncLockRef = useRef<SyncSource | null>(null); //同步锁，避免双向触发滚动死循环
  const unlockFrameRef = useRef<number | null>(null); //用于取消释放锁的动画帧
  const panelId = useId(); //生成唯一Id，用于aria-controls 无障碍关联

  //每当open状态变化，给父级添加/移除class（用于CSS控制布局）
  useEffect(() => {
    containerRef.current?.parentElement?.classList.toggle(
      "is-outline-open",
      open,
    );
  }, [open]);

  //设置同步锁，防止“正文滚动->触发目录->又触发正文滚动”左脚踩右脚的死循环
  function setSyncLock(source: SyncSource) {
    syncLockRef.current = source;
    if (unlockFrameRef.current !== null) {
      cancelAnimationFrame(unlockFrameRef.current);
    }
    //在动画帧结束时释放，让下次滚动事件能正常处理
    unlockFrameRef.current = requestAnimationFrame(() => {
      syncLockRef.current = null;
      unlockFrameRef.current = null;
    });
  }

  // 当面板打开时，让目录列表的滚动位置与当前正文的滚动进度保持一致
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

  //核心逻辑：扫描DOM里的标题，监控滚动，同步高亮和滚动位置
  useEffect(() => {
    const selector = "h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]";
    let headings: HTMLElement[] = [];
    let frame: number | null = null;
    let observer: MutationObserver | null = null;
    let giveUpTimer: number | null = null;

    //更新标题高亮
    function updateActive() {
      let current = headings[0];
      for (const element of headings) {
        if (element.getBoundingClientRect().top > 140) break;
        current = element;
      }
      setActiveId(current?.id ?? "");
    }

    //同步目录的滚动给正文
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

    //停止扫描DOM，清理定时器
    function stopWatching() {
      observer?.disconnect();
      observer = null;
      if (giveUpTimer !== null) {
        window.clearTimeout(giveUpTimer);
        giveUpTimer = null;
      }
    }

    //把扫描到的标题更新到state，并调用高亮和同步
    function publish() {
      setItems(
        headings.map((element) => ({
          id: element.id,
          text: element.textContent?.trim() || "未命名标题",
          level: Number(element.tagName.slice(1)),//取标签名 如H2，切掉第一个字符，就只剩“2”，再转成数字
        })),
      );
      updateActive();
      syncOutlineToBody();
    }

    function scan() {
      //通过bodyId找到对应笔记
      const body = document.getElementById(bodyId);
      //在正文里找出h1[id],h2[id]...
      const found = Array.from(
        body?.querySelectorAll<HTMLElement>(selector) ?? [],
      );
      if (found.length === 0) return false;

      headings = found;
      stopWatching();
      publish();
      return true;
    }

    //用requestAnimationFrame 节流扫描，防止频繁操作DOM导致卡顿
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
      //我给你15s，再加载不出来就放弃
      giveUpTimer = window.setTimeout(stopWatching, 15000);
    }

    // 监听滚动和窗口大小变化，同样用 requestAnimationFrame 优化性能
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

    //组件卸载时清理所有监听器和定时器
    return () => {
      stopWatching();
      if (frame !== null) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [bodyId]);

  // 点击外部区域和键盘 Escape 键时关闭面板
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

  // 用户拖动目录列表的滚动条时，同步正文的滚动
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

  //如果没有任何标题，不渲染组件
  if (!items.length) return null;
  //计算最小层级，用于锁进样式
  const minimumLevel = Math.min(...items.map((item) => item.level));
  const markerItems = getMarkerItems(items);
  const activeIndex = items.findIndex((item) => item.id === activeId);

  //计算当前高亮的标记线
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
      {/* 触发按钮：桌面端显示侧边线框，移动端显示按钮 */}
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
          {/* 渲染侧边标记线，根据层级调整宽度，根据 active 调整高亮 */}
          {markerItems.map((item, markerIndex) => (
            <span
              key={`${item.id}-${markerIndex}`}
              className={markerIndex === activeMarkerIndex ? "is-active" : ""}
              style={{ width: item.level === minimumLevel ? 22 : 14 }}
            />
          ))}
        </span>
      </button>
      {/* 目录面板 */}
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
        {/* 目录列表 */}
        <ol ref={listRef} onScroll={handleOutlineScroll}>
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                // 面板关闭时，禁用 tab 聚焦，防止键盘用户 Tab 到隐藏元素上
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
