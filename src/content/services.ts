import type { Service } from "./schema.ts";

/**
 * The four verticals of the ecosystem, from the owner's briefs and the text already on the site.
 * Each `path` must be a page of src/routes/manifest.ts. How to edit: docs/content-guide.md.
 */
export const services: Service[] = [
  {
    slug: "tech",
    vertical: "tech",
    name: "Houcine.tech",
    path: "/dev",
    purpose: "Scalable, modern web applications with React and TypeScript, API design and full-stack development.",
    audience: "Anyone who needs a web application taken from discovery and design to build, launch and support.",
  },
  {
    slug: "studio",
    vertical: "studio",
    name: "Houcine.studio",
    path: "/designs",
    purpose: "Process-driven digital design: branding, UI/UX, visual direction, and creative and AI-assisted direction.",
    audience: "Brands and projects that need an identity, an interface or a visual direction.",
  },
  {
    slug: "education",
    vertical: "education",
    name: "Houcine.education",
    path: "/reads",
    purpose: "A curated digital bookstore for learners exploring tech, design and innovation.",
    audience: "Learners exploring tech, design and innovation.",
  },
  {
    slug: "management",
    vertical: "management",
    name: "Houcine.management",
    path: "/manages",
    purpose: "Building and managing creative brands, artists and strategic projects: brand strategy, and artist and event support.",
    audience: "Creative brands, artists, and the people behind events and strategic projects.",
  },
];
