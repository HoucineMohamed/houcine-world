import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import DataTable, { type Column } from "@/components/workspace/DataTable";
import { useActiveBrand } from "@/hooks/useActiveBrand";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { atLeast } from "@/lib/roles";
import {
  BOOKING_STATUSES, fetchBookings, updateBookingStatus, type Booking,
} from "@/services/bookings";

const BrandBookings = () => {
  const { brandId } = useParams();
  const { brand, role, isSuperAdmin } = useActiveBrand();
  const [rows, setRows] = useState<Booking[]>([]);
  const [status, setStatus] = useState("all");
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  // UX gate only — bookings_update RLS is what actually blocks writes.
  const canEdit = isSuperAdmin || atLeast(role, "editor");

  const load = useCallback(() => {
    if (!brandId) return;
    fetchBookings(brandId).then(setRows).catch((e) => setError(e.message));
  }, [brandId]);

  useEffect(() => { load(); }, [load]);
  useRealtimeTable("bookings", brandId, load);

  const filtered = useMemo(
    () => rows.filter((r) =>
      (status === "all" || r.status === status) &&
      (!date || (r.starts_at ?? "").slice(0, 10) === date)
    ),
    [rows, status, date]
  );

  const change = async (id: string, next: string) => {
    try {
      await updateBookingStatus(id, next);
      toast.success("Status updated");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update blocked");
    }
  };

  const columns: Column<Booking>[] = [
    { key: "client", header: "Client", sortable: true, value: (r) => r.client_name },
    {
      key: "date", header: "Date", sortable: true,
      value: (r) => r.starts_at ?? "",
      render: (r) => (r.starts_at ? new Date(r.starts_at).toLocaleString() : "—"),
    },
    {
      key: "status", header: "Status", sortable: true, value: (r) => r.status,
      render: (r) =>
        canEdit ? (
          <Select value={r.status} onValueChange={(v) => change(r.id, v)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {BOOKING_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : (
          <span className="capitalize">{r.status}</span>
        ),
    },
    { key: "brand", header: "Brand", value: () => brand?.name ?? "—" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Bookings</h1>
      <div className="flex flex-wrap gap-3 mb-4">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="all">All statuses</SelectItem>
            {BOOKING_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" className="w-44" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      {error && <p className="text-sm text-destructive mb-4">{error}</p>}
      <DataTable columns={columns} rows={filtered} rowKey={(r) => r.id} empty="No bookings yet." />
      {!canEdit && (
        <p className="text-xs text-muted-foreground mt-4">
          You have read-only access to bookings for this brand.
        </p>
      )}
    </div>
  );
};

export default BrandBookings;
