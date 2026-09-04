/**
 * Meta Business Suite (System User token) integration.
 *
 * Deliberately NOT an OAuth login flow: the brand owner generates a
 * long-lived System User access token inside Meta Business Manager for the
 * Page / Instagram Business account their business already owns, and pastes
 * it into Brand Settings. Because the token only ever touches assets owned by
 * that Business, no Meta App Review is required — unlike the consumer
 * Facebook Login flow (facebook-oauth), which needs Advanced Access.
 *
 * Graph API version pinned to v21.0 — bump before Meta's rolling deprecation.
 */

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export class MetaApiError extends Error {
  reason: "invalid_token" | "api_error" | "no_page" | "insufficient_permissions";
  constructor(message: string, reason: MetaApiError["reason"]) {
    super(message);
    this.reason = reason;
  }
}

interface GraphErrorBody {
  error?: { message?: string; type?: string; code?: number; error_subcode?: number };
}

const graphGet = async <T>(path: string, params: Record<string, string>): Promise<T> => {
  const url = new URL(`${GRAPH_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  const body = await res.json().catch(() => ({}));
  const err = (body as GraphErrorBody).error;
  if (!res.ok || err) {
    const message = err?.message || `Meta Graph API request failed (${res.status})`;
    if (err?.code === 190 || res.status === 401) throw new MetaApiError(message, "invalid_token");
    if (err?.code === 10 || err?.code === 200 || err?.code === 803) {
      throw new MetaApiError(message, "insufficient_permissions");
    }
    throw new MetaApiError(message, "api_error");
  }
  return body as T;
};

export interface MetaAsset {
  pageId: string;
  pageName: string;
  /** Page access token derived from the System User token — used for all insight calls. */
  pageAccessToken: string;
  pageFollowers: number;
  igUserId: string | null;
  igUsername: string | null;
  igFollowers: number;
  igMediaCount: number;
}

interface AccountsResponse {
  data?: {
    id: string;
    name: string;
    access_token: string;
    fan_count?: number;
    followers_count?: number;
    instagram_business_account?: { id: string; username?: string; followers_count?: number; media_count?: number };
  }[];
}

/**
 * Resolves the Business-owned Page (and its linked Instagram Business
 * account, if any) reachable from the given System User token.
 * `preferredPageId` lets a business with several Pages pin one.
 */
export const resolveAssets = async (systemUserToken: string, preferredPageId?: string | null): Promise<MetaAsset> => {
  const res = await graphGet<AccountsResponse>("/me/accounts", {
    fields:
      "id,name,access_token,fan_count,followers_count,instagram_business_account{id,username,followers_count,media_count}",
    limit: "50",
    access_token: systemUserToken,
  });
  const pages = res.data ?? [];
  if (pages.length === 0) {
    throw new MetaApiError(
      "This token can't see any Facebook Page. In Business Settings, assign the Page to the System User with Page insights access.",
      "no_page",
    );
  }
  const page = (preferredPageId && pages.find((p) => p.id === preferredPageId)) || pages[0];
  const ig = page.instagram_business_account;
  return {
    pageId: page.id,
    pageName: page.name,
    pageAccessToken: page.access_token,
    pageFollowers: page.followers_count ?? page.fan_count ?? 0,
    igUserId: ig?.id ?? null,
    igUsername: ig?.username ?? null,
    igFollowers: ig?.followers_count ?? 0,
    igMediaCount: ig?.media_count ?? 0,
  };
};

interface InsightsResponse {
  data?: { name: string; values?: { value: number | Record<string, number> }[] }[];
}

const sumInsight = (rows: InsightsResponse["data"], name: string): number => {
  const row = rows?.find((r) => r.name === name);
  if (!row) return 0;
  return (row.values ?? []).reduce((sum, v) => {
    if (typeof v.value === "number") return sum + v.value;
    return sum + Object.values(v.value ?? {}).reduce((a, b) => a + b, 0);
  }, 0);
};

export interface PageInsights {
  impressions: number;
  engagements: number;
  fans: number;
}

/** Page-level insights over the trailing 28 days. Missing metrics degrade to 0 rather than failing the pull. */
export const fetchPageInsights = async (pageId: string, pageAccessToken: string): Promise<PageInsights> => {
  try {
    const res = await graphGet<InsightsResponse>(`/${pageId}/insights`, {
      metric: "page_impressions,page_post_engagements,page_fans",
      period: "days_28",
      access_token: pageAccessToken,
    });
    return {
      impressions: sumInsight(res.data, "page_impressions"),
      engagements: sumInsight(res.data, "page_post_engagements"),
      fans: sumInsight(res.data, "page_fans"),
    };
  } catch (e) {
    if (e instanceof MetaApiError && e.reason === "invalid_token") throw e;
    return { impressions: 0, engagements: 0, fans: 0 };
  }
};

export interface IgInsights {
  reach: number;
  impressions: number;
  profileViews: number;
}

export const fetchInstagramInsights = async (igUserId: string, pageAccessToken: string): Promise<IgInsights> => {
  try {
    const res = await graphGet<InsightsResponse>(`/${igUserId}/insights`, {
      metric: "reach,impressions,profile_views",
      period: "days_28",
      access_token: pageAccessToken,
    });
    return {
      reach: sumInsight(res.data, "reach"),
      impressions: sumInsight(res.data, "impressions"),
      profileViews: sumInsight(res.data, "profile_views"),
    };
  } catch (e) {
    if (e instanceof MetaApiError && e.reason === "invalid_token") throw e;
    return { reach: 0, impressions: 0, profileViews: 0 };
  }
};

export interface MetaRecentItem {
  id: string;
  title: string;
  permalink: string;
  stats: { label: string; value: number }[];
}

interface PostsResponse {
  data?: {
    id: string;
    message?: string;
    permalink_url?: string;
    created_time: string;
    likes?: { summary?: { total_count?: number } };
    comments?: { summary?: { total_count?: number } };
    shares?: { count?: number };
  }[];
}

export const fetchRecentPagePosts = async (
  pageId: string,
  pageAccessToken: string,
  limit = 8,
): Promise<MetaRecentItem[]> => {
  try {
    const res = await graphGet<PostsResponse>(`/${pageId}/posts`, {
      fields: "message,permalink_url,created_time,likes.summary(true),comments.summary(true),shares",
      limit: String(limit),
      access_token: pageAccessToken,
    });
    return (res.data ?? []).map((p) => ({
      id: p.id,
      title: `FB · ${p.message?.slice(0, 120) || "(no caption)"}`,
      permalink: p.permalink_url ?? `https://facebook.com/${p.id}`,
      stats: [
        { label: "Likes", value: p.likes?.summary?.total_count ?? 0 },
        { label: "Comments", value: p.comments?.summary?.total_count ?? 0 },
        { label: "Shares", value: p.shares?.count ?? 0 },
      ],
    }));
  } catch {
    return [];
  }
};

