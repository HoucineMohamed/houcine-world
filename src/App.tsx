import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import Index from "./pages/Index";
import AboutMe from "./pages/AboutMe";
import Dev from "./pages/Dev";
import Designs from "./pages/Designs";
import Reads from "./pages/Reads";
import Manages from "./pages/Manages";
import LaRosaView from "./pages/LaRosaView";
import BookingForm from "./pages/BookingForm";
import AboutDJ from "./pages/AboutDJ";
import Review from "./pages/Review";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import AuthCallback from "./pages/AuthCallback";
import { usePageTracking } from "./hooks/useAnalytics";
import AuthGuard from "./components/workspace/AuthGuard";
import BrandGuard from "./components/workspace/BrandGuard";
import WorkspaceLogin from "./pages/workspace/WorkspaceLogin";
import WorkspaceResolver from "./pages/workspace/WorkspaceResolver";
import BrandSelect from "./pages/workspace/BrandSelect";
import BrandDashboard from "./pages/workspace/BrandDashboard";
import BrandBookings from "./pages/workspace/BrandBookings";
import BrandNotifications from "./pages/workspace/BrandNotifications";
import BrandAnalytics from "./pages/workspace/BrandAnalytics";
import BrandMessages from "./pages/workspace/BrandMessages";
import BrandSettings from "./pages/workspace/BrandSettings";
import EcosystemView from "./pages/workspace/EcosystemView";
import PlatformCredentials from "./pages/workspace/PlatformCredentials";
import WorkspaceDenied from "./pages/workspace/WorkspaceDenied";
import WorkspaceNotFound from "./pages/workspace/WorkspaceNotFound";

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
    document.body.classList.toggle("workspace-active", location.pathname.startsWith("/workspace"));
    return () => { document.body.classList.remove("workspace-active"); };
  }, [location.pathname]);

  return (
    <Routes>
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

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <Router>
    <ScrollToTop />
    <AppRoutes />
  </Router>
);

export default App;
