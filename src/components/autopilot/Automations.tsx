import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Copy, Play, Pause, Archive, FlaskConical, ArrowDown, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { autopilotApi, type Action, type Automation, type Condition, type Definition } from "@/services/autopilot";
import { attempt, useAsync } from "@/components/command/useAsync";
import { Empty, ErrorBox, Field, fmtDateTime, inputCls, label, Panel, Pill, StatusPill } from "@/components/command/ui";
import { useAutopilot } from "@/pages/workspace/autopilot/Autopilot";
import { ACTIONS, ALERT_CATEGORIES, describeCondition, FIELDS, NOTIFICATION_CATEGORIES, OPS, TRIGGERS } from "./shared";

// Automation Builder: TRIGGER -> CONDITIONS -> ACTIONS, from fixed lists only (the database refuses anything else).
// Every saved change of the definition is a new version; executions record the version they ran.

const TEMPLATES: { name: string; description: string; definition: Definition }[] = [
  { name: "Unassigned leads", description: "A new lead without an owner goes to the assignment queue and the admins are told.",
    definition: { trigger: "lead.created", match: "all", conditions: [{ field: "unassigned", op: "eq", value: "true" }], actions: [{ type: "notify_admins", title: "New lead without an owner: {name}", category: "leads", priority: "normal" }, { type: "queue_assignment" }] } },
  { name: "Project deadlines", description: "An active, unfinished project close to its deadline: the owner is told, a follow-up task and an activity entry are added.",
    definition: { trigger: "project.deadline_approaching", match: "all", conditions: [{ field: "status", op: "eq", value: "active" }, { field: "progress_pct", op: "lt", value: "100" }], actions: [{ type: "notify_owner", title: "Deadline in {days_to_deadline} days: {name}", category: "projects", priority: "high" }, { type: "create_task", title: "Check the deadline of {name}", due_in_days: 1, assign: "owner" }, { type: "add_activity", title: "Deadline approaching: {name}" }] } },
  { name: "Outstanding invoices", description: "An overdue invoice with a balance: a finance alert, the admins are told, and a follow-up draft (never sent to the client).",
    definition: { trigger: "invoice.overdue", match: "all", conditions: [{ field: "outstanding", op: "gt", value: "0" }], actions: [{ type: "create_alert", title: "Overdue invoice {name}: {outstanding} {currency}", severity: "high", category: "finance" }, { type: "notify_admins", title: "Invoice overdue: {name}", category: "finance", priority: "high" }, { type: "followup_draft" }] } },
  { name: "Project budget", description: "When a project's costs reach 90% of its budget (same currency only): a financial warning to the owner and central management.",
    definition: { trigger: "project.budget_threshold", match: "all", conditions: [{ field: "budget_use_pct", op: "gte", value: "90" }], actions: [{ type: "create_alert", title: "Budget at {budget_use_pct}%: {name}", severity: "high", category: "finance" }, { type: "notify_owner", title: "Budget at {budget_use_pct}%: {name}", category: "finance", priority: "high" }, { type: "notify_admins", title: "Budget at {budget_use_pct}%: {name}", category: "finance", priority: "high", include_central: true }] } },
  { name: "Client revision request", description: "When a client asks for a revision: the project manager is told and a task is created.",
    definition: { trigger: "deliverable.revision_requested", match: "all", conditions: [], actions: [{ type: "notify_owner", title: "Revision requested: {title}", category: "projects", priority: "high" }, { type: "create_task", title: "Handle the revision: {title}", priority: "high", due_in_days: 2, assign: "owner" }] } },
  { name: "Proposal accepted", description: "When a client accepts a proposal: the admins are told (the project is created by an admin, once).",
    definition: { trigger: "proposal.accepted", match: "all", conditions: [], actions: [{ type: "notify_admins", title: "Proposal accepted: {title}", category: "finance", priority: "high" }] } },
  { name: "Client onboarding", description: "When a client joins a project: an onboarding task for the project owner.",
    definition: { trigger: "project.client_added", match: "all", conditions: [], actions: [{ type: "create_task", title: "Onboard the client on {name}", priority: "medium", due_in_days: 3, assign: "owner" }] } },
  { name: "Knowledge review overdue", description: "When a library document's review date passes: its owner is told.",
    definition: { trigger: "knowledge.review_overdue", match: "all", conditions: [], actions: [{ type: "notify_owner", title: "Review overdue: {title}", category: "knowledge", priority: "normal" }] } },
  { name: "Knowledge review requested", description: "When a document is submitted for review: the brand's admins are told (super admins for global or management documents).",
    definition: { trigger: "knowledge.review_requested", match: "all", conditions: [], actions: [{ type: "notify_admins", title: "Review requested: {title}", category: "knowledge", priority: "normal", include_central: true }] } },
  { name: "Knowledge gap", description: "When a question repeatedly finds no source: an alert for the knowledge owners.",
    definition: { trigger: "knowledge.gap_detected", match: "all", conditions: [], actions: [{ type: "create_alert", title: "{title}", severity: "low", category: "system" }] } },
];

