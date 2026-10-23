// The pure part of the send-notification function: validation, escaping, the origin check, the rate limit and
// the email text. No Deno, network or database code here, so the Node tests (scripts/ci/send-notification
// .test.mjs) import this file directly. index.ts wires it to the request, the database and the mail sender.
//
// Rules (docs/owner-review-guide.md, topic 1):
// - Only known fields are accepted, each with a length limit; anything else is refused (400).
// - Every visitor-supplied value is HTML-escaped before it enters the email; anything that reaches the subject
//   loses CR, LF and every other control character.
// - The hidden "website" field (a trap for robots) must be empty; when it is not, nothing is saved or sent,
//   and the robot gets the same success answer as a person.
// - Requests come only from the site's own origins.
// - A simple per-address limit, kept in the function's memory: best-effort (each running copy of the function
//   has its own memory, and a restart clears it), and it refuses when the address is unknown.

export const LIMITS = {
  userName: 100,
  userEmail: 254,
  userPhone: 40,
  serviceType: 100,
  message: 5000,
  additionalValue: 200,
} as const;

/** The pages whose forms post here, and what each sends (src/pages/*.tsx). */
export const PAGES = ["Houcine.world", "Houcine.tech", "Houcine.studio", "Houcine.education", "La Rosa View", "Booking"] as const;
export const FORM_TYPES = ["Contact", "Quote Request", "DJ Booking Request"] as const;
export const SUBSCRIBE_SOURCES = ["Houcine.education", "La Rosa View"] as const;
export const ADDITIONAL_KEYS = ["paymentPreference", "budget", "eventDate", "eventLocation"] as const;

const SUBMIT_FIELDS = new Set(["pageName", "formType", "userName", "userEmail", "userPhone", "serviceType", "message", "additionalData", "website"]);
const SUBSCRIBE_FIELDS = new Set(["email", "source", "website"]);

// One address: no spaces, brackets, quotes (an apostrophe is allowed before the @, as in o'brien@...), commas or
// semicolons, so a value can never hold a second address or break out of where it is used.
const EMAIL = /^[^\s@<>"(),;:\\[\]]+@[^\s@<>"'(),;:\\[\]]+\.[^\s@<>"'(),;:\\[\]]+$/;
// Characters no field may hold: controls (C0, DEL, C1), zero-width and direction marks, line separators, BOM.
// Line breaks and tabs are allowed in the message only (see textOf).
// eslint-disable-next-line no-control-regex
const FORBIDDEN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2028\u2029\u2060\ufeff]/;
// Every C0 control character, DEL, and the Unicode line and paragraph separators.
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f\u2028\u2029]/g;

export interface Submission {
  pageName: (typeof PAGES)[number];
  formType: (typeof FORM_TYPES)[number];
  userName: string;
  userEmail: string;
  userPhone?: string;
  serviceType?: string;
  message?: string;
  additionalData?: Partial<Record<(typeof ADDITIONAL_KEYS)[number], string>>;
}

export interface Subscription {
  email: string;
  source: (typeof SUBSCRIBE_SOURCES)[number];
}

export type Checked<T> = { ok: true; value: T; trap: boolean } | { ok: false; error: string };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** A required text: a string, trimmed, not empty, within the limit. Line breaks are kept only where allowed. */
const textOf = (v: unknown, max: number, multiline = false): string | null => {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (s === "" || s.length > max) return null;
  if (!multiline && /[\r\n\t]/.test(s)) return null;
  if (FORBIDDEN.test(s)) return null;
  return s;
};

/** An optional text: absent, null or empty means "not given". */
const optionalText = (v: unknown, max: number, multiline = false): string | undefined | null => {
  if (v === undefined || v === null || (typeof v === "string" && v.trim() === "")) return undefined;
  return textOf(v, max, multiline);
};

const emailOf = (v: unknown): string | null => {
  const s = textOf(v, LIMITS.userEmail);
  return s && EMAIL.test(s) ? s : null;
};

const trapOf = (body: Record<string, unknown>): boolean | null => {
  const w = body.website;
  if (w === undefined || w === "") return false;
  return typeof w === "string" ? true : null;
};

const unknownField = (body: Record<string, unknown>, allowed: Set<string>): string | undefined => Object.keys(body).find((k) => !allowed.has(k));

