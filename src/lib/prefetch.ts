import { useEffect } from "react";
import { PAGE_LOADERS, type PageLoaderPath } from "@/routes/pageLoaders";
import { IDLE_PREFETCH, prefetchTarget } from "@/routes/prefetchTarget";

// Fetches a public page's code before the click: when a link to it is hovered or focused, and, once the
// browser is idle, the few pages linked most. Only public pages (src/routes/prefetchTarget.ts); nothing
// when the visitor asked to save data or is on a slow connection. A failed early fetch is ignored here on
// purpose: it changes nothing, and the real navigation shows the "could not load" message if it fails too.

const started = new Set<string>();

const prefetch = (path: string) => {
  if (started.has(path) || !(path in PAGE_LOADERS)) return;
  started.add(path);
  PAGE_LOADERS[path as PageLoaderPath]().catch(() => {
    started.delete(path);
  });
};

const saveData = (): boolean => {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return Boolean(c?.saveData) || /(^|-)2g$/.test(c?.effectiveType ?? "");
};

const onIntent = (event: Event) => {
  const link = (event.target as Element | null)?.closest?.("a[href]");
  if (!(link instanceof HTMLAnchorElement) || link.target === "_blank" || link.hasAttribute("download")) return;
  const target = prefetchTarget(link.href, window.location.origin);
  if (target) prefetch(target);
};

/** Mounted once, in src/App.tsx. */
export const usePrefetch = () => {
  useEffect(() => {
    if (saveData()) return;
    document.addEventListener("pointerover", onIntent, { passive: true });
    document.addEventListener("focusin", onIntent);
    const idle = () => IDLE_PREFETCH.forEach(prefetch);
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    const id = w.requestIdleCallback ? w.requestIdleCallback(idle, { timeout: 5000 }) : window.setTimeout(idle, 3000);
    return () => {
      document.removeEventListener("pointerover", onIntent);
      document.removeEventListener("focusin", onIntent);
      if (w.cancelIdleCallback && w.requestIdleCallback) w.cancelIdleCallback(id);
      else window.clearTimeout(id);
    };
  }, []);
};
