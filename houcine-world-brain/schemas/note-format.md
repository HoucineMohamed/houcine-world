# Note format

Every note (except this folder and `README.md`) starts with a header between two `---` lines. The build
(`scripts/brain/build.mjs`) refuses a note whose header is missing a required field or uses an unknown value.

```markdown
---
id: lrv-bookings
title: Booking La Rosa View
brand: la-rosa-view
type: topic
visibility: public
status: verified
aliases: [book La Rosa, hire the DJ, booking request, réserver, حجز]
tags: [booking, event, hire]
sources: [site-booking-form, site-terms]
updated: 2026-10-29
---
```

| Field | Required | Values |
| --- | --- | --- |
| `id` | yes | Unique, lower case, letters, digits and dashes. Never reuse an id. |
| `title` | yes | The note's name; `[[links]]` use it (or an alias). |
| `brand` | yes | `houcine-world` (shared), `la-rosa-view`, `houcine-tech`, `houcine-studio`, `houcine-management`, `houcine-education`. A new brand is added in `scripts/brain/lib.mjs` (`BRANDS`). |
| `type` | yes | `overview`, `topic`, `service`, `person`, `policy`, `faq`, `contact`, `relationship`, `index`, `source` (`index` and `source` notes are never searched). |
| `visibility` | yes | `public` (an agent may use it), `internal` (owner and maintainers only), `confidential` (never leaves the repository). Only `public` is compiled into the agents' index. |
| `status` | yes | The note's default reliability: `verified`, `policy` (a current rule), `incomplete`, `pending` (awaiting confirmation), `outdated` (kept for history, never stated as current). |
| `sources` | yes for public notes | Ids from `sources/` (the build checks that each exists). |
| `updated` | yes | The date the facts were last checked, `YYYY-MM-DD`. |
| `aliases` | no | Other names for the subject, in any language. Links and search use them. |
| `tags` | no | Short keywords that help search. |
| `fact_<name>` | no | One machine-readable value that code also needs (for example `fact_email`). A test compares it with the site's own constant. |

## Status inside a note

A section can say it is less certain than the note as a whole: put a callout as the first line under its heading.

```markdown
## Prices
> [!incomplete] No price or package is published for La Rosa View.
```

Callouts understood: `[!verified]`, `[!policy]`, `[!incomplete]`, `[!pending]`, `[!outdated]`. The agent is told
the status of every passage it receives, and never states an `incomplete`, `pending` or `outdated` passage as a
current fact.

## Links

`[[Title]]` or `[[Title|shown text]]` links to another note by its title or one of its aliases. The build fails on a
link that matches no note. Links are also how search finds related notes: when a note is a good match, the best part
of each note it links to is considered too (only within the brands the agent may use).

## Sections become passages

The search works on passages: each `##` section of a note is one passage (with the note's title and header). Keep
a section about one thing, and give it a heading that says what it is about.
