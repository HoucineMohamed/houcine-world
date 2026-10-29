// knowledge-studio: the private backend of Knowledge Studio (/workspace/knowledge in the site). Every request must carry
// a signed-in user's token AND that user must be a super admin (is_super_admin(), the same check as Platform
// Credentials): this is enforced here, on the server, before anything is read. The logic is in core.ts.
//
//   GET  /knowledge-studio/state | note?path= | version?path=&commit= | publication?id= | search?q= | review | feedback | activity
//   POST /knowledge-studio/draft | validate | discard | archive | restore | publish | retry | playground | assist | feedback | resolve
//
// Secrets (Supabase -> Edge Functions -> Secrets), docs/knowledge-studio.md:
//   KNOWLEDGE_GITHUB_TOKEN   needed to publish (and to read the newest notes): a fine-grained GitHub token for this
//                            repository only, Contents read/write + Actions read/write. Without it the Studio is
//                            read-only, over the notes bundled with this deployment.
//   KNOWLEDGE_GITHUB_REPO    optional, "owner/name". Default "HoucineMohamed/houcine-world".
//   KNOWLEDGE_GITHUB_BRANCH  optional. Default "main".
//   ANTHROPIC_API_KEY, ANTHROPIC_MODEL, CONCIERGE_INTERPRETER_MODEL: the concierge's own (playground, formatting help).
// Logs hold step outcomes only: never a note's text, a message, a token or a key.
import { authenticateRequest, isSuperAdmin, serviceClient } from "../_shared/authz.ts";
import { createAnthropicProvider } from "../_shared/llm/anthropic.ts";
import { BRAIN_INDEX } from "../_shared/brain/index.generated.ts";
import { LA_ROSA_VIEW_CONCIERGE } from "../concierge/agent.ts";
import { isAllowedOrigin } from "../concierge/core.ts";
import { BRAIN_SNAPSHOT } from "./snapshot.generated.ts";
import { BRAIN_DIR, createStudio, type StudioRequest } from "./core.ts";
import { createGithubRepo, createSnapshotRepo } from "./github.ts";
import { createStore } from "./store.ts";

const MAX_BODY = 200_000;

const corsFor = (origin: string | null): Record<string, string> =>
  isAllowedOrigin(origin)
    ? { "Access-Control-Allow-Origin": origin!, Vary: "Origin", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" }
    : {};

const json = (status: number, body: unknown, origin: string | null) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...corsFor(origin) } });

const build = () => {
  const token = Deno.env.get("KNOWLEDGE_GITHUB_TOKEN")?.trim();
  const [owner, name] = (Deno.env.get("KNOWLEDGE_GITHUB_REPO")?.trim() || "HoucineMohamed/houcine-world").split("/");
  const repo = token && owner && name
    ? createGithubRepo({ token, owner, repo: name, branch: Deno.env.get("KNOWLEDGE_GITHUB_BRANCH")?.trim() || "main", workflow: "supabase-deploy.yml", brainDir: BRAIN_DIR, fetch })
    : createSnapshotRepo(BRAIN_SNAPSHOT);
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  const model = Deno.env.get("ANTHROPIC_MODEL")?.trim() || "claude-opus-5-5";
  const interpreterModel = Deno.env.get("CONCIERGE_INTERPRETER_MODEL")?.trim() || "claude-haiku-5-5";
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  return createStudio({
    repo,
    store: createStore(serviceClient()),
    live: {
      async fingerprint() {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        try {
          const res = await fetch(`${supabaseUrl}/functions/v1/concierge/status`, { signal: controller.signal });
          if (!res.ok) return null;
          const data = await res.json();
          return typeof data?.fingerprint === "string" && /^[0-9a-f]{16}$/.test(data.fingerprint) ? data.fingerprint : null;
        } catch {
          return null;
        } finally {
          clearTimeout(timer);
        }
      },
    },
    answerer: apiKey ? createAnthropicProvider({ apiKey, model, effort: "low", timeoutMs: 60_000, fetch }) : null,
    interpreter: apiKey && interpreterModel !== "off" ? createAnthropicProvider({ apiKey, model: interpreterModel, effort: "low", timeoutMs: 15_000, fetch }) : null,
    agent: LA_ROSA_VIEW_CONCIERGE,
    liveIndex: BRAIN_INDEX,
    snapshot: BRAIN_SNAPSHOT,
    now: () => Date.now(),
  });
};

const studio = build();

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: isAllowedOrigin(origin) ? 204 : 403, headers: corsFor(origin) });
  if (req.method !== "GET" && req.method !== "POST") return json(405, { error: "Method not allowed" }, origin);

  // Server-side authorization, before anything else: a signed-in user who is a super admin.
  const auth = await authenticateRequest(req);
  if (!auth) return json(401, { error: "Sign in first.", code: "not_authenticated" }, origin);
  if (!(await isSuperAdmin(auth.userClient))) return json(403, { error: "Knowledge Studio is for the platform's super admins only.", code: "forbidden" }, origin);

  const url = new URL(req.url);
  const action = url.pathname.split("/").filter(Boolean).pop() ?? "";
  let body: unknown = null;
  if (req.method === "POST") {
    const text = await req.text();
    if (text.length > MAX_BODY) return json(413, { error: "Request too large" }, origin);
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      return json(400, { error: "Invalid request body" }, origin);
    }
  }
  const request: StudioRequest = {
    method: req.method as "GET" | "POST",
    action,
    query: Object.fromEntries(url.searchParams.entries()),
    body,
    actor: { id: auth.user.id, email: auth.user.email ?? null },
  };
  try {
    const res = await studio.handle(request);
    console.log(`knowledge-studio: ${req.method} ${action} -> ${res.status}${res.body.code ? ` ${res.body.code}` : ""}`);
    return json(res.status, res.body, origin);
  } catch (e) {
    console.error(`knowledge-studio: ${req.method} ${action} failed:`, e instanceof Error ? e.message.slice(0, 40) : "unknown");
    return json(500, { error: "Something went wrong. Nothing was published; try again.", code: "internal" }, origin);
  }
});
