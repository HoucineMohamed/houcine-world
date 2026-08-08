import { supabase } from "@/lib/supabaseClient";

export interface Notification {
  id: string;
  brand_id: string;
  kind: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
}

export const fetchNotifications = async (brandId: string): Promise<Notification[]> => {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, brand_id, kind, title, body, read_at, created_at")
    .eq("brand_id", brandId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data ?? [];
};

export const markNotificationRead = async (id: string) => {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
};

export const markAllRead = async (brandId: string) => {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("brand_id", brandId)
    .is("read_at", null);
  if (error) throw error;
};
