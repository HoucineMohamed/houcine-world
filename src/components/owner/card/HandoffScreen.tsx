import { useEffect, useRef, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { Loader2, Lock } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createHandoffStore, type HandoffView } from "./handoff";

// The full-page screen of the Houcine.Trades hand-off: "Opening Houcine.Trades…" while the signed note is
// requested, then either the navigation (the screen stays until the new page loads), a failure with Try again
// and the plain sign-in link, or "not set up yet". It belongs to the owner chunk and is mounted into the page
// only the first time an entry is clicked. It shows no token, key or note, and logs nothing.

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export const handoffStore = createHandoffStore();

interface Actions {
  retry: () => void;
  signInHref: string;
}

let actions: Actions | null = null;
let mounted = false;
/** The entry that was clicked: focus returns to it when the screen closes. */
let returnFocus: HTMLElement | null = null;

const close = () => {
  handoffStore.set("idle");
  returnFocus?.focus();
  returnFocus = null;
};

const Screen = () => {
  const view = useSyncExternalStore(handoffStore.subscribe, handoffStore.get);
  const heading = useRef<HTMLHeadingElement>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (view === "idle") return;
    heading.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && view !== "opening") close();
      // Keep Tab inside the screen.
      if (e.key === "Tab" && box.current) {
        const items = [...box.current.querySelectorAll<HTMLElement>("a[href], button, [tabindex='-1']")];
        const first = items[0];
        const last = items[items.length - 1];
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [view]);

  if (view === "idle" || !actions) return null;
  const { retry, signInHref } = actions;
  const text: Record<Exclude<HandoffView, "idle">, { title: string; body: string }> = {
    opening: { title: "Opening Houcine.Trades…", body: "Checking that it is you, then opening it in this tab." },
    expired: { title: "Your sign-in has ended", body: "Sign in to the workspace again, then open Houcine.Trades. You can also open its own sign-in page now." },
    error: { title: "Houcine.Trades could not be opened", body: "The signed hand-off did not work this time. Try again, or open the sign-in page and sign in there." },
    "not-configured": { title: "The hand-off is not set up yet", body: "Houcine.Trades still opens, at its own sign-in page. The setup steps are on the Ecosystem page of the workspace." },
  };
  const t = text[view];

  return (
    <div
      ref={box}
      role="dialog"
      aria-modal="true"
      aria-labelledby="trades-handoff-title"
      aria-describedby="trades-handoff-text"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur px-6"
    >
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-accent/10">
          {view === "opening" ? (
            <Loader2 className="h-7 w-7 text-accent motion-safe:animate-spin" aria-hidden="true" />
          ) : (
            <Lock className="h-7 w-7 text-accent" aria-hidden="true" />
          )}
        </div>
        <h2 id="trades-handoff-title" ref={heading} tabIndex={-1} className="text-2xl font-bold font-display text-foreground mb-3 outline-none">
          {t.title}
        </h2>
        <p id="trades-handoff-text" className="text-muted-foreground mb-8" role={view === "opening" ? "status" : undefined}>
          {t.body}
        </p>
        {view !== "opening" && (
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            {(view === "error" || view === "expired") && (
              <a href="/workspace/login" className={cn(buttonVariants({ variant: "outline" }), "min-h-11", focusRing)}>
                Sign in again
              </a>
            )}
            {view === "error" && (
              <button type="button" onClick={retry} className={cn(buttonVariants(), "min-h-11", focusRing)}>
                Try again
              </button>
            )}
            <a href={signInHref} rel="noopener noreferrer" referrerPolicy="no-referrer" className={cn(buttonVariants({ variant: "outline" }), "min-h-11", focusRing)}>
              Open the sign-in page
            </a>
            {view === "not-configured" && (
              <a href="/workspace/ecosystem" className={cn(buttonVariants({ variant: "outline" }), "min-h-11", focusRing)}>
                Setup steps
              </a>
            )}
            <button type="button" onClick={close} className={cn(buttonVariants({ variant: "ghost" }), "min-h-11", focusRing)}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/** Shows the screen in `view` ("idle" hides it), mounting it on first use. `next` null keeps the current actions. */
export const showHandoff = (view: HandoffView, next: Actions | null) => {
  if (next) actions = next;
  if (view === "idle") {
    handoffStore.set("idle");
    return;
  }
  if (handoffStore.get() === "idle" && document.activeElement instanceof HTMLElement) returnFocus = document.activeElement;
  if (!mounted) {
    const host = document.createElement("div");
    document.body.appendChild(host);
    createRoot(host).render(<Screen />);
    mounted = true;
  }
  handoffStore.set(view);
};
