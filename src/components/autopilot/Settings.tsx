import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { autopilotApi, type Preferences } from "@/services/autopilot";
import { attempt, useAsync } from "@/components/command/useAsync";
import { ErrorBox, Field, fmtDateTime, inputCls, LoadingGrid, Panel, Pill } from "@/components/command/ui";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { useAutopilot } from "@/pages/workspace/autopilot/Autopilot";
import { NOTIFICATION_CATEGORIES } from "./shared";

// Settings: the person's own notification preferences (row-level security: only their row), and how monitoring runs.

const Settings = () => {
  const { user } = useWorkspace();
  const { brands, lastScan, canManage } = useAutopilot();
  const prefs = useAsync(() => (user ? autopilotApi.preferences(user.id) : Promise.reject(new Error("Sign in again."))), [user?.id]);
  const [draft, setDraft] = useState<Preferences | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (prefs.value) setDraft(prefs.value); }, [prefs.value]);

  if (prefs.error) return <ErrorBox message={prefs.error} onRetry={prefs.reload} />;
  if (!draft) return <LoadingGrid tiles={2} />;
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const save = async () => {
    setSaving(true);
    // Only brands this person can see may be muted; anything else is dropped before saving.
    const clean = { ...draft, muted_brands: draft.muted_brands.filter((b) => brands.some((x) => x.id === b)) };
    const error = await attempt(() => autopilotApi.savePreferences(clean));
    setSaving(false);
    setMessage(error ?? "Preferences saved.");
    if (!error) prefs.reload();
  };
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Panel title="My notifications" description="Applied when a notification is created; existing notifications stay as they are">
        <div className="space-y-4">
          <label className="flex items-center gap-2"><input type="checkbox" checked={draft.in_app} onChange={(e) => setDraft({ ...draft, in_app: e.target.checked })} /> Receive in-app notifications</label>
          <Field label="Minimum priority" className="max-w-xs">
            <select aria-label="Minimum priority" className={inputCls} value={draft.min_priority} onChange={(e) => setDraft({ ...draft, min_priority: e.target.value })}>
              <option value="low">Everything (low and above)</option><option value="normal">Normal and above</option><option value="high">High and urgent</option><option value="urgent">Urgent only</option>
            </select>
          </Field>
          <fieldset><legend className="mb-1 text-xs text-muted-foreground">Mute categories</legend>
            <div className="flex flex-wrap gap-3">{Object.entries(NOTIFICATION_CATEGORIES).map(([c, l]) => <label key={c} className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={draft.muted_categories.includes(c)} onChange={() => setDraft({ ...draft, muted_categories: toggle(draft.muted_categories, c) })} /> {l}</label>)}</div>
          </fieldset>
          {brands.length > 0 && (
            <fieldset><legend className="mb-1 text-xs text-muted-foreground">Mute brands</legend>
              <div className="flex flex-wrap gap-3">{brands.map((b) => <label key={b.id} className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={draft.muted_brands.includes(b.id)} onChange={() => setDraft({ ...draft, muted_brands: toggle(draft.muted_brands, b.id) })} /> {b.name}</label>)}</div>
            </fieldset>
          )}
          <div className="flex items-center gap-3"><Button size="sm" onClick={() => void save()} disabled={saving}>Save preferences</Button>{message && <span role="status" className="text-xs">{message}</span>}</div>
        </div>
      </Panel>
      {canManage && (
        <Panel title="How monitoring runs">
          <div className="space-y-3 text-xs text-muted-foreground">
            <p><Pill tone="good">Immediate</Pill> Record events (a lead created, a task completed, an expense recorded…) run their automations at once, in the database, in the same transaction as the change.</p>
            <p><Pill tone="info">Scheduled checks</Pill> Overdue tasks and invoices, approaching deadlines, stagnant leads and the other monitoring rules run when Autopilot is opened, with “Run monitoring now”, and at most once every 2 minutes. Last run: {lastScan ? fmtDateTime(lastScan) : "not yet"}.</p>
            <p>To run them every 15 minutes even when nobody opens Autopilot, the owner can turn on a schedule in Supabase (docs/autopilot.md, “Scheduling”). It is a Supabase setting, so it is off until the owner chooses it.</p>
            <p><Pill>Email</Pill> Not available: no email provider is configured. Automations notify inside the workspace only.</p>
          </div>
        </Panel>
      )}
    </div>
  );
};

export default Settings;
