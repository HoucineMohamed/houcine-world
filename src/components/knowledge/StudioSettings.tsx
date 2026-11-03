import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, ShieldCheck, Github, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { studioApi, StudioError } from "@/services/knowledgeStudio";
import { BRAND_LABELS, readNote, writeNote, listOf, today } from "@/lib/knowledge/note";
import { useStudio } from "./StudioContext";
import { Section, TokenWarning } from "./ui";

/** Matches TOKEN_WARNING_DAYS in supabase/functions/knowledge-studio/core.ts (the server decides when to warn). */
const TOKEN_WARNING_DAYS = 14;

// Settings: what each AI agent may read (AI access) and the state of the publishing setup. AI access is itself a note
// (houcine-world-brain/agents/<agent>.md): changing it here saves a draft of that note, published like any other
// change, recorded in the activity log, and enforced by the agent's retrieval on the server. Whatever is chosen here,
// internal and restricted notes are never available to an AI: only public notes are ever compiled into its index.

const AGENT_ID = "la-rosa-view-concierge";
const AGENT_PATH = "agents/la-rosa-view-concierge.md";

const StudioSettings = () => {
  const { state, reload } = useStudio();
  const navigate = useNavigate();
  const access = state?.agents[AGENT_ID];
  const [brands, setBrands] = useState<string[]>([]);
  const [referral, setReferral] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const draftPending = state?.drafts.some((d) => d.path === AGENT_PATH);

  useEffect(() => {
    if (access) {
      setBrands(access.brands);
      setReferral(access.referralBrands);
    }
  }, [access]);

  const toggle = (list: string[], set: (v: string[]) => void, b: string) => set(list.includes(b) ? list.filter((x) => x !== b) : [...list, b]);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const note = await studioApi.note(AGENT_PATH);
      const current = note.draft?.content ?? note.content ?? "";
      const parsed = readNote(current, AGENT_PATH);
      const fields = { ...parsed.fields, brands, referral_brands: referral.filter((b) => !brands.includes(b)), updated: today() };
      await studioApi.saveDraft({ path: AGENT_PATH, content: writeNote(fields, parsed.body), expectedVersion: note.draft?.version ?? null, baseSha: note.sha });
      await reload();
      setMessage("Saved as a draft. Publish it to apply the new access to the concierge.");
    } catch (e) {
      setMessage(e instanceof StudioError ? e.message : "Could not save the access change.");
    } finally {
      setSaving(false);
    }
  };

  if (!state) return null;
  const changed = access && (JSON.stringify([...brands].sort()) !== JSON.stringify([...access.brands].sort()) || JSON.stringify([...referral].sort()) !== JSON.stringify([...access.referralBrands].sort()));

  return (
    <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-2">
      <Section title="AI access · La Rosa View Concierge" className="lg:col-span-2">
        {!access ? (
          <p className="text-sm text-muted-foreground">No access note is compiled for this agent; it uses its built-in defaults.</p>
        ) : (
          <div className="space-y-4 text-sm">
            <p className="flex items-start gap-2 text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" /> Only PUBLIC notes can ever reach the concierge. These choices narrow which public notes it may read. They are enforced by its search on the server.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr><th className="py-1 pr-4 font-medium">Brand</th><th className="py-1 pr-4 font-medium">Full access to its public notes</th><th className="py-1 font-medium">Overview only (to point visitors)</th></tr>
                </thead>
                <tbody>
                  {Object.entries(BRAND_LABELS).map(([b, label]) => (
                    <tr key={b} className="border-t border-border/60">
                      <td className="py-1.5 pr-4">{label}</td>
                      <td className="py-1.5 pr-4"><input type="checkbox" aria-label={`Full access: ${label}`} checked={brands.includes(b)} onChange={() => toggle(brands, setBrands, b)} className="h-4 w-4 accent-emerald-400" /></td>
                      <td className="py-1.5"><input type="checkbox" aria-label={`Overview only: ${label}`} checked={referral.includes(b) && !brands.includes(b)} disabled={brands.includes(b)} onChange={() => toggle(referral, setReferral, b)} className="h-4 w-4 accent-primary" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" disabled={!changed || saving || !state.canPublish || brands.length === 0} onClick={() => void save()}>{saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}Save access change as draft</Button>
              <Button size="sm" variant="ghost" onClick={() => navigate(`/workspace/knowledge/notes?path=${encodeURIComponent(AGENT_PATH)}`)}>Open the access note</Button>
              {draftPending && <span className="text-xs text-amber-200">An access change is waiting to be published.</span>}
              {message && <span className="text-xs text-muted-foreground" role="status">{message}</span>}
            </div>
          </div>
        )}
      </Section>

      <Section title="Publishing">
        <div className="space-y-2 text-sm">
          <p className="flex items-center gap-2"><Github className="h-4 w-4" aria-hidden="true" /> {state.mode === "github" ? (state.canPublish ? "Connected to the knowledge repository: publishing works." : `The repository could not be read (${state.repoProblem}).`) : "Read-only: the KNOWLEDGE_GITHUB_TOKEN secret is not set."}</p>
          {state.head && <p className="text-xs text-muted-foreground">Branch head <code>{state.head.slice(0, 7)}</code></p>}
          {state.token && (
            <>
              <TokenWarning token={state.token} />
              <p className="text-xs text-muted-foreground">
                {state.token.expiresAt
                  ? `The token expires on ${new Date(state.token.expiresAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}. The Studio warns ${TOKEN_WARNING_DAYS} days before.`
                  : "GitHub did not say when the token expires: check the date you noted when you created it."}
              </p>
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer text-foreground/80">How to replace the token</summary>
                <ol className="mt-1 list-decimal space-y-0.5 pl-5">
                  <li>On GitHub: your picture, Settings, Developer settings, Personal access tokens, Fine-grained tokens, Generate new token.</li>
                  <li>Only the houcine-world repository; Contents: Read and write; Actions: Read and write. Note the expiry date.</li>
                  <li>In supabase.com/dashboard: the project, Edge Functions, Secrets, edit KNOWLEDGE_GITHUB_TOKEN and paste the new token.</li>
                  <li>Delete the old token on GitHub. Reload this page: it should say "publishing works".</li>
                </ol>
              </details>
            </>
          )}
          <p className="text-xs text-muted-foreground">Publishing commits the notes and the rebuilt index to the main branch; the “Deploy Supabase” workflow then updates the AI. Setup steps: docs/knowledge-studio.md.</p>
        </div>
      </Section>

      <Section title="AI index">
        <div className="space-y-1 text-sm">
          <p className="flex items-center gap-2"><Cpu className="h-4 w-4" aria-hidden="true" /> Published notes give index <code>{state.index.expected ?? "—"}</code></p>
          <p className="text-xs text-muted-foreground">The live concierge serves <code>{state.index.live ?? "unreachable"}</code>; this Studio was deployed with <code>{state.index.bundled}</code>.</p>
          <p className="text-xs text-muted-foreground">{state.index.notes} public notes, {state.index.passages} passages. See <Link to="/workspace/knowledge/activity" className="underline">Activity</Link> for every update.</p>
        </div>
      </Section>
    </div>
  );
};

export default StudioSettings;
