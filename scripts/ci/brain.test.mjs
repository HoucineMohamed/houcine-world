// The Houcine.world knowledge brain (docs/knowledge-brain.md): the notes are valid, the committed index matches them,
// non-public notes never reach it, the facts code also uses agree with the site, and retrieval finds the right notes
// for the evaluation set (scripts/brain/evals/concierge-cases.json) -- within the agent's brands only.
//
//   node --experimental-strip-types --test scripts/ci/brain.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildBrain, renderIndexModule } from "../brain/lib.mjs";

const root = new URL("../../", import.meta.url).pathname;
const brainDir = join(root, "houcine-world-brain");
const { BRAIN_INDEX } = await import(join(root, "supabase/functions/_shared/brain/index.generated.ts"));
const { search, allowedNote } = await import(join(root, "supabase/functions/_shared/brain/retrieve.ts"));
const { terms, normalize } = await import(join(root, "supabase/functions/_shared/brain/text.ts"));
const { LA_ROSA_VIEW_CONCIERGE: agent } = await import(join(root, "supabase/functions/concierge/agent.ts"));
const cases = JSON.parse(readFileSync(join(root, "scripts/brain/evals/concierge-cases.json"), "utf8")).cases;

const built = buildBrain(brainDir);

test("every note is valid", () => {
  assert.deepEqual(built.errors, []);
});

test("the committed index is exactly what the notes produce (rebuild with scripts/brain/build.mjs)", () => {
  const committed = readFileSync(join(root, "supabase/functions/_shared/brain/index.generated.ts"), "utf8");
  assert.equal(committed, renderIndexModule(built.index));
});

test("non-public notes never reach the index, and the index holds no trace of them", () => {
  const hidden = built.notes.filter((n) => n.fields.visibility !== "public");
  assert.ok(hidden.length >= 1, "the brain has at least one internal note (the open questions)");
  const text = readFileSync(join(root, "supabase/functions/_shared/brain/index.generated.ts"), "utf8");
  for (const n of hidden) {
    assert.ok(!BRAIN_INDEX.notes.some((x) => x.id === n.fields.id), n.fields.id);
    assert.ok(!text.includes(n.fields.id), `${n.fields.id} appears in the index`);
    assert.ok(!text.includes(n.fields.title), `${n.fields.title} appears in the index`);
  }
  assert.ok(!text.includes("WhatsApp"), "a phrase only found in the internal note");
});

test("every passage carries a status and every public note cites sources and a date", () => {
  for (const c of BRAIN_INDEX.chunks) assert.match(c.status, /^(verified|policy|incomplete|pending|outdated)$/);
  for (const n of BRAIN_INDEX.notes) {
    assert.match(n.updated, /^\d{4}-\d{2}-\d{2}$/);
    if (n.type !== "source" && n.type !== "index") assert.ok(n.sources.length > 0, n.id);
  }
  const incomplete = BRAIN_INDEX.chunks.filter((c) => c.status === "incomplete").map((c) => c.id);
  assert.ok(incomplete.includes("lrv-bookings#3"), "the unpublished prices are marked incomplete");
});

test("facts the code also uses agree with the site's own constants (one source of truth, checked)", () => {
  const contact = readFileSync(join(root, "src/config/contact.ts"), "utf8");
  const lrv = BRAIN_INDEX.notes.find((n) => n.id === "lrv-contact");
  assert.ok(contact.includes(`larosaview: "${lrv.facts.email}"`), "La Rosa View email = SERVICE_EMAILS.larosaview");
  const hw = BRAIN_INDEX.notes.find((n) => n.id === "hw-contact");
  assert.ok(contact.includes(`CONTACT_EMAIL = "${hw.facts.email}"`));
  assert.ok(contact.includes(`CONTACT_PHONE_DISPLAY = "${hw.facts.phone}"`));
  const form = readFileSync(join(root, "src/pages/BookingForm.tsx"), "utf8");
  const bookings = BRAIN_INDEX.notes.find((n) => n.id === "lrv-bookings");
  for (const type of bookings.facts.event_types.split("; ")) assert.ok(form.includes(`>${type}<`) || form.includes(`"${type}"`), type);
  const page = readFileSync(join(root, "src/pages/LaRosaView.tsx"), "utf8");
  const services = BRAIN_INDEX.chunks.find((c) => c.id === "lrv-services#0").text;
  for (const [, title] of page.matchAll(/\{ title: "([^"]+)", desc:/g)) {
    if (["Music Production", "Live Performances", "Media & Visuals", "Artist Collaboration"].includes(title)) continue;
    assert.ok(services.includes(title), `service "${title}" from the page is in the brain`);
  }
});

