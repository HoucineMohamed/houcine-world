import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

/**
 * Subscribes to realtime changes for a table scoped to a brand.
 * brand_id filtering here only reduces noise — RLS decides what the socket may deliver.
 */
export const useRealtimeTable = (
  table: "bookings" | "notifications" | "messages",
  brandId: string | undefined,
  onChange: () => void
) => {
  useEffect(() => {
    if (!brandId) return;
    const channel = supabase
      .channel(`${table}:${brandId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `brand_id=eq.${brandId}` },
        () => onChange()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, brandId]);
};
