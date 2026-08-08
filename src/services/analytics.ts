import { supabase } from "@/lib/supabaseClient";

export interface AnalyticsEvent {
  id: string;
  brand_id: string;
  event_name: string;
  properties: unknown;
  occurred_at: string;
}

/** Read-only in the app: analytics_write RLS restricts writes to super admin / service role. */
export const fetchAnalyticsEvents = async (brandId?: string): Promise<AnalyticsEvent[]> => {
  let query = supabase
    .from("analytics_events")
    .select("id, brand_id, event_name, properties, occurred_at")
    .order("occurred_at", { ascending: false })
    .limit(500);
  if (brandId) query = query.eq("brand_id", brandId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as AnalyticsEvent[];
};
