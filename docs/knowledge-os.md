# Houcine.world Knowledge OS

Written 1 November 2026. Knowledge OS turns Knowledge Studio into one knowledge infrastructure with four visibility
levels, a private library, governance, and one retrieval service for every AI assistant. Labels: **IMPLEMENTED**,
**TESTED** (local database / unit / browser tests), **CONFIGURATION REQUIRED**, **DEFERRED**, **NOT IMPLEMENTED**.
Nothing here is claimed to work in production: nothing was deployed, and CI could not run.
Assessment and final findings: `docs/knowledge-os-assessment.md`.

## 1. Architecture overview — IMPLEMENTED, TESTED

```
PUBLIC        houcine-world-brain/*.md ── Knowledge Studio publish (public notes ONLY) ──▶ public GitHub repo ──▶ compiled index
CLIENT                                                                                                   (bundled; unchanged)
INTERNAL      Supabase kos_documents / kos_versions / kos_reviews / kos_links ◀── Knowledge Library (/workspace/knowledge/library)
MANAGEMENT                     │  one access rule (kos_allows + kos_my_identity), deny by default
                               ▼
              kos_retrieve (AI) · RLS (lists, search, graph, versions) · kos_simulate (access test) · kos_insights
                               ▼
_shared/knowledge/retrieve.ts ─▶ client assistant · intelligence assistant · Autopilot assistant
concierge (public)  ─▶ compiled public index only (no private knowledge, by design and by test)
```

**Main difference from the original plan.** The GitHub repository is **public** (verified), so non-public knowledge
cannot use the Markdown/GitHub pipeline at all. Public knowledge keeps that pipeline. Client, internal and management
knowledge lives in Supabase, with the same kind of content: Markdown text, title, category, tags and sources.

## 2. Visibility model — IMPLEMENTED, TESTED

| Level | Where it lives | Who reads it |
| --- | --- | --- |
| Public | Markdown note (Knowledge Studio → GitHub → index) | everyone, every assistant |
| Client | Library | the clients of its brand (or of every brand when global), the restricted client only when restricted; the brand's team; super admins |
| Internal | Library | the brand's team members (or every team member when global); super admins. Never clients or partners |
| Management | Library | super admins only |

Partners and anonymous visitors get no private knowledge. Brand admins never read management knowledge.

## 3. Scope model — IMPLEMENTED, TESTED

Every document is either global (`brand_id` empty) or scoped to one real brand (`brands.id`; no hardcoded list, so
new brands work without schema changes). A client document can also be restricted to one client contact. A
membership held on an organization covers its people, as in Client OS.

## 4. Authorization rules — IMPLEMENTED, TESTED

- **One rule.** `kos_allows(visibility, brand, contact, identity)`, with the identity always computed by the database
  from the signed-in person (`kos_my_identity`: super admin, brand memberships, client memberships).
- **Who may edit:** `kos_can_edit`. Super admins edit everything. Brand admins edit their brands' client and internal
  documents. Global and management documents are for super admins only.
- **Who may read:** editors read every status; everyone else reads only live documents (a published version, not
  archived, not expired).
- **Same rule everywhere:** row-level security applies it to lists, search, preview, versions, reviews and graph
  links (a link is visible only if both ends are). `kos_retrieve` applies it for AI, `kos_simulate` for the access
  test, `kos_insights` for analytics.
- **No direct writes:** the browser has no write grant on the tables. Every change goes through a `kos_*` function
  that checks rights and writes `audit_logs` (`knowledge.*`).

## 5. Document lifecycle — IMPLEMENTED, TESTED

The stages are: draft, then in review, then approved, then published, then archived.

- **Review:** request a review (optionally naming a reviewer who can edit the document), then approve, or reject
  with a reason.
- **Publish and unpublish:** publishing is an explicit action. Unpublishing removes the document from every reader
  and assistant at once.
- **Archive and restore:** a restored document comes back as an unpublished draft.
- **Duplicate and delete:** documents can be duplicated; only never-published documents can be deleted.
- **Changing visibility or scope** (`kos_set_scope`):
  - making a document visible to more people needs an explicit confirmation;
  - anything involving management needs a super admin;
  - nobody can move a document into a brand they don't administer.
- **Public visibility is not set here:** public knowledge is a reviewed note in Knowledge Studio.

## 6. Version history — IMPLEMENTED, TESTED

Every save is a new `kos_versions` row (append-only), with its author, time and change note.

- **What readers get:** the published version, so an edit never changes what readers and assistants receive until
  it is reviewed and published.
- **Restoring:** an earlier version comes back as a new version; history is never rewritten.
- **Access:** only editors see the version history.

