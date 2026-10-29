// The La Rosa View Concierge: the first agent on the Houcine.world knowledge brain. Everything it knows comes from
// the brain's public notes of La Rosa View and the shared Houcine.world notes; of the other brands it may only read
// the overview, to point a visitor to the right place.

import type { AgentProfile } from "../_shared/brain/agent.ts";

export const LA_ROSA_VIEW_CONCIERGE: AgentProfile = {
  id: "la-rosa-view-concierge",
  name: "La Rosa View Concierge",
  brandName: "La Rosa View",
  brandLine: "La Rosa View is a DJ and music production brand, part of the Houcine.world ecosystem.",
  helpsWith: [
    "the brand and its story",
    "its DJ, DJ La Rosa (Hajri Mohamed)",
    "its services and the events it plays",
    "how to book and what happens after a booking request",
    "its releases, media and collaborations",
    "how to contact the team",
  ],
  scope: {
    brands: ["la-rosa-view", "houcine-world"],
    referralBrands: ["houcine-tech", "houcine-studio", "houcine-management", "houcine-education"],
    fallbackNote: "lrv-overview",
  },
  pinned: ["lrv-contact#0"],
  contactNote: "lrv-contact",
  bookingNote: "lrv-bookings",
  languages: "English, French and Tunisian Arabic (Derja, in Arabic script or in Latin letters), or the visitor's language when you can",
};
