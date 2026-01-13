import React, { useState, useEffect } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, TrendingUp, Monitor, Smartphone, Tablet, MousePointerClick } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PageViewData {
  page_name: string;
  count: number;
}

interface DeviceData {
  device_type: string;
  count: number;
}

interface DailyData {
  date: string;
  views: number;
}

interface CtaData {
  event_type: string;
  count: number;
}

const COLORS = ["#67e8f9", "#a78bfa", "#f472b6", "#fbbf24", "#34d399"];

const AdminAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [pageViews, setPageViews] = useState<PageViewData[]>([]);
  const [deviceData, setDeviceData] = useState<DeviceData[]>([]);
  const [dailyViews, setDailyViews] = useState<DailyData[]>([]);
  const [ctaEvents, setCtaEvents] = useState<CtaData[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch page views by page
      const { data: viewsData } = await supabase
        .from("page_views")
        .select("page_name");

      if (viewsData) {
        const pageCount: Record<string, number> = {};
        viewsData.forEach((v) => {
          pageCount[v.page_name] = (pageCount[v.page_name] || 0) + 1;
        });
        setPageViews(
          Object.entries(pageCount).map(([page_name, count]) => ({
            page_name,
            count,
          }))
        );

        // Device breakdown
        const { data: deviceViewsData } = await supabase
          .from("page_views")
          .select("device_type");

        if (deviceViewsData) {
          const deviceCount: Record<string, number> = {};
          deviceViewsData.forEach((v) => {
            deviceCount[v.device_type] = (deviceCount[v.device_type] || 0) + 1;
          });
          setDeviceData(
            Object.entries(deviceCount).map(([device_type, count]) => ({
              device_type,
              count,
            }))
          );
        }
      }

      // Daily views (last 7 days)
      const last7Days = new Date();
      last7Days.setDate(last7Days.getDate() - 7);
      
      const { data: dailyData } = await supabase
        .from("page_views")
        .select("created_at")
        .gte("created_at", last7Days.toISOString());

      if (dailyData) {
        const dailyCount: Record<string, number> = {};
        dailyData.forEach((v) => {
          const date = new Date(v.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
          dailyCount[date] = (dailyCount[date] || 0) + 1;
        });
        setDailyViews(
          Object.entries(dailyCount).map(([date, views]) => ({
            date,
            views,
          }))
        );
      }

      // CTA events
      const { data: ctaData } = await supabase
        .from("cta_events")
        .select("event_type");

      if (ctaData) {
        const ctaCount: Record<string, number> = {};
        ctaData.forEach((e) => {
          ctaCount[e.event_type] = (ctaCount[e.event_type] || 0) + 1;
        });
        setCtaEvents(
          Object.entries(ctaCount).map(([event_type, count]) => ({
            event_type,
            count,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case "mobile":
        return <Smartphone className="w-4 h-4" />;
      case "tablet":
        return <Tablet className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  const totalViews = pageViews.reduce((sum, p) => sum + p.count, 0);
  const totalEvents = ctaEvents.reduce((sum, e) => sum + e.count, 0);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-accent" />
              Total Page Views
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {totalViews.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MousePointerClick className="w-4 h-4 text-accent" />
              CTA Clicks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {totalEvents.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Device Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              {deviceData.map((d) => (
                <div key={d.device_type} className="flex items-center gap-2">
                  {getDeviceIcon(d.device_type)}
                  <span className="text-sm text-muted-foreground capitalize">
                    {d.device_type}:
                  </span>
                  <span className="font-semibold text-foreground">{d.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="views" className="space-y-4">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="views">Page Views</TabsTrigger>
          <TabsTrigger value="trend">Daily Trend</TabsTrigger>
          <TabsTrigger value="cta">CTA Events</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
        </TabsList>

        <TabsContent value="views">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg">Views by Page</CardTitle>
            </CardHeader>
            <CardContent>
              {pageViews.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pageViews} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                      <YAxis 
                        type="category" 
                        dataKey="page_name" 
                        stroke="hsl(var(--muted-foreground))"
                        width={120}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No data yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trend">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg">Daily Views (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              {dailyViews.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyViews}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="views"
                        stroke="hsl(var(--accent))"
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--accent))" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No data yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cta">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg">CTA Click Events</CardTitle>
            </CardHeader>
            <CardContent>
              {ctaEvents.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ctaEvents}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="event_type" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No CTA events tracked yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg">Device Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {deviceData.length > 0 ? (
                <div className="h-[300px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deviceData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ device_type, percent }) =>
                          `${device_type} ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="device_type"
                      >
                        {deviceData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No data yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAnalytics;
