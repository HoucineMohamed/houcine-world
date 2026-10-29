import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { studioApi, StudioError, type Publication, type StudioState } from "@/services/knowledgeStudio";

// Shared state of Knowledge Studio's screens: the brain's overview (from the server), the publication in progress and
// its polling, and a few UI actions. A publication is followed until the server reports "live" (the concierge serves
// the new index) or "failed"; the screens never claim success earlier.

export type PublishPhase = "idle" | "validating" | "committing" | "deploying" | "live" | "failed";

interface StudioContextValue {
  state: StudioState | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  publication: Publication | null;
  phase: PublishPhase;
  publishMessage: string | null;
  publishErrors: string[];
  publish: (paths?: string[]) => Promise<void>;
  retrySync: () => Promise<void>;
  dismissPublication: () => void;
  teachOpen: boolean;
  setTeachOpen: (open: boolean) => void;
}

const Ctx = createContext<StudioContextValue | null>(null);

export const useStudio = (): StudioContextValue => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStudio outside StudioProvider");
  return v;
};

const PHASE_OF: Record<Publication["status"], PublishPhase> = { committing: "committing", deploying: "deploying", live: "live", failed: "failed" };

const failureText = (code: string | null): string => {
  switch (code) {
    case "deploy_failed": return "The notes are saved in the repository, but the deployment that updates the AI failed. The AI still uses the previous knowledge.";
    case "deploy_timeout": return "The deployment took too long. The notes are saved; the AI still uses the previous knowledge.";
    case "deploy_not_started": return "The deployment did not start. The notes are saved; the AI still uses the previous knowledge.";
    case "index_mismatch": return "The deployment finished but the AI serves a different index (perhaps a newer change). Check Activity, then retry.";
    case "branch_protected": return "GitHub refused the commit (protected branch). Nothing changed; your drafts are kept.";
    case "repo_auth": return "GitHub refused the Studio's token. Nothing changed; your drafts are kept.";
    default: return "Publication failed. Your drafts are kept.";
  }
};

export const StudioProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<StudioState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publication, setPublication] = useState<Publication | null>(null);
  const [phase, setPhase] = useState<PublishPhase>("idle");
  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [publishErrors, setPublishErrors] = useState<string[]>([]);
  const [teachOpen, setTeachOpen] = useState(false);
  const timer = useRef<number | null>(null);
  const polls = useRef(0);

  const reload = useCallback(async () => {
    try {
      const s = await studioApi.state();
      setState(s);
      setError(null);
      const p = s.publication;
      if (p && (p.status === "committing" || p.status === "deploying")) {
        setPublication(p);
        setPhase(PHASE_OF[p.status]);
      }
    } catch (e) {
      setError(e instanceof StudioError ? e.message : "Knowledge Studio could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Follow a publication until it is live or failed: every 5 s, then more slowly; only while the page is visible.
  useEffect(() => {
    if (!publication || (publication.status !== "deploying" && publication.status !== "committing")) return;
    const tick = async () => {
      if (document.hidden) {
        timer.current = window.setTimeout(tick, 5000);
        return;
      }
      try {
        const { publication: p } = await studioApi.publication(publication.id);
        setPublication(p);
        setPhase(PHASE_OF[p.status]);
        if (p.status === "live") {
          setPublishMessage("Published successfully: the AI now uses this knowledge.");
          void reload();
          return;
        }
        if (p.status === "failed") {
          setPublishMessage(failureText(p.error_code));
          void reload();
          return;
        }
      } catch {
        // A failed poll is not a failed publication: look again.
      }
      polls.current++;
      timer.current = window.setTimeout(tick, polls.current < 24 ? 5000 : 15000);
    };
    timer.current = window.setTimeout(tick, 4000);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [publication, reload]);

  const publish = useCallback(async (paths?: string[]) => {
    setPhase("validating");
    setPublishErrors([]);
    setPublishMessage("Checking every note before publishing…");
    try {
      const { publication: p } = await studioApi.publish(paths);
      polls.current = 0;
      setPublication(p);
      setPhase(PHASE_OF[p.status]);
      setPublishMessage("Saved to the knowledge repository. Updating the AI's knowledge index (usually a few minutes)…");
      void reload();
    } catch (e) {
      const err = e instanceof StudioError ? e : null;
      setPhase("failed");
      setPublishMessage(err?.code === "validation_failed" ? "Validation failed: nothing was published." : err?.message ?? "Publication failed. Your drafts are kept.");
      setPublishErrors(Array.isArray(err?.data.errors) ? (err!.data.errors as string[]) : Array.isArray(err?.data.stale) ? (err!.data.stale as { path: string; problem: string }[]).map((s) => `${s.path}: ${s.problem}`) : []);
      if (err?.data.publication) setPublication(err.data.publication as Publication);
    }
  }, [reload]);

  const retrySync = useCallback(async () => {
    if (!publication) return;
    try {
      const { publication: p } = await studioApi.retry(publication.id);
      polls.current = 0;
      setPublication(p);
      setPhase("deploying");
      setPublishMessage("Retrying the synchronization: redeploying the AI with the published notes…");
    } catch (e) {
      setPublishMessage(e instanceof StudioError ? e.message : "The synchronization could not be retried.");
    }
  }, [publication]);

  const dismissPublication = useCallback(() => {
    setPhase("idle");
    setPublishMessage(null);
    setPublishErrors([]);
  }, []);

  return (
    <Ctx.Provider value={{ state, loading, error, reload, publication, phase, publishMessage, publishErrors, publish, retrySync, dismissPublication, teachOpen, setTeachOpen }}>
      {children}
    </Ctx.Provider>
  );
};
