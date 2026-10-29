import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Toaster } from "@/components/ui/sonner";
import { AppErrorBoundary } from "@/components/BrandedFallback";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* Last line inside the app: a crash outside every route boundary shows the branded fallback, never an
        empty page. If the app cannot start at all, public/boot-watchdog.js takes over (docs/fallback.md). */}
    <AppErrorBoundary>
      <App />
      <Toaster />
    </AppErrorBoundary>
  </StrictMode>
);
