import React from "react";
import { Link } from "react-router-dom";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { CURRENCIES, cents, type Change, type Currency, type Money } from "../../../supabase/functions/_shared/command/metrics.ts";

// Shared presentation pieces of the Command Center: panels, KPI tiles with their comparison, money (always with its
// currency, never two currencies added), and the loading, empty, "not available" and error states.

export const fmtMoneyCents = (amount: number, currency: Currency) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount / 100);
export const fmtAmount = (amount: string | number | null | undefined, currency: Currency | null | undefined) =>
  amount === null || amount === undefined || !currency ? "—" : fmtMoneyCents(cents(amount), currency);
export const fmtDate = (d: string | null | undefined) =>
  d ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T12:00:00Z` : d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
export const fmtDateTime = (d: string) => new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
export const label = (s: string) => s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export const Panel = ({ title, actions, children, className, description }: { title: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string; description?: React.ReactNode }) => (
  <section className={cn("rounded-xl border border-border bg-card/40", className)}>
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-4 py-3">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold tracking-wide text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
    <div className="p-4">{children}</div>
  </section>
);

export const ChangeBadge = ({ change, invert = false }: { change: Change | null | undefined; invert?: boolean }) => {
  if (!change) return null;
  if (change.pct === null) return <span className="text-[0.7rem] text-muted-foreground">{change.note ?? ""}</span>;
  const up = change.pct > 0;
  const good = invert ? !up : up;
  const Icon = change.pct === 0 ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[0.7rem] font-medium tabular-nums", change.pct === 0 ? "text-muted-foreground" : good ? "text-emerald-300" : "text-rose-300")}>
      <Icon className="h-3 w-3" aria-hidden="true" />{change.pct > 0 ? "+" : ""}{change.pct}% <span className="font-normal text-muted-foreground">vs previous</span>
    </span>
  );
};

/** One KPI. `to` makes it a link to the records behind it. */
export const Kpi = ({ label: name, value, change, to, hint, invert, unavailable }: { label: string; value: React.ReactNode; change?: Change | null; to?: string; hint?: string; invert?: boolean; unavailable?: string }) => {
  const body = (
    <>
      <div className="text-xs text-muted-foreground">{name}</div>
      {unavailable ? (
        <div className="mt-1 text-sm text-muted-foreground">Not available</div>
      ) : (
        <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-foreground">{value}</div>
      )}
      <div className="mt-1 min-h-4">{unavailable ? <span className="text-[0.7rem] text-muted-foreground">{unavailable}</span> : <ChangeBadge change={change} invert={invert} />}</div>
      {hint && <div className="mt-0.5 text-[0.7rem] text-muted-foreground/80">{hint}</div>}
    </>
  );
  const cls = "block rounded-lg border border-border bg-background/40 p-3 transition-colors";
  return to ? (
    <Link to={to} className={cn(cls, "hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}>{body}</Link>
  ) : (
    <div className={cls}>{body}</div>
  );
};

/** Money per currency, one line each; never a combined total. */
export const MoneyLines = ({ money, empty = "No amount", className }: { money: Money | null | undefined; empty?: string; className?: string }) => {
  const present = CURRENCIES.filter((c) => money && money[c] !== undefined);
  if (!present.length) return <span className={cn("text-muted-foreground", className)}>{empty}</span>;
  return (
    <span className={cn("flex flex-col", className)}>
      {present.map((c) => <span key={c} className="tabular-nums">{fmtMoneyCents(money![c]!, c)}</span>)}
    </span>
  );
};

export const Empty = ({ title, children }: { title: string; children?: React.ReactNode }) => (
  <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
    <p className="text-sm font-medium text-foreground">{title}</p>
    {children && <div className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">{children}</div>}
  </div>
);

export const ErrorBox = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
    {message} {onRetry && <button type="button" onClick={onRetry} className="ml-2 underline">Try again</button>}
  </div>
);

export const LoadingGrid = ({ tiles = 8 }: { tiles?: number }) => (
  <div className="grid grid-cols-2 gap-3 md:grid-cols-4" role="status" aria-label="Loading">
    {Array.from({ length: tiles }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
  </div>
);

const TONES: Record<string, string> = {
  good: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  warn: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  bad: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  info: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  neutral: "border-border bg-muted/30 text-muted-foreground",
};
export const Pill = ({ tone = "neutral", children, title }: { tone?: keyof typeof TONES; children: React.ReactNode; title?: string }) => (
  <span title={title} className={cn("inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[0.7rem] font-medium", TONES[tone])}>{children}</span>
);

export const HEALTH: Record<string, { label: string; tone: keyof typeof TONES }> = {
  on_track: { label: "On track", tone: "good" },
  at_risk: { label: "At risk", tone: "warn" },
  off_track: { label: "Off track", tone: "bad" },
  not_enough_data: { label: "Not enough data", tone: "neutral" },
  closed: { label: "Closed", tone: "neutral" },
};
export const STATUS_TONE: Record<string, keyof typeof TONES> = {
  planned: "info", active: "good", on_hold: "warn", completed: "neutral", cancelled: "neutral",
  todo: "neutral", in_progress: "info", blocked: "bad", done: "good",
  new: "info", contacted: "info", qualified: "info", proposal_sent: "warn", negotiation: "warn", won: "good", lost: "bad",
  draft: "neutral", sent: "info", void: "neutral", paid: "good", partially_paid: "warn", overdue: "bad", unpaid: "warn",
  prospect: "info", client: "good", partner: "info", supplier: "neutral", inactive: "neutral",
};
export const StatusPill = ({ status }: { status: string }) => <Pill tone={STATUS_TONE[status] ?? "neutral"}>{label(status)}</Pill>;

/** A labelled form field. */
export const Field = ({ label: name, children, className }: { label: string; children: React.ReactNode; className?: string }) => (
  <label className={cn("block text-xs", className)}>
    <span className="mb-1 block text-muted-foreground">{name}</span>
    {children}
  </label>
);
export const inputCls = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * A design-token colour as a concrete value for chart SVG attributes (var() is not resolved inside SVG presentation
 * attributes). Reads the token from the page, so the charts follow the design tokens.
 */
export const tokenColor = (name: string, alpha = 1): string => {
  const raw = typeof window === "undefined" ? "" : getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
  const hsl = raw || "0 0% 50%";
  return alpha === 1 ? `hsl(${hsl})` : `hsl(${hsl} / ${alpha})`;
};
