import React, { useRef, useState } from "react";
import { Download, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/command/ui";
import { clientOsApi, ACCEPTED_FILES, fmtMoney } from "@/services/clientOs";

// Vocabulary and small parts shared by the internal Client OS, the Client Portal and the Partner Portal.

const tone = (s: string): "good" | "bad" | "warn" | "info" | "neutral" =>
  ["approved", "accepted", "completed", "active", "resolved", "ready"].includes(s) ? "good"
  : ["rejected", "declined", "revoked", "failed", "cancelled", "withdrawn", "expired"].includes(s) ? "bad"
  : ["submitted", "sent", "viewed", "revision_requested", "waiting_client", "internal_review", "negotiation", "suspended", "pending", "open"].includes(s) ? "warn"
  : ["in_progress", "draft"].includes(s) ? "info" : "neutral";

export const STATUS_WORDS: Record<string, string> = {
  draft: "Draft", sent: "Sent", viewed: "Viewed", negotiation: "In negotiation", accepted: "Accepted", rejected: "Rejected", expired: "Expired", withdrawn: "Withdrawn",
  submitted: "Awaiting review", approved: "Approved", revision_requested: "Revision requested", internal_review: "Team review", declined: "Declined", cancelled: "Cancelled",
  open: "Open", in_progress: "In progress", waiting_client: "Waiting for you", resolved: "Resolved", closed: "Closed", active: "Active", suspended: "Suspended", revoked: "Revoked",
  pending: "Pending", todo: "To do", blocked: "Blocked", done: "Done", planned: "Planned", on_hold: "On hold", completed: "Completed",
};
export const StatusPill = ({ status, words }: { status: string; words?: Record<string, string> }) => (
  <Pill tone={tone(status)}>{(words ?? STATUS_WORDS)[status] ?? status.replace(/_/g, " ")}</Pill>
);

export const fmtDay = (d: string | null | undefined) => (d ? new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");
export const fmtWhen = (d: string | null | undefined) => (d ? new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

/** Pick a file and upload it through the server-registered path; returns the file id. */
export const UploadButton = ({ brandId, projectId, purpose, audience = null, onUploaded, label = "Attach a file" }: { brandId: string; projectId: string | null; purpose: string; audience?: string | null; onUploaded: (id: string, name: string) => void; label?: string }) => {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col gap-1">
      <input ref={ref} type="file" className="sr-only" accept={ACCEPTED_FILES} aria-label={label} onChange={async (e) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (!f) return;
        setBusy(true); setError(null);
        try { onUploaded(await clientOsApi.upload(f, brandId, projectId, purpose, audience), f.name); } catch (x) { setError(x instanceof Error ? x.message : "The upload failed."); } finally { setBusy(false); }
      }} />
      <Button type="button" size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={() => ref.current?.click()}><Paperclip className="h-3.5 w-3.5" aria-hidden="true" /> {busy ? "Uploading…" : label}</Button>
      {error && <span role="alert" className="text-xs text-destructive">{error}</span>}
    </span>
  );
};

/** Opens a 60-second signed link, created only after the database confirmed this person may read the file. */
export const FileLink = ({ fileId, name, preview = false }: { fileId: string; name: string; preview?: boolean }) => {
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" className="inline-flex items-center gap-1 text-sm underline-offset-2 hover:underline" onClick={async () => {
        try { window.open(await clientOsApi.fileUrl(fileId, !preview), "_blank", "noopener,noreferrer"); setError(null); } catch (x) { setError(x instanceof Error ? x.message : "Not available."); }
      }}><Download className="h-3.5 w-3.5" aria-hidden="true" /> {name}</button>
      {error && <span role="alert" className="text-xs text-destructive">{error}</span>}
    </span>
  );
};

export const Section = ({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) => (
  <section className="space-y-2">
    <div className="flex items-center justify-between gap-2"><h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>{actions}</div>
    {children}
  </section>
);

export const Notice = ({ message, error }: { message: string | null; error?: boolean }) =>
  message ? <p role={error ? "alert" : "status"} className={error ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>{message}</p> : null;

/** Runs an action and reports success or the database's refusal in words. */
export const useAction = () => {
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); setMsg({ text: ok, error: false }); return true; } catch (e) { setMsg({ text: e instanceof Error ? e.message : "That did not work.", error: true }); return false; } finally { setBusy(false); }
  };
  return { msg, busy, run, clear: () => setMsg(null), view: msg ? <Notice message={msg.text} error={msg.error} /> : null };
};

/** Amounts per currency as the database returns them (decimal text); one line each, never a combined total. */
export const PerCurrency = ({ values, empty = "None" }: { values: Record<string, string | number>; empty?: string }) => {
  const present = Object.entries(values).filter(([, v]) => Number(v) !== 0);
  if (!present.length) return <span className="text-muted-foreground">{empty}</span>;
  return <span className="flex flex-col">{present.map(([c, v]) => <span key={c} className="tabular-nums">{fmtMoney(v, c)}</span>)}</span>;
};
