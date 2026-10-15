import { Component, Suspense, type ErrorInfo, type ReactNode } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { RotateCcw, Home } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Wraps the PUBLIC routes only (see src/App.tsx). Workspace and admin routes keep their own guards
// and are not wrapped. If a public page crashes, visitors see a calm message instead of a blank
// screen; while a lazily loaded page is downloading, they see a skeleton.

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

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

const ErrorFallback = () => (
  <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
    <div className="max-w-md text-center" role="alert">
      <h1 className="text-3xl font-bold font-display mb-3">Something went wrong</h1>
      <p className="text-muted-foreground mb-8">
        This page could not be shown. Reloading usually helps; if not, try again later.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button type="button" onClick={() => window.location.reload()} className={cn(buttonVariants(), "gap-2", focusRing)}>
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
          Reload the page
        </button>
        <Link to="/" reloadDocument className={cn(buttonVariants({ variant: "outline" }), "gap-2", focusRing)}>
          <Home className="w-4 h-4" aria-hidden="true" />
          Go to the home page
        </Link>
      </div>
    </div>
  </div>
);

class PublicErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    // Kept in the browser console only; nothing is sent anywhere.
    console.error("Public page error:", error, info.componentStack);
  }
  render() {
    return this.state.failed ? <ErrorFallback /> : this.props.children;
  }
}

/** Layout route for public pages: an error boundary (reset on every new address) and a loading skeleton. */
const PublicShell = () => {
  const { pathname } = useLocation();
  return (
    <PublicErrorBoundary key={pathname}>
      <Suspense fallback={<PageSkeleton />}>
        <Outlet />
      </Suspense>
    </PublicErrorBoundary>
  );
};

export default PublicShell;
