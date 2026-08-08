import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import {
  fetchNotifications, markAllRead, markNotificationRead, type Notification,
} from "@/services/notifications";

const BrandNotifications = () => {
  const { brandId } = useParams();
  const [rows, setRows] = useState<Notification[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!brandId) return;
    fetchNotifications(brandId).then(setRows).catch((e) => setError(e.message));
  }, [brandId]);

  useEffect(() => { load(); }, [load]);
  useRealtimeTable("notifications", brandId, load);
  useRealtimeTable("bookings", brandId, load);

  const readOne = async (id: string) => {
    try { await markNotificationRead(id); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Blocked"); }
  };

  const readAll = async () => {
    try { await markAllRead(brandId!); load(); toast.success("All marked as read"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Blocked"); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
        <Button variant="outline" size="sm" onClick={readAll}>
          <CheckCheck className="w-4 h-4 mr-2" /> Mark all read
        </Button>
      </div>
      {error && <p className="text-sm text-destructive mb-4">{error}</p>}
      <div className="space-y-2">
        {rows.map((n) => (
          <div
            key={n.id}
            className={`flex items-start gap-3 rounded-xl border p-4 ${
              n.read_at ? "border-border bg-card/40" : "border-accent/40 bg-card"
            }`}
          >
            <Bell className="w-4 h-4 mt-1 text-accent shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-foreground truncate">{n.title}</p>
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(n.created_at).toLocaleString()}
                </span>
              </div>
              {n.body && <p className="text-sm text-muted-foreground line-clamp-2">{n.body}</p>}
            </div>
            {!n.read_at && (
              <Button size="sm" variant="ghost" onClick={() => readOne(n.id)}>Mark read</Button>
            )}
          </div>
        ))}
        {!rows.length && <p className="text-sm text-muted-foreground py-8 text-center">No notifications.</p>}
      </div>
    </div>
  );
};

export default BrandNotifications;
