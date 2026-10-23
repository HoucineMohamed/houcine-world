// The Houcine.tech service catalogue: the single source of every Houcine.tech service name, family and
// starting price (owner's specification "HOUCINE.TECH — COMPLETE SERVICE CATALOGUE & STARTING PRICES").
// The Houcine.tech page, its quote form and the budget ranges all read this file; the quote check on the
// server reads supabase/functions/send-notification/techPrices.ts, which scripts/dev/tech-catalogue.test.mjs
// keeps identical to this list.
//
// Rules (from the specification):
// - Prices are listed in EUR and USD with the same number; no TND and no live conversion.
// - No one-time service starts below 699. Monthly services always say "per month".
// - Every price is a starting price; the final quote depends on scope.
// - The "additional specialized services" (section 19) are not published until they can be delivered.
//
// Keep this file free of the "@" alias and of browser-only code, so Node tests can import it.

export type Billing = "one-time" | "monthly";

export type FamilySlug =
  | "websites"
  | "web-applications"
  | "mobile"
  | "ecommerce"
  | "ai"
  | "automation"
  | "apis-integrations"
  | "data"
  | "fintech"
  | "cloud-devops"
  | "security-optimization"
  | "consulting-maintenance";

export interface ServiceFamily {
  slug: FamilySlug;
  name: string;
  summary: string;
  /** Scope notes and exclusions specific to this family, shown above its services. */
  note?: string;
}

export interface TechService {
  slug: string;
  name: string;
  family: FamilySlug;
  /** Short description; when absent the family summary describes the service. */
  description?: string;
  /** Starting price, the same number in EUR and USD. */
  from: number;
  billing: Billing;
  /** Every published service can be requested through the quote form. */
  quotable: true;
}

export const MIN_ONE_TIME_PRICE = 699;
export const CURRENCIES = ["EUR", "USD"] as const;

export const SERVICE_FAMILIES: ServiceFamily[] = [
  { slug: "websites", name: "Websites", summary: "Landing pages, portfolios, business websites, content platforms and redesigns." },
  { slug: "web-applications", name: "Web Applications", summary: "SaaS, dashboards, portals, internal tools, custom software, and the frontend and backend engineering behind them." },
  {
    slug: "mobile",
    name: "Mobile Applications",
    summary: "iOS, Android and cross-platform apps, and the backends that run them.",
    note: "Prices are for scoped entry-level projects; they do not cover a complete production-grade app with unlimited features. App-store fees are not included.",
  },
  {
    slug: "ecommerce",
    name: "E-commerce",
    summary: "Online stores, marketplaces, checkout, subscriptions and commerce integrations.",
    note: "Payment-provider fees, hosting and platform subscriptions are not included.",
  },
  {
    slug: "ai",
    name: "AI & Intelligent Systems",
    summary: "AI applications, chatbots, knowledge assistants and AI agents, each built for a specific, useful task.",
    note: "Prices exclude AI model consumption and other third-party provider fees unless a quote says otherwise.",
  },
  { slug: "automation", name: "Automation", summary: "Business processes, workflow automation and data synchronization." },
  {
    slug: "apis-integrations",
    name: "APIs & Integrations",
    summary: "APIs, webhooks, external services, business tools and legacy integrations.",
    note: "Paid API usage and third-party subscriptions are not included.",
  },
  { slug: "data", name: "Data & Databases", summary: "Database engineering, data pipelines, reporting and analytics." },
  {
    slug: "fintech",
    name: "Fintech",
    summary: "Financial dashboards, expense tracking, billing and financial data interfaces.",
    note: "Fintech projects need careful scoping. These prices cover technical software development, not regulated financial services or compliance certification.",
  },
  {
    slug: "cloud-devops",
    name: "Cloud & DevOps",
    summary: "Deployment, hosting, CI/CD, monitoring and reliability.",
    note: "Hosting, domains and cloud-provider subscriptions are billed separately.",
  },
  {
    slug: "security-optimization",
    name: "Security & Optimization",
    summary: "Application hardening, performance, accessibility and technical SEO.",
    note: "Scoped application-security work, not formal security certification or specialist penetration testing.",
  },
  {
    slug: "consulting-maintenance",
    name: "Consulting & Maintenance",
    summary: "Technical discovery, MVPs, architecture, testing, support and project rescue.",
    note: "Monthly plans cover an agreed allowance: hours, response times, supported systems and exclusions are set in each contract. No unlimited work or 24/7 emergency support unless contracted.",
  },
];

