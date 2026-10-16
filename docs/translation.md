# Translation: English and French

The site is in English. A French version is prepared in structure only: `src/content/i18n.ts` defines the
two languages, a `Localized` text type (English, plus an optional French version) and `pick()`, which falls
back to English whenever there is no French text. **No French text is shipped by a session**: machine
translation would publish unreviewed copy in your name.

## What needs a native French reviewer, in a sensible order

1. **Interface strings** (`UI` in `src/content/i18n.ts`): navigation, empty states, buttons, error messages.
   Short, and seen on every page.
2. **The content layer** (`src/content/`): `services.ts` (purpose and audience of each vertical), `faq.ts`,
   `team.ts`, then each published `work.ts` entry and `journal.ts` post.
3. **The page texts** written in the page files (`src/pages/`), starting with the home page, `/ecosystem`,
   `/services` and `/contact`.
4. **The legal pages** (`/terms`, `/privacy`, `/data-deletion`): only after the English versions are final
   and reviewed by a professional; a legal translation needs its own review.

## How the French text gets in, once reviewed

Give the reviewed text to a session: it fills the `fr` fields, then adds the language switch and the
`/fr/...` addresses (with `hreflang` links and the French pages in the sitemap). Until then, nothing
changes for visitors. `scripts/dev/i18n.test.mjs` fails on purpose if French text appears without that step.
