import { supabase } from "@/lib/supabaseClient";

export interface Booking {
  id: string;
  brand_id: string;
  client_name: string;
  client_email: string | null;
  starts_at: string | null;
  status: string;
  created_at: string;
}

export const BOOKING_STATUSES = ["pending", "confirmed", "cancelled", "completed"] as const;

export const fetchBookings = async (brandId: string): Promise<Booking[]> => {
  // brand_id filter is for display correctness; RLS bookings_select is the boundary.
  const { data, error } = await supabase
    .from("bookings")
    .select("id, brand_id, client_name, client_email, starts_at, status, created_at")
    .eq("brand_id", brandId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
};

export const updateBookingStatus = async (id: string, status: string) => {
  const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
  if (error) throw error;
};
