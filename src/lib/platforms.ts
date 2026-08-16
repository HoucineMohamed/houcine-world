import { Instagram, Music2, Cloud, Disc3, Mail, type LucideIcon } from "lucide-react";

/**
 * The full roster of platforms Connected Accounts will ever show. Adding a
 * new one later (say, TikTok) means adding a row here and an edge function —
 * the settings UI, the data model (`connected_accounts`), and the RLS/audit
 * plumbing already treat every platform identically.
 */
export interface PlatformDef {
  id: "instagram" | "tiktok" | "soundcloud" | "spotify" | "gmail";
  label: string;
  icon: LucideIcon;
  /** Only Instagram has a working OAuth flow in this phase. */
  connectable: boolean;
}

export const PLATFORMS: PlatformDef[] = [
  { id: "instagram", label: "Instagram", icon: Instagram, connectable: true },
  { id: "tiktok", label: "TikTok", icon: Music2, connectable: false },
  { id: "soundcloud", label: "SoundCloud", icon: Cloud, connectable: false },
  { id: "spotify", label: "Spotify", icon: Disc3, connectable: false },
  { id: "gmail", label: "Gmail", icon: Mail, connectable: false },
];
