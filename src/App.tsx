import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
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
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import { usePageTracking } from "./hooks/useAnalytics";

// Wrapper component to enable page tracking
const AppRoutes = () => {
  usePageTracking();
  
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
      <Route path="/admin" element={<Admin />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <Router>
    <AppRoutes />
  </Router>
);

export default App;
