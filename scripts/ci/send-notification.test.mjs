// Tests of the send-notification function's rules (supabase/functions/send-notification/core.ts): what a
// visitor may send, what reaches the email, and who may call it. scripts/ci/send-notification-breaks.test.mjs
// breaks the module on purpose, one rule at a time, and checks that these tests then fail.
//
//   node --experimental-strip-types --test scripts/ci/send-notification.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const modulePath = process.env.SEND_NOTIFICATION_CORE_PATH ?? join(here, "../../supabase/functions/send-notification/core.ts");
const core = await import(pathToFileURL(modulePath).href);
const { checkSubmission, checkSubscription, escapeHtml, headerSafe, isAllowedOrigin, clientAddress, createRateLimiter, recipientFor, submissionEmail, subscriptionEmail, LIMITS } = core;

const valid = () => ({ pageName: "Booking", formType: "DJ Booking Request", userName: "Ana", userEmail: "ana@example.com" });
const headers = (h) => ({ get: (k) => h[k.toLowerCase()] ?? null });

// What each page of the site sends today (src/pages/*.tsx through src/hooks/useFormSubmission.ts).
const REAL_FORMS = [
  { pageName: "Houcine.world", formType: "Contact", userName: "Ana", userEmail: "ana@example.com", message: "Hello\nthere" },
  { pageName: "Houcine.tech", formType: "Quote Request", userName: "Ana", userEmail: "ana@example.com", serviceType: "Business Website Development", message: "A site", additionalData: { budget: "1500-3000" } },
  { pageName: "Houcine.studio", formType: "Quote Request", userName: "Ana", userEmail: "ana@example.com", serviceType: "branding", message: "A logo", additionalData: { paymentPreference: "card" } },
  { pageName: "Houcine.studio", formType: "Quote Request", userName: "Ana", userEmail: "ana@example.com", serviceType: "branding", message: "A logo" },
  { pageName: "Booking", formType: "DJ Booking Request", userName: "Ana", userEmail: "ana@example.com", userPhone: "+216 20 000 000", serviceType: "wedding", message: "Evening set", additionalData: { eventDate: "2026-12-31", eventLocation: "Tunis" } },
  { pageName: "Booking", formType: "DJ Booking Request", userName: "Ana", userEmail: "ana@example.com", serviceType: "wedding", additionalData: { eventDate: "2026-12-31", eventLocation: "Tunis" } },
];

test("every form the site sends today is accepted unchanged", () => {
  for (const form of REAL_FORMS) {
    const r = checkSubmission(form);
    assert.equal(r.ok, true, JSON.stringify(form));
    assert.equal(r.trap, false);
    assert.deepEqual(r.value, form);
  }
  for (const source of ["Houcine.education", "La Rosa View"]) {
    const r = checkSubscription({ email: "ana@example.com", source });
    assert.equal(r.ok, true, source);
    assert.deepEqual(r.value, { email: "ana@example.com", source });
  }
});

test("empty optional fields are treated as not given", () => {
  const r = checkSubmission({ ...valid(), userPhone: "", message: "  ", serviceType: null, additionalData: { eventDate: "", eventLocation: "" } });
  assert.equal(r.ok, true);
  assert.deepEqual(r.value, valid());
});

test("required fields are required", () => {
  for (const k of ["pageName", "formType", "userName", "userEmail"]) {
    const body = valid();
    delete body[k];
    assert.equal(checkSubmission(body).ok, false, k);
    assert.equal(checkSubmission({ ...valid(), [k]: "   " }).ok, false, `${k} blank`);
  }
  assert.equal(checkSubscription({ email: "ana@example.com" }).ok, false);
  assert.equal(checkSubscription({ source: "La Rosa View" }).ok, false);
});

test("unknown pages, form types and sources are refused", () => {
  assert.equal(checkSubmission({ ...valid(), pageName: "Evil page" }).ok, false);
  assert.equal(checkSubmission({ ...valid(), formType: "Admin" }).ok, false);
  assert.equal(checkSubscription({ email: "ana@example.com", source: "Elsewhere" }).ok, false);
});

