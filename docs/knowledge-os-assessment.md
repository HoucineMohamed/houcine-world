# Knowledge OS — assessment (Phase 0) and final findings

Written 1 November 2026 from the repository, GitHub and the code, not from earlier reports. The final section
records what was implemented and how it differs from the original architecture.

## Repository state

- **VERIFIED CURRENT STATE.** On `main`: the Command Center (#89), plus Autopilot and Client OS (#92). The Knowledge
  Studio improvements #79, #80, #81 and #84 are also on `main`.
- **SECURITY GAP (process).** #93 (Client OS AI) was merged into its base branch `grok/land-autopilot-client-os` after
  #92 had reached `main`, so the assistants are **not on `main`**. #94 lands them. Knowledge OS is built on #94 and
  targets `main` directly, so no further stacked merge can strand code.

## The GitHub repository is PUBLIC

- **VERIFIED CURRENT STATE.** `HoucineMohamed/houcine-world` has visibility *public*. Every file under
  `houcine-world-brain/` is world-readable, whatever its `visibility:` header says.
- **VERIFIED CURRENT STATE.** 25 notes are `public` and 10 are `internal`. The internal ones are 1 agent-access note,
  8 maintainer maps and `internal/open-questions.md`. They contain no secrets, but they are public.
- **SECURITY GAP (fixed).** Knowledge Studio let an editor choose *internal* or *restricted* in the note editor and
  in Teach the AI, and its `publish` action committed that note to the public repository. The Studio's help text said
  "stays in the repository", which is true and means public.
- **REQUIRED IMPLEMENTATION (done).** Knowledge Studio now refuses to publish a note whose visibility is not
  `public` (agent access notes, which are configuration, excepted). The editor and Teach the AI explain that client,
  internal and management knowledge belongs in the Knowledge Library (private, Supabase).
- **CONFIGURATION DEPENDENCY / owner decision.** The 10 existing internal notes remain in the public repository and in
  its history. Removing them from history needs a history rewrite, which only the owner may decide. They are
  low-sensitivity.

## How knowledge reached the AI before Knowledge OS

| Path | Finding | Class |
| --- | --- | --- |
| `scripts/brain/build.mjs` / Studio publish → `_shared/brain/index.generated.ts` | compiles only `visibility: public` notes; the index is bundled into the Supabase functions | VERIFIED CURRENT STATE; EXISTING COMPONENT TO REUSE |
| Concierge (`/larosaview`) | searches the bundled index with its agent's brand scope (`agents/la-rosa-view-concierge.md`) | EXISTING COMPONENT TO REUSE (unchanged) |
| Client OS assistants (`client-os-ai`) | the same index, public notes of the person's brands | EXISTING COMPONENT TO REUSE (now through the shared service) |
| Autopilot assistant | the same index, every brand | EXISTING COMPONENT TO REUSE (now through the shared service) |
| Command Center analyst | no knowledge retrieval (facts only) | VERIFIED CURRENT STATE (unchanged, documented) |
| Internal / client / management knowledge | no store the server could read | REQUIRED IMPLEMENTATION (done: private store) |

## Other findings

| Finding | Class |
| --- | --- |
| Knowledge Studio: super admins only (UI and server); sections Overview, Notes, Graph, Playground, Review, Activity, Settings; drafts, events, feedback and publications in Supabase (`knowledge_*`) | EXISTING COMPONENT TO REUSE |
| Markdown notes with a strict header (`id, title, brand, type, visibility, status, updated…`), wiki links, compiled with an explicit brand list (`BRANDS` in `compile.ts`) | EXISTING COMPONENT TO REUSE (public). Private documents use real `brands.id` instead (no hardcoded list) |
| Search: BM25 with typo tolerance over the bundled index | EXISTING COMPONENT TO REUSE (public); PostgreSQL full-text search for private documents |
| Graph: computed in the browser from the Studio snapshot (public and maintainer notes) | EXISTING COMPONENT TO REUSE (extended with private documents the person may read) |
| GitHub publication: `GITHUB_TOKEN`-style secret of the `knowledge-studio` function, commit to `main`, waits for the deploy | EXISTING COMPONENT TO REUSE; CONFIGURATION DEPENDENCY |
| Audit: `audit_logs` (`cos_log`), `knowledge_events`; AI usage: `ai_activity` | EXISTING COMPONENT TO REUSE |
| Autopilot events (`ap_emit`, `ap_event_types`, `ap_tick`), notifications (`ap_notify_user`) | EXISTING COMPONENT TO REUSE |
| No semantic (vector) search exists | DEFERRED (keyword + full-text ranking) |

## Points where private knowledge could leak, and how each is closed

1. **The public repository.** The publish guard plus a private store means non-public knowledge is never committed.
   A unit test checks the guard.
2. **The bundled index.** Only public notes are compiled (unchanged). Private documents are never bundled and are read
   at request time from the database.
3. **Search and graph metadata.** Row-level security on documents, versions, reviews and links: a link is visible only
   if both ends are readable, so a restricted title never appears through a link.
4. **AI retrieval.** One function (`kos_retrieve`) checks access for every row with the caller's server-verified
   identity, at request time. The model cannot choose a level, and nothing is cached.
5. **Playground simulation.** It is computed in the database. Only a super admin may simulate an identity outside
   their own permissions, and a simulation grants nothing.
6. **Errors and logs.** Refusals are generic. Retrieval analytics store document ids and counts; question text is
   stored only for unanswered questions, cut to 120 characters, for gap detection.

## Final findings: original vs implemented architecture

See `docs/knowledge-os.md` section 1. In short: public knowledge stays in Markdown and GitHub (unchanged). Client,
internal and management knowledge lives in Supabase (`kos_*`) with its own lifecycle, versions and reviews. One
retrieval service (`_shared/knowledge/retrieve.ts`) merges both for every AI consumer, under the caller's identity.
