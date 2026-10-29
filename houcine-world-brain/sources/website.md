---
id: sources-website
title: Sources on the public site
brand: houcine-world
type: source
visibility: public
status: verified
updated: 2026-10-29
---

# Sources on the public site

Each id below is a place the facts in the brain were read from. A note lists the ids it relies on in `sources`.
When one of these pages changes, the notes that cite it must be checked again.

<!-- source ids: one per line, "- `id`: where" -->
- `site-larosaview`: the La Rosa View page, `/larosaview` (`src/pages/LaRosaView.tsx`)
- `site-about-dj`: the DJ page, `/about-dj` (`src/pages/AboutDJ.tsx`)
- `site-booking-form`: the booking request form, `/booking` (`src/pages/BookingForm.tsx`)
- `site-review`: the review form, `/review` (`src/pages/Review.tsx`)
- `site-terms`: the Terms, `/terms` (`src/pages/Terms.tsx`)
- `site-contact`: the contact page, `/contact` (`src/pages/Contact.tsx`) and `src/config/contact.ts`
- `site-legal-data`: the ecosystem and managed-brand lists of the legal pages (`src/data/legal.ts`)
- `site-services`: the four verticals (`src/content/services.ts`)
- `site-faq`: the ecosystem questions (`src/content/faq.ts`)
- `site-dev`: the Houcine.tech page, `/dev`, and its catalogue (`src/content/techCatalogue.ts`)
- `site-designs`: the Houcine.studio page, `/designs`, and its packages (`src/data/servicePackages.ts`)
- `site-reads`: the Houcine.education page, `/reads`
- `site-manages`: the Houcine.management page, `/manages`
- `previous-concierge`: the facts the concierge used before the brain (`supabase/functions/concierge/knowledgeBase.ts`, retired 29 October 2026), all of them taken from the pages above
