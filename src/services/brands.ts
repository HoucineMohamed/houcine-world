import { supabase } from "@/lib/supabaseClient";

export interface Membership {
  brand_id: string;
  role: string;
  brand: { id: string; name: string; slug: string; status: string; service: { name: string; slug: string } | null } | null;
}

/** RLS-protected: returns only the caller's own memberships (never a full brands read). */
export const fetchMemberships = async (userId: string): Promise<Membership[]> => {
  const { data, error } = await supabase
    .from("brand_admins")
    .select("brand_id, role, brand:brands(id, name, slug, status, service:services(name, slug))")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []) as unknown as Membership[];
};

export const fetchPlatformRole = async (userId: string): Promise<string> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("platform_role")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.platform_role ?? "member";
};

/** Super-admin only in practice: RLS returns nothing for members without access. */
export const fetchAllBrands = async () => {
  const { data, error } = await supabase
    .from("brands")
    .select("id, name, slug, status, service:services(name, slug)")
    .is("deleted_at", null)
    .order("name");
  if (error) throw error;
  return data ?? [];
};

export const fetchBrand = async (brandId: string) => {
  const { data, error } = await supabase
    .from("brands")
    .select("id, name, slug, status, service:services(name, slug)")
    .eq("id", brandId)
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const updateBrand = async (brandId: string, patch: { name?: string; status?: string }) => {
  const { error } = await supabase.from("brands").update(patch).eq("id", brandId);
  if (error) throw error;
};