test("unexpected fields are refused, at the top and inside additionalData", () => {
  for (const extra of [{ isAdmin: true }, { to: "attacker@example.com" }, { from: "x" }, { __proto__x: 1 }]) {
    const r = checkSubmission({ ...valid(), ...extra });
    assert.equal(r.ok, false, JSON.stringify(extra));
    assert.equal(r.error, "Unexpected field");
  }
  assert.equal(checkSubmission({ ...valid(), additionalData: { cc: "attacker@example.com" } }).ok, false);
  assert.equal(checkSubmission({ ...valid(), additionalData: ["x"] }).ok, false);
  assert.equal(checkSubscription({ email: "ana@example.com", source: "La Rosa View", bcc: "x@example.com" }).ok, false);
});

test("non-object bodies are refused", () => {
  for (const body of [null, "text", 42, [], [valid()]]) {
    assert.equal(checkSubmission(body).ok, false, JSON.stringify(body));
    assert.equal(checkSubscription(body).ok, false, JSON.stringify(body));
  }
});

test("every field has a length limit, exactly at the limit is accepted", () => {
  const cases = [
    ["userName", LIMITS.userName],
    ["userPhone", LIMITS.userPhone],
    ["serviceType", LIMITS.serviceType],
    ["message", LIMITS.message],
  ];
  for (const [field, max] of cases) {
    assert.equal(checkSubmission({ ...valid(), [field]: "a".repeat(max) }).ok, true, `${field} at ${max}`);
    assert.equal(checkSubmission({ ...valid(), [field]: "a".repeat(max + 1) }).ok, false, `${field} over ${max}`);
  }
  const longEmail = `${"a".repeat(LIMITS.userEmail)}@example.com`;
  assert.equal(checkSubmission({ ...valid(), userEmail: longEmail }).ok, false);
  assert.equal(checkSubmission({ ...valid(), additionalData: { eventLocation: "a".repeat(LIMITS.additionalValue + 1) } }).ok, false);
  assert.equal(checkSubmission({ ...valid(), message: "x".repeat(1_000_000) }).ok, false, "a huge message");
});

test("field types are checked", () => {
  for (const [k, v] of [["userName", 42], ["userEmail", ["a@b.co"]], ["message", { text: "x" }], ["userPhone", true], ["additionalData", "x"]]) {
    assert.equal(checkSubmission({ ...valid(), [k]: v }).ok, false, k);
  }
  assert.equal(checkSubmission({ ...valid(), additionalData: { budget: 5000 } }).ok, false);
});

test("an apostrophe before the @ is a valid address", () => {
  assert.equal(checkSubmission({ ...valid(), userEmail: "o'brien@example.com" }).ok, true);
  assert.equal(checkSubscription({ email: "o'brien@example.com", source: "La Rosa View" }).ok, true);
  assert.equal(checkSubmission({ ...valid(), userEmail: "ana@exa'mple.com" }).ok, false, "not in the domain");
});

test("emails must look like one address", () => {
  for (const bad of ["ana", "ana@", "@example.com", "ana@example", "ana example@x.com", "a@b.com, c@d.com", "a@b.com\r\nBcc: c@d.com", "<a@b.com>", 'a"b@c.com']) {
    assert.equal(checkSubmission({ ...valid(), userEmail: bad }).ok, false, bad);
    assert.equal(checkSubscription({ email: bad, source: "La Rosa View" }).ok, false, bad);
  }
});

test("line breaks are refused in one-line fields, kept in the message", () => {
  for (const k of ["userName", "userPhone", "serviceType"]) {
    assert.equal(checkSubmission({ ...valid(), [k]: "a\r\nBcc: x@example.com" }).ok, false, k);
  }
  assert.equal(checkSubmission({ ...valid(), additionalData: { eventLocation: "a\nb" } }).ok, false);
  assert.equal(checkSubmission({ ...valid(), message: "line one\nline two" }).ok, true);
});

