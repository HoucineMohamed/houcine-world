import { Instagram, Music2, Cloud, Disc3, Mail, Youtube, Facebook, Building2, type LucideIcon } from "lucide-react";

/**
 * The full roster of platforms Connected Accounts will ever show. Adding a
 * new one later means adding a row here and an edge function — the settings
 * UI, the data model (`connected_accounts`), and the RLS/audit plumbing
 * already treat every platform identically. `connectable` platforms still
 * need their app-level credentials filled in under Platform Credentials
 * before "Connect" is enabled — see PlatformCredentialsCard.
 *
 * `meta_business` is the one exception to the OAuth-Connect-button flow:
 * it's authenticated via a pasted System User token (Settings →
 * ConnectedAccountsCard renders its own dedicated paste UI for it instead
 * of the generic Connect button), not app-level Client ID/Secret
 * credentials — see PlatformCredentialsPanel's explicit OAUTH_PLATFORMS
 * list, which deliberately excludes it.
 */
export interface PlatformDef {
  id: "instagram" | "tiktok" | "soundcloud" | "spotify" | "gmail" | "youtube" | "facebook" | "meta_business";
  label: string;
  icon: LucideIcon;
  /** Gmail has no OAuth flow built yet — stays a "Not Connected" placeholder. */
  connectable: boolean;
}

export const PLATFORMS: PlatformDef[] = [
  { id: "instagram", label: "Instagram", icon: Instagram, connectable: true },
  { id: "tiktok", label: "TikTok", icon: Music2, connectable: true },
  { id: "soundcloud", label: "SoundCloud", icon: Cloud, connectable: true },
  { id: "spotify", label: "Spotify", icon: Disc3, connectable: true },
  { id: "youtube", label: "YouTube", icon: Youtube, connectable: true },
  { id: "facebook", label: "Facebook", icon: Facebook, connectable: true },
  { id: "meta_business", label: "Meta Business Suite", icon: Building2, connectable: true },
  { id: "gmail", label: "Gmail", icon: Mail, connectable: false },
];
