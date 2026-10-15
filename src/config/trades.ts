// Address of the separate, private Houcine.Trades app (see docs/trades-integration.md).
//
// This module is only loaded through a dynamic import, after the super-admin
// check passes, so it is not part of the main public bundle. Hiding the card is
// a convenience, not secrecy: Houcine.Trades protects itself with its own
// single-owner login (password + authenticator code).

/**
 * The Houcine.Trades address. EMPTY until the app is deployed: while it is empty
 * or invalid, the card is shown disabled ("Not deployed yet") with no link.
 * Example once deployed: "https://trades.houcine.world"
 */
export const TRADES_URL = "https://houcine-trades.onrender.com";

/**
 * Hostnames the address may live under. Only SUBDOMAINS count
 * ("trades.houcine.world" is allowed, "houcine.world" itself and
 * "evilhoucine.world" are not). Edit this list to allow another host.
 */
export const TRADES_HOST_ALLOWLIST: readonly string[] = ["houcine.world", "onrender.com"];

/**
 * Signed hand-off to Houcine.Trades (docs/trades-integration.md). On click, the owner's browser asks
 * this site's own Netlify Function for a 60-second signed assertion and opens
 * TRADES_URL + TRADES_SSO_PATH + "#" + assertion. The Supabase token never leaves this site.
 * Set to false to stop trying: the entries then open the plain sign-in page.
 */
export const TRADES_SSO_ENABLED = true;
export const TRADES_SSO_PATH = "sso";
export const TRADES_ASSERT_ENDPOINT = "/api/assert";

/**
 * Pure validator. Returns the address to link to ("https://host/"), or null
 * when the value is not acceptable. Accepted only if ALL of these hold:
 * - it parses as an https URL;
 * - no username or password, no query ("?"), no fragment ("#"), no port, no path;
 * - the hostname is a subdomain of an entry in the allowlist;
 * - the text is already in its plain form ("https://host" or "https://host/"),
 *   so nothing unusual (spaces, capitals, backslashes, odd encodings) slips through.
 */
export const validateTradesUrl = (
  raw: unknown,
  allowlist: readonly string[] = TRADES_HOST_ALLOWLIST,
): string | null => {
  if (typeof raw !== "string" || raw === "") return null;
  if (raw.includes("?") || raw.includes("#") || raw.includes("@")) return null;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  if (url.protocol !== "https:") return null;
  if (url.username !== "" || url.password !== "") return null;
  if (url.search !== "" || url.hash !== "") return null;
  if (url.port !== "") return null;
  if (url.pathname !== "/") return null;

  const origin = `https://${url.hostname}`;
  if (raw !== origin && raw !== `${origin}/`) return null;

  const host = url.hostname;
  const allowed = allowlist.some((entry) => {
    const suffix = entry.trim().toLowerCase();
    if (suffix === "" || suffix.startsWith(".")) return false;
    return host.length > suffix.length + 1 && host.endsWith(`.${suffix}`);
  });
  if (!allowed) return null;

  return `${origin}/`;
};