## 7. Brand knowledge spaces — IMPLEMENTED, TESTED

The Library's "Brand space" filter shows one brand's documents with its own counts. Brand admins open
`/workspace/knowledge/library` (sidebar: Knowledge), which offers only the Library, Insights and the access test. The
public-notes Studio stays super-admin only.

## 8. Search — IMPLEMENTED, TESTED

- **Library lists:** filtered and paged in the database (50 per page). Filters: visibility, brand, status,
  category, tag, owner; text search over title, description, category and content.
- **AI retrieval:** PostgreSQL full-text search (`simple` configuration, prefix matching) with weights
  title > category and tags > content, a GIN index, and a plain-text snippet.
- **Public notes:** keep their BM25 search (unchanged).
- **Semantic (vector) search:** DEFERRED.

## 9. Graph — IMPLEMENTED (browser test: NOT DONE)

The existing Graph shows private documents the viewer may read next to public notes, with their relations: a document,
or a public note id, with types related, procedure, policy, service, FAQ, source, project type or brand. A new filter
switches between public, private or both.

- **Editing relations:** relations are added and removed in the Library.
- **Hidden ends:** a relation whose other end the viewer cannot read is never returned.
- **Problems flagged** in Insights: broken relations (target archived or missing) and disconnected documents.
- **Testing:** the graph view is part of the super-admin Studio, which needs the `knowledge-studio` function. My
  browser harness does not emulate that function, so the graph was not browser-tested. Its data rules are tested in
  the database.

## 10. AI retrieval integration — IMPLEMENTED, TESTED

`supabase/functions/_shared/knowledge/retrieve.ts`:

- `publicSources`: the compiled public index, limited to the brands passed in;
- `privateSources`: `kos_retrieve`, called with the **person's own client**;
- `retrieveKnowledge`: both together.

| Consumer | Knowledge it gets |
| --- | --- |
| Client assistant (`client-os-ai`, client) | public notes of their brands + client documents they may read |
| Intelligence assistant (`client-os-ai`, internal) | public notes of the brands in scope + internal and client documents of those brands (+ management for super admins) |
| Autopilot assistant | public notes + private documents the admin may read |
| La Rosa View Concierge | public notes only (unchanged; a test fails if it ever references private retrieval) |
| Command Center analyst | no knowledge (facts only; unchanged) — NOT IMPLEMENTED by choice |

Only published, non-archived, non-expired documents are retrieved. Nothing private is cached, so a visibility change,
unpublication, archive, expiry, membership change or brand reassignment applies to the very next question. The model
never sees or chooses a permission level, and text in a question cannot change it (tested).

## 11. Source attribution — IMPLEMENTED, TESTED