/** The visual workflow: one card per step, joined top to bottom. */
export const WorkflowDiagram = ({ d }: { d: Definition }) => (
  <ol className="flex flex-col items-stretch" aria-label="Workflow">
    <li className="rounded-lg border border-sky-500/40 bg-sky-500/5 p-3">
      <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-sky-300">When</p>
      <p className="font-medium">{TRIGGERS[d.trigger]?.label ?? d.trigger}</p>
      <p className="text-xs text-muted-foreground">{TRIGGERS[d.trigger]?.help}</p>
    </li>
    <li aria-hidden="true" className="flex justify-center py-1 text-muted-foreground"><ArrowDown className="h-4 w-4" /></li>
    <li className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
      <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-amber-300">If {d.conditions?.length ? (d.match === "any" ? "any of" : "all of") : ""}</p>
      {d.conditions?.length ? <ul className="mt-1 space-y-0.5">{d.conditions.map((c, i) => <li key={i}>{describeCondition(c)}</li>)}</ul> : <p className="text-muted-foreground">Always</p>}
    </li>
    <li aria-hidden="true" className="flex justify-center py-1 text-muted-foreground"><ArrowDown className="h-4 w-4" /></li>
    {d.requires_approval && <><li className="rounded-lg border border-violet-500/30 bg-muted/30 p-2 text-xs">An admin approves each execution first</li><li aria-hidden="true" className="flex justify-center py-1 text-muted-foreground"><ArrowDown className="h-4 w-4" /></li></>}
    <li className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3">
      <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-emerald-300">Then</p>
      <ol className="mt-1 list-decimal space-y-0.5 pl-5">{d.actions.map((a, i) => <li key={i}>{ACTIONS[a.type]?.label ?? a.type}{a.title ? `: “${a.title}”` : ""}</li>)}</ol>
    </li>
  </ol>
);

