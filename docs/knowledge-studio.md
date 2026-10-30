# Knowledge Studio

Written 30 October 2026. Knowledge Studio is the private screen where you explore, edit and publish the Houcine.world
knowledge brain (`houcine-world-brain/`, explained in `docs/knowledge-brain.md`) and test what the La Rosa View
Concierge does with it. Address: **/workspace/knowledge** (also linked from the workspace menu and from /admin).

## 1. Who can open it

Only a **super admin** of the platform (the same people who see Ecosystem and Platform Credentials). This is checked
twice: the page sends anyone else to "denied", and, what really protects the knowledge, the `knowledge-studio` Edge
Function checks the signed-in user's token and `is_super_admin()` on the server before reading or changing anything.
Its database tables have row-level security with no policy, so the browser cannot reach them directly. Visitors of the
public site never see any of it.

## 2. What you can do

| Section | What it is for |
| --- | --- |
| **Overview** | Whether the AI uses the published knowledge (in sync / out of sync / publishing), the number of notes (public, internal, restricted, archived), notes by brand, links between notes, sections awaiting confirmation, unpublished changes with a Publish button, problems found in the notes. Every number is counted from the notes themselves. |
| **Notes** | The explorer. Left: search (Enter searches all text and related words), folders, filters (brand, category, visibility, status, tag, archived), unpublished changes, New note. Middle: the note, with Edit, Side by side, Preview, Markdown (the whole file), Compare (with the published version) and History (published versions: view, compare, restore). Right: its properties (title, brand, category, visibility, confidence, tags, other names, sources, last checked), whether the AI can use it, its links and the notes linking to it. |
| **+ Teach the AI** | Write information in ordinary words, optionally "Help me organize it", then save it as a draft note (section 4). |
| **Graph** | The notes as a network: one dot per note, one line per real `[[link]]`, coloured by brand; people are squares. Zoom, drag, search, filter, click to see connections, double-click to open. |
| **AI Playground** | A private chat with the concierge: with the published knowledge (what visitors get) or with your drafts (a preview). Each answer has a retrieval inspector (what was understood, which passages were read and why, their brand, visibility, status and sources) and feedback buttons. Its **Coverage** tab scores a fixed list of visitor questions per brand (section 7b). |
| **Review** | What needs your attention: playground feedback, failed publications, note problems, drafts out of date, sections awaiting confirmation or outdated, notes without tags, notes not checked for six months. |
| **Activity** | Every operation with who and when: drafts, publications, AI index updates, failures, feedback, access changes. |
| **Settings** | AI access (which brands the concierge may read) and the publishing setup. |

## 3. Statuses you will see

- **Published**: this version is in the knowledge repository.
- **Draft**: a new note, saved but not published. No AI can see it.
- **Pending publication**: a published note with unpublished changes. The AI still uses the published version.
- **Needs review**: has parts awaiting confirmation or outdated.
- **Archived**: kept for history in `archive/`, never used by an AI.
- **AI out of sync**: the published notes and what the live concierge serves differ (a deployment is pending or failed).

Visibility: **Public** (the public AI may use it once published), **Internal** (admins only), **Restricted**
(confidential: never sent to any AI). Confidence: **Verified**, **Current policy**, **Incomplete**, **Awaiting
confirmation**, **Outdated**; a section can differ from its note by starting with a marker line such as
`> [!pending] ...`. The AI never states incomplete, unconfirmed or outdated parts as facts.

## 4. Teaching the AI something new

1. Click **+ Teach the AI**. Write the information in your own words.
2. Optional: **Help me organize it**. The AI suggests a title, sections, tags and related notes, lists details that
   seem to be missing (they are marked "not confirmed yet", never invented) and possible conflicts with existing
   notes (with links). These are suggestions only. If a suggested section adds a number, address or price you did not
   write, the server removes it and tells you. Your exact words are always kept.
3. Choose the brand, category, visibility, tags, source and related notes.
4. Tick **I confirm this information is accurate** only if it is. Otherwise the note is saved as *awaiting
   confirmation* and the AI will not state it as fact.
