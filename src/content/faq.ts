import type { Faq } from "./schema.ts";

/** Questions and answers, written only from facts about the public site. */
export const faq: Faq[] = [
  {
    slug: "what-is-houcine-world",
    question: "What is Houcine.world?",
    answer:
      "A modular digital ecosystem of four verticals: tech, studio, education and management. They run independently while sharing a technical base, a design language and a growth infrastructure.",
    links: [{ label: "About the ecosystem", href: "/ecosystem" }],
  },
  {
    slug: "who-builds-it",
    question: "Who builds it?",
    answer: "Houcine.world is founder-built, by Mohamed Houcine.",
    links: [{ label: "About Mohamed Houcine", href: "/about" }],
  },
  {
    slug: "new-brands",
    question: "Can a new brand join the ecosystem?",
    answer: "The ecosystem is designed so that new brands can be added without rebuilding the core.",
  },
  {
    slug: "get-in-touch",
    question: "How do I get in touch?",
    answer: "The contact page lists the ways to reach Houcine.world.",
    links: [{ label: "Contact", href: "/contact" }],
  },
];
