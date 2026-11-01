import React, { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { commandApi, type Invoice } from "@/services/command";
import { useCommand } from "./context";
import { attempt, useAsync } from "./useAsync";
import { Empty, ErrorBox, Field, fmtAmount, fmtDate, inputCls, Kpi, label, MoneyLines, Panel, StatusPill } from "./ui";
import { addMoney, cents, CURRENCIES, invoiceBalance, invoicePaymentStatus, type Currency, type Money } from "../../../supabase/functions/_shared/command/metrics.ts";

// Finance: invoices (invoiced revenue), payments (received revenue), expenses, and their summaries. Every amount keeps
// its currency; EUR and USD are never added. An invoice's payment status is derived from its payments. Visible to
// brand admins and super admins only (enforced by the database). No payment is ever initiated from here.

const TABS = [["summary", "Summary"], ["invoices", "Invoices"], ["payments", "Payments"], ["expenses", "Expenses"], ["clients", "By client"], ["projects", "By project"]] as const;
const money = (amount: string, currency: Currency): Money => ({ [currency]: cents(amount) });

const useFinance = () => {
  const { scope } = useCommand();
  const key = [JSON.stringify(scope.brandIds)];
  const invoices = useAsync(() => commandApi.invoices(scope), key);
  const payments = useAsync(() => commandApi.payments(scope), key);
  const expenses = useAsync(() => commandApi.expenses(scope), key);
  const projects = useAsync(() => commandApi.projects(scope), key);
  const contacts = useAsync(() => commandApi.contacts(), key);
  const links = useAsync(() => commandApi.contactBrands(scope), key);
  return { invoices, payments, expenses, projects, contacts, links, reload: () => { invoices.reload(); payments.reload(); expenses.reload(); }, error: invoices.error ?? payments.error ?? expenses.error };
};

const AmountCurrency = ({ amount, currency, onAmount, onCurrency, fixed }: { amount: string; currency: string; onAmount: (v: string) => void; onCurrency: (v: string) => void; fixed?: string }) => (
  <>
    <Field label="Amount"><input inputMode="decimal" pattern="\d+(\.\d{1,2})?" required className={inputCls} value={amount} onChange={(e) => onAmount(e.target.value)} /></Field>
    <Field label="Currency"><select className={inputCls} value={fixed ?? currency} disabled={!!fixed} onChange={(e) => onCurrency(e.target.value)}><option>EUR</option><option>USD</option></select></Field>
  </>
);

const Forms = ({ f, kind, onDone }: { f: ReturnType<typeof useFinance>; kind: "invoice" | "payment" | "expense"; onDone: () => void }) => {
  const { scopeBrands, reload, today } = useCommand();
  const [v, setV] = useState({ brand_id: scopeBrands.length === 1 ? scopeBrands[0]!.id : "", number: "", contact_id: "", project_id: "", invoice_id: "", issue_date: today, due_date: "", amount: "", currency: "EUR", status: "sent", date: today, method: "", category: "", vendor: "", description: "" });
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });
  const brandContacts = (f.contacts.value ?? []).filter((c) => (f.links.value ?? []).some((l) => l.contact_id === c.id && l.brand_id === v.brand_id));
  const brandProjects = (f.projects.value ?? []).filter((p) => p.brand_id === v.brand_id);
  const openInvoices = (f.invoices.value ?? []).filter((i) => i.brand_id === v.brand_id && i.status === "sent" && invoiceBalance(i as never, (f.payments.value ?? []) as never, "9999-12-31") > 0);
  const inv = openInvoices.find((i) => i.id === v.invoice_id);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const common = { brand_id: v.brand_id, project_id: v.project_id || null, description: v.description || null, category: v.category || null };
    const error = await attempt(() =>
      kind === "invoice" ? commandApi.createInvoice({ ...common, number: v.number, contact_id: v.contact_id || null, issue_date: v.issue_date, due_date: v.due_date || null, amount: v.amount, currency: v.currency as Currency, status: v.status })
      : kind === "payment" ? commandApi.recordPayment({ ...common, invoice_id: v.invoice_id || null, contact_id: (inv?.contact_id ?? v.contact_id) || null, project_id: (inv?.project_id ?? v.project_id) || null, amount: v.amount, currency: (inv?.currency ?? v.currency) as Currency, received_on: v.date, method: v.method || null })
      : commandApi.recordExpense({ ...common, amount: v.amount, currency: v.currency as Currency, incurred_on: v.date, vendor: v.vendor || null }));
    if (error) return setErr(error);
    f.reload();
    reload();
    onDone();
  };
  return (
    <form onSubmit={submit} className="mb-4 grid gap-3 rounded-lg border border-border p-3 md:grid-cols-4">
      <Field label="Brand"><select className={inputCls} value={v.brand_id} onChange={set("brand_id")} required><option value="">Choose a brand</option>{scopeBrands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
      {kind === "invoice" && <>
        <Field label="Invoice number"><input className={inputCls} value={v.number} onChange={set("number")} required maxLength={60} /></Field>
        <Field label="Client"><select className={inputCls} value={v.contact_id} onChange={set("contact_id")}><option value="">None</option>{brandContacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="Status"><select className={inputCls} value={v.status} onChange={set("status")}><option value="draft">Draft (not counted)</option><option value="sent">Sent</option></select></Field>
        <Field label="Issued"><input type="date" required className={inputCls} value={v.issue_date} onChange={set("issue_date")} /></Field>
        <Field label="Due"><input type="date" className={inputCls} value={v.due_date} onChange={set("due_date")} /></Field>
      </>}
      {kind === "payment" && <>
        <Field label="Invoice (optional)"><select className={inputCls} value={v.invoice_id} onChange={set("invoice_id")}><option value="">No invoice</option>{openInvoices.map((i) => <option key={i.id} value={i.id}>{i.number} · {fmtAmount(i.amount, i.currency)}</option>)}</select></Field>
        {!inv && <Field label="Client"><select className={inputCls} value={v.contact_id} onChange={set("contact_id")}><option value="">None</option>{brandContacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>}
        <Field label="Received on"><input type="date" required className={inputCls} value={v.date} onChange={set("date")} /></Field>
        <Field label="Method"><input className={inputCls} value={v.method} onChange={set("method")} maxLength={60} placeholder="Bank transfer…" /></Field>
      </>}
      {kind === "expense" && <>
        <Field label="Incurred on"><input type="date" required className={inputCls} value={v.date} onChange={set("date")} /></Field>
        <Field label="Vendor"><input className={inputCls} value={v.vendor} onChange={set("vendor")} maxLength={200} /></Field>
      </>}
      <AmountCurrency amount={v.amount} currency={v.currency} fixed={inv?.currency} onAmount={(a) => setV({ ...v, amount: a })} onCurrency={(c) => setV({ ...v, currency: c })} />
      {!inv && <Field label="Project"><select className={inputCls} value={v.project_id} onChange={set("project_id")}><option value="">None</option>{brandProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>}
      <Field label="Category"><input className={inputCls} value={v.category} onChange={set("category")} maxLength={80} /></Field>
      <Field label="Description" className="md:col-span-2"><input className={inputCls} value={v.description} onChange={set("description")} maxLength={2000} /></Field>
      <div className="flex items-end gap-2"><Button type="submit" size="sm" disabled={!v.brand_id}>Save</Button><Button type="button" size="sm" variant="ghost" onClick={onDone}>Cancel</Button></div>
      {err && <p role="alert" className="text-sm text-rose-300 md:col-span-4">{err}</p>}
    </form>
  );
};

const Finance = () => {
  const { canAdmin, snap, mode, brandName, today, link } = useCommand();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") ?? "summary") as (typeof TABS)[number][0];
  const projectFilter = params.get("project");
  const outstandingOnly = params.get("filter") === "outstanding";
  const f = useFinance();
  const [adding, setAdding] = useState<null | "invoice" | "payment" | "expense">(null);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: string, v: string) => { const n = new URLSearchParams(params); if (v) n.set(k, v); else n.delete(k); setParams(n, { replace: true }); };
  const payments = f.payments.value ?? [];
  const contactName = (id: string | null) => (f.contacts.value ?? []).find((c) => c.id === id)?.name ?? "—";
  const projectName = (id: string | null) => (f.projects.value ?? []).find((p) => p.id === id)?.name ?? "—";
  const byProject = <T extends { project_id: string | null }>(rows: T[]) => (projectFilter ? rows.filter((r) => r.project_id === projectFilter) : rows);

  const perClient = useMemo(() => {
    const m = new Map<string, { invoiced: Money; received: Money }>();
    for (const i of (f.invoices.value ?? []).filter((x) => x.status === "sent" && x.contact_id)) {
      const row = m.get(i.contact_id!) ?? { invoiced: {}, received: {} };
      row.invoiced = addMoney(row.invoiced, i.currency, cents(i.amount));
      m.set(i.contact_id!, row);
    }
    for (const p of payments.filter((x) => x.contact_id)) {
      const row = m.get(p.contact_id!) ?? { invoiced: {}, received: {} };
      row.received = addMoney(row.received, p.currency, cents(p.amount));
      m.set(p.contact_id!, row);
    }
    return [...m.entries()];
  }, [f.invoices.value, payments]);

  if (!canAdmin) return <Empty title="Finance is for brand admins">Invoices, payments and expenses are visible to the brand admins of a brand and to super admins. The database refuses them to other roles.</Empty>;
  if (f.error) return <ErrorBox message={f.error} onRetry={f.reload} />;
  if (!f.invoices.value || !f.payments.value || !f.expenses.value) return <p className="text-sm text-muted-foreground" role="status">Loading…</p>;
  const fin = snap?.finance.visible ? snap.finance : null;
  const voidExpense = async (id: string) => { const e = await attempt(() => commandApi.voidExpense(id)); if (e) setErr(e); else f.reload(); };
  const setInvoiceStatus = async (i: Invoice, s: "draft" | "sent" | "void") => { const e = await attempt(() => commandApi.setInvoiceStatus(i.id, s)); if (e) setErr(e); else f.reload(); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Finance">
          {TABS.map(([t, l]) => <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => set("tab", t)} className={cn("rounded-md px-3 py-1.5 text-sm", tab === t ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>{l}</button>)}
        </div>
        <div className="ml-auto flex gap-2">
          {(["invoice", "payment", "expense"] as const).map((k) => <Button key={k} size="sm" variant="outline" className="gap-1.5" onClick={() => setAdding(k)}><Plus className="h-3.5 w-3.5" aria-hidden="true" /> {label(k)}</Button>)}
        </div>
      </div>
      {projectFilter && <p className="text-xs text-muted-foreground">Project: {projectName(projectFilter)} <button type="button" className="underline" onClick={() => set("project", "")}>show all</button></p>}
      {adding && <Forms f={f} kind={adding} onDone={() => setAdding(null)} />}
      {err && <ErrorBox message={err} />}

      {tab === "summary" && fin && (
        <Panel title="Revenue classes" description={`${snap!.period.label}. Pipeline is not revenue; contracted is not invoiced; invoiced is not received.`}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
            <Kpi label="Pipeline (expected)" value={<MoneyLines money={snap!.leads.pipelineValue} empty="—" className="text-lg" />} hint="Open leads' expected values" to={link("crm", { tab: "pipeline" })} />
            <Kpi label="Contracted" value={<MoneyLines money={fin.contracted} empty="—" className="text-lg" />} hint="Signed in the period" />
            <Kpi label="Invoiced" value={<MoneyLines money={fin.invoiced} empty="—" className="text-lg" />} />
            <Kpi label="Received" value={<MoneyLines money={fin.received} empty="—" className="text-lg" />} />
            <Kpi label="Outstanding" value={<MoneyLines money={fin.outstanding} empty="—" className="text-lg" />} hint={`At ${snap!.period.end}`} />
            <Kpi label="Expenses" value={<MoneyLines money={fin.expenses} empty="—" className="text-lg" />} />
            <Kpi label="Estimated profit" value={<MoneyLines money={fin.estimatedProfit.value} empty="—" className="text-lg" />} unavailable={fin.estimatedProfit.unavailable} hint="Received − expenses" />
          </div>
        </Panel>
      )}

      {tab === "invoices" && (
        <Panel title="Invoices" description={outstandingOnly ? "Showing invoices with an amount still due" : "Payment status is worked out from the recorded payments"} actions={outstandingOnly && <Button size="sm" variant="ghost" onClick={() => set("filter", "")}>All invoices</Button>}>
          {byProject(f.invoices.value).length === 0 ? <Empty title="No invoice" /> : (
            <div className="overflow-x-auto"><table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground"><tr>{["Number", ...(mode === "global" ? ["Brand"] : []), "Client", "Issued", "Due", "Amount", "Still due", "Status", ""].map((h) => <th key={h} scope="col" className="px-2 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {byProject(f.invoices.value).filter((i) => !outstandingOnly || (i.status === "sent" && invoiceBalance(i as never, payments as never, today) > 0)).map((i) => {
                  const st = invoicePaymentStatus(i as never, payments as never, today);
                  return (
                    <tr key={i.id} className="border-t border-border/60">
                      <th scope="row" className="px-2 py-2 font-medium">{i.number}</th>
                      {mode === "global" && <td className="px-2 py-2 text-muted-foreground">{brandName(i.brand_id)}</td>}
                      <td className="px-2 py-2">{contactName(i.contact_id)}</td>
                      <td className="px-2 py-2">{fmtDate(i.issue_date)}</td>
                      <td className="px-2 py-2">{fmtDate(i.due_date)}</td>
                      <td className="px-2 py-2 tabular-nums">{fmtAmount(i.amount, i.currency)}</td>
                      <td className="px-2 py-2 tabular-nums">{i.status === "sent" ? <MoneyLines money={{ [i.currency]: invoiceBalance(i as never, payments as never, today) }} /> : "—"}</td>
                      <td className="px-2 py-2"><StatusPill status={st} /></td>
                      <td className="px-2 py-2">
                        {i.status === "draft" && <Button size="sm" variant="ghost" onClick={() => void setInvoiceStatus(i, "sent")}>Mark sent</Button>}
                        {i.status !== "void" && !payments.some((p) => p.invoice_id === i.id) && <Button size="sm" variant="ghost" onClick={() => void setInvoiceStatus(i, "void")}>Void</Button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          )}
        </Panel>
      )}

      {tab === "payments" && (
        <Panel title="Payments received">
          {byProject(payments).length === 0 ? <Empty title="No payment recorded" /> : (
            <div className="overflow-x-auto"><table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground"><tr>{["Received", ...(mode === "global" ? ["Brand"] : []), "Client", "Invoice", "Project", "Method", "Amount"].map((h) => <th key={h} scope="col" className="px-2 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>{byProject(payments).map((p) => (
                <tr key={p.id} className="border-t border-border/60">
                  <td className="px-2 py-2">{fmtDate(p.received_on)}</td>
                  {mode === "global" && <td className="px-2 py-2 text-muted-foreground">{brandName(p.brand_id)}</td>}
                  <td className="px-2 py-2">{contactName(p.contact_id)}</td>
                  <td className="px-2 py-2">{f.invoices.value!.find((i) => i.id === p.invoice_id)?.number ?? "—"}</td>
                  <td className="px-2 py-2">{projectName(p.project_id)}</td>
                  <td className="px-2 py-2 text-muted-foreground">{p.method ?? "—"}</td>
                  <td className="px-2 py-2 tabular-nums">{fmtAmount(p.amount, p.currency)}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </Panel>
      )}

      {tab === "expenses" && (
        <Panel title="Expenses">
          {byProject(f.expenses.value).length === 0 ? <Empty title="No expense recorded" /> : (
            <div className="overflow-x-auto"><table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground"><tr>{["Date", ...(mode === "global" ? ["Brand"] : []), "Category", "Vendor", "Project", "Amount", "Status", ""].map((h) => <th key={h} scope="col" className="px-2 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>{byProject(f.expenses.value).map((x) => (
                <tr key={x.id} className={cn("border-t border-border/60", x.status === "void" && "text-muted-foreground line-through")}>
                  <td className="px-2 py-2">{fmtDate(x.incurred_on)}</td>
                  {mode === "global" && <td className="px-2 py-2">{brandName(x.brand_id)}</td>}
                  <td className="px-2 py-2">{x.category ?? "—"}</td>
                  <td className="px-2 py-2">{x.vendor ?? "—"}</td>
                  <td className="px-2 py-2">{projectName(x.project_id)}</td>
                  <td className="px-2 py-2 tabular-nums">{fmtAmount(x.amount, x.currency)}</td>
                  <td className="px-2 py-2"><StatusPill status={x.status} /></td>
                  <td className="px-2 py-2">{x.status !== "void" && <Button size="sm" variant="ghost" onClick={() => void voidExpense(x.id)}>Void</Button>}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </Panel>
      )}

      {tab === "clients" && (
        <Panel title="Revenue by client" description="All time, per currency">
          {perClient.length === 0 ? <Empty title="No invoice or payment linked to a client" /> : (
            <table className="w-full text-left text-sm"><thead className="text-xs text-muted-foreground"><tr>{["Client", "Invoiced", "Received"].map((h) => <th key={h} scope="col" className="px-2 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>{perClient.map(([id, r]) => <tr key={id} className="border-t border-border/60"><th scope="row" className="px-2 py-2 font-medium">{contactName(id)}</th><td className="px-2 py-2"><MoneyLines money={r.invoiced} empty="—" /></td><td className="px-2 py-2"><MoneyLines money={r.received} empty="—" /></td></tr>)}</tbody></table>
          )}
        </Panel>
      )}

      {tab === "projects" && (
        <Panel title="Project financial performance" description="Budget and estimated cost as entered; actual cost = recorded expenses of the project; received = its payments">
          {(f.projects.value ?? []).length === 0 ? <Empty title="No project" /> : (
            <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs text-muted-foreground"><tr>{["Project", "Budget", "Estimated cost", "Actual cost", "Received", "Estimated vs actual"].map((h) => <th key={h} scope="col" className="px-2 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>{(f.projects.value ?? []).map((p) => {
                let actual: Money = {};
                for (const x of f.expenses.value!.filter((e) => e.project_id === p.id && e.status !== "void")) actual = addMoney(actual, x.currency, cents(x.amount));
                let rec: Money = {};
                for (const x of payments.filter((e) => e.project_id === p.id)) rec = addMoney(rec, x.currency, cents(x.amount));
                const diff = p.currency && p.estimated_cost !== null ? (actual[p.currency] ?? 0) - cents(p.estimated_cost) : null;
                return (
                  <tr key={p.id} className="border-t border-border/60">
                    <th scope="row" className="px-2 py-2 font-medium">{p.name}</th>
                    <td className="px-2 py-2">{fmtAmount(p.budget, p.currency)}</td>
                    <td className="px-2 py-2">{fmtAmount(p.estimated_cost, p.currency)}</td>
                    <td className="px-2 py-2"><MoneyLines money={actual} empty="None recorded" /></td>
                    <td className="px-2 py-2"><MoneyLines money={rec} empty="—" /></td>
                    <td className={cn("px-2 py-2 tabular-nums", diff !== null && diff > 0 && "text-rose-300")}>{diff === null || !p.currency ? "—" : `${diff > 0 ? "+" : ""}${fmtAmount(diff / 100, p.currency)}`}</td>
                  </tr>
                );
              })}</tbody></table></div>
          )}
        </Panel>
      )}
      <p className="text-xs text-muted-foreground">Currencies: {CURRENCIES.join(" and ")}, always shown separately. No conversion and no tax calculation is made here; no payment is ever sent from the Command Center.</p>
    </div>
  );
};

export default Finance;
