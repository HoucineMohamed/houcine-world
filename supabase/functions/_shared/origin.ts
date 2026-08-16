/** Shared by the tiktok/spotify/soundcloud oauth functions (instagram-oauth predates
 * this and keeps its own copy of the same logic — left untouched intentionally). */
export const allowedOrigin = (req: Request): string => {
  const origin = req.headers.get("origin");
  const fallback = Deno.env.get("WORKSPACE_APP_URL") ?? "";
  if (!origin) return fallback;
  const allowlist = (Deno.env.get("WORKSPACE_ALLOWED_ORIGINS") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (allowlist.length === 0) return origin; // no allowlist configured -> trust the browser-set Origin header
  return allowlist.includes(origin) ? origin : fallback;
};

export const redirectToSettings = (origin: string, brandId: string | null, params: Record<string, string>) => {
  const base = brandId ? `${origin}/workspace/${brandId}/settings` : `${origin}/workspace`;
  const url = new URL(base);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Response(null, { status: 302, headers: { Location: url.toString() } });
};
