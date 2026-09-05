import { supabase } from "@/lib/supabaseClient";

export interface ConnectedAccount {
  id: string;
  brand_id: string;
  platform: string;
  status: "connected" | "expired" | "error" | "disconnected";
  account_name: string | null;
  token_expires_at: string | null;
  error_message: string | null;
  connected_at: string | null;
}

/** RLS-protected: brand members only ever see their own brand's rows. No tokens live here. */
export const fetchConnectedAccounts = async (brandId: string): Promise<ConnectedAccount[]> => {
  const { data, error } = await supabase
    .from("connected_accounts")
    .select("id, brand_id, platform, status, account_name, token_expires_at, error_message, connected_at")
    .eq("brand_id", brandId);
  if (error) throw error;
  return (data ?? []) as ConnectedAccount[];
};

/**
 * Starts Instagram's real OAuth flow: asks the `instagram-oauth` edge function
 * for an authorize URL (it mints and stores the CSRF state server-side), then
 * hands the browser off to Instagram/Facebook's consent screen.
 */
export const startInstagramConnect = async (brandId: string) => {
  const { data, error } = await supabase.functions.invoke<{ url: string }>("instagram-oauth/authorize", {
    body: { brand_id: brandId },
  });
  if (error) throw error;
  if (!data?.url) throw new Error("Instagram did not return an authorization URL");
  window.location.href = data.url;
};

/** Disconnect goes through the audited SECURITY DEFINER RPC, same pattern as membership writes. */
export const disconnectPlatformAccount = async (brandId: string, platform: string) => {
  const { error } = await supabase.rpc("disconnect_platform_account", { p_brand_id: brandId, p_platform: platform });
  if (error) throw error;
};

export interface InstagramRecentPost {
  id: string;
  caption: string | null;
  likeCount: number;
  commentCount: number;
  timestamp: string;
  permalink: string;
  mediaType: string;
}

export interface InstagramMetrics {
  username: string;
  followers: number;
  mediaCount: number;
  recentPosts: InstagramRecentPost[];
  engagement: {
    postsSampled: number;
    totalLikes: number;
    totalComments: number;
    avgLikesPerPost: number;
    avgCommentsPerPost: number;
  };
}

export interface InstagramMetricsResponse {
  connected: boolean;
  status?: "connected" | "expired" | "error";
  accountName?: string | null;
  metrics?: InstagramMetrics | null;
  fetchedAt?: string | null;
  stale?: boolean;
  message?: string;
}

/** Always live-sourced from the `instagram-metrics` edge function — the token never reaches the browser. */
export const fetchInstagramMetrics = async (brandId: string): Promise<InstagramMetricsResponse> => {
  const { data, error } = await supabase.functions.invoke<InstagramMetricsResponse>("instagram-metrics", {
    body: { brand_id: brandId },
  });
  if (error) throw error;
  return data ?? { connected: false };
};

// ── Generic platform connect/metrics (TikTok, Spotify, SoundCloud, YouTube, Facebook) ──
// Same pattern as the Instagram-specific functions above, parameterized by
// platform now that every platform's edge functions follow the identical
// `${platform}-oauth` / `${platform}-metrics` route + response shape.

export type OAuthPlatform = "tiktok" | "spotify" | "soundcloud" | "youtube" | "facebook";

/** Starts a platform's real OAuth flow via its `${platform}-oauth/authorize` edge function. */
export const startPlatformConnect = async (brandId: string, platform: OAuthPlatform) => {
  const { data, error } = await supabase.functions.invoke<{ url: string; error?: string }>(
    `${platform}-oauth/authorize`,
    { body: { brand_id: brandId } },
  );
  if (error) throw error;
  if (!data?.url) throw new Error(data?.error ?? `${platform} did not return an authorization URL`);
  window.location.href = data.url;
};

export interface PlatformMetricStat {
  label: string;
  value: number;
}

