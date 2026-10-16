// The booking form's markup (src/pages/BookingForm.tsx): every field has a label tied to it, the page has a
// <main>, and what is submitted is exactly what it was before the accessibility fix.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../../src/pages/BookingForm.tsx", import.meta.url), "utf8");

test("seven labels, each tied to a field with the same id", () => {
  const labels = [...src.matchAll(/<label htmlFor="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(labels, ["booking-name", "booking-email", "booking-phone", "booking-event-type", "booking-date", "booking-location", "booking-message"]);
  for (const id of labels) assert.equal(src.split(`id="${id}"`).length - 1, 1, `exactly one element has id ${id}`);
  assert.doesNotMatch(src, /<label(?![^>]*htmlFor)/, "a label without htmlFor");
});

test("one <main id=\"main\"> for the skip link, and no heading before the h1", () => {
  assert.equal(src.split('<main id="main">').length - 1, 1);
  assert.ok(src.indexOf("<main") < src.indexOf("<h1"));
  const firstHeading = src.match(/<h[1-6]\b/)?.[0];
  assert.equal(firstHeading, "<h1");
});

test("the floating background cannot widen the page", () => {
  assert.match(src, /absolute inset-0 overflow-hidden bg-gradient-to-br/);
});

test("what is submitted is unchanged", () => {
  const call = src.slice(src.indexOf("submitForm({"), src.indexOf("});", src.indexOf("submitForm({")) + 3);
  assert.equal(
    call.replace(/\s+/g, " "),
    'submitForm({ pageName: "Booking", formType: "DJ Booking Request", userName: formData.name, userEmail: formData.email, userPhone: formData.phone || undefined, serviceType: formData.eventType, message: formData.message || undefined, additionalData: { eventDate: formData.date, eventLocation: formData.location, }, });',
  );
});
