# Content guide: add a project, a journal post or a testimonial

Everything on the site that you write yourself lives in a few small files in the folder `src/content/`.
You can edit them in the browser, on GitHub; no program to install. Each file holds a **list**: a pair
of square brackets `[ ]` with one **entry** per item, each entry between curly braces `{ }`.

## How to edit a file on GitHub (the same for every section below)

1. Open the repository on github.com, click the folder `src`, then `content`, then the file.
2. Click the **pencil** (Edit this file) at the top right of the file.
3. Make your change (see the sections below). Keep every comma, quote and bracket you see.
4. Scroll down, choose **"Create a new branch for this commit and start a pull request"**, then click
   **Propose changes** and **Create pull request**.
5. Wait for the checks. The **netlify/houcineworld/deploy-preview** check has a **Details** link: it opens
   a preview of the site with your change. If it looks right, merge the pull request.

If a check fails, open it: the message says which entry and which field is wrong (for example
`work[0].summary: must not be empty`).

## The rules every entry must follow

- **Only real things.** No invented clients, numbers, results or quotes. If you have nothing yet, leave
  the list empty: the page shows "Coming soon" by itself.
- **No empty or placeholder text.** Words like "Lorem ipsum", "TODO", "Coming soon" or `[NAME]` are
  refused.
- **A slug** is the entry's short name in the address: lower-case words joined by hyphens, for example
  `brand-refresh-2026`. Each slug is used only once per file.
- **Links** are either a page of this site, starting with `/` (for example `/contact`), or a full address
  starting with `https://`. A link to a page that does not exist is refused.
- **Images** are files in the folder `src/assets/`. Upload the image there first (on GitHub: open
  `src/assets`, then **Add file → Upload files**), then write its path, for example
  `src/assets/my-project.jpg`. Every image needs a short description (`alt`) for people who cannot see
  it. Keep images small (under 300 KB if you can).
- **Dates** are written `YYYY-MM-DD`, for example `2026-10-16`.

## Add a project (case study)

File: **`src/content/work.ts`**. Today the list is empty: `export const work: Work[] = [];`

Put your entry between the two square brackets. Copy this, then replace every value:

```ts
export const work: Work[] = [
  {
    slug: "brand-refresh-2026",
    title: "Brand refresh for a music label",
    vertical: "studio",
    summary: "One or two sentences that say what the project was.",
    context: "What the situation was before the project.",
    role: "What you did yourself.",
    approach: "How you did it.",
    outcome: "What changed afterwards, with real facts only.",
    date: "2026-10-16",
    tags: ["Branding", "UI/UX"],
    gallery: [{ src: "src/assets/brand-refresh-cover.jpg", alt: "The new logo on a black poster" }],
    links: [{ label: "See the live site", href: "https://example.com" }],
    draft: false,
  },
];
```

- `vertical` is one of `tech`, `studio`, `education`, `management` or `world`. A `management` project also
  appears in the "Selected work" of the Houcine.management page.
- `date`, the pictures in `gallery` and the `links` are optional: write `gallery: []` or `links: []` when
  there are none, and delete the `date` line.
- `draft: true` keeps the project off every page until you change it to `false`.
- To add a second project, put a comma after the closing `}` of the first one and paste another entry.

## Start from a template (ask a session)

A session can print a new project or post for you, ready to paste: ask it to "make a draft case study
called ... for the studio vertical" or "a draft journal post called ... dated ...". It runs
`scripts/dev/new-entry.mjs` (templates in `src/content/templates.ts`). The draft has the right address
(slug) and every text reads "TODO: ...": the checks refuse it until each TODO is replaced with your own
words, and it stays a draft (`draft: true`) so nothing appears on the site before you publish it.

Published projects and posts also describe themselves to search engines (structured data), from the same
templates; there is nothing to fill in for that.

## Add a journal post

File: **`src/content/journal.ts`**. A post is made of **blocks**: paragraphs (`p`), subheadings (`h2`)
and bullet lists (`ul`).

```ts
export const journal: Post[] = [
  {
    slug: "how-we-plan-a-brand",
    title: "How we plan a brand",
    summary: "One sentence that appears in the list of posts and in search results.",
    date: "2026-10-16",
    tags: ["Studio", "Process"],
    body: [
      { type: "p", text: "The first paragraph." },
      { type: "h2", text: "A subheading" },
      { type: "p", text: "Another paragraph." },
      { type: "ul", items: ["A first point", "A second point"] },
    ],
    draft: true,
  },
];
```

Start with `draft: true` while you write; change it to `draft: false` when the post should appear.

## Add a testimonial

File: **`src/content/testimonials.ts`**. Only add a quote that someone really gave you and agreed to see
published. The line `confirmedByOwner: true` is your confirmation of that; without it the entry is refused.

```ts
export const testimonials: Testimonial[] = [
  {
    slug: "label-founder-2026",
    quote: "The exact words the person wrote to you.",
    author: "Their name, as they agreed to be named",
    context: "The project it is about",
    confirmedByOwner: true,
  },
];
```

## Where your entries appear

- Projects: `/work` (with filters and search), their own page `/work/<slug>`, the site search, and for the
  management vertical the "Selected work" of `/manages`.
- Journal posts: `/journal`, their own page `/journal/<slug>`, the RSS feed (`/rss.xml`) and the search.
- Questions and answers: `/ecosystem`, each with its own anchor (`/ecosystem#faq-<slug>`), and the search.
- Testimonials: kept in `src/content/testimonials.ts`, checked like the rest; no page shows that list yet
  (the quotes already on `/designs` and `/reads` are part of those pages).
- Every published entry also gets its own line in the sitemap. Drafts appear nowhere.

## Change the services, the team or the questions and answers

- **`src/content/services.ts`**: the four verticals, with what each is for and who it is for.
- **`src/content/team.ts`**: the people behind the ecosystem.
- **`src/content/faq.ts`**: questions and answers.

They follow the same rules. The `path` of a service must be one of the site's pages.

## Add a new page to the site

New pages are code, so ask a Claude session to add them. Each page is listed in
**`src/routes/manifest.ts`** (its address, title, description, whether search engines may list it), and
the sitemap is written from that list. A page that is missing from the list makes the build fail, on
purpose.

## Where the checks live

- `src/content/schema.ts`: the rules above, written as code.
- `scripts/dev/content.test.mjs`: checks every entry against those rules.
- `scripts/dev/manifest.test.mjs`: checks the list of pages, the sitemap and robots.txt.
- `scripts/dev/templates.test.mjs`: checks the templates (a fresh draft is refused until written, then valid).

They run on a session's computer today (`node --experimental-strip-types --test scripts/dev/*.test.mjs`)
and will run on every pull request once a critical change, approved by the owner, adds them to CI.
