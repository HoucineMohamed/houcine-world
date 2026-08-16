import type { SupabaseClient } from "npm:@supabase/supabase-js@2.49.1";

/**
 * Resolves the app-level OAuth Client ID/Secret for a platform from either
 * source an admin might have used: Edge Function secrets (Deno env — how
 * Instagram was originally configured) take priority, falling back to the
 * `platform_credentials` table (how the in-app "Platform Credentials" panel
 * stores them). Every OAuth edge function goes through this instead of
 * reading Deno.env directly, so both configuration paths just work.
 */

export type PlatformId = "instagram" | "tiktok" | "soundcloud" | "spotify";

export const PLATFORM_IDS: PlatformId[] = ["instagram", "tiktok", "soundcloud", "spotify"];

const ENV_KEYS: Record<PlatformId, { id: string; secret: string; redirect: string }> = {
  instagram: { id: "INSTAGRAM_APP_ID", secret: "INSTAGRAM_APP_SECRET", redirect: "INSTAGRAM_REDIRECT_URI" },
  tiktok: { id: "TIKTOK_CLIENT_KEY", secret: "TIKTOK_CLIENT_SECRET", redirect: "TIKTOK_REDIRECT_URI" },
  spotify: { id: "SPOTIFY_CLIENT_ID", secret: "SPOTIFY_CLIENT_SECRET", redirect: "SPOTIFY_REDIRECT_URI" },
  soundcloud: { id: "SOUNDCLOUD_CLIENT_ID", secret: "SOUNDCLOUD_CLIENT_SECRET", redirect: "SOUNDCLOUD_REDIRECT_URI" },
};

export interface PlatformCredentials {
  clientId: string;
  clientSecret: string;
}

/** The callback URL an admin registers in each provider's developer console. */
export const redirectUriFor = (platform: PlatformId): string => {
  const override = Deno.env.get(ENV_KEYS[platform].redirect);
  if (override) return override;
  const base = Deno.env.get("SUPABASE_URL")!.replace(/\/$/, "");
  return `${base}/functions/v1/${platform}-oauth/callback`;
};

export const getPlatformCredentials = async (
  svc: SupabaseClient,
  platform: PlatformId,
): Promise<PlatformCredentials | null> => {
  const envKeys = ENV_KEYS[platform];
  const envId = Deno.env.get(envKeys.id);
  const envSecret = Deno.env.get(envKeys.secret);
  if (envId && envSecret) return { clientId: envId, clientSecret: envSecret };

  const { data } = await svc
    .from("platform_credentials")
    .select("client_id, client_secret")
    .eq("platform", platform)
    .maybeSingle();
  if (data?.client_id && data?.client_secret) {
    return { clientId: data.client_id, clientSecret: data.client_secret };
  }
  return null;
};

export const isPlatformConfigured = async (svc: SupabaseClient, platform: PlatformId): Promise<boolean> =>
  (await getPlatformCredentials(svc, platform)) !== null;
