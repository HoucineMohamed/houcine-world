// Language structure for English and French (types and keys only). The site is in English today; NO French
// text is shipped by a session, because machine translation would put unreviewed copy in the owner's name.
// When the owner has French text reviewed by a native speaker, it goes in the `fr` fields below (and, for the
// content files, in a Localized value), and pick() starts returning it. What needs translating, and in
// which order: docs/translation.md. Tested in scripts/dev/i18n.test.mjs.

export const LOCALES = ["en", "fr"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/** A text in English, with an optional reviewed French version. */
export interface Localized<T = string> {
  en: T;
  fr?: T;
}

/** The text for a language, falling back to English when there is no French version. */
export const pick = <T>(value: Localized<T>, locale: Locale): T => (locale === "fr" ? value.fr ?? value.en : value.en);

/** Interface strings shared by every page, by key. French versions are left empty until reviewed. */
export const UI: Record<string, Localized> = {
  "nav.search": { en: "Search the site" },
  "nav.skip": { en: "Skip to content" },
  "nav.back": { en: "Back to the ecosystem" },
  "empty.comingSoon": { en: "Coming soon" },
  "work.title": { en: "Work" },
  "journal.title": { en: "Journal" },
  "journal.readingTime": { en: "min read" },
  "journal.related": { en: "Related posts" },
  "contact.send": { en: "Send the message" },
  "error.reload": { en: "Reload the page" },
  "error.home": { en: "Go to the home page" },
  "notFound.title": { en: "Page not found" },
};
