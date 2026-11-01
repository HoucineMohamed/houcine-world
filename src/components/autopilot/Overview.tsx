import React from "react";
import { Link } from "react-router-dom";
import { autopilotApi } from "@/services/autopilot";
import { useAsync } from "@/components/command/useAsync";
import { Empty, ErrorBox, fmtDateTime, Kpi, LoadingGrid, Panel } from "@/components/command/ui";
import { useAutopilot } from "@/pages/workspace/autopilot/Autopilot";
import { RunPill, SeverityPill } from "./shared";

// Autopilot overview: every number is counted from the execution, automation and alert records.

const Overview = () => {
  const { brandIds, link, tick, brandName, mode } = useAutopilot();
  const key = [JSON.stringify(brandIds), tick];
  const automations = useAsync(() => autopilotApi.automations(brandIds), key);
  const runs = useAsync(() => autopilotApi.runs(brandIds), key);
  const alerts = useAsync(() => autopilotApi.alerts(brandIds, "open"), key);
  const error = automations.error ?? runs.error ?? alerts.error;
  if (error) return <ErrorBox message={error} />;
  if (!automations.value || !runs.value || !alerts.value) return <LoadingGrid />;
  const today = new Date().toISOString().slice(0, 10);
  const todayRuns = runs.value.filter((r) => r.created_at.slice(0, 10) === today);
  const executed = runs.value.filter((r) => r.status === "completed" || r.status === "failed");
  const reliability = executed.length ? Math.round((executed.filter((r) => r.status === "completed").length / executed.length) * 1000) / 10 : null;
  const name = (id: string) => automations.value!.find((a) => a.id === id)?.name ?? "Automation";
  return (
    <div className="space-y-5">
      <Panel title="Automation" description="From the execution records (the latest 200 executions)">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Kpi label="Active automations" value={automations.value.filter((a) => a.status === "active").length} to={link("automations")} />
          <Kpi label="Executions today" value={todayRuns.length} to={link("executions")} />
          <Kpi label="Successful today" value={todayRuns.filter((r) => r.status === "completed").length} to={link("executions", { status: "completed" })} />
          <Kpi label="Failed today" value={todayRuns.filter((r) => r.status === "failed").length} to={link("executions", { status: "failed" })} invert />
          <Kpi label="Awaiting approval" value={runs.value.filter((r) => r.status === "awaiting_approval").length} to={link("executions", { status: "awaiting_approval" })} />
          <Kpi label="Reliability" value={reliability !== null ? `${reliability}%` : "—"} unavailable={reliability === null ? "No execution with actions yet." : undefined} hint="Completed ÷ (completed + failed)" />
        </div>
      </Panel>
      <Panel title="Monitoring" description="Open alerts from the deterministic monitoring rules and automations">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi label="Open alerts" value={alerts.value.length} to={link("monitoring")} />
          <Kpi label="Critical" value={alerts.value.filter((a) => a.severity === "critical").length} to={link("monitoring", { severity: "critical" })} invert />
          <Kpi label="High" value={alerts.value.filter((a) => a.severity === "high").length} to={link("monitoring", { severity: "high" })} invert />
          <Kpi label="Finance" value={alerts.value.filter((a) => a.category === "finance").length} to={link("monitoring", { category: "finance" })} />
        </div>
      </Panel>
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Most important alerts" actions={<Link className="text-xs text-muted-foreground hover:underline" to={link("monitoring")}>All alerts</Link>}>
          {alerts.value.length === 0 ? <Empty title="No open alert" /> : (
            <ul className="divide-y divide-border/60">
              {[...alerts.value].sort((a, b) => ["critical", "high", "medium", "low", "info"].indexOf(a.severity) - ["critical", "high", "medium", "low", "info"].indexOf(b.severity)).slice(0, 8).map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3 py-2"><span className="min-w-0"><span className="font-medium">{a.title}</span><span className="block text-xs text-muted-foreground">{mode === "global" ? `${brandName(a.brand_id)} · ` : ""}{fmtDateTime(a.detected_at)}</span></span><SeverityPill severity={a.severity} /></li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Recent workflow activity" actions={<Link className="text-xs text-muted-foreground hover:underline" to={link("executions")}>Execution history</Link>}>
          {runs.value.length === 0 ? <Empty title="No execution yet">Executions appear when an active automation's trigger happens.</Empty> : (
            <ul className="divide-y divide-border/60">
              {runs.value.slice(0, 8).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2"><Link to={link("executions", { run: r.id })} className="min-w-0 hover:underline"><span className="font-medium">{name(r.automation_id)}</span><span className="block text-xs text-muted-foreground">{fmtDateTime(r.created_at)}{mode === "global" ? ` · ${brandName(r.brand_id)}` : ""}</span></Link><RunPill status={r.status} /></li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
};

export default Overview;
