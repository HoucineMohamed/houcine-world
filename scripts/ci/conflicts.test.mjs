// Possible duplicates and contact details that disagree (supabase/functions/_shared/brain/conflicts.ts), shown in
// Knowledge Studio's review queue: what today's notes give, and that a copied section or an unlisted email or phone
// number is reported. The finder only points; it never changes a note.
//
//   node --experimental-strip-types --test scripts/ci/conflicts.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";

const root = new URL("../../", import.meta.url).pathname;
const { findConflicts, DUPLICATE_THRESHOLD } = await import(join(root, "supabase/functions/_shared/brain/conflicts.ts"));
const { compileBrain } = await import(join(root, "supabase/functions/_shared/brain/compile.ts"));
const { readBrainFiles } = await import("../brain/lib.mjs");

const files = readBrainFiles(join(root, "houcine-world-brain"));
const adminIndex = (fs) => {
  const r = compileBrain(fs, { audience: "admin" });
  assert.deepEqual(r.errors, []);
  return r.index;
};
const edit = (path, change) => files.map((f) => (f.path === path ? { ...f, text: change(f.text) } : f));

test("today's notes: two sections repeated in another note, and every contact detail is listed", () => {
  const found = findConflicts(adminIndex(files));
  assert.deepEqual(found.map((f) => [f.kind, ...f.notes].join(" ")).sort(), [
    "possible_duplicate lrv-bookings lrv-policies",
    "possible_duplicate lrv-overview rel-ecosystem",
  ]);
  assert.ok(DUPLICATE_THRESHOLD > 0 && DUPLICATE_THRESHOLD < 1);
});

test("a section copied into another note is reported once, with both places", () => {
  const services = files.find((f) => f.path === "brands/la-rosa-view/services.md").text;
  const copied = /## Event types the booking form accepts\n[\s\S]*?(?=\n## |$)/.exec(services)[0];
  const found = findConflicts(adminIndex(edit("brands/la-rosa-view/identity-and-brand.md", (t) => `${t}\n\n${copied.replace("## Event types the booking form accepts", "## Events we play")}\n`)));
  const dup = found.filter((f) => f.notes.includes("lrv-identity") && f.notes.includes("lrv-services"));
  assert.equal(dup.length, 1);
  assert.equal(dup[0].kind, "possible_duplicate");
});

test("an email or phone number no contact note lists is reported; the same number in another format is not", () => {
  const found = findConflicts(adminIndex(edit("brands/la-rosa-view/identity-and-brand.md", (t) => `${t}\n\n## Reach us\nWrite to bookings@larosaview.example or call +33 6 11 22 33 44. The general line is +33746503304.\n`)));
  const mismatch = found.filter((f) => f.kind === "contact_mismatch");
  assert.equal(mismatch.length, 1);
  assert.deepEqual(mismatch[0].notes, ["lrv-identity"]);
  assert.match(mismatch[0].detail, /bookings@larosaview\.example/);
  assert.match(mismatch[0].detail, /\+33 6 11 22 33 44/);
  assert.ok(!mismatch[0].detail.includes("+33746503304"), "the listed number, written without spaces, is known");
});
