import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { TRADES_URL, validateTradesUrl } from "@/config/trades";
import { END_TO_END_STEPS, SETUP_GROUPS, TRADES_OWNER_PAGES, isRealDate, loadState, saveState, tradesPageUrl, type SavedState } from "./items";

// The owner command center (owner chunk only, loaded on demand from the Private apps section of
// /workspace/ecosystem): the setup checklist of every manual step left, and the static facts of Houcine.Trades.
// Ticks and the verification date stay in this browser (localStorage, guarded: the page works without it).
// Nothing here calls Houcine.Trades or any other service, and no token is involved.

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const storage = (): Storage | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const CommandCenter = () => {
  const [state, setState] = useState<SavedState>(() => loadState(storage()));
  const [saved, setSaved] = useState(true);
  const [dateText, setDateText] = useState(state.verifiedOn);
  const changed = useRef(false);

  // Saved only after a change by the owner, so opening the page never overwrites what is stored.
  useEffect(() => {
    if (!changed.current) return;
    setSaved(saveState(storage(), state));
  }, [state]);

  const update = (next: (s: SavedState) => SavedState) => {
    changed.current = true;
    setState(next);
  };

  const total = SETUP_GROUPS.reduce((n, g) => n + g.items.length, 0);
  const done = SETUP_GROUPS.reduce((n, g) => n + g.items.filter((i) => state.done[i.id]).length, 0);
  const base = validateTradesUrl(TRADES_URL);

  return (
    <div className="mt-6 space-y-8 text-sm">
      <section aria-labelledby="owner-setup-title" className="space-y-4">
        <h3 id="owner-setup-title" className="text-base font-semibold text-foreground">
          Setup checklist ({done} of {total} done)
        </h3>
        {state.readable === false && !changed.current && (
          <p role="status" className="text-xs text-muted-foreground">
            The ticks saved in this browser could not be read. They are left as they are until you tick something here.
          </p>
        )}
        {!saved && (
          <p role="status" className="text-xs text-muted-foreground">
            This browser does not keep the ticks (private window or storage blocked); they last until you leave the page.
          </p>
        )}
        {SETUP_GROUPS.map((g) => (
          <fieldset key={g.id} className="rounded-lg border border-border/50 p-4">
            <legend className="px-1 font-semibold text-foreground">{g.title}</legend>
            <ul className="space-y-4">
              {g.items.map((i) => {
                const id = `owner-step-${i.id}`;
                const ok = Boolean(state.done[i.id]);
                return (
                  <li key={i.id} className="flex gap-3">
                    <input
                      id={id}
                      type="checkbox"
                      checked={ok}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        update((s) => ({ ...s, done: { ...s.done, [i.id]: checked } }));
                      }}
                      className="mt-1 h-5 w-5 shrink-0 accent-[hsl(var(--accent))]"
                      aria-describedby={`${id}-why ${id}-path`}
                    />
                    <div className="space-y-1">
                      <label htmlFor={id} className={cn("font-medium", ok ? "text-accent" : "text-foreground")}>
                        {i.title}
                      </label>
                      <p id={`${id}-why`} className="text-muted-foreground">{i.why}</p>
                      <p id={`${id}-path`} className="text-xs text-muted-foreground">
                        <span className="sr-only">Where: </span>
                        <span className="font-mono">{i.path}</span>
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        ))}
      </section>

      <section aria-labelledby="trades-facts-title" className="space-y-4 rounded-lg border border-border/50 p-4">
        <h3 id="trades-facts-title" className="text-base font-semibold text-foreground">Houcine.Trades</h3>
        <p>
          <span className="text-muted-foreground">Address: </span>
          <span className="font-mono text-foreground break-all">{base ?? "not set (TRADES_URL)"}</span>
        </p>
        <div>
          <p className="font-medium text-foreground mb-2">Its owner pages</p>
          <ul className="space-y-1">
            {TRADES_OWNER_PAGES.map((p) => {
              const url = tradesPageUrl(base, p.path);
              return (
                <li key={p.path}>
                  {url ? (
                    <a href={url} rel="noopener noreferrer" referrerPolicy="no-referrer" className={cn("inline-flex items-center gap-1 min-h-11 text-accent underline rounded", focusRing)}>
                      {p.label} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground">{p.label}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
        <div>
          <p className="font-medium text-foreground mb-2">One-time end-to-end test</p>
          <ol className="list-decimal space-y-2 pl-5">
            {END_TO_END_STEPS.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <p className="mt-2 text-xs text-muted-foreground">The full version: docs/trades-integration.md, section 10.</p>
        </div>
        <div className="space-y-1">
          <label htmlFor="trades-verified-on" className="font-medium text-foreground">
            Last checked by hand
          </label>
          <input
            id="trades-verified-on"
            type="date"
            value={dateText}
            onChange={(e) => {
              const v = e.target.value;
              setDateText(v);
              // Only a complete, real date is kept; a half-typed one stays in the field until it is complete.
              if (v === "" || isRealDate(v)) update((s) => ({ ...s, verifiedOn: v }));
            }}
            className={cn("block min-h-11 rounded-md border border-border bg-background px-3 text-foreground", focusRing)}
          />
          <p className="text-xs text-muted-foreground">The date you last ran the test above. Kept in this browser only.</p>
        </div>
      </section>
    </div>
  );
};

export default CommandCenter;