export interface PlatformRecentItem {
  id: string;
  title: string;
  permalink: string;
  stats: PlatformMetricStat[];
}

/** Normalized shape shared by tiktok-metrics, spotify-metrics, and soundcloud-metrics. */
export interface PlatformMetrics {
  followers: number;
  secondaryLabel: string;
  secondaryValue: number;
  engagement: PlatformMetricStat[];
  recentItems: PlatformRecentItem[];
}

export interface PlatformMetricsResponse {
  connected: boolean;
  status?: "connected" | "expired" | "error";
  accountName?: string | null;
  metrics?: PlatformMetrics | null;
  fetchedAt?: string | null;
  stale?: boolean;
  message?: string;
}

export const fetchPlatformMetrics = async (brandId: string, platform: OAuthPlatform): Promise<PlatformMetricsResponse> => {
  const { data, error } = await supabase.functions.invoke<PlatformMetricsResponse>(`${platform}-metrics`, {
    body: { brand_id: brandId },
  });
  if (error) throw error;
  return data ?? { connected: false };
};

// ── Meta Business Suite (System User token, not OAuth) ─────────────────────
// Same connected_accounts row / same normalized metrics shape as every other
// platform, but the connect step is a pasted token instead of a redirect —
// its own service functions instead of startPlatformConnect, and its edge
// function route names use a hyphen ("meta-business-…") where the stored
// `platform` value uses an underscore ("meta_business"), so it can't share
// the generic `${platform}-metrics` string interpolation above.

export interface SaveMetaBusinessTokenResult {
  ok: boolean;
  accountName?: string;
  pageName?: string;
  instagramUsername?: string | null;
  tokenExpiresAt?: string | null;
  error?: string;
  reason?: "invalid_token" | "api_error" | "no_page" | "insufficient_permissions";
}

/** Validates the pasted token against Meta, resolves the Page/IG account, and stores it server-side. */
export const saveMetaBusinessToken = async (
  brandId: string,
  accessToken: string,
  pageId?: string,
): Promise<SaveMetaBusinessTokenResult> => {
  const { data, error } = await supabase.functions.invoke<SaveMetaBusinessTokenResult>("meta-business-token", {
    body: { brand_id: brandId, access_token: accessToken, ...(pageId ? { page_id: pageId } : {}) },
  });
  if (error) {
    // Validation failures (bad token, no linked Page, missing permissions)
    // come back as a 4xx with a JSON body ({ ok: false, error, reason }) —
    // supabase-js only exposes that via error.context (the raw Response),
    // leaving `data` null, so pull it out here instead of surfacing the
    // generic "Edge Function returned a non-2xx status code" message.
    const context = (error as { context?: Response }).context;
    if (context) {
      try {
        const body = await context.clone().json();
        if (body && typeof body === "object" && "error" in body) return body as SaveMetaBusinessTokenResult;
      } catch { /* fall through */ }
    }
    throw error;
  }
  return data ?? { ok: false, error: "No response from the server" };
};

/** Extra fields meta-business-metrics adds for the combined Analytics summary card. */
export interface MetaBusinessBreakdown {
  pageName: string;
  pageFollowers: number;
  instagramUsername: string | null;
  instagramFollowers: number;
  totalReach28d: number;
}

export interface MetaBusinessMetrics extends PlatformMetrics {
  breakdown?: MetaBusinessBreakdown;
}

export interface MetaBusinessMetricsResponse extends Omit<PlatformMetricsResponse, "metrics"> {
  metrics?: MetaBusinessMetrics | null;
}

export const fetchMetaBusinessMetrics = async (brandId: string): Promise<MetaBusinessMetricsResponse> => {
  const { data, error } = await supabase.functions.invoke<MetaBusinessMetricsResponse>("meta-business-metrics", {
    body: { brand_id: brandId },
  });
  if (error) throw error;
  return data ?? { connected: false };
};
