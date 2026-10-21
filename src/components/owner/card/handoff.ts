// The pure decisions of the Houcine.Trades hand-off screen (./HandoffScreen.tsx, ./openTrades.ts), tested from
// Node in ./handoff.test.mjs (no "@" imports, no browser code here).

export const ASSERTION_SHAPE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const SSO_PATH_SHAPE = /^[a-z0-9-]+$/;

/**
 * What the owner sees: nothing, the "Opening" screen, a failure with Try again, "your sign-in has ended", or
 * "not set up yet".
 */
export type HandoffView = "idle" | "opening" | "error" | "expired" | "not-configured";

export type HandoffOutcome = { kind: "go"; url: string } | { kind: "error" } | { kind: "expired" } | { kind: "not-configured" };

/** Why the request for a note did not get an answer from the function at all (status 0). */
export type NoAnswer = "no-session" | "network";

/**
 * From the answer of /api/assert to what happens next. Only a 200 with a well-formed assertion navigates, to
 * `href` + `ssoPath` + "#" + assertion (a fragment: never sent to a server, never a query string). The function
 * answers 503 when its settings are missing; 404 or 405, or a 200 that is not JSON (the site's page instead of
 * the function), mean the function is not deployed. No session means the owner's sign-in has ended. Anything else
 * is an error the owner may retry.
 */
export const handoffOutcome = (status: number, body: unknown, href: string, ssoPath: string, noAnswer?: NoAnswer): HandoffOutcome => {
  if (status === 0 && noAnswer === "no-session") return { kind: "expired" };
  if (status === 503 || status === 404 || status === 405) return { kind: "not-configured" };
  if (status === 200 && body === null) return { kind: "not-configured" };
  if (status !== 200) return { kind: "error" };
  const assertion = (body as { assertion?: unknown } | null)?.assertion;
  if (typeof assertion !== "string" || assertion.length >= 2048 || !ASSERTION_SHAPE.test(assertion)) return { kind: "error" };
  if (!href.startsWith("https://") || !href.endsWith("/") || href.includes("?") || href.includes("#")) return { kind: "error" };
  if (!SSO_PATH_SHAPE.test(ssoPath)) return { kind: "error" };
  return { kind: "go", url: `${href}${ssoPath}#${assertion}` };
};

/** A tiny store for the one screen, shared by the three entries. */
export const createHandoffStore = () => {
  let view: HandoffView = "idle";
  const listeners = new Set<() => void>();
  return {
    get: () => view,
    set: (next: HandoffView) => {
      view = next;
      for (const l of listeners) l();
    },
    subscribe: (l: () => void) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
};