type Row = [name: string, from: number, billing?: Billing];

const ROWS: Record<FamilySlug, Row[]> = {
  websites: [
    ["Landing Page Development", 699],
    ["Portfolio Website Development", 899],
    ["Business Website Development", 1299],
    ["E-commerce Website Development", 2499],
    ["Educational Website Development", 1999],
    ["Membership Website Development", 1999],
    ["Blog & Publishing Website Development", 1299],
    ["Directory & Listing Website Development", 1999],
    ["Booking & Reservation Website Development", 1999],
    ["Marketplace Development", 3999],
    ["Community Website Development", 1999],
    ["Documentation Website Development", 999],
    ["Multilingual Website Development", 1699],
    ["Website Redesign", 999],
    ["Website Migration", 999],
    ["Progressive Web App Development", 1999],
  ],
  "web-applications": [
    ["Custom Web Application Development", 2999],
    ["SaaS Product Development", 4999],
    ["MVP Development", 1999],
    ["Educational Platform Development", 1999],
    ["Internal Business Tool Development", 1499],
    ["Admin Panel Development", 1299],
    ["Dashboard Development", 1299],
    ["Client Portal Development", 1999],
    ["Employee Portal Development", 1999],
    ["Custom CRM Development", 2999],
    ["ERP & Business Management Systems", 4999],
    ["Inventory Management Systems", 1999],
    ["Order Management Systems", 1999],
    ["Project Management Tool Development", 1999],
    ["Workflow Management Systems", 1499],
    ["Document Management Systems", 1999],
    ["Reporting Application Development", 1299],
    ["Scheduling & Resource Management Systems", 1499],
    ["Multi-tenant Application Development", 4999],
    ["Real-time Application Development", 2999],
    ["Software Modernization", 1999],
    // UI engineering and frontend development
    ["Frontend Development", 1499],
    ["Responsive Interface Development", 899],
    ["Design-to-Code Implementation", 999],
    ["Component Library Development", 1499],
    ["Design System Implementation", 1499],
    ["Interactive Interface Development", 999],
    ["Data Visualization Interfaces", 999],
    ["Frontend Architecture", 1499],
    ["State Management Implementation", 899],
    ["Frontend Refactoring", 899],
    ["UI Bug Fixes", 699],
    ["Cross-browser Compatibility", 699],
    // Backend development and application architecture
    ["Backend Application Development", 1999],
    ["Server-side Business Logic", 999],
    ["User Authentication Systems", 899],
    ["Role-based Access Control", 899],
    ["Multi-tenant Backend Architecture", 2999],
    ["File Upload & Storage Systems", 899],
    ["Background Job Processing", 999],
    ["Notification Backend Systems", 899],
    ["Search Backend Development", 999],
    ["Caching & Performance Architecture", 999],
    ["Real-time Backend Systems", 1999],
    ["Scheduled Task Systems", 699],
    ["Application Architecture Consulting", 899],
    ["Backend Modernization", 1999],
  ],
  mobile: [
    ["iOS Application Development", 4999],
    ["Android Application Development", 4999],
    ["Cross-platform App Development", 3999],
    ["Mobile App MVP Development", 2999],
    ["Mobile App UI Implementation", 999],
    ["App Backend Development", 1999],
    ["Mobile App Integration", 999],
    ["Mobile App Maintenance", 699, "monthly"],
    ["App Store Deployment Support", 699],
  ],
  ecommerce: [
    ["Online Store Development", 2499],
    ["Custom E-commerce Platform Development", 3999],
    ["Product Catalogue Systems", 999],
    ["Shopping Cart Development", 699],
    ["Checkout Optimization", 699],
    ["Payment Gateway Integration", 899],
    ["Subscription Commerce Development", 1999],
    ["Digital Product Store Development", 1499],
    ["Booking Commerce Development", 1999],
    ["Multi-vendor Marketplace Systems", 3999],
    ["Order Tracking Systems", 999],
    ["Inventory & Commerce Integration", 1499],
    ["E-commerce Platform Migration", 1499],
    ["E-commerce Maintenance", 699, "monthly"],
  ],
  ai: [
    ["AI Feature Integration", 999],
    ["AI Application Development", 2999],
    ["AI Chatbot Integration", 999],
    ["Customer Support Automation", 1499],
    ["AI Knowledge Assistant Development", 1999],
    ["AI Document Processing Automation", 1499],
    ["Intelligent Search Development", 1499],
    ["Retrieval-Augmented Generation (RAG) Systems", 2499],
    ["AI Agent Development", 1999],
    ["AI Workflow Integration", 1499],
    ["Text Classification & Extraction", 999],
    ["Recommendation System Development", 1999],
    ["AI-powered Content Tools", 1499],
    ["AI API Integration", 899],
    ["AI Prototyping & Proof of Concept", 999],
    ["AI Evaluation & Guardrails", 1499],
    ["AI Application Monitoring Setup", 999],
    ["Ongoing AI Application Optimization", 999, "monthly"],
  ],
  automation: [
    ["Business Process Automation", 999],
    ["Workflow Automation", 899],
    ["No-code & Low-code Automation", 699],
    ["API-based Automation", 899],
    ["CRM Automation", 899],
    ["Lead Management Automation", 699],
    ["Email Workflow Automation", 699],
    ["Document Workflow Automation", 999],
    ["Reporting Automation", 899],
    ["Data Synchronization", 999],
    ["Appointment & Booking Automation", 699],
    ["Invoice Workflow Automation", 899],
    ["Notification System Development", 699],
    ["Third-party Tool Integration", 899],
    ["Automation Audit", 699],
  ],
  "apis-integrations": [
    ["REST API Development", 1499],
    ["GraphQL API Development", 1999],
    ["Third-party API Integration", 899],
    ["Webhook Integration", 699],
    ["Authentication Integration", 699],
    ["OAuth Integration", 899],
    ["Payment API Integration", 899],
    ["Mapping & Geolocation Integration", 899],
    ["Email & Messaging Integration", 699],
    ["Calendar Integration", 699],
    ["CRM & ERP Integration", 1499],
    ["Legacy System Integration", 1999],
    ["API Documentation", 699],
    ["API Testing & Debugging", 699],
    // Business integrations
    ["CRM Integration", 899],
    ["Accounting Software Integration", 999],
    ["Email Marketing Integration", 699],
    ["Analytics Integration", 699],
    ["Customer Support Integration", 699],
    ["Calendar & Scheduling Integration", 699],
    ["Payment Provider Integration", 899],
    ["Shipping & Logistics Integration", 999],
    ["Identity Provider Integration", 899],
    ["Cloud Storage Integration", 699],
    ["Messaging Platform Integration", 699],
    ["E-signature Integration", 899],
    ["Maps & Location Integration", 899],
    ["Analytics & Reporting Integration", 999],
  ],
  data: [
    ["Database Design", 899],
    ["Relational Database Development", 1299],
    ["Database Schema Optimization", 699],
    ["Query Performance Optimization", 699],
    ["Database Migration", 999],
    ["Data Import & Cleaning", 699],
    ["Data Modeling", 899],
    ["Data Access & Permissions", 899],
    ["Backup & Recovery Planning", 699],
    ["Data Synchronization Systems", 999],
    ["Analytics Data Pipelines", 1999],
    ["Database Monitoring Setup", 699],
  ],
  fintech: [
    ["Fintech Dashboard Development", 1999],
    ["Financial Analytics Dashboards", 1499],
    ["Budget Management Applications", 1999],
    ["Expense Tracking Systems", 1499],
    ["Invoice & Billing Software", 1499],
    ["Subscription Billing Integration", 999],
    ["Financial Data Visualization", 999],
    ["Transaction Monitoring Interfaces", 1999],
    ["Payment Integration", 899],
    ["Financial Reporting Systems", 1499],
    ["Banking API Integration", 1499],
    ["Reconciliation Tools", 1499],
    ["Financial Admin Panels", 1499],
    ["Fintech MVP Development", 3999],
  ],
  "cloud-devops": [
    ["Website Deployment", 699],
    ["Application Deployment", 899],
    ["Cloud Hosting Setup", 999],
    ["Hosting Migration", 899],
    ["Domain & DNS Configuration", 699],
    ["SSL/TLS Configuration", 699],
    ["CI/CD Pipeline Setup", 1499],
    ["Development/Staging/Production Setup", 1499],
    ["Environment & Secret Management", 999],
    ["Containerization", 1499],
    ["Infrastructure as Code", 1999],
    ["Cloud Architecture Review", 999],
    ["Deployment Troubleshooting", 699],
    ["Monitoring & Logging Setup", 899],
    ["Backup Configuration", 699],
    ["Reliability Improvements", 999],
    ["Infrastructure Cost Optimization", 899],
    ["Managed Technical Maintenance", 999, "monthly"],
  ],
  "security-optimization": [
    ["Application Security Review", 999],
    ["Authentication Hardening", 899],
    ["Authorization & Permission Audit", 899],
    ["Database Access Security", 899],
    ["API Security Review", 999],
    ["Input Validation Improvements", 699],
    ["Dependency Security Review", 699],
    ["Security Headers Configuration", 699],
    ["Secrets Management Improvements", 699],
    ["Privacy-conscious Data Handling Improvements", 899],
    ["Security Fix Implementation", 899],
    ["Secure Deployment Practices", 999],
    // Performance, SEO and technical optimization
    ["Website Performance Optimization", 699],
    ["Core Web Vitals Improvements", 699],
    ["Frontend Bundle Optimization", 699],
    ["Image & Asset Optimization", 699],
    ["Backend Performance Optimization", 899],
    ["Database Performance Optimization", 899],
    ["Technical SEO Implementation", 699],
    ["Metadata & Structured Data", 699],
    ["Sitemap & Indexing Configuration", 699],
    ["Accessibility Improvements", 699],
    ["Responsive Design Fixes", 699],
    ["Browser Compatibility Fixes", 699],
    ["Technical Website Audit", 899],
    ["Conversion-oriented Technical Improvements", 899],
  ],
  "consulting-maintenance": [
    // Testing, quality assurance and maintenance
    ["Functional Testing", 699],
    ["Cross-device Testing", 699],
    ["Cross-browser Testing", 699],
    ["API Testing", 699],
    ["Integration Testing", 899],
    ["Automated Test Implementation", 999],
    ["Regression Testing", 699],
    ["Bug Investigation & Fixes", 699],
    ["Legacy Code Review", 999],
    ["Technical Debt Reduction", 999],
    ["Dependency & Framework Updates", 699],
    ["Ongoing Website Maintenance", 699, "monthly"],
    ["Application Maintenance", 899, "monthly"],
    ["Technical Support Retainer", 699, "monthly"],
    // Digital products, prototypes and technical consulting
    ["Technical Discovery", 699],
    ["Software Feasibility Study", 899],
    ["Product Requirements Definition", 899],
    ["Technical Specification Writing", 899],
    ["Technology Stack Selection", 699],
    ["Architecture Planning", 999],
    ["Proof of Concept Development", 999],
    ["Interactive Prototyping", 999],
    ["MVP Planning & Delivery", 1999],
    ["Existing Product Assessment", 899],
    ["Technical Due Diligence Support", 1499],
    ["Developer Handover & Documentation", 699],
    ["Technical Team Augmentation", 1999, "monthly"],
    ["Software Project Rescue", 1499],
    // Recommended monthly plans
    ["Website Care", 699, "monthly"],
    ["Application Care", 899, "monthly"],
    ["Managed Infrastructure", 999, "monthly"],
    ["Automation Care", 899, "monthly"],
    ["AI Application Care", 999, "monthly"],
    ["Product Development Retainer", 1999, "monthly"],
  ],
};

