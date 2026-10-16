import { lazy, Suspense, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRIVATE_PREFIXES } from "@/routes/manifest";

// Site search on the public pages: Ctrl+K (Cmd+K on a Mac), "/" or the Search button in the header opens an
// accessible dialog. The dialog and its index are a separate file, downloaded on first use. Everything
// runs in the browser over the route manifest and the content layer; nothing is sent anywhere.

const SearchDialog = lazy(() => import("./SearchDialog"));
const OPEN_EVENT = "site-search:open";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** The header button. It only asks <SiteSearch /> (mounted once in App) to open. */
export const SearchButton = ({ className }: { className?: string }) => (
  <button
    type="button"
    onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
    aria-label="Search the site (Ctrl+K or /)"
    aria-keyshortcuts="Control+K Meta+K /"
    className={cn(
      "inline-flex items-center gap-2 rounded-md border border-border/60 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:border-accent/50 transition-colors",
      focusRing,
      className,
    )}
  >
    <Search className="w-4 h-4" aria-hidden="true" />
    <span className="hidden sm:inline">Search</span>
    <kbd className="hidden md:inline rounded border border-border/60 px-1.5 font-mono text-[10px] text-muted-foreground">Ctrl K</kbd>
  </button>
);

/** Listens for the shortcut and the button, and shows the dialog. Public pages only. */
const SiteSearch = () => {
  const { pathname } = useLocation();
  const isPrivate = PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (isPrivate) return;
    const show = () => {
      setLoaded(true);
      setOpen(true);
    };
    const typing = (t: EventTarget | null) =>
      t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));
    const onKey = (e: KeyboardEvent) => {
      const ctrlK = (e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "k";
      // "/" opens search too, except while the visitor is typing in a field.
      const slash = e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey && !typing(e.target);
      if (ctrlK || slash) {
        e.preventDefault();
        show();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, show);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, show);
    };
  }, [isPrivate]);

  useEffect(() => setOpen(false), [pathname]);

  if (isPrivate || !loaded) return null;
  return (
    <Suspense fallback={null}>
      <SearchDialog open={open} onOpenChange={setOpen} />
    </Suspense>
  );
};

export default SiteSearch;
