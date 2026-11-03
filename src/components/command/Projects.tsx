import React, { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { commandApi, type Project } from "@/services/command";
import { useCommand } from "./context";
import { attempt, useAsync } from "./useAsync";
import { Empty, ErrorBox, Field, fmtAmount, fmtDate, HEALTH, inputCls, label, MoneyLines, Panel, Pill, StatusPill } from "./ui";
import { addDays, daysBetween, projectHealth, type ProjectHealth } from "../../../supabase/functions/_shared/command/metrics.ts";

// Project portfolio: list, board, timeline and calendar views of the same projects, and one workspace per project
// (milestones, tasks, deliverables, budget and costs). Health comes from the engine's documented rules.

const STATUSES = ["planned", "active", "on_hold", "completed", "cancelled"];
const PRIORITIES = ["low", "medium", "high", "urgent"];
const VIEWS = [["list", "Portfolio"], ["board", "Board"], ["timeline", "Timeline"], ["calendar", "Calendar"]] as const;

const useHealth = () => {
  const { data, today } = useCommand();
  return (p: Project): ProjectHealth | null => (data ? projectHealth(p as never, data.dataset.tasks, data.dataset.milestones, data.dataset.expenses, today) : null);
};

const HealthPill = ({ h }: { h: ProjectHealth | null }) => (h ? <Pill tone={HEALTH[h.health]!.tone} title={h.reasons.join(" · ") || "No warning"}>{HEALTH[h.health]!.label}</Pill> : null);

const NewProject = ({ onDone }: { onDone: () => void }) => {
  const { scopeBrands, reload } = useCommand();
  const [f, setF] = useState({ brand_id: scopeBrands.length === 1 ? scopeBrands[0]!.id : "", name: "", status: "planned", priority: "medium", start_date: "", deadline: "", currency: "EUR", budget: "", estimated_cost: "", description: "" });
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasMoney = f.budget || f.estimated_cost;
    const error = await attempt(() => commandApi.createProject({
      brand_id: f.brand_id, name: f.name, status: f.status, priority: f.priority, description: f.description || null,
      start_date: f.start_date || null, deadline: f.deadline || null,
      currency: hasMoney ? (f.currency as "EUR" | "USD") : null, budget: f.budget || null, estimated_cost: f.estimated_cost || null,
    }));
    if (error) return setErr(error);
    reload();
    onDone();
  };
  return (
    <form onSubmit={submit} className="grid gap-3 rounded-lg border border-border p-3 md:grid-cols-4">
      <Field label="Brand"><select className={inputCls} value={f.brand_id} onChange={set("brand_id")} required><option value="">Choose a brand</option>{scopeBrands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
      <Field label="Name"><input className={inputCls} value={f.name} onChange={set("name")} required maxLength={200} /></Field>
      <Field label="Status"><select className={inputCls} value={f.status} onChange={set("status")}>{STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select></Field>
      <Field label="Priority"><select className={inputCls} value={f.priority} onChange={set("priority")}>{PRIORITIES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select></Field>
      <Field label="Start"><input type="date" className={inputCls} value={f.start_date} onChange={set("start_date")} /></Field>
      <Field label="Deadline"><input type="date" className={inputCls} value={f.deadline} onChange={set("deadline")} /></Field>
      <Field label="Currency"><select className={inputCls} value={f.currency} onChange={set("currency")}><option>EUR</option><option>USD</option></select></Field>
      <Field label="Budget"><input inputMode="decimal" pattern="\d+(\.\d{1,2})?" className={inputCls} value={f.budget} onChange={set("budget")} /></Field>
      <Field label="Estimated cost"><input inputMode="decimal" pattern="\d+(\.\d{1,2})?" className={inputCls} value={f.estimated_cost} onChange={set("estimated_cost")} /></Field>
      <Field label="Description" className="md:col-span-2"><input className={inputCls} value={f.description} onChange={set("description")} maxLength={5000} /></Field>
      <div className="flex items-end gap-2"><Button type="submit" size="sm" disabled={!f.brand_id || !f.name.trim()}>Create project</Button><Button type="button" size="sm" variant="ghost" onClick={onDone}>Cancel</Button></div>
      {err && <p role="alert" className="text-sm text-rose-300 md:col-span-4">{err}</p>}
    </form>
  );
};

const ProjectWorkspace = ({ project, onClose, onChanged }: { project: Project; onClose: () => void; onChanged: () => void }) => {
  const { scope, canEdit, canAdmin, brandName, reload, link, today } = useCommand();
  const health = useHealth()(project);
  const milestones = useAsync(() => commandApi.milestones(scope, project.id), [project.id]);
  const tasks = useAsync(() => commandApi.tasks(scope, project.id), [project.id]);
  const [err, setErr] = useState<string | null>(null);
  const [task, setTask] = useState({ title: "", kind: "task", due_date: "", milestone_id: "", priority: "medium" });
  const [ms, setMs] = useState({ title: "", due_date: "" });
  const refresh = () => { milestones.reload(); tasks.reload(); reload(); onChanged(); };
  const run = async (fn: () => Promise<unknown>) => { const e = await attempt(fn); if (e) setErr(e); else { setErr(null); refresh(); } };
  const p = project;
  return (
    <Panel title={p.name} actions={<Button size="sm" variant="ghost" onClick={onClose} aria-label="Close the project"><X className="h-4 w-4" /></Button>}
      description={`${brandName(p.brand_id)} · ${label(p.priority)} priority · ${fmtDate(p.start_date)} to ${fmtDate(p.deadline)}`}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <HealthPill h={health} />
        {health && health.reasons.map((r) => <span key={r} className="text-xs text-muted-foreground">{r}</span>)}
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Field label="Status"><select className={inputCls} disabled={!canEdit} value={p.status} onChange={(e) => void run(() => commandApi.updateProject(p.id, { status: e.target.value }))}>{STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select></Field>
            <Field label="Priority"><select className={inputCls} disabled={!canEdit} value={p.priority} onChange={(e) => void run(() => commandApi.updateProject(p.id, { priority: e.target.value }))}>{PRIORITIES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select></Field>
            <Field label="Deadline"><input type="date" className={inputCls} disabled={!canEdit} defaultValue={p.deadline ?? ""} onBlur={(e) => e.target.value !== (p.deadline ?? "") && void run(() => commandApi.updateProject(p.id, { deadline: e.target.value || null }))} /></Field>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted-foreground">Progress</dt><dd>{health?.progress !== null && health?.progress !== undefined ? `${Math.round(health.progress * 100)}% (${health.doneTasks} of ${health.doneTasks + health.openTasks} tasks)` : "No task yet"}</dd>
            <dt className="text-muted-foreground">Time used</dt><dd>{health?.plannedProgress !== null && health?.plannedProgress !== undefined ? `${Math.round(health.plannedProgress * 100)}%` : "Needs start and deadline"}</dd>
            <dt className="text-muted-foreground">Budget</dt><dd>{fmtAmount(p.budget, p.currency)}</dd>
            <dt className="text-muted-foreground">Estimated cost</dt><dd>{fmtAmount(p.estimated_cost, p.currency)}</dd>
            <dt className="text-muted-foreground">Actual cost</dt><dd>{canAdmin ? <MoneyLines money={health?.actualCost} empty="No expense recorded" /> : "Brand admins only"}</dd>
            <dt className="text-muted-foreground">Contract</dt><dd>{p.contract_signed_on ? `${fmtAmount(p.contract_value, p.currency)}, signed ${fmtDate(p.contract_signed_on)}` : "Not recorded"}</dd>
          </dl>
          {canEdit && !p.contract_signed_on && p.currency && (
            <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); void run(() => commandApi.updateProject(p.id, { contract_value: String(fd.get("v")), contract_signed_on: String(fd.get("d")) })); }}>
              <Field label={`Contract value (${p.currency})`}><input name="v" required inputMode="decimal" pattern="\d+(\.\d{1,2})?" className={inputCls} /></Field>
              <Field label="Signed on"><input name="d" type="date" required className={inputCls} /></Field>
              <Button type="submit" size="sm" variant="outline">Record the signed contract</Button>
            </form>
          )}
          {canAdmin && <Link className="text-xs underline" to={link("finance", { project: p.id })}>Invoices, payments and expenses of this project</Link>}
        </div>
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Milestones</h3>
          <ul className="mb-2 space-y-1 text-sm">
            {(milestones.value ?? []).map((m) => (
              <li key={m.id} className="flex items-center gap-2">
                <button type="button" disabled={!canEdit} aria-pressed={!!m.completed_at} aria-label={`${m.completed_at ? "Reopen" : "Complete"} ${m.title}`} onClick={() => void run(() => commandApi.setMilestoneDone(m.id, !m.completed_at))}
                  className={cn("flex h-5 w-5 items-center justify-center rounded border", m.completed_at ? "border-emerald-400 bg-emerald-500/20" : "border-border")}>{m.completed_at && <Check className="h-3 w-3" />}</button>
                <span className={cn(m.completed_at && "text-muted-foreground line-through")}>{m.title}</span>
                <span className={cn("ml-auto text-xs", !m.completed_at && m.due_date && m.due_date < today ? "text-rose-300" : "text-muted-foreground")}>{fmtDate(m.due_date)}</span>
              </li>
            ))}
          </ul>
          {canEdit && (
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void run(() => commandApi.addMilestone({ project_id: p.id, brand_id: p.brand_id, title: ms.title, due_date: ms.due_date || null })).then(() => setMs({ title: "", due_date: "" })); }}>
              <input aria-label="Milestone" className={inputCls} placeholder="New milestone" value={ms.title} onChange={(e) => setMs({ ...ms, title: e.target.value })} required />
              <input aria-label="Due date" type="date" className={cn(inputCls, "w-40")} value={ms.due_date} onChange={(e) => setMs({ ...ms, due_date: e.target.value })} />
              <Button type="submit" size="sm" variant="outline">Add</Button>
            </form>
          )}
        </div>
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tasks and deliverables</h3>
          <ul className="mb-2 space-y-1 text-sm">
            {(tasks.value ?? []).map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-2">
                <select aria-label={`Status of ${t.title}`} disabled={!canEdit} className="h-7 rounded border border-input bg-background px-1 text-xs" value={t.status} onChange={(e) => void run(() => commandApi.updateTask(t.id, { status: e.target.value }))}>
                  {["todo", "in_progress", "blocked", "done"].map((s) => <option key={s} value={s}>{label(s)}</option>)}
                </select>
                <span className={cn(t.status === "done" && "text-muted-foreground line-through")}>{t.title}</span>
                {t.kind === "deliverable" && <Pill tone="info">Deliverable</Pill>}
                <span className={cn("ml-auto text-xs", t.status !== "done" && t.due_date && t.due_date < today ? "text-rose-300" : "text-muted-foreground")}>{fmtDate(t.due_date)}</span>
              </li>
            ))}
          </ul>
          {canEdit && (
            <form className="grid gap-2 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void run(() => commandApi.addTask({ project_id: p.id, brand_id: p.brand_id, title: task.title, kind: task.kind, due_date: task.due_date || null, milestone_id: task.milestone_id || null, priority: task.priority })).then(() => setTask({ ...task, title: "" })); }}>
              <input aria-label="Task" className={cn(inputCls, "sm:col-span-2")} placeholder="New task or deliverable" value={task.title} onChange={(e) => setTask({ ...task, title: e.target.value })} required />
              <select aria-label="Kind" className={inputCls} value={task.kind} onChange={(e) => setTask({ ...task, kind: e.target.value })}><option value="task">Task</option><option value="deliverable">Deliverable</option></select>
              <input aria-label="Due date" type="date" className={inputCls} value={task.due_date} onChange={(e) => setTask({ ...task, due_date: e.target.value })} />
              <select aria-label="Milestone" className={inputCls} value={task.milestone_id} onChange={(e) => setTask({ ...task, milestone_id: e.target.value })}><option value="">No milestone</option>{(milestones.value ?? []).map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</select>
              <Button type="submit" size="sm" variant="outline">Add</Button>
            </form>
          )}
        </div>
      </div>
      {err && <p role="alert" className="mt-3 text-sm text-rose-300">{err}</p>}
    </Panel>
  );
};

