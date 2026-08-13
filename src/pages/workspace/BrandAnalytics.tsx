import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { CalendarDays, CalendarRange, Users, Clock, CheckCircle2, Loader2, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActiveBrand } from "@/hooks/useActiveBrand";
import { fetchBookings, type Booking } from "@/services/bookings";
import { fetchAnalyticsEvents, type AnalyticsEvent } from "@/services/analytics";
import { initAnalytics, analyticsEnabled, captureBrandEvent } from "@/lib/analytics";
import { summarize, timeSeries, countBy, type Bucket } from "@/lib/brandMetrics";
import { MetricCard, Panel, EmptyState } from "@/components/workspace/analytics/AnalyticsCards";

const PIE_COLORS = [
  "hsl(var(--accent))", "hsl(var(--primary))", "hsl(var(--muted-foreground))", "hsl(var(--destructive))",
];

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  color: "hsl(var(--foreground))",
};

const BUCKETS: { id: Bucket; label: string; periods: number }[] = [
  { id: "daily", label: "Daily", periods: 30 },
  { id: "weekly", label: "Weekly", periods: 12 },
  { id: "monthly", label: "Monthly", periods: 12 },
];

const BrandAnalytics = () => {
  const { brandId } = useParams();
  const { brand } = useActiveBrand();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [bucket, setBucket] = useState<Bucket>("daily");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initAnalytics();
    if (brandId) captureBrandEvent("workspace_analytics_viewed", brandId);
  }, [brandId]);

  useEffect(() => {
    if (!brandId) return;
    let alive = true;
    setLoading(true);
    Promise.all([
      fetchBookings(brandId).catch(() => [] as Booking[]),
      fetchAnalyticsEvents(brandId).catch(() => [] as AnalyticsEvent[]),
    ]).then(([b, e]) => {
      if (!alive) return;
      setBookings(b);
      setEvents(e);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [brandId]);

  const stats = useMemo(() => summarize(bookings), [bookings]);
  const periods = BUCKETS.find((b) => b.id === bucket)!.periods;
  const series = useMemo(() => timeSeries(bookings, bucket, periods), [bookings, bucket, periods]);
  const byStatus = useMemo(() => countBy(bookings, (b) => b.status), [bookings]);
  const byMonth = useMemo(() => timeSeries(bookings, "monthly", 6), [bookings]);

  const activity = useMemo(() => {
    const fromBookings = bookings.slice(0, 20).map((b) => ({
      id: `b-${b.id}`,
      at: b.created_at,
      title: `Booking · ${b.client_name}`,
      detail: b.status,
    }));
    const fromEvents = events.slice(0, 20).map((e) => ({
      id: `e-${e.id}`,
      at: e.occurred_at,
      title: e.event_name.replace(/_/g, " "),
      detail: "event",
    }));
    return [...fromBookings, ...fromEvents]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 12);
  }, [bookings, events]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-1">Analytics</h1>
      <p className="text-muted-foreground text-sm mb-8">
        {brand?.name} · website data. External platforms (Instagram, TikTok, SoundCloud, Spotify, Gmail) slot into this same grid later.
      </p>

      {/* Summary tiles */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <MetricCard label="Total bookings" value={stats.total} icon={CalendarDays} hint={`${stats.thisMonth} in last 30 days`} />
        <MetricCard label="This week" value={stats.thisWeek} icon={CalendarRange} hint="Last 7 days" />
        <MetricCard label="Active clients" value={stats.activeClients} icon={Users} hint={`${stats.clients} clients all-time`} />
        <MetricCard
          label="Pending vs completed"
          value={`${stats.pending} / ${stats.completed}`}
          icon={CheckCircle2}
          hint={`${stats.confirmed} confirmed · ${stats.cancelled} cancelled`}
        />
      </div>

      {/* Modular chart grid */}
      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <Panel
          title="Bookings over time"
          className="lg:col-span-2"
          actions={
            <div className="flex gap-1">
              {BUCKETS.map((b) => (
                <Button
                  key={b.id}
                  size="sm"
                  variant={bucket === b.id ? "default" : "ghost"}
                  onClick={() => setBucket(b.id)}
                >
                  {b.label}
                </Button>
              ))}
            </div>
          }
        >
          {bookings.length ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series}>
                  <defs>
                    <linearGradient id="bookingsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis stroke="hsl(var(--muted-foreground))" allowDecimals={false} width={32} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="bookings" stroke="hsl(var(--accent))" strokeWidth={2} fill="url(#bookingsFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState>No bookings recorded yet.</EmptyState>
          )}
        </Panel>

        <Panel title="Bookings by status">
          {byStatus.length ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byStatus} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={3}>
                    {byStatus.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState>No status data yet.</EmptyState>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Monthly volume" className="lg:col-span-2">
          {bookings.length ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" allowDecimals={false} width={32} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
                  <Bar dataKey="bookings" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState>No bookings recorded yet.</EmptyState>
          )}
        </Panel>

        <Panel title="Recent activity">
          {activity.length ? (
            <ul className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
              {activity.map((a) => (
                <li key={a.id} className="flex items-start gap-3">
                  <Activity className="w-4 h-4 mt-0.5 text-accent shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-foreground truncate capitalize">{a.title}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="capitalize">{a.detail}</span> ·{" "}
                      {new Date(a.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>Nothing has happened yet.</EmptyState>
          )}
        </Panel>
      </div>

      {!analyticsEnabled() && (
        <p className="text-xs text-muted-foreground mt-6 flex items-center gap-2">
          <Clock className="w-3 h-3" /> Phase 1 uses stored website data only.
        </p>
      )}
    </div>
  );
};

export default BrandAnalytics;
