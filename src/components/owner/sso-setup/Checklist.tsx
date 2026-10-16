import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { TRADES_URL } from "@/config/trades";
import { requestNote } from "../card/openTrades";
import { CHECK_TEXT, NETLIFY_VARIABLES, SCOPES, STEPS, audienceFor, checkResult, type CheckResult } from "./steps";

// The setup checklist of the Houcine.Trades hand-off: every step in order, the Netlify variable names with their
// scopes, the audience value and the owner's user id, and a live check that turns green when the function works.
// Ticks live in this page's memory only. The live check's note is thrown away at once: never shown or kept.

/** A value with a Copy button; `value` null shows `missing` instead, with nothing to copy. */
const Copyable = ({ label, value, missing }: { label: string; value: string | null; missing: string }) => {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  useEffect(() => {
    if (state !== "copied") return;
    const t = window.setTimeout(() => setState("idle"), 2000);
    return () => window.clearTimeout(t);
  }, [state]);
  if (value === null) {
    return (
      <p>
        <span className="text-muted-foreground">{label}:</span> <span className="text-foreground">{missing}</span>
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground">{label}:</span>
      <code className="rounded bg-muted px-2 py-1 font-mono text-xs text-foreground break-all">{value}</code>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1 min-h-11"
        onClick={() => {
          if (!navigator.clipboard?.writeText) {
            setState("failed");
            return;
          }
          navigator.clipboard.writeText(value).then(() => setState("copied"), () => setState("failed"));
        }}
      >
        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
        {state === "copied" ? "Copied" : `Copy ${label.toLowerCase()}`}
      </Button>
      {state === "failed" && <span className="text-xs text-foreground" role="status">Copy did not work: select the text and copy it by hand.</span>}
    </div>
  );
};

const Checklist = () => {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [check, setCheck] = useState<CheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const audience = audienceFor(TRADES_URL);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null), () => setUserId(null));
  }, []);

  const runCheck = async () => {
    setChecking(true);
    const { status, noAnswer } = await requestNote();
    setCheck(checkResult(status, noAnswer === "no-session"));
    setChecking(false);
  };

  const isDone = (id: string) => (id === "check" ? check === "ok" : Boolean(done[id]));
  const complete = STEPS.every((s) => isDone(s.id));

  return (
    <section aria-labelledby="sso-checklist-title" className="space-y-4">
      <h3 id="sso-checklist-title" className="text-sm font-semibold text-foreground">
        Setup checklist {complete ? "(complete)" : `(${STEPS.filter((s) => isDone(s.id)).length} of ${STEPS.length})`}
      </h3>

      <div className="space-y-2 rounded-md border border-border p-4">
        <Copyable label="Audience" value={audience} missing="TRADES_URL is not a valid address yet" />
        <Copyable label="Your user id" value={userId} missing="sign in again to see it" />
        <p className="text-xs text-muted-foreground">Netlify scopes for every variable: {SCOPES}.</p>
        <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
          {NETLIFY_VARIABLES.map((v) => (
            <li key={v.name}>
              <code className="font-mono text-foreground">{v.name}</code>: {v.value}
            </li>
          ))}
        </ul>
      </div>

      <ol className="space-y-3">
        {STEPS.map((s, i) => {
          const ok = isDone(s.id);
          return (
            <li key={s.id} className="flex gap-3">
              {s.kind === "manual" ? (
                <input
                  id={`sso-step-${s.id}`}
                  type="checkbox"
                  checked={ok}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setDone((d) => ({ ...d, [s.id]: checked }));
                  }}
                  className="mt-1 h-5 w-5 shrink-0 accent-[hsl(var(--accent))]"
                />
              ) : ok ? (
                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
              ) : (
                <Circle className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              )}
              <div className="space-y-1">
                <label htmlFor={s.kind === "manual" ? `sso-step-${s.id}` : undefined} className={ok ? "font-medium text-accent" : "font-medium text-foreground"}>
                  {i + 1}. {s.title}
                  {s.kind === "auto" && <span className="sr-only">{ok ? " (done)" : " (not done)"}</span>}
                </label>
                <p className="text-xs text-muted-foreground">{s.detail}</p>
                {s.id === "check" && (
                  <div className="space-y-2 pt-1">
                    <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={runCheck} disabled={checking}>
                      {checking ? "Checking…" : "Check now"}
                    </Button>
                    {check && (
                      <p role="status" className={check === "ok" ? "text-xs text-accent" : "text-xs text-foreground"}>
                        {CHECK_TEXT[check]}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
};

export default Checklist;
