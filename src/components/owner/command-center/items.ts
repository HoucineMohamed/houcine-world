// The owner command center on /workspace/ecosystem (owner chunk only): every manual step the owner still has,
// grouped, each with one plain sentence and an exact click path, and the static facts of Houcine.Trades. Pure
// data and helpers, tested from Node in ./items.test.mjs (no "@" imports, no browser code).

export interface SetupItem {
  id: string;
  title: string;
  /** One plain sentence: what and why. */
  why: string;
  /** The exact click path. */
  path: string;
}

export interface SetupGroup {
  id: string;
  title: string;
  items: SetupItem[];
}

export const SETUP_GROUPS: readonly SetupGroup[] = [
  {
    id: "handoff",
    title: "Houcine.Trades hand-off",
    items: [
      { id: "keys", title: "Create the key pair", why: "The pair lets houcine.world sign a short note that Houcine.Trades can check.", path: "This page → Private apps → Single sign-on setup → Create a new key pair" },
      { id: "netlify-vars", title: "Add the Netlify variables, scopes Production + Functions only", why: "The hand-off function reads SSO_PRIVATE_KEY, OWNER_USER_ID and TRADES_AUDIENCE from Netlify, nowhere else.", path: "app.netlify.com → houcineworld → Site configuration → Environment variables → Add a variable (scopes: Production, Functions)" },
      { id: "audience", title: "Set the same audience on both sides", why: "The note is accepted only when TRADES_AUDIENCE equals the audience saved in Houcine.Trades.", path: "Netlify: TRADES_AUDIENCE · Houcine.Trades: /security/sso → Audience" },
      { id: "owner-id", title: "Pin your owner id on both sides", why: "Only notes about your own account are accepted: the same user id in OWNER_USER_ID and in Houcine.Trades.", path: "Supabase → Authentication → Users → your row → User UID · Houcine.Trades: /security/sso → Owner id" },
      { id: "public-key", title: "Paste the public key and switch sign-on on", why: "Houcine.Trades checks each note with the public key; sign-on stays off until you switch it on.", path: "Houcine.Trades: /security/sso → Public key → Save → Switch on" },
    ],
  },
  {
    id: "supabase",
    title: "Supabase",
    items: [
      { id: "token", title: "Check the deploy token", why: "The Deploy Supabase workflow needs a valid token to apply database rules and functions; replace it when it says so.", path: "supabase.com/dashboard/account/tokens → Generate new token · GitHub → houcine-world → Settings → Secrets and variables → Actions → SUPABASE_ACCESS_TOKEN → Update" },
      { id: "function-secrets", title: "Check the form email secrets", why: "Form emails go from NOTIFY_FROM to NOTIFY_TO (and NOTIFY_TO_LAROSAVIEW for La Rosa View).", path: "Supabase → Edge Functions → Secrets → Add new secret" },
      { id: "deploy-function", title: "Deploy the form function after each change", why: "Deploy Supabase does not deploy send-notification, so a new version goes live when you deploy it.", path: "Supabase → Edge Functions → send-notification → Deploy (or add it to the list in .github/workflows/supabase-deploy.yml)" },
      { id: "signups", title: "Check that new sign-ups are off", why: "Members are invited; nobody creates an account on their own.", path: "Supabase → Authentication → Sign In / Providers → Allow new users to sign up → off → Save" },
      { id: "magic-link", title: "Test a magic link", why: "After any sign-in setting changes, make sure you can still get in.", path: "houcine.world/workspace/login → your email → open the newest email → the link opens the workspace" },
    ],
  },
  {
    id: "domains",
    title: "Domains (in this order)",
    items: [
      { id: "trades-domain", title: "Point trades.houcine.world at Render", why: "Houcine.Trades gets its own address; the old one keeps working meanwhile.", path: "Render → the service → Settings → Custom Domains → Add · your DNS → CNAME trades → the onrender.com target · wait for the certificate" },
      { id: "trades-url", title: "Then change TRADES_URL", why: "The owner cards open the new address.", path: "Ask a session: set TRADES_URL in src/config/trades.ts (a pull request that waits for you)" },
      { id: "trades-audience", title: "At the same time, change TRADES_AUDIENCE and the Trades audience", why: "All three must name the new host, or the hand-off falls back to the sign-in page.", path: "Netlify → TRADES_AUDIENCE · Houcine.Trades /security/sso → Audience · then merge the TRADES_URL pull request (docs/domain-migration-plan.md, step 4)" },
      { id: "remove-onrender", title: "Last, remove onrender.com", why: "Once the new address works, the old host is no longer allowed.", path: "Ask a session: remove \"onrender.com\" from TRADES_HOST_ALLOWLIST in src/config/trades.ts" },
    ],
  },
  {
    id: "hosting",
    title: "Hosting",
    items: [
      { id: "vercel", title: "Check that Vercel is disconnected", why: "Netlify is the only live host; an old Vercel project should not build the site.", path: "vercel.com → the old project → Settings → Git → Disconnect (then Settings → Advanced → Delete Project if unused)" },
    ],
  },
  {
    id: "legal",
    title: "Legal",
    items: [
      { id: "legal-placeholders", title: "Fill in the legal placeholders", why: "The Terms, Privacy and Data Deletion pages need the legal entity, jurisdiction, contact and address.", path: "GitHub → houcine-world → src/data/legal.ts → edit (or ask a session), then have a professional review the pages" },
    ],
  },
  {
    id: "content",
    title: "Content",
    items: [
      { id: "portfolio", title: "Add real portfolio items", why: "Work and Selected work show \"Coming soon\" until real, published projects are added.", path: "Ask a session, or edit src/content/work.ts (docs/content-guide.md)" },
      { id: "testimonials", title: "Confirm or replace the testimonials", why: "Only real quotes from real people, with their agreement, may stay on /designs and /reads.", path: "Ask a session to keep or remove the quotes written into /designs and /reads; new quotes go in src/content/testimonials.ts (docs/content-guide.md)" },
    ],
  },
];

