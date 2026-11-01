import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { knowledgeOsApi, type KosInsights } from "@/services/knowledgeOs";
import { Pill, Section } from "../ui";
import { fmtDay, inputCls, useKosBrands } from "./shared";

// Knowledge Intelligence (docs/knowledge-os.md section 12): computed in the database from the documents the person may
// edit and the retrieval log (ids and counts; question text only for unanswered questions). Suggestions are for human
// review: nothing is merged, deleted or published from here. A gap can become a DRAFT, nothing more.

const Row = ({ to, children }: { to: string; children: React.ReactNode }) => <li><Link className="hover:underline" to={to}>{children}</Link></li>;
const List = ({ items, empty }: { items: React.ReactNode[]; empty: string }) => items.length ? <ul className="space-y-1 text-sm">{items}</ul> : <p className="text-xs text-muted-foreground">{empty}</p>;
const doc = (id: string) => `/workspace/knowledge/library?id=${id}`;

const Insights = () => {
  const { brands, isSuperAdmin } = useKosBrands();
  const [brand, setBrand] = useState("");
  const [s, setS] = useState<KosInsights | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [draftBrand, setDraftBrand] = useState("");
  useEffect(() => { setS(null); knowledgeOsApi.insights(brand || null).then((x) => { setS(x); setError(null); }).catch((e) => setError(e instanceof Error ? e.message : "Could not load.")); }, [brand]);
  useEffect(() => { if (brands && !isSuperAdmin && !draftBrand) setDraftBrand(brands[0]?.id ?? ""); }, [brands, isSuperAdmin, draftBrand]);
  if (error) return <p role="alert" className="text-destructive">{error}</p>;
  if (!s || !brands) return <p className="text-muted-foreground" role="status">Loading…</p>;
  const draftFromGap = async (q: string) => {
    try {
      const id = await knowledgeOsApi.save(null, { title: q.slice(0, 1).toUpperCase() + q.slice(1, 200), content: `Question asked without an answer: "${q}".\n\nWrite the answer here, cite a source, then request a review.`, visibility: "internal", brand_id: draftBrand || null, tags: ["gap"] }, "From a knowledge gap");
      setMsg(`Draft created (internal, not published).`);
      window.location.assign(doc(id));
    } catch (e) { setMsg(e instanceof Error ? e.message : "Could not create the draft."); }
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="font-display text-lg font-semibold">Knowledge intelligence</h2><p className="text-xs text-muted-foreground">How private knowledge is used and where it needs work. Computed {fmtDay(s.computed_at)}; retrievals over 90 days.</p></div>
        <label className="text-xs"><span className="mb-1 block text-muted-foreground">Brand</span><select aria-label="Insights brand" className={inputCls} value={brand} onChange={(e) => setBrand(e.target.value)}><option value="">{isSuperAdmin ? "Everything" : "All my brands"}</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {[["Documents", s.total], ["Live", s.live], ["AI retrievals", s.retrievals], ["Answered", s.answered_pct === null ? "—" : `${s.answered_pct}%`], ["Awaiting review", s.awaiting_review.length], ["Unowned", s.unowned.length]].map(([l, v]) => (
          <div key={String(l)} className="rounded-lg border border-border bg-card/40 p-3"><div className="text-[0.7rem] text-muted-foreground">{l}</div><div className="text-xl font-semibold tabular-nums">{v}</div></div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Section title="By visibility"><ul className="space-y-1 text-sm">{Object.entries(s.by_visibility).map(([k, v]) => <li key={k} className="flex justify-between"><span>{k}</span><span className="tabular-nums">{v}</span></li>)}</ul></Section>
        <Section title="By brand"><ul className="space-y-1 text-sm">{s.by_brand.map((b) => <li key={b.brand_id ?? "g"} className="flex justify-between"><span>{b.brand}</span><span className="tabular-nums">{b.count}</span></li>)}</ul></Section>
        <Section title="AI systems using the library"><ul className="space-y-1 text-sm">{Object.entries(s.by_consumer).length === 0 ? <li className="text-xs text-muted-foreground">No retrieval yet.</li> : Object.entries(s.by_consumer).map(([k, v]) => <li key={k} className="flex justify-between"><span>{k.replace("_", " ")}</span><span className="tabular-nums">{v}</span></li>)}</ul></Section>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Knowledge gaps (asked at least twice, no source found, 30 days)">
          {msg && <p role="status" className="mb-2 text-xs">{msg}</p>}
          {s.gaps.length > 0 && <label className="mb-2 block text-xs"><span className="text-muted-foreground">Drafts go to </span><select aria-label="Gap draft brand" className="h-7 rounded border border-input bg-background px-1 text-xs" value={draftBrand} onChange={(e) => setDraftBrand(e.target.value)}>{isSuperAdmin && <option value="">All brands</option>}{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>}
          <List empty="No repeated unanswered question." items={s.gaps.map((g) => <li key={g.question} className="flex items-center justify-between gap-2"><span>“{g.question}” <span className="text-xs text-muted-foreground">× {g.times}, last {fmtDay(g.last)}</span></span><Button size="sm" variant="outline" className="h-7" onClick={() => void draftFromGap(g.question)}>Draft an answer</Button></li>)} />
        </Section>
        <Section title="Most used by the assistants">
          <List empty="No document retrieved yet." items={s.top_documents.map((t) => <Row key={t.id} to={doc(t.id)}>{t.title} <span className="text-xs text-muted-foreground">× {t.uses} · {t.consumers.join(", ")}</span></Row>)} />
        </Section>
        <Section title="Review overdue · expiring · unowned">
          <List empty="Nothing overdue, expiring or unowned." items={[
            ...s.review_overdue.map((x) => <Row key={`o${x.id}`} to={doc(x.id)}><Pill tone="out">review overdue</Pill> {x.title} <span className="text-xs text-muted-foreground">since {fmtDay(x.review_due)}</span></Row>),
            ...s.expiring.map((x) => <Row key={`e${x.id}`} to={doc(x.id)}><Pill tone="pending">expires</Pill> {x.title} <span className="text-xs text-muted-foreground">{fmtDay(x.expires_on)}</span></Row>),
            ...s.unowned.map((x) => <Row key={`u${x.id}`} to={doc(x.id)}><Pill tone="neutral">no owner</Pill> {x.title}</Row>)]} />
        </Section>
        <Section title="Possible duplicates · broken relations · disconnected · never used">
          <List empty="No issue found." items={[
            ...s.duplicates.map((x) => <li key={`d${x.a}${x.b}`}><Pill tone="pending">similar</Pill> <Link className="hover:underline" to={doc(x.a)}>{x.a_title}</Link> / <Link className="hover:underline" to={doc(x.b)}>{x.b_title}</Link></li>),
            ...s.broken_links.map((x) => <Row key={`b${x.from}${x.to}`} to={doc(x.from)}><Pill tone="out">broken relation</Pill> {x.from_title}</Row>),
            ...s.orphans.slice(0, 10).map((x) => <Row key={`n${x.id}`} to={doc(x.id)}><Pill tone="neutral">no relation</Pill> {x.title}</Row>),
            ...s.unused.slice(0, 10).map((x) => <Row key={`z${x.id}`} to={doc(x.id)}><Pill tone="neutral">never retrieved</Pill> {x.title}</Row>)]} />
          <p className="mt-2 text-[0.7rem] text-muted-foreground">Suggestions only: nothing is merged or deleted automatically. Conflicting statements across documents are not detected yet.</p>
        </Section>
      </div>
    </div>
  );
};

export default Insights;
