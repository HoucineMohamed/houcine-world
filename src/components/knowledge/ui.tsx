import React from "react";
import { cn } from "@/lib/utils";
import { BRAND_LABELS, STATUS_INFO, VISIBILITY_INFO } from "@/lib/knowledge/note";
import type { NoteSummary } from "@/services/knowledgeStudio";

// Small shared pieces of Knowledge Studio: status pills and the brand colour dots. Colours are restrained: one hue
// per brand for recognition, and the status colours used everywhere in the Studio.

export const BRAND_COLORS: Record<string, string> = {
  "houcine-world": "#a1a1aa",
  "la-rosa-view": "#f43f5e",
  "houcine-tech": "#38bdf8",
  "houcine-studio": "#c084fc",
  "houcine-management": "#fbbf24",
  "houcine-education": "#34d399",
};

export const BrandDot = ({ brand, className }: { brand: string | null; className?: string }) => (
  <span aria-hidden="true" className={cn("inline-block h-2 w-2 shrink-0 rounded-full", className)} style={{ backgroundColor: BRAND_COLORS[brand ?? ""] ?? "#71717a" }} />
);

export const brandLabel = (brand: string | null) => BRAND_LABELS[brand ?? ""] ?? brand ?? "—";

const PILL: Record<string, string> = {
  published: "border-emerald-500/30 text-emerald-300 bg-emerald-500/10",
  draft: "border-sky-500/30 text-sky-300 bg-sky-500/10",
  pending: "border-amber-500/30 text-amber-300 bg-amber-500/10",
  review: "border-violet-500/30 text-violet-300 bg-violet-500/10",
  archived: "border-zinc-500/30 text-zinc-400 bg-zinc-500/10",
  out: "border-rose-500/30 text-rose-300 bg-rose-500/10",
  neutral: "border-border text-muted-foreground bg-muted/30",
};

export const Pill = ({ tone, children, title }: { tone: keyof typeof PILL; children: React.ReactNode; title?: string }) => (
  <span title={title} className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[0.7rem] font-medium leading-4", PILL[tone])}>
    {children}
  </span>
);

/** One note's publication status, derived from the note and its draft (spec: Published, Draft, Pending publication, Needs review, Archived). */
export const noteStatus = (n: NoteSummary): { tone: keyof typeof PILL; label: string; help: string } => {
  if (n.archived && !n.draft) return { tone: "archived", label: "Archived", help: "Kept for history, never used by an AI." };
  if (n.draft?.operation === "archive") return { tone: "pending", label: "Archive pending", help: "Will be archived when you publish." };
  if (n.draft?.operation === "restore") return { tone: "pending", label: "Restore pending", help: "Will be restored when you publish." };
  if (n.isNew) return { tone: "draft", label: "Draft", help: "A new note, not published: no AI can see it yet." };
  if (n.draft) return { tone: "pending", label: "Pending publication", help: "Has unpublished changes: the AI still uses the published version." };
  if (n.sections.some((s) => s.status === "pending" || s.status === "outdated")) return { tone: "review", label: "Needs review", help: "Has parts awaiting confirmation or outdated." };
  return { tone: "published", label: "Published", help: "This version is in the repository." };
};

export const VisibilityPill = ({ visibility }: { visibility: string | null }) => {
  const info = VISIBILITY_INFO[visibility ?? ""];
  if (!info) return <Pill tone="neutral">?</Pill>;
  return <Pill tone={visibility === "public" ? "published" : visibility === "internal" ? "neutral" : "out"} title={info.help}>{info.label}</Pill>;
};

export const StatusPill = ({ status }: { status: string | null }) => {
  const info = STATUS_INFO[status ?? ""];
  if (!info) return null;
  const tone = status === "verified" || status === "policy" ? "published" : status === "outdated" ? "archived" : status === "pending" ? "review" : "pending";
  return <Pill tone={tone} title={info.help}>{info.label}</Pill>;
};

export const Section = ({ title, actions, children, className }: { title: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }) => (
  <section className={cn("rounded-lg border border-border bg-card/40", className)}>
    <header className="flex items-center justify-between gap-2 border-b border-border/70 px-4 py-2.5">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {actions}
    </header>
    <div className="p-4">{children}</div>
  </section>
);

export const timeAgo = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

/** The publishing token is about to expire (or has): what happens and what to do. Shown only when GitHub gave a date. */
export const TokenWarning = ({ token }: { token: { expiresAt: string | null; daysLeft: number | null; warn: boolean } | null }) => {
  if (!token?.warn || !token.expiresAt || token.daysLeft === null) return null;
  const date = new Date(token.expiresAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
  const when = token.daysLeft < 0 ? `expired on ${date}` : token.daysLeft === 0 ? `expires today (${date})` : `expires on ${date}, in ${token.daysLeft} day${token.daysLeft === 1 ? "" : "s"}`;
  return (
    <p role="alert" className={cn("rounded-md border p-2 text-xs", token.daysLeft < 0 ? "border-rose-500/30 bg-rose-500/10 text-rose-200" : "border-amber-500/30 bg-amber-500/10 text-amber-200")}>
      The publishing token {when}. {token.daysLeft < 0 ? "Publishing stops until it is replaced." : "When it expires, publishing stops."} Create a new token on GitHub and replace the KNOWLEDGE_GITHUB_TOKEN secret in Supabase (steps in Settings).
    </p>
  );
};
