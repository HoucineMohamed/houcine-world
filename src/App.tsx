import React, { Suspense, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import RouteMeta from "./components/RouteMeta";
import SkipLink from "./components/SkipLink";
import SiteSearch from "./components/search/SiteSearch";
import { route } from "./routes/manifest";
import PublicShell, { PageErrorBoundary } from "./components/PublicShell";
import { usePageTracking } from "./hooks/useAnalytics";
import AuthGuard from "./components/workspace/AuthGuard";
import BrandGuard from "./components/workspace/BrandGuard";

// Every page is its own chunk (program item 0.5: a performance pass with measured bundle sizes).
// Before this change the whole site -- every public page and every workspace page -- was one
// ~2.9MB/730KB-gzip JS file; a visitor only ever needs the one page they're on. React.lazy keeps
// each <Route>'s element as a plain reference, so nothing here changes which guard, role check or
// path renders which page -- only when its code is fetched.
const Index = React.lazy(() => import("./pages/Index"));
const AboutMe = React.lazy(() => import("./pages/AboutMe"));
const Dev = React.lazy(() => import("./pages/Dev"));
const Brand = React.lazy(() => import("./pages/Brand"));
const Team = React.lazy(() => import("./pages/Team"));
const BrandKit = React.lazy(() => import("./pages/BrandKit"));
const Services = React.lazy(() => import("./pages/Services"));
const Work = React.lazy(() => import("./pages/Work"));
const WorkEntry = React.lazy(() => import("./pages/WorkEntry"));
const Journal = React.lazy(() => import("./pages/Journal"));
const JournalPost = React.lazy(() => import("./pages/JournalPost"));
const Designs = React.lazy(() => import("./pages/Designs"));
const Reads = React.lazy(() => import("./pages/Reads"));
const Manages = React.lazy(() => import("./pages/Manages"));
const LaRosaView = React.lazy(() => import("./pages/LaRosaView"));
const BookingForm = React.lazy(() => import("./pages/BookingForm"));
const AboutDJ = React.lazy(() => import("./pages/AboutDJ"));
const Review = React.lazy(() => import("./pages/Review"));
const Terms = React.lazy(() => import("./pages/Terms"));
const Privacy = React.lazy(() => import("./pages/Privacy"));
const DataDeletion = React.lazy(() => import("./pages/DataDeletion"));
const Contact = React.lazy(() => import("./pages/Contact"));
const Ecosystem = React.lazy(() => import("./pages/Ecosystem"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const Admin = React.lazy(() => import("./pages/Admin"));
const AdminLogin = React.lazy(() => import("./pages/AdminLogin"));
const AuthCallback = React.lazy(() => import("./pages/AuthCallback"));
const WorkspaceLogin = React.lazy(() => import("./pages/workspace/WorkspaceLogin"));
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
const WorkspaceNotFound = React.lazy(() => import("./pages/workspace/WorkspaceNotFound"));

// Wrapper component to enable page tracking
const AppRoutes = () => {
  usePageTracking();

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
        <Route path={route("/brand-kit")} element={<BrandKit />} />
        <Route path={route("/services")} element={<Services />} />
      </Route>
      <Route path={route("/admin")} element={<Admin />} />
      <Route path={route("/admin/login")} element={<AdminLogin />} />
      <Route path={route("/auth/callback")} element={<AuthCallback />} />

      {/* Workspace: login is public, everything else is auth + membership guarded */}
      <Route path={route("/workspace/login")} element={<WorkspaceLogin />} />
      <Route element={<AuthGuard />}>
        <Route path={route("/workspace")} element={<WorkspaceResolver />} />
        <Route path={route("/workspace/select")} element={<BrandSelect />} />
        <Route path={route("/workspace/ecosystem")} element={<EcosystemView />} />
        <Route path={route("/workspace/platform-credentials")} element={<PlatformCredentials />} />
        <Route path={route("/workspace/denied")} element={<WorkspaceDenied />} />
        <Route path={route("/workspace/:brandId")} element={<BrandGuard />}>
          <Route path="dashboard" element={<BrandDashboard />} />
          <Route path="bookings" element={<BrandBookings />} />
          <Route path="notifications" element={<BrandNotifications />} />
          <Route path="analytics" element={<BrandAnalytics />} />
          <Route path="messages" element={<BrandMessages />} />
          <Route path="settings" element={<BrandSettings />} />
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
