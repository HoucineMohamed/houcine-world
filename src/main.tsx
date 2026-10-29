import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { Toaster } from "@/components/ui/sonner";
import { supabaseConfigProblems } from "@/integrations/supabase/configCheck";
import { AppErrorBoundary } from "@/components/BrandedFallback";

const root = document.getElementById("root")!;

/** A plain screen drawn without React or the app, so it shows even when the app cannot start. */
function showStartupError(message: string) {
  const main = document.createElement("main");
  main.setAttribute("role", "alert");
  main.className = "min-h-screen flex items-center justify-center p-6 text-center";
  const p = document.createElement("p");
  p.className = "text-lg";
  p.textContent = message;
  main.append(p);
  root.replaceChildren(main);
}

// The app (and with it the Supabase client) is loaded only after the settings pass, because the client throws while its
// module loads and nothing would be drawn: a blank page with no message.
const problems = supabaseConfigProblems(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
if (problems.length > 0) {
  console.error(`Supabase configuration error: ${problems.join(", ")}`);
  showStartupError("Configuration error, please contact the owner");
} else {
  import("./App.tsx")
    .then(({ default: App }) => {
      createRoot(root).render(
        <StrictMode>
          {/* Last line inside the app: a crash outside every route boundary shows the branded fallback, never an
              empty page. If the app cannot start at all, public/boot-watchdog.js takes over (docs/fallback.md). */}
          <AppErrorBoundary>
            <App />
            <Toaster />
          </AppErrorBoundary>
        </StrictMode>,
      );
    })
    .catch((e: unknown) => {
      console.error("The app could not start", e);
      showStartupError("The site could not start. Please reload the page, or contact the owner if it happens again.");
    });
}
