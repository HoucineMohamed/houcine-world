/**
 * Spotify Web API — Authorization Code Flow.
 * Docs: https://developer.spotify.com/documentation/web-api/tutorials/code-flow
 *
 * Note on "streaming stats": the Web API does not expose per-track play
 * counts to a regular account owner (that data lives only in Spotify for
 * Artists, which has no public API). What IS available and what this file
 * pulls is: follower count on the account, and the account's recently played
 * tracks — the closest official, non-scraped proxy for "recent engagement."
 */
import type { PlatformCredentials } from "./credentials.ts";

const AUTH_BASE = "https://accounts.spotify.com/authorize";
const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API_BASE = "https://api.spotify.com/v1";

export const SPOTIFY_SCOPES = "user-read-email user-read-private user-read-recently-played";

export class SpotifyApiError extends Error {
  reason: "invalid_token" | "api_error" | "config_error";
  constructor(message: string, reason: SpotifyApiError["reason"]) {
    super(message);
    this.reason = reason;
  }
}

export const buildAuthorizeUrl = (creds: PlatformCredentials, redirectUri: string, state: string) => {
  const url = new URL(AUTH_BASE);
  url.searchParams.set("client_id", creds.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", SPOTIFY_SCOPES);
  url.searchParams.set("state", state);
  return url.toString();
};

interface TokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token?: string; // omitted on a plain refresh if Spotify didn't rotate it
}

const basicAuthHeader = (creds: PlatformCredentials) =>
  `Basic ${btoa(`${creds.clientId}:${creds.clientSecret}`)}`;

const postForm = async (creds: PlatformCredentials, params: Record<string, string>): Promise<TokenResponse> => {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(creds),
    },
    body: new URLSearchParams(params).toString(),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new SpotifyApiError(body.error_description || body.error || `Spotify token request failed (${res.status})`, "api_error");
  }
  return body as TokenResponse;
};

export const exchangeCodeForToken = (creds: PlatformCredentials, code: string, redirectUri: string) =>
  postForm(creds, { grant_type: "authorization_code", code, redirect_uri: redirectUri });

export const refreshAccessToken = (creds: PlatformCredentials, refreshToken: string) =>
  postForm(creds, { grant_type: "refresh_token", refresh_token: refreshToken });

const apiGet = async <T>(path: string, accessToken: string, params: Record<string, string> = {}): Promise<T> => {
  const url = new URL(`${API_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
  if (res.status === 204) return {} as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = body?.error?.message || `Spotify API request failed (${res.status})`;
    throw new SpotifyApiError(message, res.status === 401 ? "invalid_token" : "api_error");
  }
  return body as T;
};

export interface SpotifyProfile {
  id: string;
  display_name: string;
  followers: { total: number };
  external_urls: { spotify: string };
}

export const fetchProfile = (accessToken: string) => apiGet<SpotifyProfile>("/me", accessToken);

export interface SpotifyRecentlyPlayedItem {
  played_at: string;
  track: {
    id: string;
    name: string;
    external_urls: { spotify: string };
    artists: { name: string }[];
  };
}

export const fetchRecentlyPlayed = async (accessToken: string, limit = 10) => {
  const res = await apiGet<{ items: SpotifyRecentlyPlayedItem[] }>("/me/player/recently-played", accessToken, {
    limit: String(limit),
  });
  return res.items ?? [];
};
