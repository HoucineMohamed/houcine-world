import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { autopilotApi, type Run } from "@/services/autopilot";
import { attempt, useAsync } from "@/components/command/useAsync";
import { Empty, ErrorBox, Field, fmtDateTime, inputCls, label, LoadingGrid, Panel, Pill } from "@/components/command/ui";
import { useAutopilot } from "@/pages/workspace/autopilot/Autopilot";
import { ACTIONS, OPS, FIELDS, RUN_LABEL, RunPill, TRIGGERS } from "./shared";

// Execution history: every run of every automation (one per automation and event), its condition checks, each action's
// outcome and attempt, and the controls the database allows: retry a failed run (at most 5 attempts), approve or cancel
// a run waiting for approval. Failures are kept, never discarded.

const RunDetail = ({ run, automationName, onChanged }: { run: Run; automationName: string; onChanged: () => void }) => {
  const { tick, canManage } = useAutopilot();
  const actions = useAsync(() => autopilotApi.runActions(run.id), [run.id, run.status, run.attempts, tick]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const act = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    const error = await attempt(fn);
    setBusy(false);
    setMessage(error ?? done);
    if (!error) { onChanged(); actions.reload(); }
  };
  return (
    <Panel title={automationName} description={`Execution ${run.id.slice(0, 8)} · version ${run.version} · event ${run.event_id}`}
      actions={<RunPill status={run.status} />}>
      <div className="space-y-4">
        <dl className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
          <div><dt className="text-muted-foreground">Created</dt><dd>{fmtDateTime(run.created_at)}</dd></div>
          <div><dt className="text-muted-foreground">Started</dt><dd>{run.started_at ? fmtDateTime(run.started_at) : "—"}</dd></div>
          <div><dt className="text-muted-foreground">Finished</dt><dd>{run.completed_at ? fmtDateTime(run.completed_at) : "—"}</dd></div>
          <div><dt className="text-muted-foreground">Attempts</dt><dd>{run.attempts} of 5</dd></div>
        </dl>
        {run.error && <p role="alert" className="rounded-md border border-rose-500/30 bg-rose-500/10 p-2 text-xs">{run.error}</p>}
        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Conditions</h3>
          {!run.conditions_result ? <p className="text-xs text-muted-foreground">Not evaluated yet.</p> : run.conditions_result.checks.length === 0 ? <p className="text-xs text-muted-foreground">No condition: the trigger alone runs it.</p> : (
            <ul className="space-y-1 text-xs">
              {run.conditions_result.checks.map((c, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2"><Pill tone={c.ok ? "good" : "neutral"}>{c.ok ? "Met" : "Not met"}</Pill>{FIELDS[c.field] ?? c.field} {OPS[c.op] ?? c.op} {c.value} <span className="text-muted-foreground">(actual: {c.actual === null || c.actual === undefined ? "empty" : String(c.actual)})</span></li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</h3>
          {actions.error ? <ErrorBox message={actions.error} /> : !actions.value ? <p className="text-xs text-muted-foreground">Loading…</p> : actions.value.length === 0 ? <p className="text-xs text-muted-foreground">No action ran{run.status === "awaiting_approval" ? " yet: waiting for approval" : run.status === "skipped" ? ": conditions not met" : ""}.</p> : (
            <ol className="space-y-1 text-xs">
              {actions.value.map((a) => (
                <li key={a.id} className="flex flex-wrap items-start gap-2">
                  <Pill tone={a.status === "completed" ? "good" : a.status === "failed" ? "bad" : "neutral"}>{label(a.status)}</Pill>
                  <span>{a.position}. {ACTIONS[a.action_type]?.label ?? a.action_type}</span>
                  <span className="text-muted-foreground">attempt {a.attempt}</span>
                  {a.error && <span className="w-full text-rose-300">{a.error}</span>}
                  {a.result && <span className="w-full break-all text-muted-foreground">{JSON.stringify(a.result)}</span>}
                </li>
              ))}
            </ol>
          )}
        </div>
        {message && <p role="status" className="text-xs">{message}</p>}
        {canManage && (
          <div className="flex flex-wrap gap-2">
            {run.status === "failed" && <Button size="sm" disabled={busy || run.attempts >= 5} onClick={() => void act(() => autopilotApi.retry(run.id), "Retried. See the result above.")}>{run.attempts >= 5 ? "Retry limit reached" : "Retry"}</Button>}
            {run.status === "awaiting_approval" && <>
              <Button size="sm" disabled={busy} onClick={() => void act(() => autopilotApi.decide(run.id, true), "Approved and executed.")}>Approve and run</Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => void act(() => autopilotApi.decide(run.id, false), "Cancelled: no action ran.")}>Cancel</Button>
            </>}
          </div>
        )}
      </div>
    </Panel>
  );
};

const Executions = () => {
  const { brandIds, tick, brandName, mode, link } = useAutopilot();
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "";
  const automation = params.get("automation") ?? "";
  const selected = params.get("run");
  const key = [JSON.stringify(brandIds), status, automation, tick];
  const runs = useAsync(() => autopilotApi.runs(brandIds, { status: status || undefined, automation: automation || undefined }), key);
  const automations = useAsync(() => autopilotApi.automations(brandIds), [JSON.stringify(brandIds), tick]);
  // The open execution is loaded on its own, so it stays in view when it leaves the list's filter (after an approval).
  const one = useAsync(() => (selected ? autopilotApi.run(selected) : Promise.resolve(null)), [selected, tick, runs.value]);
  const set = (k: string, v: string) => { const p = new URLSearchParams(params); if (v) p.set(k, v); else p.delete(k); setParams(p, { replace: true }); };
  const error = runs.error ?? automations.error;
  if (error) return <ErrorBox message={error} onRetry={() => { runs.reload(); automations.reload(); }} />;
  if (!runs.value || !automations.value) return <LoadingGrid tiles={4} />;
  const auto = (id: string) => automations.value!.find((a) => a.id === id);
  const fromScope = (r: Run | null | undefined) => (r && (!brandIds || brandIds.includes(r.brand_id ?? "")) ? r : undefined);
  const current = selected ? fromScope(one.value) ?? fromScope(runs.value.find((r) => r.id === selected)) : undefined;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Status" className="w-48"><select aria-label="Execution status" className={inputCls} value={status} onChange={(e) => set("status", e.target.value)}><option value="">All</option>{Object.entries(RUN_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="Automation" className="w-64"><select aria-label="Automation" className={inputCls} value={automation} onChange={(e) => set("automation", e.target.value)}><option value="">All</option>{automations.value.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Executions" description="The latest 200, newest first. Automated changes are marked automated in the activity history.">
          {runs.value.length === 0 ? <Empty title="No execution">An execution is recorded each time an active automation's trigger happens.</Empty> : (
            <ul className="divide-y divide-border/60">
              {runs.value.map((r) => {
                const a = auto(r.automation_id);
                return (
                  <li key={r.id}>
                    <button type="button" onClick={() => set("run", r.id)} aria-current={r.id === selected ? "true" : undefined} className={`flex w-full items-center justify-between gap-3 py-2 text-left hover:bg-muted/40 ${r.id === selected ? "bg-muted/60" : ""}`}>
                      <span className="min-w-0">
                        <span className="font-medium">{a?.name ?? "Automation"}</span>
                        <span className="block text-xs text-muted-foreground">{a ? TRIGGERS[a.definition.trigger]?.label ?? a.definition.trigger : ""} · {fmtDateTime(r.created_at)}{mode === "global" ? ` · ${brandName(r.brand_id)}` : ""}{r.attempts > 1 ? ` · ${r.attempts} attempts` : ""}</span>
                      </span>
                      <RunPill status={r.status} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
        {current ? <RunDetail run={current} automationName={auto(current.automation_id)?.name ?? "Automation"} onChanged={() => { runs.reload(); one.reload(); }} />
          : <Panel title="Execution detail"><Empty title={selected ? "Execution not found in this view" : "Choose an execution"}>{selected ? <Link className="underline" to={link("executions")}>Show all executions</Link> : "Its conditions, actions and attempts appear here."}</Empty></Panel>}
      </div>
    </div>
  );
};

export default Executions;
