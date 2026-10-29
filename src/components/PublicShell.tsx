import { Component, Suspense, type ErrorInfo, type ReactNode } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { RotateCcw, Home } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { BrandedFallback, fallbackActionClass } from "@/components/BrandedFallback";
import { cn } from "@/lib/utils";
import { isChunkLoadError } from "@/lib/chunkError";

// Wraps the PUBLIC routes only (see src/App.tsx). Workspace and admin routes keep their own guards
// and are not wrapped. If a public page crashes, visitors see the branded fallback instead of a blank
// screen; while a lazily loaded page is downloading, they see a skeleton.

/** Placeholder shown while a page's code is loading. */
export const PageSkeleton = () => (
  <div className="min-h-screen bg-background px-6 pt-28 pb-20" role="status" aria-live="polite">
    <span className="sr-only">Loading the page…</span>
    <div className="container mx-auto max-w-5xl space-y-8" aria-hidden="true">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-14 w-full max-w-2xl" />
      <Skeleton className="h-6 w-full max-w-xl" />
      <div className="grid gap-6 md:grid-cols-3 pt-8">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </div>
  </div>
);

/**
 * The message shown when a page crashes, or when its code could not be loaded (`chunk`: offline, or the site
 * was updated since the tab was opened). Both use the branded fallback (src/components/BrandedFallback.tsx); a
 * reload fetches the current files, and the home page is one click away. No error detail is shown.
 */
export const ErrorFallback = ({ chunk = false }: { chunk?: boolean }) => (
  <div role="alert" data-chunk-error={chunk ? "" : undefined}>
    <BrandedFallback
      actions={
        <>
          <button type="button" onClick={() => window.location.reload()} className={cn(fallbackActionClass, "bg-foreground text-background hover:bg-foreground/90 hover:text-background")}>
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            Try again
          </button>
          <Link to="/" reloadDocument className={fallbackActionClass}>
            <Home className="w-4 h-4" aria-hidden="true" />
            Go to the home page
          </Link>
        </>
      }
    />
  </div>
);

/** Error boundary with the message above. Used for the public pages (here) and around all routes (App). */
export class PageErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, { failed: boolean; chunk: boolean }> {
  state = { failed: false, chunk: false };
  static getDerivedStateFromError(error: unknown) {
    return { failed: true, chunk: isChunkLoadError(error) };
  }
  // A new resetKey (the address) clears the message without remounting what the boundary wraps.
  componentDidUpdate(prev: { resetKey?: string }) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) this.setState({ failed: false, chunk: false });
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    // Kept in the browser console only; nothing is sent anywhere.
    console.error("Public page error:", error, info.componentStack);
  }
  render() {
    return this.state.failed ? <ErrorFallback chunk={this.state.chunk} /> : this.props.children;
  }
}

/** Layout route for public pages: an error boundary (reset on every new address) and a loading skeleton. */
const PublicShell = () => {
  const { pathname } = useLocation();
  return (
    <PageErrorBoundary key={pathname}>
      <Suspense fallback={<PageSkeleton />}>
        <Outlet />
      </Suspense>
    </PageErrorBoundary>
  );
};

export default PublicShell;
