// Writes public/sitemap.xml, public/robots.txt and public/rss.xml (the journal feed) from the route manifest (src/routes/manifest.ts, which
// uses BASE_URL from src/config/site.ts), so routes and the site address live in one place.
//
//   node --experimental-strip-types scripts/dev/seo-files.mjs           write both files
//   node --experimental-strip-types scripts/dev/seo-files.mjs --check   exit 1 if either file is out of date
//
// Offline, no dependency: it only reads the manifest and the content layer and writes the three public files.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const { sitemapXml, robotsTxt } = await import(join(root, "src/routes/manifest.ts"));
const { BASE_URL } = await import(join(root, "src/config/site.ts"));
const { journal } = await import(join(root, "src/content/journal.ts"));
const { rssXml } = await import(join(root, "src/content/query.ts"));
const sitemap = sitemapXml();
const robots = robotsTxt();
const rss = rssXml(journal, BASE_URL);

const readOrNull = (path) => {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
};

const check = process.argv.includes("--check");
let stale = 0;
for (const [file, text] of Object.entries({ "public/sitemap.xml": sitemap, "public/robots.txt": robots, "public/rss.xml": rss })) {
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