test("links resolve to notes, and the graph connects bookings to the shared booking rule", () => {
  const ids = new Set(BRAIN_INDEX.notes.map((n) => n.id));
  for (const n of BRAIN_INDEX.notes) for (const l of n.links) assert.ok(ids.has(l), `${n.id} -> ${l}`);
  assert.ok(BRAIN_INDEX.notes.find((n) => n.id === "lrv-bookings").links.includes("policy-booking-requests"));
});

test("text handling: accents, Arabic letter forms and the article, typos are tolerated", () => {
  assert.deepEqual(terms("Réservation"), terms("reservation"));
  assert.deepEqual(terms("booking"), terms("book"));
  assert.deepEqual(terms("الحجز"), terms("حجز"));
  assert.equal(normalize("أ"), normalize("ا"));
  const typo = search(BRAIN_INDEX, ["bookin the dj for a weding"], agent.scope);
  assert.ok(typo.some((p) => p.note.id === "lrv-bookings"));
});

const ranked = (queries) => search(BRAIN_INDEX, queries, agent.scope);

for (const c of cases) {
  test(`retrieval eval ${c.id} (${c.category})`, () => {
    const passages = ranked([c.turns.at(-1), ...c.queries]);
    const notes = passages.map((p) => p.note.id);
    for (const id of c.expect_notes) assert.ok(notes.includes(id), `${id} missing from ${notes.join(", ")}`);
    for (const id of c.forbid_notes ?? []) assert.ok(!notes.includes(id), `${id} must not be retrieved`);
    for (const p of passages) assert.ok(allowedNote(p.note, agent.scope), `${p.note.id} is outside the agent's scope`);
  });
}

test("brand separation: whatever the query, the La Rosa View agent only reads its brands and other brands' overviews", () => {
  for (const q of ["tech prices websites apps", "studio packages branding price", "Revolut Société Générale EUR USD", "education bookstore"]) {
    for (const p of ranked([q])) {
      const ok = agent.scope.brands.includes(p.note.brand) || p.note.type === "overview";
      assert.ok(ok, `${q} -> ${p.note.id}`);
    }
  }
});

test("nothing matched -> the agent's overview, so the model can say the information is not there", () => {
  const r = ranked(["zzzz qqqq"]);
  assert.ok(r.length > 0 && r.every((p) => p.note.id === "lrv-overview"));
});

test("knowledge freshness: change a note, rebuild, and search returns the new fact", () => {
  const dir = mkdtempSync(join(tmpdir(), "brain-"));
  try {
    cpSync(brainDir, dir, { recursive: true });
    const file = join(dir, "brands/la-rosa-view/events.md");
    const text = readFileSync(file, "utf8").replace(
      "## Upcoming events\n> [!incomplete] No calendar of upcoming public events or performances is published.",
      "## Upcoming events\nLa Rosa View plays the Moonlight Terrace opening on 20 December 2026.\n\n## Older note\n> [!incomplete] No calendar of upcoming public events or performances is published.",
    );
    writeFileSync(file, text);
    const fresh = buildBrain(dir);
    assert.deepEqual(fresh.errors, []);
    assert.notEqual(fresh.index.fingerprint, BRAIN_INDEX.fingerprint);
    const hit = search(fresh.index, ["moonlight terrace opening"], agent.scope);
    assert.equal(hit[0]?.note.id, "lrv-events-releases");
    assert.match(hit[0].chunk.text, /20 December 2026/);
    // The committed index does not know it until rebuilt.
    assert.ok(!search(BRAIN_INDEX, ["moonlight terrace opening"], agent.scope).some((p) => /Moonlight/.test(p.chunk.text)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the build refuses broken notes: unknown link, missing source, public note linking to an internal one", () => {
  const dir = mkdtempSync(join(tmpdir(), "brain-"));
  try {
    cpSync(brainDir, dir, { recursive: true });
    const file = join(dir, "brands/la-rosa-view/overview.md");
    writeFileSync(file, readFileSync(file, "utf8").replace("sources: [site-larosaview,", "sources: [made-up-source, site-larosaview,") + "\n[[No Such Note]] [[Open questions for the owner]]\n");
    const { index, errors } = buildBrain(dir);
    assert.equal(index, null);
    assert.ok(errors.some((e) => e.includes("made-up-source")));
    assert.ok(errors.some((e) => e.includes("No Such Note")));
    assert.ok(errors.some((e) => e.includes("non-public note")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
