// The "What I Use to Build" section of Houcine.tech (src/pages/Dev.tsx, src/components/tech/TechStack.tsx).
// Three levels: the core stack (used on most projects), twelve categories, and inside each category the
// tools chosen per project plus the engineering capabilities. Only list tools that are genuinely part of
// the toolkit; never add certifications, partnerships or skill levels here.
//   Checked by: node --experimental-strip-types --test scripts/dev/tech-stack.test.mjs

export interface CoreTool {
  name: string;
  /** What the tool does in a project, in two or three words. */
  role: string;
}

export interface StackCategory {
  slug: string;
  name: string;
  description: string;
  /** Named technologies and products. Core ones are flagged in the UI; the rest are chosen per project. */
  tools: readonly string[];
  /** Practices and engineering work, not products. */
  capabilities: readonly string[];
}

export const CORE_STACK: readonly CoreTool[] = [
  { name: "React", role: "User interfaces" },
  { name: "TypeScript", role: "Typed application code" },
  { name: "Tailwind CSS", role: "Styling system" },
  { name: "Supabase", role: "Backend, auth and storage" },
  { name: "PostgreSQL", role: "Relational database" },
  { name: "GitHub", role: "Code and version control" },
  { name: "Lovable", role: "AI-assisted building" },
  { name: "Netlify", role: "Hosting and deploys" },
];

export const STACK_CATEGORIES: readonly StackCategory[] = [
  {
    slug: "frontend",
    name: "Frontend Engineering",
    description: "The interfaces people see and use, built to be fast, typed and maintainable.",
    tools: ["React", "Next.js", "TypeScript", "JavaScript", "Tailwind CSS", "HTML5", "CSS3"],
    capabilities: [],
  },
  {
    slug: "backend",
    name: "Backend Engineering",
    description: "The server-side logic that stores, protects and processes a product's data.",
    tools: ["Node.js", "Python"],
    capabilities: [
      "REST APIs",
      "Server-side application architecture",
      "Authentication and authorization",
      "Background jobs and server-side processing",
    ],
  },
  {
    slug: "databases",
    name: "Databases & Data Management",
    description: "Structured, secure data models that a product can grow on.",
    tools: ["PostgreSQL", "Supabase", "Firebase", "SQL"],
    capabilities: [
      "Database schema design",
      "Data modeling",
      "Database security and access policies",
      "Data integration",
    ],
  },
  {
    slug: "ai",
    name: "AI & Intelligent Systems",
    description: "Language models and AI features integrated into real products and workflows.",
    tools: ["OpenAI API", "Claude API", "Gemini API"],
    capabilities: [
      "Large language models",
      "AI-powered application features",
      "RAG systems",
      "AI assistants and chat interfaces",
      "AI workflow integration",
      "Structured AI outputs",
      "Intelligent document and information processing",
    ],
  },
  {
    slug: "apis",
    name: "APIs & Integrations",
    description: "Connecting a product to the services and systems a business already relies on.",
    tools: [],
    capabilities: [
      "REST APIs",
      "Webhooks",
      "Third-party API integrations",
      "Authentication and API authorization",
      "Data synchronization",
      "Service-to-service communication",
      "Custom integration development",
      "API testing and documentation",
    ],
  },
  {
    slug: "automation",
    name: "Automation & Workflows",
    description: "Repetitive work handed to reliable, event-driven and scheduled workflows.",
    tools: ["n8n", "Make", "Zapier"],
    capabilities: [
      "Custom API workflows",
      "Event-driven automation",
      "Scheduled workflows",
      "AI-powered automation",
      "Form-to-database workflows",
      "Notifications and reporting automation",
      "Cross-platform data synchronization",
    ],
  },
  {
    slug: "ui",
    name: "UI Engineering & Design Systems",
    description: "Consistent, accessible interfaces built from reusable components.",
    tools: ["Figma"],
    capabilities: [
      "Component-based architecture",
      "Design systems",
      "Reusable UI components",
      "Responsive design",
      "Accessibility-focused interface development",
      "Interaction design",
      "UI prototyping",
      "Design-to-development workflows",
    ],
  },
  {
    slug: "commerce",
    name: "E-commerce & Payments",
    description: "Catalogues, checkouts and billing flows connected to secure payment providers.",
    tools: [],
    capabilities: [
      "Payment gateway APIs",
      "Checkout integrations",
      "Subscription and billing integrations",
      "Product catalogue systems",
      "Order management",
      "Transactional workflows",
      "Payment status webhooks",
      "Secure payment integration patterns",
    ],
  },
  {
    slug: "cloud",
    name: "Cloud, Hosting & Deployment",
    description: "Getting a product online and keeping its releases predictable.",
    tools: ["Netlify", "Render", "Vercel", "Cloudflare", "AWS"],
    capabilities: [
      "Environment configuration",
      "DNS and domain configuration",
      "Deployment pipelines",
      "Production environments",
      "Application hosting",
      "Build and release workflows",
    ],
  },
  {
    slug: "security",
    name: "Security & Reliability",
    description: "Access control, safe configuration and the safeguards a live product needs.",
    tools: [],
    capabilities: [
      "Authentication and authorization",
      "Role-based access control",
      "Secure environment variables",
      "API security",
      "Input validation",
      "Database access policies",
      "Secure configuration",
      "Error handling",
      "Logging and monitoring integrations",
      "Backup and recovery planning",
    ],
  },
  {
    slug: "testing",
    name: "Testing & Performance",
    description: "Checks that a product works, loads quickly and stays accessible before it ships.",
    tools: [],
    capabilities: [
      "Automated testing",
      "Unit testing",
      "Integration testing",
      "End-to-end testing",
      "TypeScript type checking",
      "Performance profiling",
      "Lighthouse audits",
      "Accessibility checks",
      "Production build validation",
      "Responsive testing",
      "Error investigation and debugging",
    ],
  },
  {
    slug: "collaboration",
    name: "Development & Collaboration",
    description: "The everyday tools and review practices behind every release.",
    tools: ["Lovable", "GitHub", "Git", "Visual Studio Code", "Cursor", "Claude Code"],
    capabilities: [
      "AI-assisted development workflows",
      "Pull requests",
      "Code review",
      "Version control",
      "Continuous integration and deployment",
    ],
  },
];

const CORE_NAMES = new Set(CORE_STACK.map((t) => t.name));

/** True for tools in the core stack; every other tool is chosen per project. */
export const isCoreTool = (name: string): boolean => CORE_NAMES.has(name);
