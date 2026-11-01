import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { knowledgeOsApi, type KosResult } from "@/services/knowledgeOs";
import { Pill, Section } from "../ui";
import { inputCls, useKosBrands } from "./shared";

// Knowledge access test (docs/knowledge-os.md section 11): what an identity would retrieve, computed by the database.
// Super admins may simulate anyone; brand admins only the public, a client of their brand or their brand's admin.
// A simulation grants nothing. "Compare with a draft" shows the results before and after a draft change.

const Results = ({ title, r }: { title: string; r: { results: KosResult[]; note: string | null } | null }) => (
  <Section title={title}>
    {!r ? <p className="text-xs text-muted-foreground">Run a test.</p> : (
      <div className="space-y-2">
        {r.note && <p className="text-xs text-muted-foreground">{r.note}</p>}
        {r.results.length === 0 ? <p className="text-sm">No private document would be retrieved.</p> : (
          <ol className="space-y-2">{r.results.map((x) => (
            <li key={x.document_id} className="rounded-md border border-border p-2">
              <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{x.title}</span><Pill tone="neutral">{x.visibility}</Pill><span className="text-[0.7rem] text-muted-foreground">relevance {Number(x.score).toFixed(3)} · v{x.version} · {x.brand}</span></div>
              <p className="mt-1 text-xs text-muted-foreground">Why: {x.why}</p>
              <p className="mt-1 text-sm">{x.section}</p>
            </li>))}</ol>
        )}
      </div>
    )}
  </Section>
);

const AccessTest = () => {
  const { brands, isSuperAdmin } = useKosBrands();
  const [f, setF] = useState({ q: "", role: "client", brand: "", contact: "", draft: "" });
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [drafts, setDrafts] = useState<{ id: string; title: string }[]>([]);
  const [before, setBefore] = useState<{ results: KosResult[]; note: string | null } | null>(null);
  const [after, setAfter] = useState<{ results: KosResult[]; note: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (brands && !f.brand && brands[0]) setF((x) => ({ ...x, brand: brands[0]!.id })); }, [brands, f.brand]);
  useEffect(() => { if (f.brand) knowledgeOsApi.clients(f.brand).then(setClients).catch(() => setClients([])); }, [f.brand]);
  useEffect(() => { knowledgeOsApi.list({ status: "draft" }).then((r) => setDrafts(r.rows.map((d) => ({ id: d.id, title: d.title })))).catch(() => setDrafts([])); }, []);
  if (!brands) return <p className="text-muted-foreground" role="status">Loading…</p>;
  const run = async () => {
    setError(null); setBefore(null); setAfter(null);
    try {
      const args = [f.q, f.role, f.role === "public" || f.role === "super" ? null : f.brand || null, f.role === "client" ? f.contact || null : null] as const;
      setBefore(await knowledgeOsApi.simulate(...args, null));
      if (f.draft) setAfter(await knowledgeOsApi.simulate(...args, f.draft));
    } catch (e) { setError(e instanceof Error ? e.message : "The test could not run."); }
  };
  return (
    <div className="space-y-4">
      <div><h2 className="font-display text-lg font-semibold">Knowledge access test</h2><p className="text-xs text-muted-foreground">See what an identity's assistant would retrieve from the private library. The public assistant only uses published public notes (try it in the AI Playground).</p></div>
      <Section title="Test">
        <div className="grid gap-2 md:grid-cols-4">
          <label className="text-xs"><span className="mb-1 block text-muted-foreground">Identity</span><select aria-label="Identity" className={inputCls} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
            <option value="public">Public visitor</option><option value="client">A client of the brand</option><option value="brand_admin">The brand's admin</option>{isSuperAdmin && <option value="super">Super admin</option>}</select></label>
          {(f.role === "client" || f.role === "brand_admin") && <label className="text-xs"><span className="mb-1 block text-muted-foreground">Brand</span><select aria-label="Test brand" className={inputCls} value={f.brand} onChange={(e) => setF({ ...f, brand: e.target.value, contact: "" })}>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>}
          {f.role === "client" && <label className="text-xs"><span className="mb-1 block text-muted-foreground">Client</span><select aria-label="Test client" className={inputCls} value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })}><option value="">Choose…</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
          <label className="text-xs"><span className="mb-1 block text-muted-foreground">Compare with a draft (optional)</span><select aria-label="Draft under test" className={inputCls} value={f.draft} onChange={(e) => setF({ ...f, draft: e.target.value })}><option value="">None</option>{drafts.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}</select></label>
        </div>
        <div className="mt-2 flex gap-2"><input aria-label="Question" className={inputCls} value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="A question this identity might ask" /><Button size="sm" className="h-9" disabled={!f.q.trim() || (f.role === "client" && !f.contact)} onClick={() => void run()}>Test</Button></div>
        {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
        <p className="mt-2 text-[0.7rem] text-muted-foreground">Testing grants no access. Brand admins can test only their own brands.</p>
      </Section>
      <div className={f.draft ? "grid gap-4 lg:grid-cols-2" : ""}>
        <Results title={f.draft ? "Now (published knowledge)" : "Retrieved"} r={before} />
        {f.draft && <Results title="With the draft published" r={after} />}
      </div>
    </div>
  );
};

export default AccessTest;
