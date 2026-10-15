// Writes public/sitemap.xml and public/robots.txt from BASE_URL (src/config/site.ts) and the page list
// (src/config/routes.ts), so the site address lives in one place.
//
//   node --experimental-strip-types scripts/dev/seo-files.mjs           write both files
//   node --experimental-strip-types scripts/dev/seo-files.mjs --check   exit 1 if either file is out of date
//
// Offline, no dependency: it only reads the two config files and writes the two public files.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const { BASE_URL } = await import(join(root, "src/config/site.ts"));
const { PUBLIC_PAGES, PRIVATE_PREFIXES } = await import(join(root, "src/config/routes.ts"));

if (!/^https:\/\/[a-z0-9.-]+$/.test(BASE_URL)) {
  throw new Error(`BASE_URL must be https://host with no trailing slash, got ${BASE_URL}`);
}

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...Object.keys(PUBLIC_PAGES).map((path) => `  <url><loc>${BASE_URL}${path}</loc></url>`),
  "</urlset>",
  "",
].join("\n");

// The same crawler groups as before. robots.txt is a request to crawlers, not a security control.
const AGENTS = ["Googlebot", "Bingbot", "Twitterbot", "facebookexternalhit", "*"];
const disallow = PRIVATE_PREFIXES.map((p) => `Disallow: ${p === "/auth" ? "/auth/" : p}`);
const robots = [
  ...AGENTS.flatMap((agent) => [`User-agent: ${agent}`, "Allow: /", ...disallow, ""]),
  `Sitemap: ${BASE_URL}/sitemap.xml`,
  "",
].join("\n");

const readOrNull = (path) => {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
};

const check = process.argv.includes("--check");
let stale = 0;
for (const [file, text] of Object.entries({ "public/sitemap.xml": sitemap, "public/robots.txt": robots })) {
  const path = join(root, file);
  if (readOrNull(path) === text) {
    console.log(`${file}: up to date`);
  } else if (check) {
    console.log(`${file}: OUT OF DATE (run without --check to rewrite it)`);
    stale++;
  } else {
    writeFileSync(path, text);
    console.log(`${file}: written`);
  }
}
process.exit(stale > 0 ? 1 : 0);
