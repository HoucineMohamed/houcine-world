import React, { Suspense, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import RouteMeta from "./components/RouteMeta";
import PublicShell from "./components/PublicShell";
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
      <Route path="/admin" element={<Admin />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Workspace: login is public, everything else is auth + membership guarded */}
      <Route path="/workspace/login" element={<WorkspaceLogin />} />
      <Route element={<AuthGuard />}>
        <Route path="/workspace" element={<WorkspaceResolver />} />
        <Route path="/workspace/select" element={<BrandSelect />} />
        <Route path="/workspace/ecosystem" element={<EcosystemView />} />
        <Route path="/workspace/platform-credentials" element={<PlatformCredentials />} />
        <Route path="/workspace/denied" element={<WorkspaceDenied />} />
        <Route path="/workspace/:brandId" element={<BrandGuard />}>
          <Route path="dashboard" element={<BrandDashboard />} />
          <Route path="bookings" element={<BrandBookings />} />
          <Route path="notifications" element={<BrandNotifications />} />
          <Route path="analytics" element={<BrandAnalytics />} />
          <Route path="messages" element={<BrandMessages />} />
          <Route path="settings" element={<BrandSettings />} />
        </Route>
      </Route>
      <Route path="/workspace/*" element={<WorkspaceNotFound />} />

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
    {/* Each page is its own chunk now (above); this is the one fallback shown while any of them
        loads. Plain text, no new dependency, and intentionally unstyled -- it's rarely visible on a
        fast connection and the goal here is smaller bundles, not a loading-screen design. */}
    <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center" }}>Loading…</div>}>
      <AppRoutes />
    </Suspense>
  </Router>
);

export default App;
