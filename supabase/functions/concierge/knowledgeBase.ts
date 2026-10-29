// The La Rosa View Concierge's grounded knowledge base. Every fact here is taken verbatim or
// closely paraphrased from the public pages (src/pages/LaRosaView.tsx, AboutDJ.tsx,
// BookingForm.tsx, Terms.tsx, Review.tsx) and src/config/contact.ts -- nothing invented. This file
// has no "src/" imports on purpose: edge functions cannot import from the frontend build
// (see AGENTS.md's note on techPrices.ts for the same constraint), so this is the one place that
// holds these facts for the server. If the public pages change, update this file to match.
//
// Scope: this knowledge base, and the system prompt built from it (see core.ts), cover ONLY
// La Rosa View -- not Houcine.tech, Houcine.studio, Houcine.management or Houcine.education.

export const PROPERTY = {
  name: "La Rosa View",
  tagline: "Where Sound Meets Vision.",
  type: "DJ and music production brand",
  managedBy:
    "Houcine.management, which develops and coordinates brands, artists, creative ventures and businesses.",
  description:
    "La Rosa View is a DJ and music production brand built around DJ La Rosa (Hajri Mohamed). " +
    "Its own words: \"La Rosa View is more than a name -- it's a perspective on music, life, and " +
    "art.\" The brand covers music production, live performances, media & visuals, and artist " +
    "collaboration.",
  location: "Based in Tunisia. No more specific city or address is published.",
} as const;

export const PEOPLE = [
  {
    name: "Hajri Mohamed",
    role: "DJ & Producer",
    alsoKnownAs: "DJ La Rosa",
    facts: [
      "+2 years of experience",
      "+50 events played, from private parties to clubs",
      "Versatile sets: House, Techno, Afrobeat and more",
      "Based in Tunisia",
    ],
  },
  {
    name: "Houcine Mohamed",
    role: "Director",
    // Nothing more is published about this role -- do not elaborate beyond the title.
    facts: [],
  },
] as const;

// The prose service categories from the public page, plus the booking form's own event-type list
// (the two don't perfectly mirror each other; both are real and may be mentioned).
export const SERVICES = [
  { name: "DJ Sets", description: "Custom curated music experiences for every vibe and occasion." },
  { name: "Private Parties", description: "Exclusive performances for intimate gatherings." },
  { name: "Club & Beach Events", description: "High-energy sets at clubs and beach venues." },
  { name: "Corporate & Brand Events", description: "Professional entertainment for corporate functions." },
  { name: "Music Production & Mixes", description: "Professional audio production and mixing services." },
  { name: "Collaborations & Projects with Artists", description: "Creative partnerships and artist collaborations." },
] as const;

export const BOOKABLE_EVENT_TYPES = ["Private Party", "Wedding", "Corporate Event", "Festival", "Club Night", "Other"] as const;

export const BOOKING = {
  howToBook:
    "Use the booking request form at /booking. It asks for your name, email, phone (optional), " +
    "event type, event date, location (city/venue), and any additional details (expected guests, " +
    "special requirements).",
  whatHappensNext:
    "Submitting the form sends a request, not a confirmed booking. It does not guarantee " +
    "availability, pricing, or acceptance -- a member of the team reviews it and responds " +
    "directly, typically within 24 hours, to confirm or decline and work out further details.",
  cancellationAndPayment:
    "There is no site-defined cancellation, rescheduling, deposit, or payment policy for La Rosa " +
    "View bookings. These are arranged directly between the visitor and the team once a member of " +
    "the team responds to the request -- never promise a specific cancellation policy, deposit " +
    "amount, currency, or payment method, since none is published.",
} as const;

export const CONTACT = {
  email: "larosaview@houcine.world",
  instagram: "https://www.instagram.com/la.rosaview/",
  tiktok: "https://www.tiktok.com/@larosaview",
  youtube: "https://www.youtube.com/@LaRosaView",
  soundcloud: "https://soundcloud.com/la-rosa-view",
  // No phone number is published for La Rosa View specifically.
} as const;

export const EXTRAS = {
  n30: "N30 is La Rosa View's annual signature mix: one date, one mix, one vision. Every " +
    "November 30 the previous N30 is retired and a new one takes its place.",
  media: "Featured on Al Hayet FM (an interview).",
} as const;

// What the assistant must NOT claim, however a visitor phrases the question.
export const LIMITATIONS = [
  "There is no live availability calendar or real-time pricing system -- never invent a price, a date's availability, or a quote.",
  "The on-page review form at /review does not publish submitted reviews anywhere public; never promise a review will appear on the site.",
  "A booking request is not a confirmation -- never say a booking is \"confirmed\" or \"booked\" unless the visitor tells you the team has already confirmed it directly.",
  "No cancellation, deposit, or payment policy is published -- never state specific terms; direct the visitor to ask the team once they respond.",
] as const;