const DESCRIPTIONS: Record<string, string> = {
  "Website Care": "A defined maintenance allowance, routine updates and agreed minor fixes.",
  "Application Care": "Routine application maintenance, updates and scoped troubleshooting.",
  "Managed Infrastructure": "Agreed infrastructure monitoring and maintenance.",
  "Automation Care": "Monitoring and maintaining selected automation workflows.",
  "AI Application Care": "Monitoring and maintaining a defined AI-enabled application.",
  "Technical Support Retainer": "A defined allowance for ongoing technical support.",
  "Product Development Retainer": "An agreed recurring development capacity and roadmap.",
};

export const slugify = (s: string): string =>
  s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export const TECH_SERVICES: TechService[] = SERVICE_FAMILIES.flatMap((family) =>
  ROWS[family.slug].map(([name, from, billing = "one-time"]) => ({
    slug: slugify(name),
    name,
    family: family.slug,
    ...(DESCRIPTIONS[name] ? { description: DESCRIPTIONS[name] } : {}),
    from,
    billing,
    quotable: true as const,
  })),
);

/**
 * The five original Houcine.tech project types, kept and repositioned inside the catalogue. Each points at
 * its catalogue entry, which holds the price.
 */
export const FEATURED_SERVICES = [
  {
    label: "Landing Page",
    service: "Landing Page Development",
    description: "Perfect for creators and personal brands — fast, elegant, and mobile-optimized.",
    timeline: "5-7 days",
  },
  {
    label: "Portfolio Website",
    service: "Portfolio Website Development",
    description: "Fully custom, SEO-friendly, and easily updatable portfolios for artists, developers, and designers.",
    timeline: "10-14 days",
  },
  {
    label: "Business Website",
    service: "Business Website Development",
    description: "Conversion-oriented websites built with React, Tailwind, and modern integrations.",
    timeline: "14-21 days",
  },
  {
    label: "Educational Platform",
    service: "Educational Platform Development",
    description: "Websites for schools, clubs, and projects with login systems or course sections.",
    timeline: "21-30 days",
  },
  {
    label: "Fintech Dashboard",
    service: "Fintech Dashboard Development",
    description: "Data-driven apps and automation interfaces for finance, crypto, or business dashboards.",
    timeline: "30-45 days",
  },
] as const;

