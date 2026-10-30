import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { studioApi, StudioError, type CoverageReport, type CoverageResult } from "@/services/knowledgeStudio";
import { useStudio } from "./StudioContext";
import { BrandDot, brandLabel, Pill } from "./ui";

// Coverage: a fixed list of real visitor questions per brand, searched WITHOUT any AI call against the published
// knowledge (or a preview with the drafts). Shows per brand how many questions find the passage that answers them,
// the known gaps, and the score kept with each publication. Read only: it changes nothing and costs nothing.

const RESULT: Record<CoverageResult, { tone: "published" | "pending" | "neutral" | "out"; label: string; help: string }> = {
  answered: { tone: "published", label: "Answered", help: "The search finds the passage that states the answer." },
  awaiting: { tone: "pending", label: "Awaiting confirmation", help: "The search finds the passage that says this is not published yet (the honest answer until the owner confirms)." },
  gap: { tone: "neutral", label: "Known gap", help: "No note answers this yet; the reason says where the fact would come from." },
  not_found: { tone: "out", label: "Not found", help: "A note should answer this, but the search does not find it from the visitor's words." },
};

const ResultPill = ({ result }: { result: CoverageResult }) => <Pill tone={RESULT[result].tone} title={RESULT[result].help}>{RESULT[result].label}</Pill>;

const Coverage = ({ source, initialBrand = null }: { source: "live" | "preview"; initialBrand?: string | null }) => {
  const navigate = useNavigate();
  const { state } = useStudio();
  const [report, setReport] = useState<CoverageReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [brand, setBrand] = useState<string | null>(initialBrand);

  const load = async () => {
    setBusy(true);
    setError(null);
    try {
      setReport(await studioApi.coverage(source));
    } catch (e) {
      setError(e instanceof StudioError ? e.message : "The coverage could not be computed.");
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  const open = (noteId: string) => {
    const n = state?.notes.find((x) => x.id === noteId);
    if (n) navigate(`/workspace/knowledge/notes?path=${encodeURIComponent(n.path)}`);
  };

  const questions = report?.questions.filter((q) => !brand || q.brand === brand) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <p className="flex-1">
          Real visitor questions, searched without any AI call {source === "live" ? "in the published knowledge (what visitors get)" : "in a preview with your drafts"}.
          The concierge also rewrites questions before searching, so it usually finds a little more than this score.
        </p>
        <Button size="sm" variant="ghost" onClick={() => void load()} disabled={busy} className="gap-1.5">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />} Check again
        </Button>
      </div>
      {error && <p className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300" role="alert">{error}</p>}
      {!report && !error && <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Checking…</p>}
      {report && (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <caption className="sr-only">Coverage per brand</caption>
              <thead className="bg-muted/30 text-muted-foreground">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">Brand</th>
                  <th scope="col" className="px-3 py-2 font-medium">Questions</th>
                  <th scope="col" className="px-3 py-2 font-medium">Answered</th>
                  <th scope="col" className="px-3 py-2 font-medium">Awaiting confirmation</th>
                  <th scope="col" className="px-3 py-2 font-medium">Known gaps</th>
                  <th scope="col" className="px-3 py-2 font-medium">Not found</th>
                  <th scope="col" className="px-3 py-2 font-medium" title="Questions the public La Rosa View Concierge can reach with its access (other brands: overview only).">Concierge reaches</th>
                </tr>
              </thead>
              <tbody>
                {report.brands.map((b) => (
                  <tr key={b.brand} className={cn("border-t border-border", brand === b.brand && "bg-violet-500/10")}>
                    <th scope="row" className="px-3 py-2 font-medium">
                      <button type="button" onClick={() => setBrand(brand === b.brand ? null : b.brand)} aria-pressed={brand === b.brand} className="flex items-center gap-1.5 hover:underline">
                        <BrandDot brand={b.brand} /> {brandLabel(b.brand)}
                      </button>
                    </th>
                    <td className="px-3 py-2 tabular-nums">{b.total}</td>
                    <td className="px-3 py-2 tabular-nums">{b.answered}</td>
                    <td className="px-3 py-2 tabular-nums">{b.awaiting}</td>
                    <td className="px-3 py-2 tabular-nums">{b.gap}</td>
                    <td className={cn("px-3 py-2 tabular-nums", b.not_found > 0 && "text-rose-300")}>{b.not_found}</td>
                    <td className="px-3 py-2 tabular-nums">{b.concierge} of {b.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[0.7rem] text-muted-foreground">Index {report.fingerprint}. Click a brand to see only its questions.</p>

          <ol className="space-y-2">
            {questions.map((q) => (
              <li key={q.id} className="rounded-md border border-border p-2 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <BrandDot brand={q.brand} />
                  <span className="font-medium text-foreground">{q.question}</span>
                  <span className="ml-auto flex flex-wrap gap-1">
                    <ResultPill result={q.brand_view} />
                    {q.brand_view !== "gap" && q.concierge_view !== q.brand_view && <Pill tone="neutral" title="The result with the public concierge's own access.">Concierge: {RESULT[q.concierge_view].label.toLowerCase()}</Pill>}
                  </span>
                </div>
                {q.gap && <p className="mt-1 text-muted-foreground">Missing: {q.gap}</p>}
                {q.expect.length > 0 && (
                  <p className="mt-1 text-muted-foreground">
                    Answered by:{" "}
                    {q.expect.map((e, i) => {
                      const id = e.split("#")[0]!;
                      return (
                        <span key={e}>
                          {i > 0 && ", "}
                          <button type="button" onClick={() => open(id)} className={cn("hover:underline", q.found.some((f) => f.startsWith(`${id}#`)) ? "text-violet-300" : "text-muted-foreground")}>{e.replace("#", " › ")}</button>
                        </span>
                      );
                    })}
                    {q.unknown.length > 0 && <span className="text-rose-300"> (not in the published notes: {q.unknown.join(", ")})</span>}
                  </p>
                )}
                {q.brand_view === "not_found" && q.top.length > 0 && (
                  <p className="mt-1 text-muted-foreground">The search found instead: {q.top.map((t) => `${t.note} › ${t.section}`).join("; ")}</p>
                )}
              </li>
            ))}
          </ol>

          <div className="rounded-lg border border-border p-3 text-xs">
            <p className="mb-2 font-semibold text-muted-foreground">Score at each publication (answered / awaiting / gaps / not found)</p>
            {report.trend.length === 0 ? (
              <p className="text-muted-foreground">No publication from the Studio has recorded a score yet.</p>
            ) : (
              <ul className="space-y-1">
                {report.trend.map((t) => (
                  <li key={`${t.at}-${t.fingerprint}`} className="flex flex-wrap gap-x-3 gap-y-1">
                    <span className="tabular-nums text-muted-foreground">{new Date(t.at).toLocaleString()}</span>
                    {Object.entries(t.coverage).map(([b, [answered, awaiting, gap, notFound]]) => (
                      <span key={b} className="flex items-center gap-1"><BrandDot brand={b} /> {answered}/{awaiting}/{gap}/{notFound}</span>
                    ))}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Coverage;
