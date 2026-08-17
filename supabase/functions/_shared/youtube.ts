/**
 * YouTube Data API v3, via Google's standard OAuth 2.0 server-side
 * (confidential client) Authorization Code flow — no PKCE. Google supports
 * PKCE as an additional layer for public clients (SPA/mobile), but since
 * this app already holds a client_secret server-side (same trust model as
 * Spotify/TikTok here), the plain code+secret exchange is what Google's own
 * web-server-app guide describes, and what's used.
 * Docs: https://developers.google.com/identity/protocols/oauth2/web-server
 *       https://developers.google.com/youtube/v3/docs/channels/list
 *
 * Note on scope: youtube.readonly is a Google "sensitive" scope — the OAuth
 * consent screen requires Google verification before any user outside the
 * app's own registered test users can complete this flow. Until that
 * verification is done, only accounts added as test users in the Google
 * Cloud Console can connect.
 */
import type { PlatformCredentials } from "./credentials.ts";

const AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API_BASE = "https://www.googleapis.com/youtube/v3";

export const YOUTUBE_SCOPES = "https://www.googleapis.com/auth/youtube.readonly";

export class YouTubeApiError extends Error {
  reason: "invalid_token" | "api_error" | "config_error";
  constructor(message: string, reason: YouTubeApiError["reason"]) {
    super(message);
    this.reason = reason;
  }
}

export const buildAuthorizeUrl = (creds: PlatformCredentials, redirectUri: string, state: string) => {
  const url = new URL(AUTH_BASE);
  url.searchParams.set("client_id", creds.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", YOUTUBE_SCOPES);
  url.searchParams.set("state", state);
  // access_type=offline is required for Google to issue a refresh_token at
  // all; prompt=consent forces the consent screen (and a fresh refresh_token)
  // every time, since Google only issues one on a user's *first* grant
  // otherwise — needed because a brand may disconnect and reconnect later.
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  return url.toString();
};

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string; // omitted on a plain refresh
  scope: string;
  token_type: string;
  error?: string;
  error_description?: string;
}

const postForm = async (params: Record<string, string>): Promise<TokenResponse> => {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) {
    throw new YouTubeApiError(body.error_description || body.error || `Google token request failed (${res.status})`, "api_error");
  }
  return body as TokenResponse;
};

export const exchangeCodeForToken = (creds: PlatformCredentials, code: string, redirectUri: string) =>
  postForm({
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });

export const refreshAccessToken = (creds: PlatformCredentials, refreshToken: string) =>
  postForm({
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

const apiGet = async <T>(path: string, accessToken: string, params: Record<string, string>): Promise<T> => {
  const url = new URL(`${API_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = body?.error?.message || `YouTube API request failed (${res.status})`;
    throw new YouTubeApiError(message, res.status === 401 ? "invalid_token" : "api_error");
  }
  return body as T;
};

export interface YouTubeChannel {
  id: string;
  title: string;
  subscriberCount: number | null; // null if the channel owner has hidden their subscriber count
  viewCount: number;
  videoCount: number;
  uploadsPlaylistId: string | null;
}

interface ChannelsListResponse {
  items?: {
    id: string;
    snippet: { title: string };
    statistics: { subscriberCount?: string; hiddenSubscriberCount?: boolean; viewCount: string; videoCount: string };
    contentDetails?: { relatedPlaylists?: { uploads?: string } };
  }[];
}

export const fetchChannel = async (accessToken: string): Promise<YouTubeChannel> => {
  const res = await apiGet<ChannelsListResponse>("/channels", accessToken, {
    part: "snippet,statistics,contentDetails",
    mine: "true",
  });
  const channel = res.items?.[0];
  if (!channel) throw new YouTubeApiError("No YouTube channel found for this account", "api_error");
  return {
    id: channel.id,
    title: channel.snippet.title,
    subscriberCount: channel.statistics.hiddenSubscriberCount ? null : Number(channel.statistics.subscriberCount ?? 0),
    viewCount: Number(channel.statistics.viewCount ?? 0),
    videoCount: Number(channel.statistics.videoCount ?? 0),
    uploadsPlaylistId: channel.contentDetails?.relatedPlaylists?.uploads ?? null,
  };
};

export interface YouTubeVideo {
  id: string;
  title: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
}

interface PlaylistItemsResponse {
  items?: { contentDetails: { videoId: string } }[];
}
interface VideosListResponse {
  items?: {
    id: string;
    snippet: { title: string; publishedAt: string };
    statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
  }[];
}

/**
 * Uses the channel's uploads playlist (playlistItems.list, 1 quota unit)
 * rather than search.list (100 quota units) to list recent videos — cheap
 * enough for routine polling against YouTube's default 10,000 units/day
 * project quota. videos.list (1 unit) then fills in per-video stats, which
 * playlistItems.list doesn't return.
 */
export const fetchRecentVideos = async (
  accessToken: string,
  uploadsPlaylistId: string | null,
  limit = 10,
): Promise<YouTubeVideo[]> => {
  if (!uploadsPlaylistId) return [];
  const playlist = await apiGet<PlaylistItemsResponse>("/playlistItems", accessToken, {
    part: "contentDetails",
    playlistId: uploadsPlaylistId,
    maxResults: String(limit),
  });
  const videoIds = (playlist.items ?? []).map((i) => i.contentDetails.videoId).filter(Boolean);
  if (videoIds.length === 0) return [];

  const videos = await apiGet<VideosListResponse>("/videos", accessToken, {
    part: "snippet,statistics",
    id: videoIds.join(","),
  });
  return (videos.items ?? []).map((v) => ({
    id: v.id,
    title: v.snippet.title,
    publishedAt: v.snippet.publishedAt,
    viewCount: Number(v.statistics.viewCount ?? 0),
    likeCount: Number(v.statistics.likeCount ?? 0),
    commentCount: Number(v.statistics.commentCount ?? 0),
  }));
};