export const checkSubmission = (body: unknown): Checked<Submission> => {
  if (!isRecord(body)) return { ok: false, error: "Invalid request body" };
  const extra = unknownField(body, SUBMIT_FIELDS);
  if (extra !== undefined) return { ok: false, error: "Unexpected field" };
  const trap = trapOf(body);
  if (trap === null) return { ok: false, error: "Invalid field: website" };

  if (!(PAGES as readonly unknown[]).includes(body.pageName) || !(FORM_TYPES as readonly unknown[]).includes(body.formType)) {
    return { ok: false, error: "Missing required fields: pageName, formType, userName, userEmail" };
  }
  const userName = textOf(body.userName, LIMITS.userName);
  const userEmail = emailOf(body.userEmail);
  if (!userName || !userEmail) return { ok: false, error: "Missing required fields: pageName, formType, userName, userEmail" };

  const userPhone = optionalText(body.userPhone, LIMITS.userPhone);
  const serviceType = optionalText(body.serviceType, LIMITS.serviceType);
  const message = optionalText(body.message, LIMITS.message, true);
  if (userPhone === null) return { ok: false, error: "Invalid field: userPhone" };
  if (serviceType === null) return { ok: false, error: "Invalid field: serviceType" };
  if (message === null) return { ok: false, error: "Invalid field: message" };

  let additionalData: Submission["additionalData"];
  if (body.additionalData !== undefined && body.additionalData !== null) {
    if (!isRecord(body.additionalData)) return { ok: false, error: "Invalid field: additionalData" };
    additionalData = {};
    for (const [k, v] of Object.entries(body.additionalData)) {
      if (!(ADDITIONAL_KEYS as readonly string[]).includes(k)) return { ok: false, error: "Unexpected field" };
      const t = optionalText(v, LIMITS.additionalValue);
      if (t === null) return { ok: false, error: "Invalid field: additionalData" };
      if (t !== undefined) additionalData[k as (typeof ADDITIONAL_KEYS)[number]] = t;
    }
    if (Object.keys(additionalData).length === 0) additionalData = undefined;
  }

  return {
    ok: true,
    trap,
    value: {
      pageName: body.pageName as Submission["pageName"],
      formType: body.formType as Submission["formType"],
      userName,
      userEmail,
      ...(userPhone ? { userPhone } : {}),
      ...(serviceType ? { serviceType } : {}),
      ...(message ? { message } : {}),
      ...(additionalData ? { additionalData } : {}),
    },
  };
};

export const checkSubscription = (body: unknown): Checked<Subscription> => {
  if (!isRecord(body)) return { ok: false, error: "Invalid request body" };
  if (unknownField(body, SUBSCRIBE_FIELDS) !== undefined) return { ok: false, error: "Unexpected field" };
  const trap = trapOf(body);
  if (trap === null) return { ok: false, error: "Invalid field: website" };
  const email = emailOf(body.email);
  if (!email || !(SUBSCRIBE_SOURCES as readonly unknown[]).includes(body.source)) {
    return { ok: false, error: "Missing required fields: email, source" };
  }
  return { ok: true, trap, value: { email, source: body.source as Subscription["source"] } };
};

/** Text that is safe inside HTML element content and inside a double-quoted attribute. */
export const escapeHtml = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Text that is safe in a mail header: no CR, LF or other control character, single spaces, at most 200 characters. */
export const headerSafe = (s: string): string => s.replace(CONTROL, " ").replace(/\s+/g, " ").trim().slice(0, 200);

const BUDGET = /^(?:(\d{1,7})-(\d{1,7})|over-(\d{1,7}))(\/month)?$/;

/**
 * Houcine.tech quote requests: a budget must belong to a known service, use that service's billing period
 * (one-time or "/month"), and reach at least the service's starting price. `prices` is the server copy of the
 * catalogue (techPrices.ts). Returns an error message, or null when the submission is fine.
 */
