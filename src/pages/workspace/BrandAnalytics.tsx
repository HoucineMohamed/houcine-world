import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActiveBrand } from "@/hooks/useActiveBrand";
import { fetchAnalyticsEvents, type AnalyticsEvent } from "@/services/analytics";
import { initAnalytics, analyticsEnabled, captureBrandEvent } from "@/lib/analytics";

const BrandAnalytics = () => {
  const { brandId } = useParams();
  const { brand } = useActiveBrand();
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);

  useEffect(() => {
    initAnalytics();
    if (brandId) captureBrandEvent("workspace_analytics_viewed", brandId);
  }, [brandId]);

  useEffect(() => {
    if (!brandId) return;
    fetchAnalyticsEvents(brandId).then(setEvents).catch(() => setEvents([]));
  }, [brandId]);

  const cards = useMemo(() => {
    const uniqueDays = new Set(events.map((e) => e.occurred_at.slice(0, 10)));
    const completed = events.filter((e) => e.event_name === "booking_completed").length;
    return [
      { label: "Events tracked", value: events.length },
      { label: "Active days", value: uniqueDays.size },
      { label: "Bookings completed", value: completed },
    ];
  }, [events]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-1">Analytics</h1>
      <p className="text-muted-foreground text-sm mb-8">{brand?.name} · read-only</p>
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{c.value.toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      {!analyticsEnabled() && (
        <p className="text-xs text-muted-foreground">
          PostHog is not connected yet — cards above are rendered from stored analytics events.
        </p>
      )}
    </div>
  );
};

export default BrandAnalytics;
