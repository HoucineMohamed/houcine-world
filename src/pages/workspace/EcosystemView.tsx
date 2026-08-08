import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabaseClient";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { fetchAllBrands } from "@/services/brands";
import { fetchAnalyticsEvents } from "@/services/analytics";

interface BrandRow { id: string; name: string; status: string; service?: { name?: string } | null }

const EcosystemView = () => {
  const { isSuperAdmin, user } = useWorkspace();
  const navigate = useNavigate();
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [filter, setFilter] = useState("all");
  const [eventCount, setEventCount] = useState(0);

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetchAllBrands().then((r) => setBrands(r as unknown as BrandRow[])).catch(() => setBrands([]));
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetchAnalyticsEvents(filter === "all" ? undefined : filter)
      .then((e) => setEventCount(e.length))
      .catch(() => setEventCount(0));
  }, [filter, isSuperAdmin]);

  if (!isSuperAdmin) return <Navigate to="/workspace/denied" replace />;

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Ecosystem</h1>
            <p className="text-muted-foreground text-sm">{user?.email} · super admin</p>
          </div>
          <Button
            variant="ghost" size="sm"
            onClick={async () => { await supabase.auth.signOut(); navigate("/workspace/login"); }}
          >
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-64"><SelectValue placeholder="All brands" /></SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">All brands</SelectItem>
              {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">{eventCount} analytics events</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((b) => (
            <Card
              key={b.id}
              className="cursor-pointer hover:border-accent transition-colors"
              onClick={() => navigate(`/workspace/${b.id}/dashboard`)}
            >
              <CardHeader className="pb-2"><CardTitle className="text-base">{b.name}</CardTitle></CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {b.service?.name ?? "—"} · {b.status}
              </CardContent>
            </Card>
          ))}
        </div>
        {!brands.length && <p className="text-sm text-muted-foreground mt-6">No brands yet.</p>}
      </div>
    </div>
  );
};

export default EcosystemView;