/** What starting prices do not include unless a quote says so (specification, section 1.5). */
export const PRICE_EXCLUSIONS = [
  "Hosting subscriptions and domains",
  "Third-party software licences and external subscriptions",
  "Paid API usage and AI model consumption",
  "Payment-provider and app-store fees",
  "Legal or regulatory certification",
  "Unlimited revisions, support, features or integrations",
] as const;

export const serviceByName = (name: string): TechService | undefined => TECH_SERVICES.find((s) => s.name === name);
export const servicesInFamily = (family: FamilySlug): TechService[] => TECH_SERVICES.filter((s) => s.family === family);
export const familyBySlug = (slug: string): ServiceFamily | undefined => SERVICE_FAMILIES.find((f) => f.slug === slug);

/** "1,299" */
export const formatAmount = (n: number): string => n.toLocaleString("en-US");

/** "€1,299 / $1,299" */
export const formatPrice = (n: number): string => `€${formatAmount(n)} / $${formatAmount(n)}`;

/** "From €1,299 / $1,299" or "From €699 / $699 per month" */
export const priceLabel = (s: Pick<TechService, "from" | "billing">): string =>
  `From ${formatPrice(s.from)}${s.billing === "monthly" ? " per month" : ""}`;

// ---------------------------------------------------------------------------------------------------------
// Budget ranges for the quote form. A range is offered only when its top is above the service's starting
// price, and the lowest offered range starts at that price, so a visitor can never pick a budget below it.
// Values: "999-1500", "over-25000"; monthly ranges end in "/month".

