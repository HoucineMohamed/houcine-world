/**
 * SoundCloud API — OAuth 2.1 authorization code flow with PKCE (mandatory
 * since SoundCloud's 2024 migration off OAuth 2.0).
 * Docs: https://developers.soundcloud.com/docs/api/guide
 */
import type { PlatformCredentials } from "./credentials.ts";

const AUTH_BASE = "https://secure.soundcloud.com/authorize";
const TOKEN_URL = "https://secure.soundcloud.com/oauth/token";
const API_BASE = "https://api.soundcloud.com";

export class SoundCloudApiError extends Error {
  reason: "invalid_token" | "api_error" | "config_error";
  constructor(message: string, reason: SoundCloudApiError["reason"]) {
    super(message);
    this.reason = reason;
  }
}

const base64url = (bytes: ArrayBuffer | Uint8Array) => {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let str = "";
  for (const b of arr) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

export const generateCodeVerifier = () => base64url(crypto.getRandomValues(new Uint8Array(32)));

export const codeChallengeFromVerifier = async (verifier: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(digest);
};

export const buildAuthorizeUrl = async (
  creds: PlatformCredentials,
  redirectUri: string,
  state: string,
  codeVerifier: string,
) => {
  const url = new URL(AUTH_BASE);
  url.searchParams.set("client_id", creds.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", await codeChallengeFromVerifier(codeVerifier));
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
};

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  token_type: string;
}

const postForm = async (params: Record<string, string>): Promise<TokenResponse> => {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json; charset=utf-8" },
    body: new URLSearchParams(params).toString(),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new SoundCloudApiError(body.error_description || body.error || `SoundCloud token request failed (${res.status})`, "api_error");
  }
  return body as TokenResponse;
};

export const exchangeCodeForToken = (
  creds: PlatformCredentials,
  code: string,
  redirectUri: string,
  codeVerifier: string,
) =>
  postForm({
    grant_type: "authorization_code",
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    redirect_uri: redirectUri,
    code,
    code_verifier: codeVerifier,
  });

/** SoundCloud issues single-use refresh tokens: every refresh rotates it — always persist the new one. */
export const refreshAccessToken = (creds: PlatformCredentials, refreshToken: string) =>
  postForm({
    grant_type: "refresh_token",
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    refresh_token: refreshToken,
  });

const apiGet = async <T>(path: string, accessToken: string, params: Record<string, string> = {}): Promise<T> => {
  const url = new URL(`${API_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `OAuth ${accessToken}`, Accept: "application/json; charset=utf-8" },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = body?.error?.message || body?.error_description || `SoundCloud API request failed (${res.status})`;
    throw new SoundCloudApiError(message, res.status === 401 ? "invalid_token" : "api_error");
  }
  return body as T;
};

export interface SoundCloudProfile {
  id: number;
  username: string;
  followers_count: number;
  track_count: number;
  permalink_url: string;
}

export const fetchProfile = (accessToken: string) => apiGet<SoundCloudProfile>("/me", accessToken);

export interface SoundCloudTrack {
  id: number;
  title: string;
  permalink_url: string;
  playback_count: number;
  likes_count: number;
  comment_count: number;
  created_at: string;
}

export const fetchRecentTracks = (accessToken: string, limit = 10) =>
  apiGet<SoundCloudTrack[]>("/me/tracks", accessToken, { limit: String(limit), linked_partitioning: "false" });
