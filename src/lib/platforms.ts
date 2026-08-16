import { Instagram, Music2, Cloud, Disc3, Mail, type LucideIcon } from "lucide-react";

/**
 * The full roster of platforms Connected Accounts will ever show. Adding a
 * new one later means adding a row here and an edge function — the settings
 * UI, the data model (`connected_accounts`), and the RLS/audit plumbing
 * already treat every platform identically. `connectable` platforms still
 * need their app-level credentials filled in under Platform Credentials
 * before "Connect" is enabled — see PlatformCredentialsCard.
 */
export interface PlatformDef {
  id: "instagram" | "tiktok" | "soundcloud" | "spotify" | "gmail";
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
  { id: "gmail", label: "Gmail", icon: Mail, connectable: false },
];
