// Prints a new case study or journal post, as a draft ready to paste at the top of src/content/work.ts or
// src/content/journal.ts. Every text is a "TODO" line that the content test refuses until it is written.
//
//   node --experimental-strip-types scripts/dev/new-entry.mjs work "Project title" studio [YYYY-MM-DD]
//   node --experimental-strip-types scripts/dev/new-entry.mjs post "Post title" YYYY-MM-DD
import { caseStudyDraft, draftSource, journalPostDraft, slugify } from "../../src/content/templates.ts";

const [kind, title, a, b] = process.argv.slice(2);
const VERTICALS = ["tech", "studio", "education", "management", "world"];
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s ?? "");

if (title && slugify(title) === "") {
  console.error("The title has no Latin letters or digits to make an address (slug) from: add a few, or write the slug by hand.");
  process.exit(1);
}

if (kind === "work" && title && VERTICALS.includes(a) && (b === undefined || isDate(b))) {
  process.stdout.write(draftSource(caseStudyDraft(title, a, b)));
} else if (kind === "post" && title && isDate(a)) {
  process.stdout.write(draftSource(journalPostDraft(title, a)));
} else {
  console.error('Usage: new-entry.mjs work "Title" <tech|studio|education|management|world> [YYYY-MM-DD]\n       new-entry.mjs post "Title" YYYY-MM-DD');
  process.exit(1);
}