5. **Save as draft and review** opens the note in the editor. Check it (Preview), then **Publish**.

To correct a fact: open the note, edit, **Save draft**, then **Publish**. **Undo unpublished changes** drops a draft.
**Archive** moves a note out of the AI's reach (after publishing); **Restore** brings it back.

## 5. What "Publish" does (and why "Published successfully" takes a few minutes)

1. **Validating**: the whole brain is checked with your drafts applied: headers, links, sources, ids, that no public
   note links to an internal one, and that every site page a public note names (written like `/booking`) is a real
   public page. If anything fails, nothing is published and the problems are listed.
2. **Saving to the repository**: one commit on the main branch with the changed notes, the rebuilt AI index and the
   Studio's snapshot, all together (or nothing). The Markdown notes in the repository stay the source of truth.
3. **Updating the AI's index**: that commit starts the **Deploy Supabase** workflow, which redeploys the concierge
   with the new index (usually 2 to 5 minutes).
4. **Live**: the Studio asks the live concierge which index it serves. Only when it reports the new one does the
   Studio say *Published successfully*.

If the deployment fails, the previous knowledge keeps serving visitors. Your changes are safe in the repository, and
**Retry synchronization** runs the deployment again. If anything fails before the commit, nothing changed and your
drafts are kept. Only one publication runs at a time.

