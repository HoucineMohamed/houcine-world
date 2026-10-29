// Text handling shared by the knowledge-brain build (scripts/brain/build.mjs, Node) and the search at run time
// (retrieve.ts, Deno): the SAME functions turn a note and a visitor's question into search terms, so the two can
// never drift apart. Pure: no I/O. Works for English, French and Arabic script (Tunisian Arabic is usually written
// in Arabic script or in Latin letters; both pass through here).

/** Lower case, accents removed, Arabic letter variants folded, so "Réservation" and "reservation" match. */
export const normalize = (input: string): string =>
  input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // Latin accents
    .replace(/[ً-ٰٟـ]/g, "") // Arabic short vowels, dagger alif, tatweel
    .replace(/[آأإٱ]/g, "ا") // alif forms -> alif
    .replace(/ى/g, "ي") // alif maqsura -> ya
    .replace(/ة/g, "ه") // ta marbuta -> ha
    .toLowerCase();

// Words that carry no meaning for search, in the languages the concierge expects.
const STOPWORDS = new Set(
  (
    "a an the and or but if of to in on at by for with from as is are was were be been being do does did can could " +
    "would should will shall may might must i me my we our you your he him his she her it its they them their this " +
    "that these those what which who whom how when where why there here about into than then so not no yes just " +
    "please hi hello hey thanks thank also any some all more most very too get got have has had want need like " +
    "le la les un une des du de d l et ou mais si au aux en dans sur par pour avec sans est sont etait ete etre " +
    "je j me m moi tu te toi vous nous il elle ils elles on ce cet cette ces qui que qu quoi comment quand ou " +
    "combien pourquoi mon ma mes ton ta tes son sa ses notre votre leur leurs ne pas plus tres bonjour salut merci " +
    "svp stp oui non est-ce " +
    "في من علي الي عن هذا هذه " +
    "و انا انت"
  ).split(/\s+/),
);

// Light suffix stripping (English and French), longest first. Deliberately simple: the same rule runs on notes and
// questions, so "booking", "booked", "books" and "réservation"/"réserver" end on the same stem.
const SUFFIXES = [
  "ations", "ation", "ements", "ement", "ments", "ment", "ings", "ing", "euses", "euse", "eurs", "eur",
  "ies", "ied", "ees", "ee", "es", "ed", "er", "s", "e",
];

// Arabic: the definite article and the common one-letter prefixes joined to it ("الحجز", "والحجز" -> "حجز").
const ARABIC_PREFIX = /^(?:[\u0648\u0628\u0641\u0643\u0644])?\u0627\u0644(?=.{2,})/;

export const stem = (word: string): string => {
  if (/^[\u0600-\u06ff]+$/.test(word)) return word.replace(ARABIC_PREFIX, "");
  if (!/^[a-z]+$/.test(word) || word.length <= 4) return word;
  for (const suffix of SUFFIXES) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 3) {
      const base = word.slice(0, -suffix.length);
      return suffix === "ies" || suffix === "ied" ? base + "y" : base;
    }
  }
  return word;
};

/** Search terms of a text: normalized, split on anything that is not a letter or digit, stop words out, stemmed. */
export const terms = (input: string): string[] => {
  const out: string[] = [];
  for (const raw of normalize(input).split(/[^\p{L}\p{N}]+/u)) {
    if (!raw || raw.length < 2 || STOPWORDS.has(raw)) continue;
    out.push(stem(raw));
  }
  return out;
};

/** Counts of each term. */
export const termCounts = (input: string): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const t of terms(input)) counts[t] = (counts[t] ?? 0) + 1;
  return counts;
};

/** Edit distance, stopping early once it is certainly above `max` (then returns max + 1). */
export const boundedDistance = (a: string, b: string, max: number): number => {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost);
      cur.push(v);
      if (v < best) best = v;
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length]!;
};

/** How many typos a term may have and still match a known term: none for short words. */
export const typoAllowance = (term: string): number => (term.length >= 8 ? 2 : term.length >= 4 ? 1 : 0);

/** A phrase normalized for "does the question mention this alias" checks: single spaces, no punctuation. */
export const phrase = (input: string): string =>
  normalize(input).split(/[^\p{L}\p{N}]+/u).filter(Boolean).join(" ");
