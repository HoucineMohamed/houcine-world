/**
 * Instagram (Graph API, via Facebook Login for Business) helpers shared by the
 * `instagram-oauth` and `instagram-metrics` edge functions.
 *
 * Why Facebook Login and not the old "Instagram Basic Display" flow: Basic
 * Display never exposes `followers_count` or engagement fields — only the
 * Graph API does, and the Graph API only reaches an Instagram *Professional*
 * (Business/Creator) account that is linked to a Facebook Page. That's the
 * official, non-deprecated path to the metrics this task asks for.
 */

import type { PlatformCredentials } from "./credentials.ts";

export const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
const OAUTH_DIALOG_BASE = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`;

export const INSTAGRAM_SCOPES = [
  "instagram_basic",
  "pages_show_list",
  "instagram_manage_insights",
  "business_management",
].join(",");

export class InstagramApiError extends Error {
  /** Stable machine reason so the UI can decide "reconnect" vs "try again". */
  reason: "invalid_token" | "no_ig_account" | "api_error" | "config_error";
  constructor(message: string, reason: InstagramApiError["reason"]) {
    super(message);
    this.reason = reason;
  }
}

export const buildAuthorizeUrl = (creds: PlatformCredentials, redirectUri: string, state: string) => {
  const url = new URL(OAUTH_DIALOG_BASE);
  url.searchParams.set("client_id", creds.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", INSTAGRAM_SCOPES);
  url.searchParams.set("response_type", "code");
  return url.toString();
};

interface TokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

const graphGet = async <T>(path: string, params: Record<string, string>): Promise<T> => {
  const url = new URL(`${GRAPH_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = body?.error?.message || `Graph API request failed (${res.status})`;
    const code = body?.error?.code;
    // 190 = OAuthException (expired/invalid token) — the one case the UI must
    // surface as "reconnect", not a generic error.
    throw new InstagramApiError(message, code === 190 ? "invalid_token" : "api_error");
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

/** Also used to *refresh* a still-valid long-lived token — same grant, called again. */
export const exchangeForLongLivedToken = (creds: PlatformCredentials, shortOrCurrentLivedToken: string) =>
  graphGet<TokenResponse>("/oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    fb_exchange_token: shortOrCurrentLivedToken,
  });

interface PageAccount {
  id: string;
  name: string;
  access_token: string;
}

interface InstagramLink {
  pageId: string;
  pageAccessToken: string;
  igUserId: string;
}

/** Walks the user's Pages to find the first one with a linked IG professional account. */
export const findInstagramBusinessAccount = async (userLongLivedToken: string): Promise<InstagramLink | null> => {
  const pages = await graphGet<{ data: PageAccount[] }>("/me/accounts", { access_token: userLongLivedToken });
  for (const page of pages.data ?? []) {
    const linked = await graphGet<{ instagram_business_account?: { id: string } }>(`/${page.id}`, {
      fields: "instagram_business_account",
      access_token: page.access_token,
    });
    if (linked.instagram_business_account?.id) {
      return { pageId: page.id, pageAccessToken: page.access_token, igUserId: linked.instagram_business_account.id };
    }
  }
  return null;
};

export interface InstagramProfile {
  id: string;
  username: string;
  followers_count: number;
  media_count: number;
}

export const fetchInstagramProfile = (igUserId: string, pageAccessToken: string) =>
  graphGet<InstagramProfile>(`/${igUserId}`, {
    fields: "id,username,followers_count,media_count",
    access_token: pageAccessToken,
  });

export interface InstagramMedia {
  id: string;
  caption?: string;
  like_count?: number;
  comments_count?: number;
  timestamp: string;
  permalink: string;
  media_type: string;
}

export const fetchRecentMedia = async (igUserId: string, pageAccessToken: string, limit = 6) => {
  const res = await graphGet<{ data: InstagramMedia[] }>(`/${igUserId}/media`, {
    fields: "id,caption,like_count,comments_count,timestamp,permalink,media_type",
    limit: String(limit),
    access_token: pageAccessToken,
  });
  return res.data ?? [];
};

/** A page access token derived from a long-lived user token expires alongside it. */
export const expiryFromTokenResponse = (token: TokenResponse) => {
  const seconds = token.expires_in ?? 60 * 24 * 60 * 60; // default: Facebook's usual 60-day long-lived window
  return new Date(Date.now() + seconds * 1000);
};