**Two admins at once.** Every save carries the version you started from. If someone saved the same draft meanwhile,
you see both versions and choose ("Load their version" or "Replace it with mine"). If a note changed on the main branch
after your draft started, publishing is refused until you compare and choose ("Keep my draft" or "Use the newer
version"). Nothing is overwritten silently.

## 6. Controlling what the AI can see

- Only **public, published, non-archived** notes are compiled into the AI's index. Internal and restricted notes, and
  drafts, never are, whatever else is set.
- **Settings, AI access** decides which brands' public notes the concierge may read (full access), and of which
  brands it may only read the overview, to point visitors elsewhere. The choice is stored as a note
  (`agents/la-rosa-view-concierge.md`), published like any change, logged in Activity, and enforced by the
  concierge's search on the server.

## 7. Feedback and the review queue

In the Playground, mark an answer Correct, Incomplete, Incorrect, Missing knowledge or Outdated (with an optional
note). It becomes an item in **Review**. Feedback never changes knowledge and never trains the model: it tells you
what to add or correct. Close the item once handled.

## 7b. Coverage

**AI Playground, Coverage** shows, for each brand, how many real visitor questions the knowledge answers. The questions
are fixed (`supabase/functions/_shared/brain/coverage-questions.ts`, written from the site's own pages) and each names
the note section that should answer it. The Studio runs only the search, with the visitor's words, exactly as the
concierge's search does: **no AI call, no cost**, so it works before the Anthropic key or the GitHub token exist, and
with the published knowledge or a preview with your drafts.

| Result | Meaning |
| --- | --- |
| **Answered** | The search finds the passage that states the answer. |
| **Awaiting confirmation** | The search finds the passage that says this is not published yet; that is the honest answer until you confirm the fact. |
| **Known gap** | No note answers it yet; the line says where the fact would come from (the site, or you). |
| **Not found** | A note should answer it, but the search does not find it from the visitor's words: improve the note (tags, other names, a clearer heading). |

"Concierge reaches" counts the questions the public La Rosa View Concierge can reach with its own access: other brands
are overview only, so most of their questions are not reached on purpose. The real concierge also rewrites a question
before searching, so it usually finds a little more than this score. Each publication from the Studio keeps the
score of the new knowledge in Activity, shown under the table as a trend. A session adds or changes questions (a
pull request the owner confirms); the test `scripts/ci/coverage.test.mjs` checks them against the notes and fails if
a question the notes answer stops being found.

## 8. Setup (once, by you, in the browser)

Knowledge Studio reads and publishes the notes through GitHub. Until this is done it is **read-only** (it shows the
notes bundled with the last deployment, and the Teach and Save buttons are disabled).

1. **Create the token.** On GitHub: your picture, **Settings**, **Developer settings**, **Personal access tokens**,
   **Fine-grained tokens**, **Generate new token**. Name it "Knowledge Studio". Repository access: **Only select
   repositories**, choose `houcine-world`. Permissions, under Repository: **Contents: Read and write**, **Actions:
   Read and write** (Metadata read-only is added automatically). Choose an expiry date and note it. **Generate**, copy
   the token.
2. **Store it in Supabase.** supabase.com/dashboard, the project, **Edge Functions**, **Secrets**, **Add new secret**:
   name `KNOWLEDGE_GITHUB_TOKEN`, value the token. Save.
3. **If `main` is a protected branch** that refuses direct pushes, publishing reports "GitHub refused the commit
   (protected branch)" and changes nothing. In that case, in the repository's **Settings**, **Rules** (or **Branches**),
   allow the token's owner to bypass the rule, or tell a session and it will discuss an alternative.
4. The playground and the formatting help use the concierge's own `ANTHROPIC_API_KEY` (docs/concierge-setup.md).
   Without it, the playground still shows what would be retrieved and the formatting help still checks existing
   knowledge, but no answers are written.

Optional secrets: `KNOWLEDGE_GITHUB_REPO` ("owner/name", default `HoucineMohamed/houcine-world`) and
`KNOWLEDGE_GITHUB_BRANCH` (default `main`). The database tables are created by the migration
`20261030090000_knowledge_studio.sql`, which the Deploy Supabase workflow applies; the function itself is deployed by
the same workflow (`knowledge-studio`).

When the token expires, publishing stops with "GitHub refused the Studio's token": create a new one and replace the
secret.

## 9. How it is built (for sessions)

- `supabase/functions/knowledge-studio/`: `core.ts` (every action, pure, injected dependencies), `github.ts` (GitHub
  REST over fetch: reads the brain, publishes ONE fast-forward commit through the Git Data API, never forced),
  `store.ts` (the four tables), `index.ts` (authentication, super-admin check, routing), `snapshot.generated.ts` (the
  notes bundled for read-only mode, written by `scripts/brain/build.mjs`).
- `supabase/functions/_shared/brain/compile.ts`: the ONE compiler (notes -> index), used by the Node build, CI and the
  Studio, so a publication writes exactly what `build.mjs` would. `sha256.ts`: the fingerprint, identical everywhere.
- The concierge exposes `GET /concierge/status` (fingerprint and counts only) so the Studio can confirm "live".
- Tables (`supabase/migrations/20261030090000_knowledge_studio.sql`): `knowledge_drafts` (one per note path, with a
  version), `knowledge_publications` (one in flight at most, by a unique index), `knowledge_events` (append-only),
  `knowledge_feedback`.
- Frontend: `src/pages/workspace/knowledge/KnowledgeStudio.tsx`, `src/components/knowledge/*`,
  `src/services/knowledgeStudio.ts`, `src/lib/knowledge/*` (a safe Markdown preview that builds React elements, never
  HTML; a line diff; the note header form using the compiler's own reader and writer).
- Coverage: `supabase/functions/_shared/brain/coverage.ts` (the pure scorer) and `coverage-questions.ts` (the
  questions); the read-only action `GET coverage`; `src/components/knowledge/Coverage.tsx`; test
  `scripts/ci/coverage.test.mjs`.
- Tests: `scripts/ci/knowledge-studio.test.mjs` (the full workflow with an in-memory git repository and database,
  `scripts/brain/studio-fakes.mjs`), plus the brain, concierge and pipeline tests.

**Known limitations.**
- The playground's "published knowledge" mode uses the index deployed with the Studio function. It is deployed by the
  same workflow run as the concierge, so they match; the inspector shows both fingerprints if they ever differ.
- Publishing depends on GitHub and on the deploy workflow (minutes, not seconds), so a change is never reported live
  before the concierge really serves it.
- Activity records Studio operations. Edits made directly in the repository appear in a note's History (git), not in
  Activity.
