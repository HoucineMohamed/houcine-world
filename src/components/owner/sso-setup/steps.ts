// The setup steps of the Houcine.Trades hand-off, in order, in plain words (./Checklist.tsx shows them).
// Pure and tested from Node in ./steps.test.mjs: no "@" imports, no browser code.

/** Netlify variables the assert function reads, all with the scopes "Production" and "Functions". */
export const NETLIFY_VARIABLES = [
  { name: "SSO_PRIVATE_KEY", value: "the private key from step 2 (mark it as a secret)", secret: true },
  { name: "OWNER_USER_ID", value: "your user id, shown below", secret: false },
  { name: "TRADES_AUDIENCE", value: "the audience value, shown below", secret: false },
  { name: "VITE_SUPABASE_URL", value: "already there for the site: check that its scopes include Functions", secret: false },
  { name: "VITE_SUPABASE_PUBLISHABLE_KEY", value: "already there for the site: check that its scopes include Functions", secret: false },
] as const;

export const SCOPES = "Production + Functions";

export interface Step {
  id: string;
  title: string;
  detail: string;
  /** "auto": turns green by itself (the live check); "manual": you tick it when done. */
  kind: "auto" | "manual";
}

export const STEPS: readonly Step[] = [
  { id: "trades-ready", title: "Houcine.Trades has its sign-on page", detail: "Houcine.Trades must already have its /sso page and a settings page for the public key. Without it, stop here: the cards keep opening the normal sign-in page.", kind: "manual" },
  { id: "keys", title: "Create a key pair", detail: "Click Create a new key pair below. The keys are made in this browser and shown once; nothing is sent or saved.", kind: "manual" },
  { id: "netlify", title: "Add the five Netlify variables", detail: `app.netlify.com → the houcineworld site → Site configuration → Environment variables → Add a variable. For each one choose the scopes ${SCOPES} (and "Contains secret values" for the private key).`, kind: "manual" },
  { id: "public-key", title: "Paste the public key into Houcine.Trades", detail: "In Houcine.Trades, open its settings page and paste the public key. It is safe to share: it can only check signatures.", kind: "manual" },
  { id: "redeploy", title: "Redeploy the site", detail: "Netlify → Deploys → Trigger deploy → Deploy site. The function reads the variables only after a new deploy.", kind: "manual" },
  { id: "check", title: "Check the hand-off", detail: "Click Check now. It asks the function for a note exactly as the cards do, then throws the note away (nothing opens).", kind: "auto" },
  { id: "open", title: "Open Houcine.Trades from a card", detail: "Click any Houcine.Trades card: it should open signed in, or at its authenticator step. If it shows the normal sign-in page, one value is wrong: check the audience and the public key.", kind: "manual" },
];

/** The audience value: the Houcine.Trades host, as the function expects it (no https://, no slash). */
export const audienceFor = (tradesUrl: string): string | null => {
  try {
    const u = new URL(tradesUrl);
    return u.protocol === "https:" && u.hostname ? u.hostname.toLowerCase() : null;
  } catch {
    return null;
  }
};

export type CheckResult = "ok" | "not-configured" | "not-deployed" | "refused" | "busy" | "expired" | "failed";

/** What the live check found, from the function's answer (`noSession`: there was no sign-in to send). */
export const checkResult = (status: number, noSession = false): CheckResult =>
  status === 200 ? "ok"
  : status === 503 ? "not-configured"
  : status === 404 || status === 405 ? "not-deployed"
  : status === 403 ? "refused"
  : status === 429 ? "busy"
  : status === 0 && noSession ? "expired"
  : "failed";

export const CHECK_TEXT: Record<CheckResult, string> = {
  ok: "Working: the function signed a note for you. The checklist is complete once a card opens Houcine.Trades signed in.",
  "not-configured": "Not set up yet: at least one Netlify variable is missing or malformed, or the site was not redeployed after adding them (steps 3 and 5).",
  "not-deployed": "The function was not found: the site was deployed without it. Trigger a new deploy on Netlify (step 5).",
  refused: "Refused. Try once more in a minute (Supabase may not have answered); if it is refused again, check OWNER_USER_ID against the id below, and that your account is the super admin.",
  expired: "Your sign-in has ended. Sign in to the workspace again, then check.",
  busy: "Too many checks in a minute. Wait a minute and check again.",
  failed: "The check could not reach the function. Check your connection, then try again.",
};