test("control, invisible and direction characters are refused in every field", () => {
  for (const ch of ["\u0000", "\u0007", "\u001b", "\u007f", "\u0085", "\u200b", "\u200e", "\u202e", "\u2060", "\ufeff"]) {
    for (const k of ["userName", "userPhone", "serviceType", "message"]) {
      assert.equal(checkSubmission({ ...valid(), [k]: `a${ch}b` }).ok, false, `${k} with U+${ch.codePointAt(0).toString(16)}`);
    }
    assert.equal(checkSubmission({ ...valid(), userEmail: `an${ch}a@example.com` }).ok, false, `email with U+${ch.codePointAt(0).toString(16)}`);
    assert.equal(checkSubmission({ ...valid(), additionalData: { eventLocation: `a${ch}b` } }).ok, false);
  }
  assert.equal(checkSubmission({ ...valid(), userName: "a\tb" }).ok, false, "a tab in a one-line field");
  assert.equal(checkSubmission({ ...valid(), message: "a\tb\nc" }).ok, true, "tabs and line breaks in the message");
  assert.equal(checkSubmission({ ...valid(), userName: "Zoë Ångström-Nuñez 李" }).ok, true, "ordinary letters of any language");
});

test("the hidden trap field: empty is a person, filled is a robot", () => {
  assert.equal(checkSubmission({ ...valid(), website: "" }).trap, false);
  const robot = checkSubmission({ ...valid(), website: "http://spam.example" });
  assert.equal(robot.ok, true);
  assert.equal(robot.trap, true);
  assert.equal(checkSubscription({ email: "ana@example.com", source: "La Rosa View", website: "x" }).trap, true);
  assert.equal(checkSubmission({ ...valid(), website: 1 }).ok, false);
});

