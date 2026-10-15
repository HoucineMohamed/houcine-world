import { supabase } from "@/lib/supabaseClient";
import { TRADES_ASSERT_ENDPOINT, TRADES_SSO_ENABLED, TRADES_SSO_PATH } from "@/config/trades";

// Click handler shared by the three owner-only Houcine.Trades entries (docs/trades-integration.md).
// The Supabase access token is read from the existing client and sent ONLY to this site's own
// Netlify Function (same origin). What leaves for Houcine.Trades is the short signed assertion,
// in the URL fragment (never a query string, so it is not sent to any server). Nothing is logged,
// stored or tracked. Any failure opens the plain Houcine.Trades sign-in page instead.

const ASSERTION_SHAPE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const TIMEOUT_MS = 8000;

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

const go = (url: string) => {
  noReferrer();
  window.location.assign(url);
};

/** Ask this site's own function for an assertion; null on any problem. */
const fetchAssertion = async (): Promise<string | null> => {
  try {
    const { data, error } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (error || typeof accessToken !== "string" || accessToken === "") return null;
    const response = await fetch(TRADES_ASSERT_ENDPOINT, {
      method: "POST",
      headers: { authorization: `Bearer ${accessToken}` },
      credentials: "same-origin",
      cache: "no-store",
      redirect: "error",
      referrerPolicy: "no-referrer",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (response.status !== 200) return null;
    const body: unknown = await response.json();
    const assertion = (body as { assertion?: unknown } | null)?.assertion;
    return typeof assertion === "string" && assertion.length < 2048 && ASSERTION_SHAPE.test(assertion) ? assertion : null;
  } catch {
    return null;
  }
};

let busy = false;

/**
 * onClick for the entries. `href` is the VALIDATED Houcine.Trades address (https, ends with "/").
 * Modified clicks (new tab, new window) keep the plain link: no assertion is created for them.
 */
export const openTrades = (href: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (!TRADES_SSO_ENABLED || !href.startsWith("https://") || !href.endsWith("/")) return;
  event.preventDefault();
  if (busy) return;
  busy = true;
  void fetchAssertion().then((assertion) => {
    busy = false;
    go(assertion ? `${href}${TRADES_SSO_PATH}#${assertion}` : href);
  });
};