const Editor = ({ initial, onDone }: { initial: Partial<Automation> & { definition: Definition }; onDone: () => void }) => {
  const { mode, scopeBrands, isSuperAdmin } = useAutopilot();
  const [name, setName] = useState(initial.name ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [brandId, setBrandId] = useState<string>(initial.id ? initial.brand_id ?? "" : initial.brand_id ?? (mode === "brand" || scopeBrands.length === 1 ? scopeBrands[0]?.id ?? "" : ""));
  const [d, setD] = useState<Definition>({ match: "all", conditions: [], ...initial.definition });
  const [err, setErr] = useState<string | null>(null);
  const setCond = (i: number, c: Partial<Condition>) => setD({ ...d, conditions: (d.conditions ?? []).map((x, j) => (j === i ? { ...x, ...c } : x)) });
  const setAct = (i: number, a: Partial<Action>) => setD({ ...d, actions: d.actions.map((x, j) => (j === i ? { ...x, ...a } : x)) });
  const save = async (status: string) => {
    const error = await attempt(() => autopilotApi.saveAutomation({ id: initial.id, brand_id: brandId || null, name, description: description || null, status, definition: d }));
    if (error) setErr(error); else onDone();
  };
  return (
    <Panel title={initial.id ? `Edit: ${initial.name} (version ${initial.version})` : "New automation"} actions={<Button size="sm" variant="ghost" onClick={onDone} aria-label="Close the editor"><X className="h-4 w-4" /></Button>}>
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Name"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} /></Field>
            <Field label="Brand">
              <select className={inputCls} value={brandId} disabled={!!initial.id} onChange={(e) => setBrandId(e.target.value)}>
                {isSuperAdmin && mode === "global" && <option value="">Global (every brand)</option>}
                {!isSuperAdmin && !brandId && <option value="">Choose a brand</option>}
                {scopeBrands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
            <Field label="Description"><input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} /></Field>
          </div>
          <fieldset className="rounded-lg border border-sky-500/30 p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-sky-300">1 · Trigger</legend>
            <select aria-label="Trigger" className={inputCls} value={d.trigger} onChange={(e) => setD({ ...d, trigger: e.target.value })}>
              {Object.entries(TRIGGERS).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">{TRIGGERS[d.trigger]?.help}</p>
          </fieldset>
          <fieldset className="rounded-lg border border-amber-500/30 p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-amber-300">2 · Conditions</legend>
            <div className="mb-2 flex items-center gap-2 text-xs">Run when
              <select aria-label="Match" className="h-8 rounded-md border border-input bg-background px-2" value={d.match ?? "all"} onChange={(e) => setD({ ...d, match: e.target.value as "all" | "any" })}><option value="all">all (AND)</option><option value="any">any (OR)</option></select>
              of these are true{!(d.conditions ?? []).length && " (none: always)"}.
            </div>
            <ul className="space-y-2">
              {(d.conditions ?? []).map((c, i) => (
                <li key={i} className="grid grid-cols-[1fr_120px_1fr_auto] gap-2">
                  <select aria-label={`Condition ${i + 1} field`} className={inputCls} value={c.field} onChange={(e) => setCond(i, { field: e.target.value })}>{Object.entries(FIELDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                  <select aria-label={`Condition ${i + 1} operator`} className={inputCls} value={c.op} onChange={(e) => setCond(i, { op: e.target.value })}>{Object.entries(OPS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                  <input aria-label={`Condition ${i + 1} value`} className={inputCls} value={c.value ?? ""} disabled={c.op === "is_empty" || c.op === "not_empty"} onChange={(e) => setCond(i, { value: e.target.value })} placeholder="value (EUR, active, 1000…)" />
                  <Button size="icon" variant="ghost" aria-label={`Remove condition ${i + 1}`} onClick={() => setD({ ...d, conditions: (d.conditions ?? []).filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
                </li>
              ))}
            </ul>
            <Button size="sm" variant="outline" className="mt-2 gap-1.5" disabled={(d.conditions ?? []).length >= 10} onClick={() => setD({ ...d, conditions: [...(d.conditions ?? []), { field: "status", op: "eq", value: "" }] })}><Plus className="h-3.5 w-3.5" aria-hidden="true" /> Condition</Button>
          </fieldset>
          <fieldset className="rounded-lg border border-emerald-500/30 p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-emerald-300">3 · Actions</legend>
            <ol className="space-y-3">
              {d.actions.map((a, i) => (
                <li key={i} className="rounded-md border border-border p-2">
                  <div className="flex gap-2">
                    <select aria-label={`Action ${i + 1}`} className={inputCls} value={a.type} onChange={(e) => setAct(i, { type: e.target.value })}>{Object.entries(ACTIONS).map(([k, x]) => <option key={k} value={k}>{x.label}</option>)}</select>
                    <Button size="icon" variant="ghost" aria-label={`Remove action ${i + 1}`} disabled={d.actions.length === 1} onClick={() => setD({ ...d, actions: d.actions.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{ACTIONS[a.type]?.help}</p>
                  <div className="mt-2 grid gap-2 md:grid-cols-3">
                    {ACTIONS[a.type]?.fields.includes("title") && <Field label="Text ({name}, {amount}, {currency}… are filled in)" className="md:col-span-2"><input className={inputCls} value={a.title ?? ""} onChange={(e) => setAct(i, { title: e.target.value })} maxLength={300} /></Field>}
                    {ACTIONS[a.type]?.fields.includes("priority") && <Field label="Priority"><select className={inputCls} value={a.priority ?? (a.type === "create_task" ? "medium" : "normal")} onChange={(e) => setAct(i, { priority: e.target.value })}>{(a.type === "create_task" ? ["low", "medium", "high", "urgent"] : ["low", "normal", "high", "urgent"]).map((p) => <option key={p} value={p}>{label(p)}</option>)}</select></Field>}
                    {ACTIONS[a.type]?.fields.includes("category") && <Field label="Category"><select className={inputCls} value={a.category ?? (a.type === "create_alert" ? "projects" : "automations")} onChange={(e) => setAct(i, { category: e.target.value })}>{(a.type === "create_alert" ? Object.entries(ALERT_CATEGORIES) : Object.entries(NOTIFICATION_CATEGORIES).filter(([c]) => c !== "knowledge")).map(([c, l]) => <option key={c} value={c}>{l}</option>)}</select></Field>}
                    {ACTIONS[a.type]?.fields.includes("severity") && <Field label="Severity"><select className={inputCls} value={a.severity ?? "medium"} onChange={(e) => setAct(i, { severity: e.target.value })}>{["critical", "high", "medium", "low", "info"].map((c) => <option key={c} value={c}>{label(c)}</option>)}</select></Field>}
                    {ACTIONS[a.type]?.fields.includes("due_in_days") && <Field label="Due in (days)"><input type="number" min={0} max={365} className={inputCls} value={a.due_in_days ?? ""} onChange={(e) => setAct(i, { due_in_days: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>}
                    {ACTIONS[a.type]?.fields.includes("to") && <Field label="New status"><select className={inputCls} value={a.to ?? "on_hold"} onChange={(e) => setAct(i, { to: e.target.value })}>{["on_hold", "active", "in_progress", "blocked", "todo", "contacted", "qualified"].map((s) => <option key={s} value={s}>{label(s)}</option>)}</select></Field>}
                    {ACTIONS[a.type]?.fields.includes("assign") && <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={a.assign === "owner"} onChange={(e) => setAct(i, { assign: e.target.checked ? "owner" : undefined })} className="accent-primary" /> Assign to the project owner</label>}
                    {ACTIONS[a.type]?.fields.includes("include_central") && <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!a.include_central} onChange={(e) => setAct(i, { include_central: e.target.checked })} className="accent-primary" /> Also central management (super admins)</label>}
                    {ACTIONS[a.type]?.fields.includes("instruction") && <Field label="Instruction for the AI (optional)" className="md:col-span-3"><input className={inputCls} value={a.instruction ?? ""} onChange={(e) => setAct(i, { instruction: e.target.value })} maxLength={300} /></Field>}
                  </div>
                </li>
              ))}
            </ol>
            <Button size="sm" variant="outline" className="mt-2 gap-1.5" disabled={d.actions.length >= 8} onClick={() => setD({ ...d, actions: [...d.actions, { type: "notify_admins" }] })}><Plus className="h-3.5 w-3.5" aria-hidden="true" /> Action</Button>
            <p className="mt-2 text-xs text-muted-foreground">Email is not available: no email provider is configured for Autopilot. Nothing is ever sent to a client.</p>
          </fieldset>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!d.requires_approval} onChange={(e) => setD({ ...d, requires_approval: e.target.checked })} className="accent-primary" /> An admin must approve each execution before its actions run</label>
          {err && <ErrorBox message={err} />}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void save("active")} disabled={!name.trim() || (!brandId && !isSuperAdmin)}>Save and activate</Button>
            <Button size="sm" variant="outline" onClick={() => void save(initial.status && initial.status !== "active" ? initial.status : "draft")} disabled={!name.trim() || (!brandId && !isSuperAdmin)}>Save as {initial.status && initial.status !== "active" ? label(initial.status).toLowerCase() : "draft"}</Button>
          </div>
        </div>
        <div><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preview</p><WorkflowDiagram d={d} /></div>
      </div>
    </Panel>
  );
};

const TestPanel = ({ automation, onClose }: { automation: Automation; onClose: () => void }) => {
  const { brandIds } = useAutopilot();
  const events = useAsync(() => autopilotApi.events(automation.brand_id ? [automation.brand_id] : brandIds, automation.definition.trigger), [automation.id]);
  const [result, setResult] = useState<Awaited<ReturnType<typeof autopilotApi.test>> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  return (
    <Panel title={`Test: ${automation.name}`} description="A dry run on a recent event of this trigger: the conditions are checked, nothing is executed." actions={<Button size="sm" variant="ghost" onClick={onClose} aria-label="Close the test"><X className="h-4 w-4" /></Button>}>
      {!events.value ? <p className="text-muted-foreground">Loading…</p> : events.value.length === 0 ? <Empty title="No recent event of this trigger">Test again after one happens (for example create a lead, or run monitoring).</Empty> : (
        <ul className="space-y-1">
          {events.value.slice(0, 10).map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-2"><span className="text-xs text-muted-foreground">{fmtDateTime(e.occurred_at)} · {e.entity_type}</span>
              <Button size="sm" variant="outline" onClick={async () => { try { setResult(await autopilotApi.test(automation.id, e.id)); setErr(null); } catch (x) { setErr(x instanceof Error ? x.message : "Test failed."); } }}>Test on this event</Button></li>
          ))}
        </ul>
      )}
      {err && <ErrorBox message={err} />}
      {result && (
        <div className="mt-3 rounded-md border border-border p-3">
          <p className="font-medium">{result.would_run ? (result.requires_approval ? "Would run after an admin approves it." : "Would run.") : "Would not run."}</p>
          <ul className="mt-1 space-y-0.5 text-xs">{result.checks.map((c, i) => <li key={i} className={c.ok ? "text-emerald-300" : "text-rose-300"}>{c.ok ? "✓" : "✗"} {describeCondition(c)} (actual: {c.actual === null || c.actual === undefined ? "empty" : String(c.actual)})</li>)}</ul>
        </div>
      )}
    </Panel>
  );
};

const Automations = () => {
  const { brandIds, tick, brandName, mode, link } = useAutopilot();
  const [params, setParams] = useSearchParams();
  const list = useAsync(() => autopilotApi.automations(brandIds), [JSON.stringify(brandIds), tick]);
  const [editing, setEditing] = useState<(Partial<Automation> & { definition: Definition }) | null>(null);
  const [testing, setTesting] = useState<Automation | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const showArchived = params.get("archived") === "1";
  const versions = useAsync(() => (params.get("versions") ? autopilotApi.versions(params.get("versions")!) : Promise.resolve([])), [params.get("versions")]);
  const setStatus = async (a: Automation, status: string) => { const e = await attempt(() => autopilotApi.setStatus(a.id, status)); if (e) setErr(e); else list.reload(); };
  const rows = (list.value ?? []).filter((a) => showArchived || a.status !== "archived");
  return (
    <div className="space-y-4">
      {editing && <Editor initial={editing} onDone={() => { setEditing(null); list.reload(); }} />}
      {testing && <TestPanel automation={testing} onClose={() => setTesting(null)} />}
      {!editing && (
        <Panel title="Start from a template" description="The four example workflows; edit before saving.">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {TEMPLATES.map((t) => (
              <button key={t.name} type="button" onClick={() => setEditing({ name: t.name, description: t.description, definition: t.definition })} className="rounded-lg border border-border p-3 text-left hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <p className="font-medium">{t.name}</p><p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
              </button>
            ))}
          </div>
        </Panel>
      )}
      <Panel title={`Automations (${rows.length})`} actions={<>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground"><input type="checkbox" checked={showArchived} onChange={(e) => { const n = new URLSearchParams(params); if (e.target.checked) n.set("archived", "1"); else n.delete("archived"); setParams(n, { replace: true }); }} className="accent-primary" /> Show archived</label>
        <Button size="sm" className="gap-1.5" onClick={() => setEditing({ definition: { trigger: "lead.created", match: "all", conditions: [], actions: [{ type: "notify_admins" }] } })}><Plus className="h-3.5 w-3.5" aria-hidden="true" /> New automation</Button>
      </>}>
        {err && <ErrorBox message={err} />}
        {list.error ? <ErrorBox message={list.error} onRetry={list.reload} /> : !list.value ? <p className="text-muted-foreground">Loading…</p> : rows.length === 0 ? <Empty title="No automation yet">Start from a template above, or with New automation.</Empty> : (
          <ul className="grid gap-3 xl:grid-cols-2">
            {rows.map((a) => (
              <li key={a.id} className="rounded-lg border border-border bg-background/40 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0"><p className="font-medium">{a.name}</p><p className="text-xs text-muted-foreground">{mode === "global" ? `${brandName(a.brand_id)} · ` : ""}version {a.version} · updated {fmtDateTime(a.updated_at)}</p></div>
                  <StatusPill status={a.status === "active" ? "active" : a.status === "paused" ? "on_hold" : a.status === "draft" ? "draft" : "cancelled"} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                  <Pill tone="info">{TRIGGERS[a.definition.trigger]?.label ?? a.definition.trigger}</Pill><span className="text-muted-foreground">→</span>
                  <Pill tone="warn">{a.definition.conditions?.length ? `${a.definition.conditions.length} condition${a.definition.conditions.length > 1 ? "s" : ""}` : "always"}</Pill><span className="text-muted-foreground">→</span>
                  <Pill tone="good">{a.definition.actions.length} action{a.definition.actions.length > 1 ? "s" : ""}</Pill>
                  {a.definition.requires_approval && <Pill tone="neutral">approval</Pill>}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {a.status !== "active" && a.status !== "archived" && <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => void setStatus(a, "active")}><Play className="h-3.5 w-3.5" aria-hidden="true" /> Activate</Button>}
                  {a.status === "active" && <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => void setStatus(a, "paused")}><Pause className="h-3.5 w-3.5" aria-hidden="true" /> Pause</Button>}
                  {a.status !== "archived" && <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditing(a)}>Edit</Button>}
                  <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => setEditing({ brand_id: a.brand_id, name: `${a.name} (copy)`, description: a.description, definition: a.definition })}><Copy className="h-3.5 w-3.5" aria-hidden="true" /> Duplicate</Button>
                  <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => setTesting(a)}><FlaskConical className="h-3.5 w-3.5" aria-hidden="true" /> Test</Button>
                  <Button size="sm" variant="ghost" className="h-7" onClick={() => { const n = new URLSearchParams(params); n.set("versions", a.id); setParams(n, { replace: true }); }}>Versions</Button>
                  <Link className="inline-flex h-7 items-center px-2 text-xs text-muted-foreground hover:text-foreground" to={link("executions", { automation: a.id })}>History</Link>
                  {a.status !== "archived" && <Button size="sm" variant="ghost" className={cn("h-7 gap-1 text-muted-foreground")} onClick={() => void setStatus(a, "archived")}><Archive className="h-3.5 w-3.5" aria-hidden="true" /> Archive</Button>}
                </div>
                {params.get("versions") === a.id && (
                  <div className="mt-3 rounded-md border border-border p-2 text-xs">
                    <p className="mb-1 font-semibold text-muted-foreground">Versions (kept forever)</p>
                    <ul className="space-y-0.5">{(versions.value ?? []).map((v) => <li key={v.version}>Version {v.version} · {fmtDateTime(v.created_at)} · {TRIGGERS[v.definition.trigger]?.label} → {v.definition.actions.map((x) => ACTIONS[x.type]?.label ?? x.type).join(", ")}</li>)}</ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
};

export default Automations;