const ONE_TIME_EDGES = [MIN_ONE_TIME_PRICE, 1500, 3000, 6000, 12000, 25000];
const MONTHLY_EDGES = [MIN_ONE_TIME_PRICE, 1000, 2000, 4000];

export interface BudgetOption {
  value: string;
  label: string;
}

export const budgetOptionsFor = (s: Pick<TechService, "from" | "billing">): BudgetOption[] => {
  const edges = s.billing === "monthly" ? MONTHLY_EDGES : ONE_TIME_EDGES;
  const suffix = s.billing === "monthly" ? "/month" : "";
  const labelSuffix = s.billing === "monthly" ? " per month" : "";
  const options: BudgetOption[] = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const max = edges[i + 1];
    if (max <= s.from) continue;
    const min = Math.max(edges[i], s.from);
    options.push({
      value: `${min}-${max}${suffix}`,
      label: `€${formatAmount(min)} – ${formatAmount(max)} / $${formatAmount(min)} – ${formatAmount(max)}${labelSuffix}`,
    });
  }
  const top = Math.max(edges[edges.length - 1], s.from);
  options.push({ value: `over-${top}${suffix}`, label: `Over €${formatAmount(top)} / $${formatAmount(top)}${labelSuffix}` });
  return options;
};

/** True when `budget` is one of the ranges offered for the named service. */
export const isBudgetAllowed = (serviceName: string, budget: string): boolean => {
  const s = serviceByName(serviceName);
  return !!s && budgetOptionsFor(s).some((o) => o.value === budget);
};

/** Human label of a budget value for the named service, or undefined when it is not allowed. */
export const budgetLabel = (serviceName: string, budget: string): string | undefined => {
  const s = serviceByName(serviceName);
  return s ? budgetOptionsFor(s).find((o) => o.value === budget)?.label : undefined;
};
