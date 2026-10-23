// The Houcine.tech catalogue rules (src/content/techCatalogue.ts) and its server copy
// (supabase/functions/send-notification/techPrices.ts).
//   node --experimental-strip-types --test scripts/dev/tech-catalogue.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import * as cat from "../../src/content/techCatalogue.ts";
import { TECH_PRICES } from "../../supabase/functions/send-notification/techPrices.ts";

const { TECH_SERVICES, SERVICE_FAMILIES, FEATURED_SERVICES, budgetOptionsFor, isBudgetAllowed, serviceByName, priceLabel } = cat;

test("the catalogue has the 12 public service families, each with services", () => {
  assert.deepEqual(SERVICE_FAMILIES.map((f) => f.name), [
    "Websites", "Web Applications", "Mobile Applications", "E-commerce", "AI & Intelligent Systems", "Automation",
    "APIs & Integrations", "Data & Databases", "Fintech", "Cloud & DevOps", "Security & Optimization", "Consulting & Maintenance",
  ]);
  for (const f of SERVICE_FAMILIES) assert.ok(TECH_SERVICES.some((s) => s.family === f.slug), f.name);
});

test("no one-time service starts below 699", () => {
  for (const s of TECH_SERVICES) if (s.billing === "one-time") assert.ok(s.from >= 699, s.name);
});

test("service names and slugs are unique", () => {
  assert.equal(new Set(TECH_SERVICES.map((s) => s.name)).size, TECH_SERVICES.length);
  assert.equal(new Set(TECH_SERVICES.map((s) => s.slug)).size, TECH_SERVICES.length);
});

test("the five original services keep their specified starting prices", () => {
  const prices = Object.fromEntries(FEATURED_SERVICES.map((f) => [f.label, serviceByName(f.service)?.from]));
  assert.deepEqual(prices, { "Landing Page": 699, "Portfolio Website": 899, "Business Website": 1299, "Educational Platform": 1999, "Fintech Dashboard": 1999 });
  assert.equal(serviceByName("Educational Platform Development")?.family, "web-applications");
  assert.equal(serviceByName("Fintech Dashboard Development")?.family, "fintech");
});

test("monthly prices say per month; one-time prices do not", () => {
  assert.equal(priceLabel(serviceByName("Website Care")), "From €699 / $699 per month");
  assert.equal(priceLabel(serviceByName("Managed Technical Maintenance")), "From €999 / $999 per month");
  assert.equal(priceLabel(serviceByName("Business Website Development")), "From €1,299 / $1,299");
});

test("no budget range offered for a service ends at or below its starting price", () => {
  for (const s of TECH_SERVICES) {
    for (const o of budgetOptionsFor(s)) {
      const m = /^(?:(\d+)-(\d+)|over-(\d+))(\/month)?$/.exec(o.value);
      assert.ok(m, o.value);
      assert.equal(m[4] === "/month", s.billing === "monthly", `${s.name} ${o.value}`);
      if (m[2]) assert.ok(Number(m[2]) > s.from && Number(m[1]) >= s.from, `${s.name} ${o.value}`);
    }
  }
});

test("a €999 service offers ranges starting at €999, never €699", () => {
  const values = budgetOptionsFor({ from: 999, billing: "one-time" }).map((o) => o.value);
  assert.equal(values[0], "999-1500");
  assert.ok(!values.includes("699-1500"));
  assert.equal(isBudgetAllowed("Website Redesign", "699-1500"), false);
  assert.equal(isBudgetAllowed("Website Redesign", "999-1500"), true);
  assert.equal(isBudgetAllowed("SaaS Product Development", "1500-3000"), false);
  assert.equal(budgetOptionsFor(serviceByName("SaaS Product Development"))[0].value, "4999-6000");
});

test("the server's price list matches the catalogue exactly", () => {
  const fromCatalogue = Object.fromEntries(TECH_SERVICES.map((s) => [s.name, [s.from, s.billing]]));
  assert.deepEqual(TECH_PRICES, fromCatalogue);
});