test("escapeHtml neutralises tags, attributes and entities", () => {
  assert.equal(escapeHtml(`<script>alert("x")</script>`), "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
  assert.equal(escapeHtml(`" onmouseover='x'`), "&quot; onmouseover=&#39;x&#39;");
  assert.equal(escapeHtml("&lt;"), "&amp;lt;");
  assert.equal(escapeHtml("plain"), "plain");
});

test("no visitor text reaches the email as HTML", () => {
  const attack = {
    pageName: "Booking",
    formType: "DJ Booking Request",
    userName: `<img src=x onerror=alert(1)>`,
    userEmail: "ana@example.com",
    userPhone: `<a href="https://evil.example">call</a>`,
    serviceType: `"><script>x()</script>`,
    message: `<a href="https://evil.example">click</a>\n<b>bold</b>`,
    additionalData: { eventLocation: "<iframe src=//evil.example>", eventDate: "&amp;" },
  };
  const r = checkSubmission(attack);
  assert.equal(r.ok, true);
  const { html } = submissionEmail(r.value, "now");
  for (const raw of ["<img", "<a href", "<script", "<iframe", "<b>"]) assert.ok(!html.includes(raw), `raw ${raw} in the email`);
  assert.ok(html.includes("&quot;&gt;&lt;script&gt;"), "a quote cannot close an attribute");
  assert.ok(html.includes("&lt;img src=x onerror=alert(1)&gt;"));
  assert.ok(html.includes("&amp;amp;"));
  const sub = subscriptionEmail({ email: "ana@example.com", source: "La Rosa View" }, "<b>now</b>").html;
  assert.ok(!sub.includes("<b>now"));
});

test("the subject never carries a line break or control character", () => {
  for (const evil of ["x\r\nBcc: a@b.com", "x\nTo: a@b.com", "x\u0000y", "x\u2028y", "x\u007fy", "x\ty"]) {
    const h = headerSafe(evil);
    assert.doesNotMatch(h, /[\u0000-\u001f\u007f\u2028\u2029]/, JSON.stringify(evil));
  }
  assert.equal(headerSafe("a\r\n\r\nb"), "a b");
  assert.equal(headerSafe("x".repeat(500)).length, 200);
  const r = checkSubmission(valid());
  assert.equal(submissionEmail(r.value, "now").subject, "New DJ Booking Request from Booking");
  assert.equal(subscriptionEmail({ email: "a@b.co", source: "La Rosa View" }, "now").subject, "New subscriber from La Rosa View");
});

test("only the site's own origins may call", () => {
  for (const o of ["https://houcine.world", "https://www.houcine.world", "https://houcineworld.netlify.app", "https://deploy-preview-41--houcineworld.netlify.app", "http://localhost:8080"]) {
    assert.equal(isAllowedOrigin(o), true, o);
  }
  for (const o of [null, "", "null", "http://houcine.world", "https://houcine.world.evil.example", "https://evilhoucine.world", "https://evil.example", "https://x--houcineworld.netlify.app.evil.example", "https://a.b--houcineworld.netlify.app", "https://houcineworld.netlify.app/", "http://localhost:3000", "http://localhost:8080.evil.example", "https://localhost:8080"]) {
    assert.equal(isAllowedOrigin(o), false, String(o));
  }
});

test("the caller's address: platform header first, unknown when absent", () => {
  assert.equal(clientAddress(headers({ "cf-connecting-ip": "1.2.3.4", "x-forwarded-for": "9.9.9.9" })), "1.2.3.4");
  assert.equal(clientAddress(headers({ "x-forwarded-for": "5.6.7.8, 10.0.0.1" })), "5.6.7.8");
  assert.equal(clientAddress(headers({})), null);
  assert.equal(clientAddress(headers({ "x-forwarded-for": " , " })), null);
});

test("the rate limit: at most 5 per address in 10 minutes, unknown addresses refused", () => {
  const allow = createRateLimiter();
  const t0 = 1_000_000;
  for (let i = 0; i < 5; i++) assert.equal(allow("1.1.1.1", t0 + i), true, `request ${i + 1}`);
  assert.equal(allow("1.1.1.1", t0 + 10), false, "sixth request");
  assert.equal(allow("2.2.2.2", t0 + 10), true, "another address is independent");
  assert.equal(allow("1.1.1.1", t0 + 10 * 60_000 - 1), false, "still inside the window");
  assert.equal(allow("1.1.1.1", t0 + 10 * 60_000 + 5), true, "after the window");
  assert.equal(allow(null, t0), false);
  assert.equal(allow("", t0), false);
});

test("the rate limit table is bounded: when full, new addresses are refused", () => {
  const allow = createRateLimiter({ maxAddresses: 2 });
  assert.equal(allow("a", 0), true);
  assert.equal(allow("b", 0), true);
  assert.equal(allow("c", 0), false);
  assert.equal(allow("a", 1), true, "a known address still counts normally");
});

test("recipients come from the secrets only, La Rosa View has its own", () => {
  const s = { toDefault: "owner@example.com", toLaRosaView: "larosa@example.com" };
  assert.equal(recipientFor("Houcine.world", s), "owner@example.com");
  assert.equal(recipientFor("Booking", s), "larosa@example.com");
  assert.equal(recipientFor("La Rosa View", s), "larosa@example.com");
  assert.equal(recipientFor("La Rosa View", { toDefault: "owner@example.com" }), "owner@example.com");
  assert.equal(recipientFor("Houcine.world", {}), null);
  assert.equal(recipientFor("Houcine.world", { toDefault: "not an address" }), null);
});

// Houcine.tech quote budgets (checkTechBudget): a budget must reach the chosen service's starting price.
const PRICES = { "Landing Page Development": [699, "one-time"], "SaaS Product Development": [4999, "one-time"], "Website Care": [699, "monthly"] };
const techQuote = (serviceType, budget) => ({ pageName: "Houcine.tech", formType: "Quote Request", userName: "Ana", userEmail: "ana@example.com", serviceType, additionalData: budget === undefined ? undefined : { budget } });

test("a Houcine.tech budget below the service's starting price is refused", () => {
  assert.notEqual(core.checkTechBudget(techQuote("SaaS Product Development", "699-1500"), PRICES), null);
  assert.notEqual(core.checkTechBudget(techQuote("SaaS Product Development", "3000-4999"), PRICES), null);
  assert.equal(core.checkTechBudget(techQuote("SaaS Product Development", "4999-6000"), PRICES), null);
  assert.equal(core.checkTechBudget(techQuote("Landing Page Development", "699-1500"), PRICES), null);
});

test("a Houcine.tech budget must match the service's billing period and a known service", () => {
  assert.notEqual(core.checkTechBudget(techQuote("Website Care", "699-1000"), PRICES), null);
  assert.equal(core.checkTechBudget(techQuote("Website Care", "699-1000/month"), PRICES), null);
  assert.notEqual(core.checkTechBudget(techQuote("Landing Page Development", "699-1000/month"), PRICES), null);
  assert.notEqual(core.checkTechBudget(techQuote("Unknown service", "699-1500"), PRICES), null);
  assert.notEqual(core.checkTechBudget(techQuote("Landing Page Development", "5k-10k"), PRICES), null);
  assert.equal(core.checkTechBudget(techQuote("Landing Page Development", undefined), PRICES), null);
});
