// Tests for the services structured data (src/content/structured.ts).
//
//   node --experimental-strip-types --test scripts/dev/structured.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("services structured data: one Service per vertical whose page is an indexable manifest route", async () => {
  const { servicesStructuredData } = await import(join(root, "src/content/structured.ts"));
  const { services } = await import(join(root, "src/content/services.ts"));
  const { INDEXABLE } = await import(join(root, "src/routes/manifest.ts"));
  const data = servicesStructuredData(services, { baseUrl: "https://houcine.world", siteName: "Houcine.world", indexablePaths: INDEXABLE.map((r) => r.path) });
  assert.equal(data["@type"], "ItemList");
  assert.equal(data.itemListElement.length, services.length);
  for (const [i, el] of data.itemListElement.entries()) {
    assert.equal(el.position, i + 1);
    assert.equal(el.item["@type"], "Service");
    assert.match(el.item.url, /^https:\/\/houcine\.world\/[a-z-]+$/);
  }
  const fake = [{ ...services[0], path: "/no-such-page" }];
  assert.equal(servicesStructuredData(fake, { baseUrl: "https://x", siteName: "X", indexablePaths: ["/dev"] }).itemListElement.length, 0, "a service without a real page is left out");
});