interface IgMediaResponse {
  data?: {
    id: string;
    caption?: string;
    permalink?: string;
    like_count?: number;
    comments_count?: number;
  }[];
}

export const fetchRecentIgMedia = async (
  igUserId: string,
  pageAccessToken: string,
  limit = 8,
): Promise<MetaRecentItem[]> => {
  try {
    const res = await graphGet<IgMediaResponse>(`/${igUserId}/media`, {
      fields: "caption,permalink,like_count,comments_count,timestamp",
      limit: String(limit),
      access_token: pageAccessToken,
    });
    return (res.data ?? []).map((m) => ({
      id: m.id,
      title: `IG · ${m.caption?.slice(0, 120) || "(no caption)"}`,
      permalink: m.permalink ?? `https://instagram.com/`,
      stats: [
        { label: "Likes", value: m.like_count ?? 0 },
        { label: "Comments", value: m.comments_count ?? 0 },
      ],
    }));
  } catch {
    return [];
  }
};

/** Meta tells us how long a token is good for; System User tokens are usually non-expiring (expires_at = 0). */
export const inspectToken = async (
  token: string,
  appToken?: string,
): Promise<{ expiresAt: string | null; scopes: string[] }> => {
  if (!appToken) return { expiresAt: null, scopes: [] };
  try {
    const res = await graphGet<{ data?: { expires_at?: number; scopes?: string[] } }>("/debug_token", {
      input_token: token,
      access_token: appToken,
    });
    const exp = res.data?.expires_at ?? 0;
    return {
      expiresAt: exp > 0 ? new Date(exp * 1000).toISOString() : null,
      scopes: res.data?.scopes ?? [],
    };
  } catch {
    return { expiresAt: null, scopes: [] };
  }
};
