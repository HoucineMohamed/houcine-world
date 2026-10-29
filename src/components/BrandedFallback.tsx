import { Component, type ErrorInfo, type ReactNode } from "react";
import logoH from "@/assets/logo-h.png";

// The branded fallback inside the app (docs/fallback.md): the same look and words as public/maintenance.html,
// which covers the cases where the app itself cannot run. It never shows what went wrong: details stay in the
// browser console, nothing is sent anywhere. No router, no data, no Supabase: it must draw even when those fail.

export const FALLBACK_COPY = {
  headline: "Something Better Is Taking Shape.",
  body: "Houcine is currently working behind the scenes to improve your experience. We'll be back shortly with something better.",
  status: "Refining the experience",
  thanks: "Thank you for your patience.",
  brand: "Houcine.world",
} as const;

export const fallbackActionClass =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-border px-6 py-2.5 text-[0.9375rem] text-foreground transition-colors hover:border-muted-foreground/50 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Full-screen branded message. `actions` are the retry controls (a reload by default). */
export const BrandedFallback = ({ actions }: { actions?: ReactNode }) => (
  <div className="branded-fallback relative flex min-h-screen min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
    <div className="branded-fallback__ambient pointer-events-none absolute inset-0" aria-hidden="true" />
    <main
      id="main"
      className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 pb-8 pt-[clamp(2.5rem,8vh,5rem)] text-center"
    >
      <div className="relative mb-[clamp(1.75rem,5vh,2.75rem)] aspect-square w-[clamp(9rem,34vw,12rem)]">
        <span className="branded-fallback__glow absolute inset-[12%] rounded-full" aria-hidden="true" />
        <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true" focusable="false">
          <circle cx="60" cy="60" r="50" fill="none" className="stroke-border" strokeWidth="1" />
          <g className="branded-fallback__orbit">
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="hsl(0 0% 80% / 0.55)"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeDasharray="60 254"
            />
            <circle cx="110" cy="60" r="1.8" className="fill-foreground" />
          </g>
        </svg>
        <img
          src={logoH}
          alt="Houcine logo"
          width={500}
          height={500}
          className="branded-fallback__logo absolute inset-[22%] h-[56%] w-[56%] object-contain"
        />
      </div>
      <h1
        className="branded-fallback__rise mb-4 max-w-[18ch] font-display text-[clamp(1.9rem,6vw,3.25rem)] font-bold leading-[1.12] tracking-tight"
      >
        {FALLBACK_COPY.headline}
      </h1>
      <p className="branded-fallback__rise mb-7 max-w-[34rem] text-base text-muted-foreground sm:text-lg [animation-delay:0.15s]">
        {FALLBACK_COPY.body}
      </p>
      <p className="branded-fallback__rise mb-8 inline-flex items-center gap-2.5 rounded-full border border-border bg-card/70 px-4 py-1.5 text-sm [animation-delay:0.3s]">
        <span className="branded-fallback__pip h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
        {FALLBACK_COPY.status}
      </p>
      <div className="branded-fallback__rise flex flex-col justify-center gap-3 sm:flex-row [animation-delay:0.45s]">
        {actions ?? (
          <button type="button" onClick={() => window.location.reload()} className={fallbackActionClass}>
            Try again
          </button>
        )}
      </div>
    </main>
    <footer className="relative z-10 px-5 pb-8 pt-6 text-center text-sm text-muted-foreground">
      <p>{FALLBACK_COPY.thanks}</p>
      <p className="mt-0.5 font-display tracking-wider text-foreground">{FALLBACK_COPY.brand}</p>
    </footer>
  </div>
);

/**
 * The outermost error boundary (src/main.tsx): anything that escapes the route boundaries -- the router, the
 * search, the page meta, or the app itself while starting -- shows the branded fallback instead of an empty page.
 */
export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    // Kept in the browser console only; nothing is sent anywhere.
    console.error("App error:", error, info.componentStack);
  }
  render() {
    return this.state.failed ? <BrandedFallback /> : this.props.children;
  }
}

export default BrandedFallback;
