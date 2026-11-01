import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { autopilotApi, type UserNotification } from "@/services/autopilot";
import { attempt, useAsync } from "@/components/command/useAsync";
import { Empty, ErrorBox, Field, fmtDateTime, inputCls, label, LoadingGrid, Panel, Pill } from "@/components/command/ui";
import { cn } from "@/lib/utils";
import { useAutopilot } from "@/pages/workspace/autopilot/Autopilot";
import { NOTIFICATION_CATEGORIES } from "./shared";

// Notification center: the signed-in person's own notifications (row-level security: user_id = them). Written by
// automations, monitoring and confirmed assistant actions, honouring the person's preferences.

const PRIORITY_TONE: Record<string, "bad" | "warn" | "info" | "neutral"> = { urgent: "bad", high: "warn", normal: "info", low: "neutral" };

const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(today) - start(d)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return "This week";
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
};

const Notifications = () => {
  const { brands, brandName, mode, brandIds } = useAutopilot();
  const [params, setParams] = useSearchParams();
  const category = params.get("category") ?? "";
  const brand = params.get("nbrand") ?? "";
  const unreadOnly = params.get("unread") === "1";
  const list = useAsync(() => autopilotApi.notifications(), []);
  const [message, setMessage] = useState<string | null>(null);
  const set = (k: string, v: string) => { const p = new URLSearchParams(params); if (v) p.set(k, v); else p.delete(k); setParams(p, { replace: true }); };

  const mark = async (ids: string[] | "all") => {
    const error = await attempt(() => autopilotApi.markRead(ids));
    setMessage(error);
    if (!error) { list.reload(); window.dispatchEvent(new Event("autopilot:notifications")); }
  };

  if (list.error) return <ErrorBox message={list.error} onRetry={list.reload} />;
  if (!list.value) return <LoadingGrid tiles={3} />;
  // In a brand's Autopilot only that brand's notifications are listed (plus brand-less ones in the global view).
  const scoped = list.value.filter((n) => (mode === "brand" ? brandIds?.includes(n.brand_id ?? "") : true));
  const rows = scoped.filter((n) => (!category || n.category === category) && (!brand || (brand === "global" ? !n.brand_id : n.brand_id === brand)) && (!unreadOnly || !n.read_at));
  const unread = scoped.filter((n) => !n.read_at).length;
  const groups: { day: string; items: UserNotification[] }[] = [];
  for (const n of rows) {
    const day = dayLabel(n.created_at);
    const g = groups[groups.length - 1];
    if (g && g.day === day) g.items.push(n); else groups.push({ day, items: [n] });
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <p className="mr-auto text-sm"><span className="text-lg font-semibold">{unread}</span> unread</p>
        <Field label="Category" className="w-40"><select aria-label="Category" className={inputCls} value={category} onChange={(e) => set("category", e.target.value)}><option value="">All</option>{Object.entries(NOTIFICATION_CATEGORIES).map(([c, l]) => <option key={c} value={c}>{l}</option>)}</select></Field>
        {mode === "global" && <Field label="Brand" className="w-44"><select aria-label="Notification brand" className={inputCls} value={brand} onChange={(e) => set("nbrand", e.target.value)}><option value="">All</option><option value="global">Global</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>}
        <label className="flex h-9 items-center gap-2 text-xs"><input type="checkbox" checked={unreadOnly} onChange={(e) => set("unread", e.target.checked ? "1" : "")} /> Unread only</label>
        <Button size="sm" variant="outline" className="h-9" disabled={unread === 0} onClick={() => void mark(mode === "brand" ? scoped.filter((n) => !n.read_at).map((n) => n.id) : "all")}>Mark all as read</Button>
      </div>
      {message && <p role="alert" className="text-xs text-destructive">{message}</p>}
      {rows.length === 0 ? <Panel title="Notifications"><Empty title="No notification">Automations and monitoring notify you here, according to your preferences in Settings.</Empty></Panel> : groups.map((g) => (
        <Panel key={g.day} title={g.day}>
          <ul className="divide-y divide-border/60">
            {g.items.map((n) => (
              <li key={n.id} className={cn("flex items-start justify-between gap-3 py-2", !n.read_at && "font-medium")}>
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {!n.read_at && <span className="h-2 w-2 rounded-full bg-foreground" aria-label="Unread" />}
                    <Pill tone={PRIORITY_TONE[n.priority] ?? "neutral"}>{label(n.priority)}</Pill>
                    {n.link ? <Link className="hover:underline" to={n.link} onClick={() => { if (!n.read_at) void mark([n.id]); }}>{n.title}</Link> : <span>{n.title}</span>}
                  </div>
                  {n.body && <p className="whitespace-pre-wrap font-normal text-muted-foreground">{n.body}</p>}
                  <p className="text-xs font-normal text-muted-foreground">{brandName(n.brand_id)} · {NOTIFICATION_CATEGORIES[n.category] ?? label(n.category)} · {fmtDateTime(n.created_at)}</p>
                </div>
                {!n.read_at && <Button size="sm" variant="ghost" onClick={() => void mark([n.id])}>Mark read</Button>}
              </li>
            ))}
          </ul>
        </Panel>
      ))}
    </div>
  );
};

export default Notifications;