/** The Houcine.Trades owner pages the card links to (paths on its own address), from one list. */
export const TRADES_OWNER_PAGES: readonly { label: string; path: string }[] = [
  { label: "Security", path: "security" },
  { label: "Single sign-on setup", path: "security/sso" },
  { label: "Backups", path: "backups" },
];

/** The one-time end-to-end test (docs/trades-integration.md, section 10), short form. */
export const END_TO_END_STEPS: readonly string[] = [
  "Signed out: no Houcine.Trades card anywhere on houcine.world.",
  "As a Brand Admin: no card, no sidebar row, no Private apps section.",
  "As the super admin: Single sign-on setup → Check now says Working.",
  "Click a Houcine.Trades card: Opening Houcine.Trades… then it opens in this tab and asks for your code.",
  "The address bar shows …/sso and then Houcine.Trades' own page, nothing after a ?.",
];

/** A link to a Houcine.Trades page from the validated address (https, ends with "/"); null when there is none. */
export const tradesPageUrl = (base: string | null, path: string): string | null =>
  base && base.startsWith("https://") && base.endsWith("/") && /^[a-z0-9/-]+$/.test(path) ? `${base}${path}` : null;

/** The browser storage key of the ticks and the verification date (this browser only). */
export const STORAGE_KEY = "hw-owner-command-center-v1";

export interface SavedState {
  done: Record<string, boolean>;
  /** The date of the last manual end-to-end verification, YYYY-MM-DD, or "". */
  verifiedOn: string;
  /** false when a saved state existed but could not be read (it is then left as it was, not overwritten). */
  readable?: boolean;
}

/** A real calendar date in YYYY-MM-DD form (not 2026-02-30 or 9999-99-99). */
export const isRealDate = (s: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

const EMPTY: SavedState = { done: {}, verifiedOn: "" };
const KNOWN_IDS = new Set(SETUP_GROUPS.flatMap((g) => g.items.map((i) => i.id)));

type StorageLike = { getItem(k: string): string | null; setItem(k: string, v: string): void };

/** Reads the saved state; anything missing, broken or unexpected gives the empty state (the page works without it). */
export const loadState = (storage: StorageLike | null | undefined): SavedState => {
  const unreadable = { ...EMPTY, readable: false };
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return unreadable;
    const p = parsed as { done?: unknown; verifiedOn?: unknown };
    const done: Record<string, boolean> = {};
    if (typeof p.done === "object" && p.done !== null) {
      for (const [k, v] of Object.entries(p.done)) if (KNOWN_IDS.has(k) && v === true) done[k] = true;
    }
    const verifiedOn = typeof p.verifiedOn === "string" && isRealDate(p.verifiedOn) ? p.verifiedOn : "";
    return { done, verifiedOn };
  } catch {
    return unreadable;
  }
};

/** Saves the state; a browser that refuses storage (private window, full, blocked) is ignored. */
export const saveState = (storage: StorageLike | null | undefined, state: SavedState): boolean => {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify({ done: state.done, verifiedOn: state.verifiedOn }));
    return Boolean(storage);
  } catch {
    return false;
  }
};
