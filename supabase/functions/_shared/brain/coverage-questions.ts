// The fixed visitor questions behind the coverage score (coverage.ts, docs/knowledge-studio.md "Coverage"). Written
// from the public site's own pages; an expectation names the note section that answers it, never an answer. A "gap"
// is a question no note answers yet: its reason says where the fact would come from (the site's text, or the owner:
// houcine-world-brain/internal/open-questions.md). Nothing here is a fact for visitors; it is never sent to an AI.
// Adding a question: a new id, the brand, the visitor's words, and what a correct answer is. The test
// (scripts/ci/coverage.test.mjs) checks every expectation against the index.

import type { CoverageQuestion } from "./coverage.ts";

export const COVERAGE_QUESTIONS: CoverageQuestion[] = [
  // ---------- La Rosa View ----------
  { id: "lrv-how-to-book", brand: "la-rosa-view", kind: "answered", question: "How do I book La Rosa View for my event?", expect: ["lrv-bookings#How to book"] },
  { id: "lrv-form-fields", brand: "la-rosa-view", kind: "answered", question: "What information does the booking form ask for?", expect: ["lrv-bookings#How to book"] },
  { id: "lrv-reply-time", brand: "la-rosa-view", kind: "answered", question: "How fast will the team reply to my booking request?", expect: ["lrv-bookings#What happens after a request", "lrv-faq#How fast does the team answer?"] },
  { id: "lrv-weddings", brand: "la-rosa-view", kind: "answered", question: "Do you play at weddings?", expect: ["lrv-faq#Does La Rosa View play weddings?", "lrv-services#Event types the booking form accepts"] },
  { id: "lrv-music", brand: "la-rosa-view", kind: "answered", question: "What kind of music does the DJ play?", expect: ["lrv-dj-hajri#Experience and style", "lrv-faq#What music does DJ La Rosa play?"] },
  { id: "lrv-n30", brand: "la-rosa-view", kind: "answered", question: "What is the N30 mix?", expect: ["lrv-events-releases#N30, the annual signature mix", "lrv-faq#What is N30?"] },
  { id: "lrv-confirmed", brand: "la-rosa-view", kind: "answered", question: "Is my date confirmed once I send the form?", expect: ["lrv-faq#Is my date confirmed once I send the form?", "lrv-policies#Booking requests are not confirmations", "policy-booking-requests#A request is not a booking"] },
  { id: "lrv-contact", brand: "la-rosa-view", kind: "answered", question: "How can I contact La Rosa View?", expect: ["lrv-contact#Email"] },
  { id: "lrv-instagram", brand: "la-rosa-view", kind: "answered", question: "Is La Rosa View on Instagram?", expect: ["lrv-contact#Social accounts"] },
  { id: "lrv-based", brand: "la-rosa-view", kind: "answered", question: "Where is La Rosa View based?", expect: ["lrv-overview#Where it is based"] },
  { id: "lrv-price", brand: "la-rosa-view", kind: "awaiting", question: "How much does it cost to hire La Rosa View?", expect: ["lrv-bookings#Prices and quotes", "lrv-faq#How much does it cost?", "lrv-services#Prices"] },
  { id: "lrv-availability", brand: "la-rosa-view", kind: "awaiting", question: "Is the DJ available on my date?", expect: ["lrv-bookings#Availability", "policy-booking-requests#Availability on the site"] },
  { id: "lrv-deposit", brand: "la-rosa-view", kind: "awaiting", question: "Do I need to pay a deposit, and what happens if I cancel?", expect: ["lrv-bookings#Deposits, payment, cancellation", "lrv-policies#Payment, deposits, cancellation", "policy-booking-requests#Cancellation, rescheduling, deposits and payment"] },
  { id: "lrv-travel", brand: "la-rosa-view", kind: "awaiting", question: "Do you travel to other cities or countries for events?", expect: ["lrv-overview#Where it is based"] },
  { id: "lrv-equipment", brand: "la-rosa-view", kind: "gap", question: "Do you bring your own sound equipment, and how long is a set?", expect: [], gap: "Equipment and set length: owner question (internal/open-questions.md)." },
  { id: "lrv-updates", brand: "la-rosa-view", kind: "gap", question: "How can I get updates about new mixes and events?", expect: [], gap: "The /larosaview page has an updates sign-up (\"Stay in tune with our latest drops & events\"); no note mentions it." },

  // ---------- Houcine.world (shared) ----------
  { id: "hw-what", brand: "houcine-world", kind: "answered", question: "What is Houcine.world?", expect: ["hw-overview#What it is"] },
  { id: "hw-who", brand: "houcine-world", kind: "answered", question: "Who built Houcine.world?", expect: ["hw-overview#What it is", "person-houcine-mohamed"] },
  { id: "hw-verticals", brand: "houcine-world", kind: "answered", question: "What are the four verticals of the ecosystem?", expect: ["hw-overview#The four verticals", "rel-ecosystem"] },
  { id: "hw-email", brand: "houcine-world", kind: "answered", question: "What email address can I write to?", expect: ["hw-contact"] },
  { id: "hw-phone", brand: "houcine-world", kind: "answered", question: "What is your phone number?", expect: ["hw-contact#General contact"] },
  { id: "hw-new-brands", brand: "houcine-world", kind: "answered", question: "Can a new brand join the ecosystem?", expect: ["hw-overview#New brands"] },
  { id: "hw-data-deletion", brand: "houcine-world", kind: "gap", question: "How do I ask for my personal data to be deleted?", expect: [], gap: "Privacy and deletion requests go by email to the general address (site: src/data/legal.ts, /data-deletion); no note says so." },
  { id: "hw-law", brand: "houcine-world", kind: "gap", question: "Which law governs the terms of use?", expect: [], gap: "French law (site: src/data/legal.ts, /terms); no note says so." },
  { id: "hw-contact-form", brand: "houcine-world", kind: "gap", question: "Can I send a message through the contact page?", expect: [], gap: "The /contact message form is switched off (src/config/contact.ts); no note says so." },

  // ---------- Houcine.tech ----------
  { id: "tech-what", brand: "houcine-tech", kind: "answered", question: "What does Houcine.tech build?", expect: ["tech-overview", "tech-services#Service families"] },
  { id: "tech-mobile", brand: "houcine-tech", kind: "answered", question: "Can you build a mobile app?", expect: ["tech-services#Service families"] },
  { id: "tech-ai", brand: "houcine-tech", kind: "answered", question: "Do you do AI integration and automation?", expect: ["tech-overview", "tech-services#Service families"] },
  { id: "tech-price", brand: "houcine-tech", kind: "answered", question: "How much does a website cost?", expect: ["tech-services#Prices"] },
  { id: "tech-payment", brand: "houcine-tech", kind: "answered", question: "Which payment methods do you accept?", expect: ["tech-payment"] },
  { id: "tech-currency", brand: "houcine-tech", kind: "answered", question: "Can I pay in dollars?", expect: ["tech-payment"] },
  { id: "tech-timeline", brand: "houcine-tech", kind: "gap", question: "How long does it take to build a landing page?", expect: [], gap: "Delivery times of the five featured project types (src/content/techCatalogue.ts, FEATURED_SERVICES); no note has them." },
  { id: "tech-exclusions", brand: "houcine-tech", kind: "gap", question: "What is not included in the starting price?", expect: [], gap: "Price exclusions (src/content/techCatalogue.ts, PRICE_EXCLUSIONS) and the scoped quote with agreed revisions (/dev); no note has them." },
  { id: "tech-support", brand: "houcine-tech", kind: "gap", question: "Do you offer 24/7 support and maintenance?", expect: [], gap: "Monthly plans cover an agreed allowance, no 24/7 unless contracted (src/content/techCatalogue.ts); no note says so." },

  // ---------- Houcine.studio ----------
  { id: "studio-what", brand: "houcine-studio", kind: "answered", question: "What does Houcine.studio do?", expect: ["studio-overview"] },
  { id: "studio-branding", brand: "houcine-studio", kind: "answered", question: "Can you design a brand identity for my business?", expect: ["studio-overview", "studio-services"] },
  { id: "studio-price", brand: "houcine-studio", kind: "answered", question: "What design packages do you offer and what do they cost?", expect: ["studio-services#Packages and prices"] },
  { id: "studio-payment", brand: "houcine-studio", kind: "gap", question: "Which payment methods are accepted for design work?", expect: [], gap: "The payment terms live in a Houcine.tech note; Houcine.studio has none of its own, so its brand search cannot reach them." },
  { id: "studio-package-names", brand: "houcine-studio", kind: "gap", question: "What is included in the Brand Essentials package?", expect: [], gap: "Package names and contents (src/data/servicePackages.ts); the note only points to /designs." },
  { id: "studio-ai", brand: "houcine-studio", kind: "gap", question: "How do you use AI in your design work?", expect: [], gap: "The AI-assisted principles on /designs (src/pages/Designs.tsx); no note has them." },

  // ---------- Houcine.management ----------
  { id: "mgmt-what", brand: "houcine-management", kind: "answered", question: "What does Houcine.management do?", expect: ["management-overview"] },
  { id: "mgmt-brands", brand: "houcine-management", kind: "answered", question: "Which brands does Houcine.management manage?", expect: ["management-overview"] },
  { id: "mgmt-work", brand: "houcine-management", kind: "awaiting", question: "Can I see examples of past management work?", expect: ["management-overview"] },
  { id: "mgmt-audience", brand: "houcine-management", kind: "gap", question: "Do you work with venues and businesses?", expect: [], gap: "The five service areas and who it works with (src/pages/Manages.tsx); no note has them." },
  { id: "mgmt-process", brand: "houcine-management", kind: "gap", question: "How does a management project work, step by step?", expect: [], gap: "The four-step process (src/pages/Manages.tsx); no note has it." },
  { id: "mgmt-legal", brand: "houcine-management", kind: "gap", question: "Which company operates the Houcine.world sites?", expect: [], gap: "Houcine.management is the legal entity (src/data/legal.ts); no note says so." },

  // ---------- Houcine.education ----------
  { id: "edu-what", brand: "houcine-education", kind: "answered", question: "What is Houcine.education?", expect: ["education-overview#What it is"] },
  { id: "edu-contact", brand: "houcine-education", kind: "answered", question: "How do I contact Houcine.education?", expect: ["education-overview#Contact"] },
  { id: "edu-buy", brand: "houcine-education", kind: "answered", question: "Can I buy a course or a book now?", expect: ["education-overview#Buying and launch date"] },
  { id: "edu-launch", brand: "houcine-education", kind: "answered", question: "When will Houcine.education launch?", expect: ["education-overview#Buying and launch date"] },
];
