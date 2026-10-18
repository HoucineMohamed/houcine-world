import { supabase } from "@/lib/supabaseClient";
import { TRADES_ASSERT_ENDPOINT, TRADES_SSO_ENABLED, TRADES_SSO_PATH } from "@/config/trades";
import { handoffOutcome, type NoAnswer } from "./handoff";
import { showHandoff } from "./HandoffScreen";

// Click handler shared by the three owner-only Houcine.Trades entries (docs/trades-integration.md).
// The Supabase access token is read from the existing client and sent ONLY to this site's own
// Netlify Function (same origin). What leaves for Houcine.Trades is the short signed note, in the URL
// fragment (never a query string, so it is not sent to any server). Nothing is logged, stored or tracked.
// While the note is requested a full-page screen says so (./HandoffScreen.tsx); a failure offers Try again
// and the plain sign-in page, and "not set up yet" says where the setup steps are.

const TIMEOUT_MS = 8000;
/** If the new page has not replaced this one this long after the navigation started, the screen offers a way out. */
const NAVIGATION_GRACE_MS = 15000;

/** Make sure no Referer header leaves with the navigation (the fragment never does anyway). */
const noReferrer = () => {
  let meta = document.head.querySelector<HTMLMetaElement>('meta[name="referrer"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "referrer");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", "no-referrer");
};

/**
 * Ask this site's own function for a note: the HTTP status and body (null when it is not JSON), or status 0 with
 * the reason when there was no answer.
 */
export const requestNote = async (): Promise<{ status: number; body: unknown; noAnswer?: NoAnswer }> => {
  try {
    const { data, error } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (error || typeof accessToken !== "string" || accessToken === "") return { status: 0, body: null, noAnswer: "no-session" };
    const response = await fetch(TRADES_ASSERT_ENDPOINT, {
      method: "POST",
      headers: { authorization: `Bearer ${accessToken}` },
      credentials: "same-origin",
      cache: "no-store",
      redirect: "error",
      referrerPolicy: "no-referrer",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body: unknown = await response.json().catch(() => null);
    return { status: response.status, body };
  } catch {
    return { status: 0, body: null, noAnswer: "network" };
  }
};

let busy = false;

// Coming back with the Back button can restore this page with the "Opening" screen still up: clear it.
let navigationTimer: number | undefined;
window.addEventListener("pageshow", (e) => {
  if (!e.persisted) return;
  window.clearTimeout(navigationTimer);
  showHandoff("idle", null);
});

const start = (href: string) => {
  if (busy) return;
  busy = true;
  const retry = () => start(href);
  const actions = { retry, signInHref: href };
  try {
    showHandoff("opening", actions);
  } catch {
    busy = false;
    window.location.assign(href);
    return;
  }
  void requestNote()
    .then(({ status, body, noAnswer }) => {
      const outcome = handoffOutcome(status, body, href, TRADES_SSO_PATH, noAnswer);
      if (outcome.kind === "go") {
        noReferrer();
        window.location.assign(outcome.url);
        // Normally this page is gone before the timer fires; if the navigation was blocked, offer a way out.
        navigationTimer = window.setTimeout(() => showHandoff("error", actions), NAVIGATION_GRACE_MS);
        return;
      }
      showHandoff(outcome.kind, actions);
    })
    .finally(() => {
      busy = false;
    });
};

/**
 * onClick for the entries. `href` is the VALIDATED Houcine.Trades address (https, ends with "/").
 * Modified clicks (new tab, new window) keep the plain link: no note is created for them.
 */
export const openTrades = (href: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (!href.startsWith("https://") || !href.endsWith("/")) return;
  event.preventDefault();
  if (!TRADES_SSO_ENABLED) {
    showHandoff("not-configured", { retry: () => start(href), signInHref: href });
    return;
  }
  start(href);
};
