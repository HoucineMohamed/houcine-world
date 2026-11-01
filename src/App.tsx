import React, { Suspense, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import RouteMeta from "./components/RouteMeta";
import SkipLink from "./components/SkipLink";
import SiteSearch from "./components/search/SiteSearch";
import { route } from "./routes/manifest";
import { PAGE_LOADERS } from "./routes/pageLoaders";
import { usePrefetch } from "./lib/prefetch";
import PublicShell, { PageErrorBoundary } from "./components/PublicShell";
import { usePageTracking } from "./hooks/useAnalytics";
import AuthGuard from "./components/workspace/AuthGuard";
import BrandGuard from "./components/workspace/BrandGuard";

// Every page is its own chunk (program item 0.5: a performance pass with measured bundle sizes).
// Before this change the whole site -- every public page and every workspace page -- was one
// ~2.9MB/730KB-gzip JS file; a visitor only ever needs the one page they're on. React.lazy keeps
// each <Route>'s element as a plain reference, so nothing here changes which guard, role check or
// path renders which page -- only when its code is fetched.
const Index = React.lazy(PAGE_LOADERS["/"]);
const AboutMe = React.lazy(PAGE_LOADERS["/about"]);
const Dev = React.lazy(PAGE_LOADERS["/dev"]);
const Brand = React.lazy(PAGE_LOADERS["/brand"]);
const Team = React.lazy(PAGE_LOADERS["/team"]);
const Changelog = React.lazy(PAGE_LOADERS["/changelog"]);
const Status = React.lazy(PAGE_LOADERS["/status"]);
const BrandKit = React.lazy(PAGE_LOADERS["/brand-kit"]);
const Services = React.lazy(PAGE_LOADERS["/services"]);
const SiteMap = React.lazy(PAGE_LOADERS["/sitemap"]);
const Work = React.lazy(PAGE_LOADERS["/work"]);
const WorkEntry = React.lazy(PAGE_LOADERS["/work/:slug"]);
const Journal = React.lazy(PAGE_LOADERS["/journal"]);
const JournalPost = React.lazy(PAGE_LOADERS["/journal/:slug"]);
const Designs = React.lazy(PAGE_LOADERS["/designs"]);
const Reads = React.lazy(PAGE_LOADERS["/reads"]);
const Manages = React.lazy(PAGE_LOADERS["/manages"]);
const LaRosaView = React.lazy(PAGE_LOADERS["/larosaview"]);
const BookingForm = React.lazy(PAGE_LOADERS["/booking"]);
const AboutDJ = React.lazy(PAGE_LOADERS["/about-dj"]);
const Review = React.lazy(PAGE_LOADERS["/review"]);
const Terms = React.lazy(PAGE_LOADERS["/terms"]);
const Privacy = React.lazy(PAGE_LOADERS["/privacy"]);
const DataDeletion = React.lazy(PAGE_LOADERS["/data-deletion"]);
const Contact = React.lazy(PAGE_LOADERS["/contact"]);
const Ecosystem = React.lazy(PAGE_LOADERS["/ecosystem"]);
const NotFound = React.lazy(() => import("./pages/NotFound"));
const Admin = React.lazy(() => import("./pages/Admin"));
const AdminLogin = React.lazy(() => import("./pages/AdminLogin"));
const AuthCallback = React.lazy(() => import("./pages/AuthCallback"));
const WorkspaceLogin = React.lazy(() => import("./pages/workspace/WorkspaceLogin"));
const SetPassword = React.lazy(() => import("./pages/workspace/SetPassword"));
const WorkspaceResolver = React.lazy(() => import("./pages/workspace/WorkspaceResolver"));
const BrandSelect = React.lazy(() => import("./pages/workspace/BrandSelect"));
const BrandDashboard = React.lazy(() => import("./pages/workspace/BrandDashboard"));
const BrandBookings = React.lazy(() => import("./pages/workspace/BrandBookings"));
const BrandNotifications = React.lazy(() => import("./pages/workspace/BrandNotifications"));
const BrandAnalytics = React.lazy(() => import("./pages/workspace/BrandAnalytics"));
const BrandMessages = React.lazy(() => import("./pages/workspace/BrandMessages"));
const BrandSettings = React.lazy(() => import("./pages/workspace/BrandSettings"));
const EcosystemView = React.lazy(() => import("./pages/workspace/EcosystemView"));
const PlatformCredentials = React.lazy(() => import("./pages/workspace/PlatformCredentials"));
const WorkspaceDenied = React.lazy(() => import("./pages/workspace/WorkspaceDenied"));
const KnowledgeStudio = React.lazy(() => import("./pages/workspace/knowledge/KnowledgeStudio"));
const GlobalCommandCenter = React.lazy(() => import("./pages/workspace/command/CommandCenter").then((m) => ({ default: m.GlobalCommandCenter })));
const BrandCommandCenter = React.lazy(() => import("./pages/workspace/command/CommandCenter").then((m) => ({ default: m.BrandCommandCenter })));
const WorkspaceNotFound = React.lazy(() => import("./pages/workspace/WorkspaceNotFound"));

// Wrapper component to enable page tracking
const AppRoutes = () => {
  usePageTracking();
  usePrefetch();

  // The public site hides the native cursor globally (src/index.css) in favor
  // of <CustomCursor />, which only ever renders on public pages — none of
  // the /workspace routes mount it, so without this the cursor is invisible
  // there entirely. Toggles a body class so index.css can scope the reset to
  // exactly the workspace routes, leaving the public site untouched.
  const location = useLocation();
  useEffect(() => {
    // /admin (and /admin/login) never mount <CustomCursor /> either, so they get the same reset.
    const adminArea = location.pathname.startsWith("/workspace") || location.pathname.startsWith("/admin");
    document.body.classList.toggle("workspace-active", adminArea);
    return () => { document.body.classList.remove("workspace-active"); };
  }, [location.pathname]);

  return (
    <Routes>
      {/* Public pages: an error boundary and a loading skeleton (src/components/PublicShell.tsx) */}
      <Route element={<PublicShell />}>
        <Route path={route("/")} element={<Index />} />
        <Route path={route("/about")} element={<AboutMe />} />
        <Route path={route("/dev")} element={<Dev />} />
        <Route path={route("/designs")} element={<Designs />} />
        <Route path={route("/reads")} element={<Reads />} />
        <Route path={route("/manages")} element={<Manages />} />
        <Route path={route("/larosaview")} element={<LaRosaView />} />
        <Route path={route("/booking")} element={<BookingForm />} />
        <Route path={route("/about-dj")} element={<AboutDJ />} />
        <Route path={route("/review")} element={<Review />} />
        <Route path={route("/terms")} element={<Terms />} />
        <Route path={route("/privacy")} element={<Privacy />} />
        <Route path={route("/data-deletion")} element={<DataDeletion />} />
        <Route path={route("/contact")} element={<Contact />} />
        <Route path={route("/ecosystem")} element={<Ecosystem />} />
        <Route path={route("/work")} element={<Work />} />
        <Route path={route("/work/:slug")} element={<WorkEntry />} />
        <Route path={route("/journal")} element={<Journal />} />
        <Route path={route("/journal/:slug")} element={<JournalPost />} />
        <Route path={route("/brand")} element={<Brand />} />
        <Route path={route("/team")} element={<Team />} />
        <Route path={route("/changelog")} element={<Changelog />} />
        <Route path={route("/status")} element={<Status />} />
        <Route path={route("/brand-kit")} element={<BrandKit />} />
        <Route path={route("/services")} element={<Services />} />
        <Route path={route("/sitemap")} element={<SiteMap />} />
      </Route>
      <Route path={route("/admin")} element={<Admin />} />
      <Route path={route("/admin/login")} element={<AdminLogin />} />
      <Route path={route("/auth/callback")} element={<AuthCallback />} />

      {/* Workspace: login is public, everything else is auth + membership guarded */}
      <Route path={route("/workspace/login")} element={<WorkspaceLogin />} />
      <Route path={route("/workspace/set-password")} element={<SetPassword />} />
      <Route element={<AuthGuard />}>
        <Route path={route("/workspace")} element={<WorkspaceResolver />} />
        <Route path={route("/workspace/select")} element={<BrandSelect />} />
        <Route path={route("/workspace/ecosystem")} element={<EcosystemView />} />
        <Route path={route("/workspace/platform-credentials")} element={<PlatformCredentials />} />
        <Route path={route("/workspace/denied")} element={<WorkspaceDenied />} />
        {/* Knowledge Studio: super admins only (checked again on the server for every request). */}
        <Route path={route("/workspace/knowledge")} element={<KnowledgeStudio section="overview" />} />
        <Route path={route("/workspace/knowledge/notes")} element={<KnowledgeStudio section="notes" />} />
        <Route path={route("/workspace/knowledge/graph")} element={<KnowledgeStudio section="graph" />} />
        <Route path={route("/workspace/knowledge/playground")} element={<KnowledgeStudio section="playground" />} />
        <Route path={route("/workspace/knowledge/review")} element={<KnowledgeStudio section="review" />} />
        <Route path={route("/workspace/knowledge/activity")} element={<KnowledgeStudio section="activity" />} />
        <Route path={route("/workspace/knowledge/settings")} element={<KnowledgeStudio section="settings" />} />
        {/* Command Center: global for super admins (checked again by the database for every record). */}
        <Route path={route("/workspace/command")} element={<GlobalCommandCenter />} />
        <Route path={route("/workspace/command/:section")} element={<GlobalCommandCenter />} />
        <Route path={route("/workspace/:brandId")} element={<BrandGuard />}>
          <Route path="dashboard" element={<BrandDashboard />} />
          <Route path="bookings" element={<BrandBookings />} />
          <Route path="notifications" element={<BrandNotifications />} />
          <Route path="analytics" element={<BrandAnalytics />} />
          <Route path="messages" element={<BrandMessages />} />
          <Route path="settings" element={<BrandSettings />} />
          <Route path="command" element={<BrandCommandCenter />} />
          <Route path="command/:section" element={<BrandCommandCenter />} />
        </Route>
      </Route>
      <Route path={route("/workspace/*")} element={<WorkspaceNotFound />} />

      <Route element={<PublicShell />}>
        <Route path={route("*")} element={<NotFound />} />
      </Route>
    </Routes>
  );
};

const AppLoading = () => (
  <div className="min-h-screen bg-background flex items-center justify-center" role="status" aria-live="polite">
    <span className="sr-only">Loading…</span>
    <span className="h-8 w-8 rounded-full border-2 border-border border-t-accent motion-safe:animate-spin" aria-hidden="true" />
  </div>
);

/**
 * The error boundary around every route. A new address clears its message in place (resetKey), never by
 * remounting: a remount would restart the workspace guards and their session and access checks on every click.
 */
const RouteErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const { pathname } = useLocation();
  return <PageErrorBoundary resetKey={pathname}>{children}</PageErrorBoundary>;
};

const App = () => (
  <Router>
    <SkipLink />
    <ScrollToTop />
    <RouteMeta />
    <SiteSearch />
    {/* Each page is its own chunk (above). Public pages have their own skeleton and error boundary
        (PublicShell); this outer pair covers the workspace and admin pages: a quiet loading state in the
        site's colours, and the same calm message if a page crashes or its code cannot be downloaded. */}
    <RouteErrorBoundary>
      <Suspense fallback={<AppLoading />}>
        <AppRoutes />
      </Suspense>
    </RouteErrorBoundary>
  </Router>
);

export default App;
