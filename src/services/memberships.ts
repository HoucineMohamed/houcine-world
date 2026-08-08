import { supabase } from "@/lib/supabaseClient";

export interface BrandMember {
  id: string;
  user_id: string;
  brand_id: string;
  role: string;
  created_at: string;
  profile: { id: string; full_name: string | null; email: string | null } | null;
}

export const fetchBrandMembers = async (brandId: string): Promise<BrandMember[]> => {
  const { data, error } = await supabase
    .from("brand_admins")
    .select("id, user_id, brand_id, role, created_at, profile:profiles(id, full_name, email)")
    .eq("brand_id", brandId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as unknown as BrandMember[];
};

/**
 * Membership writes go through the audited SECURITY DEFINER RPC.
 * The RPC re-checks authorization server-side and writes an audit_logs row.
 */
export const grantMembership = async (brandId: string, email: string, role: string) => {
  const { error } = await supabase.rpc("manage_brand_membership", {
    p_action: "grant",
    p_brand_id: brandId,
    p_email: email,
    p_role: role,
  });
  if (error) throw error;
};

export const changeMemberRole = async (brandId: string, userId: string, role: string) => {
  const { error } = await supabase.rpc("manage_brand_membership", {
    p_action: "update",
    p_brand_id: brandId,
    p_user_id: userId,
    p_role: role,
  });
  if (error) throw error;
};

export const revokeMembership = async (brandId: string, userId: string) => {
  const { error } = await supabase.rpc("manage_brand_membership", {
    p_action: "revoke",
    p_brand_id: brandId,
    p_user_id: userId,
  });
  if (error) throw error;
};
