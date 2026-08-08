import { supabase } from "@/lib/supabaseClient";

export interface WorkspaceMessage {
  id: string;
  brand_id: string;
  sender_id: string | null;
  body: string;
  created_at: string;
}

export const fetchMessages = async (brandId: string): Promise<WorkspaceMessage[]> => {
  const { data, error } = await supabase
    .from("messages")
    .select("id, brand_id, sender_id, body, created_at")
    .eq("brand_id", brandId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw error;
  return data ?? [];
};

export const sendMessage = async (brandId: string, senderId: string, body: string) => {
  const { error } = await supabase
    .from("messages")
    .insert([{ brand_id: brandId, sender_id: senderId, body }]);
  if (error) throw error;
};

export const softDeleteMessage = async (id: string) => {
  const { error } = await supabase
    .from("messages")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
};