const Timeline = ({ projects, open }: { projects: Project[]; open: (id: string) => void }) => {
  const { today } = useCommand();
  const dated = projects.filter((p) => p.start_date || p.deadline);
  if (!dated.length) return <Empty title="No project has dates yet">Add a start date and a deadline to see projects on the timeline.</Empty>;
  const start = [today, ...dated.map((p) => p.start_date ?? p.deadline!)].sort()[0]!;
  const end = [addDays(today, 30), ...dated.map((p) => p.deadline ?? p.start_date!)].sort().reverse()[0]!;
  const span = Math.max(1, daysBetween(start, end));
  const pos = (d: string) => `${(100 * daysBetween(start, d)) / span}%`;
  return (
    <div className="space-y-1.5" role="list" aria-label="Project timeline">
      <div className="relative ml-[180px] h-5 text-[0.65rem] text-muted-foreground"><span className="absolute" style={{ left: 0 }}>{start}</span><span className="absolute -translate-x-1/2" style={{ left: pos(today) }}>today</span><span className="absolute right-0">{end}</span></div>
      {dated.map((p) => {
        const s = p.start_date ?? p.deadline!;
        const e = p.deadline ?? p.start_date!;
        return (
          <div key={p.id} role="listitem" className="grid grid-cols-[170px_1fr] items-center gap-2.5 text-sm">
            <button type="button" className="truncate text-left hover:underline" onClick={() => open(p.id)}>{p.name}</button>
            <div className="relative h-5 rounded bg-muted/30">
              <span className="absolute top-0 h-full w-px bg-foreground/40" style={{ left: pos(today) }} aria-hidden="true" />
              <span className={cn("absolute top-1 h-3 rounded", p.status === "completed" ? "bg-emerald-400/60" : e < today && p.status !== "cancelled" ? "bg-rose-400/70" : "bg-foreground/60")} style={{ left: pos(s), width: `max(6px, ${(100 * Math.max(0, daysBetween(s, e))) / span}%)` }} title={`${s} to ${e}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const Calendar = ({ projects, open }: { projects: Project[]; open: (id: string) => void }) => {
  const { today, data } = useCommand();
  const [month, setMonth] = useState(today.slice(0, 7));
  const first = `${month}-01`;
  const startDow = (new Date(`${first}T12:00:00Z`).getUTCDay() + 6) % 7;
  const days: string[] = [];
  for (let d = first; d.startsWith(month); d = addDays(d, 1)) days.push(d);
  const deadlines = (d: string) => projects.filter((p) => p.deadline === d);
  const tasksDue = (d: string) => (data?.dataset.tasks ?? []).filter((t) => t.due_date === d && t.status !== "done" && projects.some((p) => p.id === t.project_id));
  const shift = (n: number) => setMonth(addDays(`${month}-15`, n * 30).slice(0, 7));
  return (
    <div>
      <div className="mb-2 flex items-center gap-2"><Button size="sm" variant="outline" onClick={() => shift(-1)} aria-label="Previous month">‹</Button><span className="text-sm font-medium">{month}</span><Button size="sm" variant="outline" onClick={() => shift(1)} aria-label="Next month">›</Button></div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border text-xs">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="bg-card px-2 py-1 text-muted-foreground">{d}</div>)}
        {Array.from({ length: startDow }).map((_, i) => <div key={`e${i}`} className="bg-card/40" />)}
        {days.map((d) => (
          <div key={d} className={cn("min-h-20 bg-card p-1.5", d === today && "ring-1 ring-inset ring-foreground/40")}>
            <div className="mb-1 text-muted-foreground">{Number(d.slice(8))}</div>
            {deadlines(d).map((p) => <button key={p.id} type="button" onClick={() => open(p.id)} className="mb-0.5 block w-full truncate rounded bg-rose-500/15 px-1 text-left text-rose-200">⚑ {p.name}</button>)}
            {tasksDue(d).length > 0 && <div className="text-muted-foreground">{tasksDue(d).length} task{tasksDue(d).length > 1 ? "s" : ""} due</div>}
          </div>
        ))}
      </div>
    </div>
  );
};

const Projects = () => {
  const { scope, canEdit, brandName, mode, today, reload: reloadAll, data, link } = useCommand();
  const [params, setParams] = useSearchParams();
  const all = useAsync(() => commandApi.projects(scope), [JSON.stringify(scope.brandIds)]);
  const health = useHealth();
  const [adding, setAdding] = useState(false);
  const view = (params.get("view") ?? "list") as (typeof VIEWS)[number][0];
  const set = (k: string, v: string) => { const n = new URLSearchParams(params); if (v) n.set(k, v); else n.delete(k); setParams(n, { replace: true }); };
  const status = params.get("status") ?? "";
  const filter = params.get("filter") ?? "";
  const tasks = data?.dataset.tasks ?? [];
  const projects = useMemo(() => (all.value ?? []).filter((p) => {
    if (status && p.status !== status) return false;
    const live = p.status !== "completed" && p.status !== "cancelled";
    if (filter === "overdue") return live && !!p.deadline && p.deadline < today;
    if (filter === "due_soon") return live && !!p.deadline && p.deadline >= today && daysBetween(today, p.deadline) <= 14;
    if (filter === "attention") { const h = health(p); return !!h && (h.health === "at_risk" || h.health === "off_track"); }
    if (filter === "overdue_tasks") return tasks.some((t) => t.project_id === p.id && t.status !== "done" && t.due_date && t.due_date < today);
    if (filter === "open_tasks") return tasks.some((t) => t.project_id === p.id && t.status !== "done");
    return true;
  }), [all.value, status, filter, today, tasks]); // eslint-disable-line react-hooks/exhaustive-deps
  const open = (all.value ?? []).find((p) => p.id === params.get("id"));
  const FILTERS: Record<string, string> = { overdue: "Overdue projects", due_soon: "Deadline within 14 days", attention: "At risk or off track", overdue_tasks: "With overdue tasks", open_tasks: "With open tasks" };
  return (
    <div className="space-y-4">
      {all.error && <ErrorBox message={all.error} onRetry={all.reload} />}
      {open && <ProjectWorkspace project={open} onClose={() => set("id", "")} onChanged={all.reload} />}
      <Panel title={`Projects (${projects.length})`}
        description={filter || status ? `Filtered: ${[FILTERS[filter], status && label(status)].filter(Boolean).join(", ")}` : "Health uses the documented rules: deadline, overdue tasks, missed milestones, progress against time, budget use."}
        actions={<>
          {(filter || status) && <Button size="sm" variant="ghost" onClick={() => { const n = new URLSearchParams(params); n.delete("filter"); n.delete("status"); setParams(n, { replace: true }); }}>Clear filter</Button>}
          <div className="flex rounded-md border border-border p-0.5" role="tablist" aria-label="Project view">
            {VIEWS.map(([v, l]) => <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => set("view", v)} className={cn("rounded px-2.5 py-1 text-xs", view === v ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>{l}</button>)}
          </div>
          {canEdit && !adding && <Button size="sm" onClick={() => setAdding(true)} className="gap-1.5"><Plus className="h-3.5 w-3.5" aria-hidden="true" /> New project</Button>}
        </>}>
        {adding && <div className="mb-4"><NewProject onDone={() => { setAdding(false); all.reload(); reloadAll(); }} /></div>}
        {!all.value ? <p className="text-sm text-muted-foreground" role="status">Loading…</p> : projects.length === 0 ? <Empty title={all.value.length ? "No project matches this filter" : "No project yet"}>{all.value.length ? "" : "Create a project, or convert a won lead in CRM."}</Empty> : view === "board" ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {STATUSES.map((s) => (
              <section key={s} aria-label={label(s)} className="w-64 shrink-0 rounded-lg border border-border bg-background/40">
                <h3 className="flex justify-between border-b border-border/70 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label(s)}<span>{projects.filter((p) => p.status === s).length}</span></h3>
                <ul className="space-y-2 p-2">
                  {projects.filter((p) => p.status === s).map((p) => (
                    <li key={p.id} className="rounded-md border border-border bg-card/60 p-2 text-sm">
                      <button type="button" className="text-left font-medium hover:underline" onClick={() => set("id", p.id)}>{p.name}</button>
                      <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground"><HealthPill h={health(p)} />{fmtDate(p.deadline)}</div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : view === "timeline" ? <Timeline projects={projects} open={(id) => set("id", id)} /> : view === "calendar" ? <Calendar projects={projects} open={(id) => set("id", id)} /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground"><tr>{["Project", ...(mode === "global" ? ["Brand"] : []), "Status", "Health", "Progress", "Deadline", "Budget"].map((h) => <th key={h} scope="col" className="px-2 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {projects.map((p) => {
                  const h = health(p);
                  return (
                    <tr key={p.id} className="border-t border-border/60 hover:bg-muted/20">
                      <th scope="row" className="px-2 py-2 font-medium"><button type="button" className="text-left hover:underline" onClick={() => set("id", p.id)}>{p.name}</button></th>
                      {mode === "global" && <td className="px-2 py-2 text-muted-foreground">{brandName(p.brand_id)}</td>}
                      <td className="px-2 py-2"><StatusPill status={p.status} /></td>
                      <td className="px-2 py-2"><HealthPill h={h} /></td>
                      <td className="px-2 py-2 tabular-nums">{h?.progress !== null && h?.progress !== undefined ? `${Math.round(h.progress * 100)}%` : "—"}</td>
                      <td className={cn("px-2 py-2", p.deadline && p.deadline < today && p.status !== "completed" && p.status !== "cancelled" && "text-rose-300")}>{fmtDate(p.deadline)}</td>
                      <td className="px-2 py-2 tabular-nums">{fmtAmount(p.budget, p.currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <p className="text-xs text-muted-foreground">Clients and leads: <Link className="underline" to={link("crm")}>CRM</Link>.</p>
    </div>
  );
};

export default Projects;