export const checkTechBudget = (
  s: Submission,
  prices: Record<string, readonly [number, "one-time" | "monthly"]>,
): string | null => {
  const budget = s.additionalData?.budget;
  if (s.pageName !== "Houcine.tech" || budget === undefined) return null;
  const price = s.serviceType !== undefined && Object.prototype.hasOwnProperty.call(prices, s.serviceType) ? prices[s.serviceType] : undefined;
  if (!price) return "Invalid field: budget";
  const m = BUDGET.exec(budget);
  if (!m) return "Invalid field: budget";
  const [from, billing] = price;
  if ((m[4] === "/month") !== (billing === "monthly")) return "Invalid field: budget";
  if (m[3] !== undefined) return null;
  const min = Number(m[1]);
  const max = Number(m[2]);
  if (min >= max || max <= from) return "Budget is below the service's starting price";
  return null;
};

/** The site's own origins: the domain, the Netlify site and its deploy previews, and the local dev server. */
export const isAllowedOrigin = (origin: string | null): boolean =>
  origin !== null &&
  (origin === "https://houcine.world" ||
    origin === "http://localhost:8080" ||
    origin === "https://www.houcine.world" ||
    origin === "https://houcineworld.netlify.app" ||
    /^https:\/\/[a-z0-9-]+--houcineworld\.netlify\.app$/.test(origin));

/**
 * The caller's address as the platform reports it; null when it cannot be told. Best-effort: cf-connecting-ip
 * is set by the platform's edge; the first X-Forwarded-For entry is a fallback that a caller could fake.
 */
export const clientAddress = (headers: { get(name: string): string | null }): string | null => {
  const direct = headers.get("cf-connecting-ip")?.trim();
  if (direct) return direct;
  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first ? first : null;
};

/**
 * At most `max` requests per address in a sliding `windowMs`. Fails closed: an unknown address is refused, and
 * the table never holds more than `maxAddresses` (when full, new addresses are refused until old ones expire).
 */
export const createRateLimiter = ({ max = 5, windowMs = 10 * 60_000, maxAddresses = 10_000 } = {}) => {
  const hits = new Map<string, number[]>();
  return (address: string | null, now: number): boolean => {
    if (!address) return false;
    for (const [a, times] of hits) {
      const recent = times.filter((t) => now - t < windowMs);
      if (recent.length === 0) hits.delete(a);
      else hits.set(a, recent);
    }
    const times = hits.get(address) ?? [];
    if (times.length >= max) return false;
    if (!hits.has(address) && hits.size >= maxAddresses) return false;
    hits.set(address, [...times, now]);
    return true;
  };
};

/** Where an email goes, from the function's secrets only: La Rosa View has its own inbox, every other page the default. */
export const recipientFor = (page: string, secrets: { toDefault?: string; toLaRosaView?: string }): string | null => {
  const to = page === "La Rosa View" || page === "Booking" ? secrets.toLaRosaView || secrets.toDefault : secrets.toDefault;
  return to && EMAIL.test(to) ? to : null;
};

const row = (label: string, value: string) => `<p style="margin: 8px 0;"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`;

export const submissionEmail = (s: Submission, receivedAt: string) => ({
  subject: headerSafe(`New ${s.formType} from ${s.pageName}`),
  html: [
    `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">`,
    `<h1 style="font-size: 20px;">New ${escapeHtml(s.formType)}</h1>`,
    `<p>from ${escapeHtml(s.pageName)}</p>`,
    row("Name", s.userName),
    row("Email", s.userEmail),
    s.userPhone ? row("Phone", s.userPhone) : "",
    s.serviceType ? row("Service", s.serviceType) : "",
    s.message ? `<h2 style="font-size: 16px;">Message</h2><p style="white-space: pre-wrap;">${escapeHtml(s.message)}</p>` : "",
    ...Object.entries(s.additionalData ?? {}).map(([k, v]) => row(k, v ?? "")),
    `<p style="font-size: 12px; color: #6b7280;">Received on ${escapeHtml(receivedAt)}</p>`,
    `</div>`,
  ].join("\n"),
});

export const subscriptionEmail = (s: Subscription, receivedAt: string) => ({
  subject: headerSafe(`New subscriber from ${s.source}`),
  html: [
    `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">`,
    `<h1 style="font-size: 20px;">New subscriber</h1>`,
    `<p>from ${escapeHtml(s.source)}</p>`,
    row("Email", s.email),
    `<p style="font-size: 12px; color: #6b7280;">Subscribed on ${escapeHtml(receivedAt)}</p>`,
    `</div>`,
  ].join("\n"),
});
