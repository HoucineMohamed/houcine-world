import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Eye, 
  MessageSquare, 
  FileText, 
  Users, 
  LogOut, 
  Inbox as InboxIcon,
  BarChart3,
  Loader2,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AdminInbox from "@/components/admin/AdminInbox";
import AdminAnalytics from "@/components/admin/AdminAnalytics";
import { toast } from "sonner";

interface DashboardStats {
  totalViews: number;
  totalSubmissions: number;
  totalSubscribers: number;
  newMessages: number;
}

const Admin = () => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalViews: 0,
    totalSubmissions: 0,
    totalSubscribers: 0,
    newMessages: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate("/admin/login");
    }
  }, [user, isAdmin, loading, navigate]);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      // Fetch page views count
      const { count: viewsCount } = await supabase
        .from("page_views")
        .select("*", { count: "exact", head: true });

      // Fetch submissions count
      const { count: submissionsCount } = await supabase
        .from("submissions")
        .select("*", { count: "exact", head: true });

      // Fetch subscribers count
      const { count: subscribersCount } = await supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true });

      // Fetch new messages count
      const { count: newCount } = await supabase
        .from("submissions")
        .select("*", { count: "exact", head: true })
        .eq("status", "new");

      setStats({
        totalViews: viewsCount || 0,
        totalSubmissions: submissionsCount || 0,
        totalSubscribers: subscribersCount || 0,
        newMessages: newCount || 0,
      });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (user && isAdmin) {
      fetchStats();
    }
  }, [user, isAdmin]);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error("Failed to sign out");
    } else {
      navigate("/admin/login");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Houcine.world Control Panel</p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchStats}
              className="text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Views
              </CardTitle>
              <Eye className="w-4 h-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {loadingStats ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.totalViews.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Messages & Quotes
              </CardTitle>
              <MessageSquare className="w-4 h-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {loadingStats ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.totalSubmissions.toLocaleString()}
              </div>
              {stats.newMessages > 0 && (
                <p className="text-xs text-accent mt-1">{stats.newMessages} new</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Subscribers
              </CardTitle>
              <Users className="w-4 h-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {loadingStats ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.totalSubscribers.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Quote Requests
              </CardTitle>
              <FileText className="w-4 h-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {loadingStats ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  stats.totalSubmissions
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="inbox" className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="inbox" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
              <InboxIcon className="w-4 h-4 mr-2" />
              Inbox
              {stats.newMessages > 0 && (
                <span className="ml-2 bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full">
                  {stats.newMessages}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inbox">
            <AdminInbox onStatusChange={fetchStats} />
          </TabsContent>

          <TabsContent value="analytics">
            <AdminAnalytics />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
