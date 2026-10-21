import type { Post } from "./schema.ts";

/**
 * Journal posts. A post with `draft: true` is kept off every page (and the feed) until the owner sets it to
 * false. How to add one: docs/content-guide.md.
 */
export const journal: Post[] = [
  {
    // DRAFT: written only from facts that can be checked in this repository about the public site.
    // The owner reads it and changes `draft` to false to publish it.
    slug: "how-houcine-world-is-built",
    title: "How Houcine.world is built",
    summary: "The stack and the structure behind the public site: one technical base shared by four verticals.",
    date: "2026-10-16",
    tags: ["Tech", "Process"],
    body: [
      {
        type: "p",
        text: "Houcine.world is a modular digital ecosystem of four verticals: tech, studio, education and management. They run independently while sharing a technical base, a design language and a growth infrastructure. This post describes the technical base of the public site.",
      },
      { type: "h2", text: "The stack" },
      {
        type: "ul",
        items: [
          "React and TypeScript for the pages, built with Vite.",
          "Tailwind CSS with shadcn/ui components for the interface.",
          "Netlify for hosting, with a preview of every change before it goes live.",
        ],
      },
      { type: "h2", text: "One list of pages, one layer of content" },
      {
        type: "p",
        text: "Every page of the site is written once, in a typed route manifest: its address, title, description and whether search engines may list it. The sitemap and robots.txt are produced from that list, and a page missing from it stops the build.",
      },
      {
        type: "p",
        text: "Projects, journal posts, questions and answers live in a typed content layer. A validator refuses empty or stand-in text, duplicate addresses, links to pages that do not exist and images that are missing.",
      },
      { type: "h2", text: "One design language" },
      {
        type: "p",
        text: "Colours, type, spacing and components come from one set of design tokens, shown live on the brand page. Each page loads its own code only when it is visited, so the first page stays light.",
      },
      { type: "h2", text: "Checked before every release" },
      {
        type: "p",
        text: "Offline checks open every public page in a headless browser at desktop and phone widths: the title, one main heading, no sideways scrolling, no console errors, working links and images, and accessibility rules such as labels, headings and contrast.",
      },
    ],
    draft: true,
  },
];
