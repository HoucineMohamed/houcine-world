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
