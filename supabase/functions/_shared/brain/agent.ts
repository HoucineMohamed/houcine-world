// What makes one AI agent different from another on the same knowledge brain: its name, the brand it speaks for,
// which brands' notes it may read, and which notes hold its contact route. A new brand agent is a new AgentProfile
// (plus its own function and widget), not new retrieval or prompt code. docs/knowledge-brain.md, "Adding a brand".

import type { SearchScope } from "./retrieve.ts";
import type { BrainIndex } from "./types.ts";

export interface AgentProfile {
  id: string;
  /** How the agent introduces itself. */
  name: string;
  /** The brand it represents, as visitors call it. */
  brandName: string;
  /** One line: what the brand is, to frame the agent (the facts themselves always come from the notes). */
  brandLine: string;
  /** What visitors usually come for: the topics the agent helps with. */
  helpsWith: string[];
  /** Which notes it may read. */
  scope: SearchScope;
  /** Passages always given to the model (the contact route), by chunk id. */
  pinned: string[];
  /** Where the error messages' contact details come from: the `fact_email` of this note... */
  contactNote: string;
  /** ...and the `fact_booking_path` of this one (optional). */
  bookingNote?: string;
  /** Languages the agent answers in. */
  languages: string;
}

/**
 * The profile with the access configured in the brain (houcine-world-brain/agents/<agent id>.md, compiled into the
 * index) applied over its code defaults. The index only ever holds public notes, so no access setting can expose an
 * internal or restricted note.
 */
export const withIndexAccess = (profile: AgentProfile, index: BrainIndex): AgentProfile => {
  const access = index.agents?.[profile.id];
  if (!access) return profile;
  return {
    ...profile,
    scope: {
      brands: access.brands,
      referralBrands: access.referralBrands,
      ...(access.fallbackNote ? { fallbackNote: access.fallbackNote } : {}),
    },
    pinned: access.pinned,
  };
};
