import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2.49.1";

/** Shared request-auth plumbing for the tiktok/spotify/soundcloud oauth+metrics
 * functions (instagram-oauth/instagram-metrics predate this and are left as-is). */

export const serviceClient = (): SupabaseClient =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

export interface AuthedRequest {
  user: User;
  /** Runs as the caller (their JWT forwarded) so RLS/security-definer `auth.uid()` calls resolve correctly. */
  userClient: SupabaseClient;
}

/** Returns null on any auth failure — callers should respond 401. */
export const authenticateRequest = async (req: Request): Promise<AuthedRequest | null> => {
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  });
  const { data, error } = await userClient.auth.getUser(jwt);
  if (error || !data.user) return null;
  return { user: data.user, userClient };
};

export const canManageBrand = async (userClient: SupabaseClient, brandId: string): Promise<boolean> => {
  const [{ data: hasBrandRole }, { data: isSuperAdmin }] = await Promise.all([
    userClient.rpc("has_brand_role", { target_brand_id: brandId, min_role: "brand_admin" }),
    userClient.rpc("is_super_admin"),
  ]);
  return Boolean(hasBrandRole || isSuperAdmin);
};

export const hasBrandAccess = async (userClient: SupabaseClient, brandId: string): Promise<boolean> => {
  const [{ data: hasAccess }, { data: isSuperAdmin }] = await Promise.all([
    userClient.rpc("has_brand_access", { target_brand_id: brandId }),
    userClient.rpc("is_super_admin"),
  ]);
  return Boolean(hasAccess || isSuperAdmin);
};

export const isSuperAdmin = async (userClient: SupabaseClient): Promise<boolean> => {
  const { data } = await userClient.rpc("is_super_admin");
  return Boolean(data);
};