Each source carries its title, its version (`vN`, or a public note's date), its section or category, its brand and its
visibility. Assistants show "Published information used: …". A client sees only citations of documents they may
read; no path, storage address or internal id is shown ("Knowledge Library" as the source).

## 12. Knowledge analytics — IMPLEMENTED, TESTED

`kos_insights` (Insights page) covers:

- counts by status, visibility and brand; recently updated documents;
- review overdue, expiring, unowned, awaiting review;
- AI retrievals over 90 days, the share that was answered, use per AI system;
- most and never retrieved documents;
- knowledge gaps: the same unanswered question at least twice in 30 days. A gap can become an internal **draft**,
  never published automatically;
- possible duplicates (same or very similar titles in the same scope);
- broken relations and disconnected documents.

`kos_retrievals` stores consumer, user, brand scope, document ids, counts and the top score. The question text is
stored **only when nothing was found**, cut to 120 characters. Analytics are scoped to what the person may edit; the
raw log is super-admin only.

Conflicting statements across documents: NOT IMPLEMENTED (shown as a limitation).

## 13. Autopilot integration — IMPLEMENTED, TESTED

**New event types:** `knowledge.review_requested`, `knowledge.review_overdue`, `knowledge.expiring`,
`knowledge.document_published`, `knowledge.document_archived`, `knowledge.gap_detected` (`knowledge.duplicate_detected`
is reserved).

**Scan:** `kos_scan` runs inside Autopilot's existing monitoring tick (`ap_tick`). It finds overdue reviews
(notifying the owner, or the admins when nobody owns the document), documents expiring within 14 days, and repeated
gaps.

**Templates in the builder:** review overdue (notify the owner), review requested (notify the admins, super admins
included), knowledge gap (create an alert).

**No automatic publishing:** automations never publish, unpublish or change visibility; no knowledge action exists
for them.

## 14. GitHub publication — IMPLEMENTED, TESTED

- **Guard:** Knowledge Studio's publish refuses any draft whose visibility is not `public` (agent access notes
  excepted: they are configuration). The answer is "private_knowledge" and nothing is committed (unit-tested on the
  Studio's fake repository).
- **Help text:** the editor and Teach the AI now say internal and restricted notes are not publishable and point to
  the Library.
- **Unchanged:** the public pipeline itself (validation, compiled index, failure handling, `knowledge_events` log).
- **Owner decision:** the 10 existing `internal` notes in the repository are already public, in the files and their
  history. They are low-sensitivity (see the assessment).

## 15. Private knowledge storage — IMPLEMENTED, TESTED

Private knowledge lives in Supabase PostgreSQL, under row-level security. Content is text, up to 200,000 characters.
File attachments for private documents are NOT IMPLEMENTED. Client OS's private storage bucket is the natural place,
later.

## 16. Security considerations — TESTED

**Deny by default:**

- anonymous visitors are refused everywhere;
- partners get no private knowledge;
- direct table writes are refused;
- version history and reviews are for editors only;
- the retrieval log is super-admin only.

**Simulation:** a brand admin may simulate only the public, a client of their brand, or their brand's admin. Only a
super admin may simulate a super admin or another brand. A simulation grants nothing and is not logged as a retrieval.

**Errors:** refusals are generic ("Not allowed.") and never name a restricted document.

**Mutation checks:** breaking the brand check, the client restriction or the archive check each makes the tests fail.

## 17. Environment variables and secrets

None added. The assistants keep using `ANTHROPIC_API_KEY`, and Knowledge Studio keeps its GitHub token.

## 18. Testing

- **Database** (`bash scripts/db/test-command-center.sh` runs `scripts/db/knowledge-os.test.sql` after the other
  suites):
  - roles: super admin, brand A and B admins, clients A and B, partner A, a revoked client, anonymous;
  - creation rights; drafts invisible; review, rejection with a reason, publication;
  - each role's exact retrieval set; prompt-like text in a question changes nothing;
  - edits not live until republished; loosening needs confirmation; management and cross-brand moves refused;
  - archive, restore, unpublish and expiry leave retrieval; suspension and brand reassignment apply at once;
  - versions append-only and restore; deletion rules; graph link hiding; simulation limits and draft comparison;
  - gaps, scoped insights, Autopilot events and notifications, audit, plain-text snippets;
  - rollback (`scripts/db/knowledge-os-rollback.sql`) and re-apply.
- **Unit** (`scripts/ci/knowledge-os.test.mjs`): the publication guard; the compiled index holds no internal note;
  private retrieval runs with the caller's client and refusals return nothing; citations carry no id or path; the
  concierge never references private retrieval; the migration's deny-by-default grants. The Studio test that
  expected internal notes to be committed now expects them to be refused.
- **Browser** (real local database, Supabase's API emulated as each user): 84 checks, of which 20 are Knowledge OS:
  - brand admin redirected to the Library; a document created, reviewed and explicitly published;
  - brand A and B separation; version 2 not live until republished;
  - access test for a client, with no super identity offered to a brand admin; insights;
  - the client assistant gets client knowledge only, with a clean citation;
  - the intelligence assistant gets brand A's published internal knowledge only;
  - unpublishing applies to the next question; a partner refused; phone layouts.
- **Regression:** Command Center 33/33, Autopilot 38/38, plus the full Client OS and assistants flow inside the 84;
  `scripts/ci` and `scripts/dev`; the build and smoke check (no private code in the public bundle).

## 19. Configuration requirements

1. Merge #94 (the Client OS assistants, which never reached `main`), then this pull request. Both target `main`.
2. The migration needs no Supabase setting; no new secret.
3. The 10 existing internal notes in the public repository: decide whether to move them into the Library and remove
   them from the repository. Removing them from git history needs a history rewrite, which is the owner's call.

## 20. Known limitations and deferred work

- Semantic (vector) search: DEFERRED (keyword and full-text ranking).
- Conflicting-information detection: NOT IMPLEMENTED. Duplicates are by title similarity only.
- File attachments for private documents: NOT IMPLEMENTED.
- AI help when writing (suggested titles and tags, related documents): NOT IMPLEMENTED in the Library. Teach the AI
  keeps its existing help for public notes, and AI never publishes or raises visibility.
- Converting a private document into a public note: DEFERRED. Today a super admin writes the public note in Knowledge
  Studio, so it goes through that review.
- Graph and the super-admin Studio sections were not browser-tested (they need the `knowledge-studio` function).
- The Command Center analyst does not use knowledge.
- Retention of the retrieval log: no automatic purge (owner decision).
