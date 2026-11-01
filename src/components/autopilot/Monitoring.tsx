import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { autopilotApi } from "@/services/autopilot";
import { attempt, useAsync } from "@/components/command/useAsync";
import { Empty, ErrorBox, Field, fmtDateTime, inputCls, label, LoadingGrid, Panel, Pill } from "@/components/command/ui";
import { useAutopilot } from "@/pages/workspace/autopilot/Autopilot";
import { SeverityPill } from "./shared";

// Intelligent monitoring: the alerts the deterministic rules (ap_scan) and automations raised. An alert exists only
// because a record matched a rule; it resolves itself when the condition ends. Dismiss and resolve are audited.

const SEVERITIES = ["critical", "high", "medium", "low", "info"];
const CATEGORIES = ["projects", "crm", "finance", "system"];
const STATUSES = [{ id: "open", label: "Open" }, { id: "resolved", label: "Resolved" }, { id: "dismissed", label: "Dismissed" }];

/** Where the alert's record lives in the workspace. */
const entityLink = (brandId: string | null, type: string | null, id: string | null) => {
  if (!brandId || !type) return null;
  const base = `/workspace/${brandId}/command`;
  if (type === "project" || type === "task" || type === "milestone") return `${base}/projects`;
  if (type === "lead" || type === "contact") return `${base}/crm`;
  if (type === "invoice" || type === "expense" || type === "payment") return `${base}/finance`;
  if (type === "automation_run" && id) return `/workspace/${brandId}/autopilot/executions?run=${id}`;
  return null;
};

const Monitoring = () => {
  const { brandIds, tick, brandName, mode } = useAutopilot();
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "open";
  const severity = params.get("severity") ?? "";
  const category = params.get("category") ?? "";
  const alerts = useAsync(() => autopilotApi.alerts(brandIds, status), [JSON.stringify(brandIds), status, tick]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const set = (k: string, v: string) => { const p = new URLSearchParams(params); if (v) p.set(k, v); else p.delete(k); setParams(p, { replace: true }); };

  const change = async (id: string, to: "dismissed" | "resolved") => {
    setBusy(id);
    const error = await attempt(() => autopilotApi.setAlert(id, to));
    setBusy(null);
    setMessage(error ?? (to === "dismissed" ? "Alert dismissed." : "Alert marked resolved."));
    if (!error) alerts.reload();
  };

  if (alerts.error) return <ErrorBox message={alerts.error} onRetry={alerts.reload} />;
  const rows = (alerts.value ?? []).filter((a) => (!severity || a.severity === severity) && (!category || a.category === category))
    .sort((a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity) || b.detected_at.localeCompare(a.detected_at));
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div role="tablist" aria-label="Alert status" className="flex gap-1">
          {STATUSES.map((s) => <Button key={s.id} role="tab" aria-selected={status === s.id} size="sm" variant={status === s.id ? "default" : "outline"} onClick={() => set("status", s.id === "open" ? "" : s.id)}>{s.label}</Button>)}
        </div>
        <Field label="Severity" className="w-40"><select aria-label="Severity" className={inputCls} value={severity} onChange={(e) => set("severity", e.target.value)}><option value="">All</option>{SEVERITIES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select></Field>
        <Field label="Category" className="w-40"><select aria-label="Category" className={inputCls} value={category} onChange={(e) => set("category", e.target.value)}><option value="">All</option>{CATEGORIES.map((c) => <option key={c} value={c}>{c === "crm" ? "CRM" : label(c)}</option>)}</select></Field>
      </div>
      {message && <p role="status" className="text-xs text-muted-foreground">{message}</p>}
      <Panel title={`${STATUSES.find((s) => s.id === status)?.label ?? "Open"} alerts`} description="Raised only by a monitoring rule or an automation from the records; open alerts close themselves when the condition ends">
        {!alerts.value ? <LoadingGrid tiles={3} /> : rows.length === 0 ? <Empty title={status === "open" ? "No open alert" : "Nothing here"}>{status === "open" ? "Monitoring found nothing that needs attention in this scope." : undefined}</Empty> : (
          <ul className="divide-y divide-border/60">
            {rows.map((a) => {
              const to = entityLink(a.brand_id, a.entity_type, a.entity_id);
              return (
                <li key={a.id} className="flex flex-col gap-2 py-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2"><SeverityPill severity={a.severity} /><Pill>{a.category === "crm" ? "CRM" : label(a.category)}</Pill><span className="font-medium">{a.title}</span></div>
                    {a.description && <p className="text-muted-foreground">{a.description}</p>}
                    {a.suggested_action && <p className="text-xs"><span className="text-muted-foreground">Suggested: </span>{a.suggested_action}</p>}
                    <p className="text-xs text-muted-foreground">
                      {mode === "global" ? `${brandName(a.brand_id)} · ` : ""}Detected {fmtDateTime(a.detected_at)} · last seen {fmtDateTime(a.last_seen_at)} · {a.source === "monitor" ? `rule ${a.rule}` : a.source}
                      {a.resolved_at ? ` · resolved ${fmtDateTime(a.resolved_at)}` : ""}{a.dismissed_at ? ` · dismissed ${fmtDateTime(a.dismissed_at)}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {to && <Button asChild size="sm" variant="outline"><Link to={to}>Open record</Link></Button>}
                    {a.status === "open" && <>
                      <Button size="sm" variant="outline" disabled={busy === a.id} onClick={() => void change(a.id, "resolved")}>Resolve</Button>
                      <Button size="sm" variant="ghost" disabled={busy === a.id} onClick={() => void change(a.id, "dismissed")}>Dismiss</Button>
                    </>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
};

export default Monitoring;
