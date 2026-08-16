/**
 * TikTok for Developers — Login Kit (OAuth v2) + Display API helpers.
 * Docs: https://developers.tiktok.com/doc/oauth-user-access-token-management
 */
import type { PlatformCredentials } from "./credentials.ts";

const AUTH_BASE = "https://www.tiktok.com/v2/auth/authorize/";
const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const API_BASE = "https://open.tiktokapis.com/v2";

export const TIKTOK_SCOPES = "user.info.basic,user.info.stats,video.list";

export class TikTokApiError extends Error {
  reason: "invalid_token" | "api_error" | "config_error";
  constructor(message: string, reason: TikTokApiError["reason"]) {
    super(message);
    this.reason = reason;
  }
}

export const buildAuthorizeUrl = (creds: PlatformCredentials, redirectUri: string, state: string) => {
  const url = new URL(AUTH_BASE);
  url.searchParams.set("client_key", creds.clientId);
  url.searchParams.set("scope", TIKTOK_SCOPES);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  return url.toString();
};

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  refresh_expires_in: number;
  open_id: string;
  scope: string;
  token_type: string;
  error?: string;
  error_description?: string;
}

const postForm = async (url: string, params: Record<string, string>): Promise<TokenResponse> => {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
    body: new URLSearchParams(params).toString(),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) {
    throw new TikTokApiError(body.error_description || body.error || `TikTok token request failed (${res.status})`, "api_error");
  }
  return body as TokenResponse;
};

export const exchangeCodeForToken = (creds: PlatformCredentials, code: string, redirectUri: string) =>
  postForm(TOKEN_URL, {
    client_key: creds.clientId,
    client_secret: creds.clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });

export const refreshAccessToken = (creds: PlatformCredentials, refreshToken: string) =>
  postForm(TOKEN_URL, {
    client_key: creds.clientId,
    client_secret: creds.clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

const apiGet = async <T>(path: string, accessToken: string, params: Record<string, string>): Promise<T> => {
  const url = new URL(`${API_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
  const body = await res.json().catch(() => ({}));
  const code = body?.error?.code;
  if (!res.ok || (code && code !== "ok")) {
    const message = body?.error?.message || `TikTok API request failed (${res.status})`;
    throw new TikTokApiError(message, code === "access_token_invalid" || res.status === 401 ? "invalid_token" : "api_error");
  }
  return body as T;
};

export interface TikTokProfile {
  open_id: string;
  display_name: string;
  follower_count: number;
  likes_count: number;
  video_count: number;
}

export const fetchProfile = async (accessToken: string) => {
  const res = await apiGet<{ data: { user: TikTokProfile } }>("/user/info/", accessToken, {
    fields: "open_id,display_name,follower_count,likes_count,video_count",
  });
  return res.data.user;
};

export interface TikTokVideo {
  id: string;
  video_description: string;
  share_url: string;
  like_count: number;
  comment_count: number;
  share_count: number;
  view_count: number;
  create_time: number;
}

export const fetchRecentVideos = async (accessToken: string, limit = 6) => {
  const url = new URL(`${API_BASE}/video/list/`);
  url.searchParams.set("fields", "id,video_description,share_url,like_count,comment_count,share_count,view_count,create_time");
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ max_count: limit }),
  });
  const body = await res.json().catch(() => ({}));
  const code = body?.error?.code;
  if (!res.ok || (code && code !== "ok")) {
    const message = body?.error?.message || `TikTok API request failed (${res.status})`;
    throw new TikTokApiError(message, code === "access_token_invalid" || res.status === 401 ? "invalid_token" : "api_error");
  }
  return (body.data?.videos ?? []) as TikTokVideo[];
};
