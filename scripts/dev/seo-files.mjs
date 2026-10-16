// Writes public/sitemap.xml and public/robots.txt from the route manifest (src/routes/manifest.ts, which
// uses BASE_URL from src/config/site.ts), so routes and the site address live in one place.
//
//   node --experimental-strip-types scripts/dev/seo-files.mjs           write both files
//   node --experimental-strip-types scripts/dev/seo-files.mjs --check   exit 1 if either file is out of date
//
// Offline, no dependency: it only reads the manifest and writes the two public files.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const { sitemapXml, robotsTxt } = await import(join(root, "src/routes/manifest.ts"));
const sitemap = sitemapXml();
const robots = robotsTxt();

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
