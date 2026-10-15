import React, { lazy, Suspense, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import RouteMeta from "./components/RouteMeta";
import PublicShell from "./components/PublicShell";
import Index from "./pages/Index";
import AdminLogin from "./pages/AdminLogin";
import AuthCallback from "./pages/AuthCallback";
import { usePageTracking } from "./hooks/useAnalytics";
import AuthGuard from "./components/workspace/AuthGuard";
import BrandGuard from "./components/workspace/BrandGuard";
import WorkspaceLogin from "./pages/workspace/WorkspaceLogin";

// Route-level code splitting: each page below is downloaded when it is first visited. The home page,
// the sign-in pages, the auth callback and the guards stay in the main bundle, so signing in works
// exactly as before. Public pages load inside PublicShell's Suspense (its skeleton); workspace pages
// inside <WorkspacePage> below.
const AboutMe = lazy(() => import("./pages/AboutMe"));
const Dev = lazy(() => import("./pages/Dev"));
const Designs = lazy(() => import("./pages/Designs"));
const Reads = lazy(() => import("./pages/Reads"));
const Manages = lazy(() => import("./pages/Manages"));
const LaRosaView = lazy(() => import("./pages/LaRosaView"));
const BookingForm = lazy(() => import("./pages/BookingForm"));
const AboutDJ = lazy(() => import("./pages/AboutDJ"));
const Review = lazy(() => import("./pages/Review"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const DataDeletion = lazy(() => import("./pages/DataDeletion"));
const Contact = lazy(() => import("./pages/Contact"));
const Ecosystem = lazy(() => import("./pages/Ecosystem"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Admin = lazy(() => import("./pages/Admin"));
const WorkspaceResolver = lazy(() => import("./pages/workspace/WorkspaceResolver"));
const BrandSelect = lazy(() => import("./pages/workspace/BrandSelect"));
const BrandDashboard = lazy(() => import("./pages/workspace/BrandDashboard"));
const BrandBookings = lazy(() => import("./pages/workspace/BrandBookings"));
const BrandNotifications = lazy(() => import("./pages/workspace/BrandNotifications"));
const BrandAnalytics = lazy(() => import("./pages/workspace/BrandAnalytics"));
const BrandMessages = lazy(() => import("./pages/workspace/BrandMessages"));
const BrandSettings = lazy(() => import("./pages/workspace/BrandSettings"));
const EcosystemView = lazy(() => import("./pages/workspace/EcosystemView"));
const PlatformCredentials = lazy(() => import("./pages/workspace/PlatformCredentials"));
const WorkspaceDenied = lazy(() => import("./pages/workspace/WorkspaceDenied"));
const WorkspaceNotFound = lazy(() => import("./pages/workspace/WorkspaceNotFound"));

const WorkspaceLoading = () => (
  <div className="min-h-screen bg-background flex items-center justify-center" role="status" aria-live="polite">
    <span className="text-sm text-muted-foreground">Loading…</span>
  </div>
);
const WorkspacePage = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<WorkspaceLoading />}>{children}</Suspense>
);

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
        <Route path="/" element={<Index />} />
        <Route path="/about" element={<AboutMe />} />
        <Route path="/dev" element={<Dev />} />
        <Route path="/designs" element={<Designs />} />
        <Route path="/reads" element={<Reads />} />
        <Route path="/manages" element={<Manages />} />
        <Route path="/larosaview" element={<LaRosaView />} />
        <Route path="/booking" element={<BookingForm />} />
        <Route path="/about-dj" element={<AboutDJ />} />
        <Route path="/review" element={<Review />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/data-deletion" element={<DataDeletion />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/ecosystem" element={<Ecosystem />} />
      </Route>
      <Route path="/admin" element={<WorkspacePage><Admin /></WorkspacePage>} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Workspace: login is public, everything else is auth + membership guarded */}
      <Route path="/workspace/login" element={<WorkspaceLogin />} />
      <Route element={<AuthGuard />}>
        <Route path="/workspace" element={<WorkspacePage><WorkspaceResolver /></WorkspacePage>} />
        <Route path="/workspace/select" element={<WorkspacePage><BrandSelect /></WorkspacePage>} />
        <Route path="/workspace/ecosystem" element={<WorkspacePage><EcosystemView /></WorkspacePage>} />
        <Route path="/workspace/platform-credentials" element={<WorkspacePage><PlatformCredentials /></WorkspacePage>} />
        <Route path="/workspace/denied" element={<WorkspacePage><WorkspaceDenied /></WorkspacePage>} />
        <Route path="/workspace/:brandId" element={<BrandGuard />}>
          <Route path="dashboard" element={<WorkspacePage><BrandDashboard /></WorkspacePage>} />
          <Route path="bookings" element={<WorkspacePage><BrandBookings /></WorkspacePage>} />
          <Route path="notifications" element={<WorkspacePage><BrandNotifications /></WorkspacePage>} />
          <Route path="analytics" element={<WorkspacePage><BrandAnalytics /></WorkspacePage>} />
          <Route path="messages" element={<WorkspacePage><BrandMessages /></WorkspacePage>} />
          <Route path="settings" element={<WorkspacePage><BrandSettings /></WorkspacePage>} />
        </Route>
      </Route>
      <Route path="/workspace/*" element={<WorkspacePage><WorkspaceNotFound /></WorkspacePage>} />

      <Route element={<PublicShell />}>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

const App = () => (
  <Router>
    <ScrollToTop />
    <RouteMeta />
    <AppRoutes />
  </Router>
);

export default App;
