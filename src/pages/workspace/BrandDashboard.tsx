import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CalendarDays, Bell, MessageSquare, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabaseClient";
import { useActiveBrand } from "@/hooks/useActiveBrand";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";

const BrandDashboard = () => {
  const { brandId } = useParams();
  const { brand } = useActiveBrand();
  const [stats, setStats] = useState({ bookings: 0, unread: 0, messages: 0, events: 0 });

  const load = useCallback(async () => {
    if (!brandId) return;
    const counts = await Promise.all([
      supabase.from("bookings").select("*", { count: "exact", head: true }).eq("brand_id", brandId).is("deleted_at", null),
      supabase.from("notifications").select("*", { count: "exact", head: true }).eq("brand_id", brandId).is("read_at", null),
      supabase.from("messages").select("*", { count: "exact", head: true }).eq("brand_id", brandId).is("deleted_at", null),
      supabase.from("analytics_events").select("*", { count: "exact", head: true }).eq("brand_id", brandId),
    ]);
    setStats({
      bookings: counts[0].count ?? 0,
      unread: counts[1].count ?? 0,
      messages: counts[2].count ?? 0,
      events: counts[3].count ?? 0,
    });
  }, [brandId]);

  useEffect(() => { load(); }, [load]);
  useRealtimeTable("bookings", brandId, load);
  useRealtimeTable("notifications", brandId, load);

  const cards = [
    { label: "Bookings", value: stats.bookings, icon: CalendarDays },
    { label: "Unread notifications", value: stats.unread, icon: Bell },
    { label: "Messages", value: stats.messages, icon: MessageSquare },
    { label: "Analytics events", value: stats.events, icon: BarChart3 },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-1">{brand?.name}</h1>
      <p className="text-muted-foreground mb-8 text-sm">{brand?.service?.name} · {brand?.status}</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="w-4 h-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{value.toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default BrandDashboard;
