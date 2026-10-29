// Live evaluation of the La Rosa View Concierge against the REAL models (docs/knowledge-brain.md, "Testing").
// Runs every conversation of scripts/brain/evals/concierge-cases.json and checks the facts and behaviour of the last
// answer (required facts, forbidden claims, the reply's script). Wording is free; only facts and behaviour count.
// It spends real money (roughly 2 model calls per turn, about 30 turns) and needs a key, so it never runs in CI.
//
//   ANTHROPIC_API_KEY=... node --experimental-strip-types scripts/brain/eval-live.mjs            run the pipeline locally
//   node --experimental-strip-types scripts/brain/eval-live.mjs --endpoint=https://<project>.supabase.co/functions/v1/concierge/chat
//                                    run against the deployed function (the function's own key; 20 messages per
//                                    10 minutes per address, so add --pause=35 to space the turns)
//   --only=A1,B1   run some cases      --out=/path/report.json   write the answers and verdicts (outside the repository)
//
// Optional: ANTHROPIC_MODEL and CONCIERGE_INTERPRETER_MODEL as for the function. Exit code 1 if any case fails.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../../", import.meta.url).pathname;
const flags = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => {
  const [k, ...v] = a.slice(2).split("=");
  return [k, v.length ? v.join("=") : true];
}));
const only = typeof flags.only === "string" ? new Set(flags.only.split(",")) : null;
const pauseMs = Number(flags.pause ?? 0) * 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cases = JSON.parse(readFileSync(join(root, "scripts/brain/evals/concierge-cases.json"), "utf8")).cases
  .filter((c) => !only || only.has(c.id) || only.has(c.id.split("-")[0]));

let turn;
if (flags.endpoint) {
  turn = async (body) => {
    const res = await fetch(flags.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://houcine.world" },
      body: JSON.stringify({ ...body, stream: false }),
    });
    const data = await res.json().catch(() => ({}));
    return res.ok ? { reply: data.reply, memory: data.memory, sources: data.sources } : { error: `${res.status} ${data.code ?? ""}` };
  };
} else {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("Set ANTHROPIC_API_KEY (a real key), or pass --endpoint=<deployed function URL>.");
    process.exit(2);
  }
  const { runTurn } = await import(join(root, "supabase/functions/concierge/pipeline.ts"));
  const { checkChatRequest } = await import(join(root, "supabase/functions/concierge/core.ts"));
  const { LA_ROSA_VIEW_CONCIERGE } = await import(join(root, "supabase/functions/concierge/agent.ts"));
  const { BRAIN_INDEX } = await import(join(root, "supabase/functions/_shared/brain/index.generated.ts"));
  const { createAnthropicProvider } = await import(join(root, "supabase/functions/_shared/llm/anthropic.ts"));
  const model = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
  const interpreterModel = process.env.CONCIERGE_INTERPRETER_MODEL || "claude-haiku-5-5";
  const answerer = createAnthropicProvider({ apiKey, model, effort: "low", timeoutMs: 60_000, fetch });
  const interpreter = interpreterModel === "off" ? null : createAnthropicProvider({ apiKey, model: interpreterModel, effort: "low", timeoutMs: 20_000, fetch });
  console.log(`Local run: answer model ${model}, interpreter ${interpreterModel}`);
  turn = async (body) => {
    const checked = checkChatRequest(body);
    if (!checked.ok) return { error: checked.error };
    let reply = "";
    let memory = null;
    let sources = [];
    let error = null;
    await runTurn({ request: checked.value, agent: LA_ROSA_VIEW_CONCIERGE, index: BRAIN_INDEX, answerer, interpreter }, (e) => {
      if (e.type === "delta") reply += e.text;
      else if (e.type === "reset") reply = "";
      else if (e.type === "meta") sources = e.sources;
      else if (e.type === "done") memory = e.memory;
      else if (e.type === "error") error = e.code;
    });
    return error ? { error } : { reply, memory, sources };
  };
}

const arabicShare = (t) => {
  const letters = t.match(/\p{L}/gu) ?? [];
  return letters.length ? letters.filter((c) => /\p{Script=Arabic}/u.test(c)).length / letters.length : 0;
};

const results = [];
for (const c of cases) {
  const history = [];
  let memory;
  let last = null;
  for (const message of c.turns) {
    if (pauseMs) await sleep(pauseMs);
    last = await turn({ message, history: [...history], ...(memory ? { memory } : {}) });
    if (last.error) break;
    history.push({ role: "user", content: message }, { role: "assistant", content: last.reply });
    memory = last.memory ?? memory;
  }
  const problems = [];
  if (last.error) problems.push(`request failed: ${last.error}`);
  else {
    const answer = last.reply ?? "";
    for (const alternatives of c.must ?? []) {
      if (!alternatives.some((p) => new RegExp(p, "i").test(answer))) problems.push(`missing one of: ${alternatives.join(" | ")}`);
    }
    for (const p of c.must_not ?? []) if (new RegExp(p, "i").test(answer)) problems.push(`forbidden: /${p}/`);
    if (c.script === "arabic" && arabicShare(answer) < 0.5) problems.push("expected an answer in Arabic script");
    if (c.script === "latin" && arabicShare(answer) > 0.2) problems.push("expected an answer in Latin script");
    if (!answer.trim()) problems.push("empty answer");
  }
  const ok = problems.length === 0;
  results.push({ id: c.id, category: c.category, ok, problems, turns: c.turns, answer: last.reply ?? null, sources: last.sources ?? [], memory: last.memory ?? null });
  console.log(`${ok ? "PASS" : "FAIL"}  ${c.id} (${c.category})${ok ? "" : `\n      ${problems.join("\n      ")}`}`);
  if (flags.verbose) console.log(`      answer: ${(last.reply ?? "").replace(/\n/g, " ")}`);
}

const failed = results.filter((r) => !r.ok);
const byCategory = {};
for (const r of results) {
  byCategory[r.category] ??= { pass: 0, total: 0 };
  byCategory[r.category].total++;
  if (r.ok) byCategory[r.category].pass++;
}
console.log("\nBy category:");
for (const [k, v] of Object.entries(byCategory)) console.log(`  ${k}: ${v.pass}/${v.total}`);
console.log(`\n${results.length - failed.length}/${results.length} cases passed.`);
if (typeof flags.out === "string") writeFileSync(flags.out, JSON.stringify(results, null, 2));
process.exit(failed.length ? 1 : 0);
