/**
 * Facebook Graph API — standard OAuth 2.0 server-side (confidential client)
 * flow, no PKCE (Meta recommends PKCE for its newer public-client/mobile
 * flows; a classic web-server flow backed by a client_secret, which is what
 * this app already stores, doesn't need it).
 * Docs: https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow
 *       https://developers.facebook.com/docs/pages/access-tokens
 *
 * Token model is genuinely different from every other platform wired up
 * here: Facebook has no refresh_token at all. The code exchange returns a
 * short-lived user token (~1-2h); exchangeForLongLivedToken swaps that for a
 * long-lived user token (~60 days); the Page Access Token pulled from
 * /me/accounts inherits that ~60-day lifetime. Once it expires there is no
 * silent renewal — the brand has to fully reconnect (see facebook-metrics,
 * which treats near-expiry as "needs reconnect", never a refresh attempt).
 *
 * Scope note: pages_show_list and pages_read_engagement are Advanced Access
 * permissions — Meta App Review is required before any Facebook account
 * other than the app's own registered admins/testers can complete this flow.
 *
 * API version: pinned to v21.0, current at the time this was written. Meta
 * deprecates versions on a rolling ~2-year schedule — bump GRAPH_VERSION
 * here against the current version list at developers.facebook.com/docs/graph-api/changelog
 * before it lapses.
 */
import type { PlatformCredentials } from "./credentials.ts";

const GRAPH_VERSION = "v21.0";
const AUTH_BASE = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`;
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export const FACEBOOK_SCOPES = "public_profile,pages_show_list,pages_read_engagement";

export class FacebookApiError extends Error {
  reason: "invalid_token" | "api_error" | "config_error" | "no_page";
  constructor(message: string, reason: FacebookApiError["reason"]) {
    super(message);
    this.reason = reason;
  }
}

export const buildAuthorizeUrl = (creds: PlatformCredentials, redirectUri: string, state: string) => {
  const url = new URL(AUTH_BASE);
  url.searchParams.set("client_id", creds.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", FACEBOOK_SCOPES);
  url.searchParams.set("response_type", "code");
  return url.toString();
};

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}
interface GraphErrorBody {
  error?: { message?: string; type?: string; code?: number };
}

const graphGet = async <T>(path: string, params: Record<string, string>): Promise<T> => {
  const url = new URL(`${GRAPH_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  const body = await res.json().catch(() => ({}));
  if (!res.ok || (body as GraphErrorBody).error) {
    const err = (body as GraphErrorBody).error;
    const message = err?.message || `Facebook Graph API request failed (${res.status})`;
    // 190 = OAuthException (expired/invalid token) in Meta's error taxonomy.
    throw new FacebookApiError(message, err?.code === 190 || res.status === 401 ? "invalid_token" : "api_error");
  }
  return body as T;
};

export const exchangeCodeForToken = (creds: PlatformCredentials, code: string, redirectUri: string) =>
  graphGet<TokenResponse>("/oauth/access_token", {
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    redirect_uri: redirectUri,
    code,
  });

/** Short-lived (~1-2h) user token -> long-lived (~60 day) user token. No refresh_token exists in this flow at all. */
export const exchangeForLongLivedToken = (creds: PlatformCredentials, shortLivedToken: string) =>
  graphGet<TokenResponse>("/oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    fb_exchange_token: shortLivedToken,
  });

export interface FacebookPage {
  id: string;
  name: string;
  accessToken: string; // Page Access Token — used for all subsequent calls, not the user token
  followers: number;
}

interface AccountsResponse {
  data?: { id: string; name: string; access_token: string; fan_count?: number; followers_count?: number }[];
}

/** The brand's managed Page — same "connect via the Page you manage" model this app already uses for Instagram. */
export const fetchManagedPage = async (userAccessToken: string): Promise<FacebookPage> => {
  const res = await graphGet<AccountsResponse>("/me/accounts", {
    fields: "id,name,access_token,fan_count,followers_count",
    access_token: userAccessToken,
  });
  const page = res.data?.[0];
  if (!page) throw new FacebookApiError("No Facebook Page is managed by this account", "no_page");
  return {
    id: page.id,
    name: page.name,
    accessToken: page.access_token,
    followers: page.followers_count ?? page.fan_count ?? 0,
  };
};

export const fetchPageFollowers = async (pageId: string, pageAccessToken: string): Promise<number> => {
  const res = await graphGet<{ fan_count?: number; followers_count?: number }>(`/${pageId}`, {
    fields: "fan_count,followers_count",
    access_token: pageAccessToken,
  });
  return res.followers_count ?? res.fan_count ?? 0;
};

export interface FacebookPost {
  id: string;
  message: string | null;
  permalink: string;
  createdTime: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
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

export const fetchRecentPosts = async (
  pageId: string,
  pageAccessToken: string,
  limit = 10,
): Promise<FacebookPost[]> => {
  const res = await graphGet<PostsResponse>(`/${pageId}/posts`, {
    fields: "message,permalink_url,created_time,likes.summary(true),comments.summary(true),shares",
    limit: String(limit),
    access_token: pageAccessToken,
  });
  return (res.data ?? []).map((p) => ({
    id: p.id,
    message: p.message ?? null,
    permalink: p.permalink_url ?? `https://facebook.com/${p.id}`,
    createdTime: p.created_time,
    likeCount: p.likes?.summary?.total_count ?? 0,
    commentCount: p.comments?.summary?.total_count ?? 0,
    shareCount: p.shares?.count ?? 0,
  }));
};
