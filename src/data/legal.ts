/**
 * Single source of truth for /terms and /privacy: the ecosystem name, its
 * services, the brands currently managed under Houcine.management, and the
 * third-party platforms a brand can connect in the workspace. Add a brand or
 * a platform here and both legal pages pick it up — neither page should ever
 * hand-list these again.
 *
 * Placeholders below (wrapped in [BRACKETS]) need a real answer before these
 * pages are legally final — see the constants marked "PLACEHOLDER".
 */

export const ECOSYSTEM_NAME = "Houcine.world";

/** The four ecosystem pillars, as referenced across the public site (Index, WebGLHero, useAnalytics). */
export const ECOSYSTEM_SERVICES = [
  { name: "Houcine.tech", description: "Software development and technical work." },
  { name: "Houcine.studio", description: "Design and creative work." },
  { name: "Houcine.education", description: "Digital books and educational content." },
  { name: "Houcine.management", description: "Management of independent creative brands, such as La Rosa View." },
] as const;

/**
 * Brands currently managed under Houcine.management, each with its own
 * workspace, bookings, and connected accounts. Add new brands here as
 * Houcine.management takes them on.
 */
export const MANAGED_BRANDS = [
  { name: "La Rosa View", description: "DJ and music production brand." },
] as const;

/**
 * Every third-party platform a brand can connect in the workspace
 * (Settings -> Connected Accounts), and precisely what's pulled from each —
 * kept in sync with each platform's edge function
 * (supabase/functions/<platform>-metrics, and _shared/metaBusiness.ts for
 * Meta Business Suite). Update this the same day a new platform's connector
 * ships.
 */
export const CONNECTED_PLATFORMS = [
  {
    name: "Instagram",
    connectionMethod: "OAuth (Facebook Login for Business)",
    dataPulled:
      "Username, follower count, media count, and recent posts (caption, like/comment counts, timestamp, permalink, media type) for the connected Instagram professional account.",
  },
  {
    name: "TikTok",
    connectionMethod: "OAuth (TikTok Login Kit)",
    dataPulled:
      "Display name, follower count, likes count, video count, and recent videos (caption, view/like/comment counts, share link) for the connected TikTok account.",
  },
  {
    name: "Spotify",
    connectionMethod: "OAuth (Spotify Authorization Code flow)",
    dataPulled:
      "Follower count and recently played tracks (track and artist name, Spotify link) for the connected Spotify account. Spotify does not expose per-track play counts to account owners, so none are pulled.",
  },
  {
    name: "SoundCloud",
    connectionMethod: "OAuth 2.1 with PKCE",
    dataPulled:
      "Follower count, track count, and recent tracks (title, permalink, play/like/comment counts) for the connected SoundCloud account.",
  },
  {
    name: "YouTube",
    connectionMethod: "OAuth (Google, read-only YouTube scope)",
    dataPulled:
      "Subscriber count, video count, and recent videos (title, view/like/comment counts, video link) for the connected YouTube channel.",
  },
  {
    name: "Meta Business Suite (Facebook Page + Instagram)",
    connectionMethod:
      "A System User access token generated and pasted in by the brand admin (Meta Business Manager) -- not an OAuth redirect.",
    dataPulled:
      "Facebook Page name and follower count; the linked Instagram Business/Creator account's username and follower count; the Page's 28-day impressions, post engagements, and fan count; the Instagram account's 28-day reach, impressions, and profile views; and recent Facebook posts / Instagram media with their like, comment, and share counts.",
  },
] as const;

// ── Placeholders: fill these in before treating these pages as legally final ──

/** PLACEHOLDER — the legal entity operating this ecosystem (e.g. a registered company or the individual owner's legal name). */
export const LEGAL_ENTITY_NAME = "[LEGAL ENTITY NAME]";

/** PLACEHOLDER — the jurisdiction whose law governs these Terms and where disputes would be handled. */
export const GOVERNING_JURISDICTION = "[GOVERNING JURISDICTION]";

/** PLACEHOLDER — a single contact address for privacy questions, data-access/deletion requests, and general legal/Terms questions. */
export const LEGAL_CONTACT_EMAIL = "[CONTACT EMAIL FOR PRIVACY / LEGAL REQUESTS]";

/** Shown on both pages. Update whenever the copy materially changes. */
export const LEGAL_LAST_UPDATED = "September 5, 2026";
