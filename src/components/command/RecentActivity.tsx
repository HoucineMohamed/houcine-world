import React, { useCallback, useEffect, useState } from "react";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { commandApi, type ActivityEvent } from "@/services/command";
import { useCommand } from "./context";
import { Empty, ErrorBox, fmtDateTime, label } from "./ui";

// The activity timeline, read from the existing audit_logs table (written by the database's triggers; nobody can
// change it from the browser). Brand admins see their brands' history; super admins see everything.

export const describe = (e: ActivityEvent): string => {
  const [entity, verb] = e.action.split(".");
  const m = (e.metadata ?? {}) as Record<string, unknown>;
  const neu = (m.new ?? {}) as Record<string, unknown>;
  const old = (m.old ?? {}) as Record<string, unknown>;
  const what = label(entity ?? e.action);
  switch (verb) {
    case "stage_changed": return `${what} moved from ${label(String(old.stage ?? "?"))} to ${label(String(neu.stage ?? "?"))}`;
    case "status_changed": return `${what} status: ${label(String(old.status ?? "?"))} → ${label(String(neu.status ?? "?"))}`;
    case "completed": return "Task completed";
    case "delivered": return "Deliverable delivered";
    case "converted": return "Lead converted into a project";
    case "generated": return `Report generated: ${label(String(m.report ?? ""))}`;
    case "created": return `${what} created${m.amount ? ` (${m.amount} ${m.currency ?? ""})` : ""}`;
    case "deleted": return `${what} deleted`;
    case "updated": return `${what} updated${Array.isArray(m.changed) ? `: ${(m.changed as string[]).map(label).join(", ").toLowerCase()}` : ""}`;
    default: return `${what} ${label(verb ?? "")}`.trim();
  }
};

export const useActivity = (filters: { action?: string; entity?: string; actor?: string; from?: string; to?: string }, pageSize = 100) => {
  const { scope } = useCommand();
  const [events, setEvents] = useState<ActivityEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const key = JSON.stringify([scope.brandIds, filters]);
  const load = useCallback(async (before?: string) => {
    try {
      const rows = await commandApi.activity(scope, { ...filters, before });
      setEvents((cur) => (before && cur ? [...cur, ...rows] : rows));
      setMore(rows.length === pageSize);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The activity could not be loaded.");
    }
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setEvents(null); void load(); }, [load]);
  return { events, error, more, loadMore: () => events?.length && load(events[events.length - 1]!.created_at), reload: () => load() };
};

export const ActivityList = ({ events }: { events: ActivityEvent[] }) => {
  const { user } = useWorkspace();
  const { brandName, mode } = useCommand();
  return (
    <ol className="relative space-y-3 border-l border-border pl-4">
      {events.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-foreground/50" aria-hidden="true" />
          <p className="text-sm text-foreground">{describe(e)}</p>
          <p className="text-xs text-muted-foreground">
            {fmtDateTime(e.created_at)} · {e.actor_id ? (e.actor_id === user?.id ? "you" : "a team member") : "system"}
            {mode === "global" && ` · ${brandName(e.brand_id)}`}
          </p>
        </li>
      ))}
    </ol>
  );
};

const RecentActivity = ({ limit }: { limit: number }) => {
  const { events, error, reload } = useActivity({});
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!events) return <p className="text-sm text-muted-foreground" role="status">Loading…</p>;
  if (!events.length) return <Empty title="No activity recorded yet">Activity appears when records are created or changed. Brand activity is visible to brand admins.</Empty>;
  return <ActivityList events={events.slice(0, limit)} />;
};

export default RecentActivity;
