import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import AboutMe from "./pages/AboutMe";
import Dev from "./pages/Dev";
import Designs from "./pages/Designs";
import NotFound from "./pages/NotFound";

const App = () => (
  <Router>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/about" element={<AboutMe />} />
      <Route path="/dev" element={<Dev />} />
      <Route path="/designs" element={<Designs />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Router>
);

export default App;
