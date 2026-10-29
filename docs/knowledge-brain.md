# The Houcine.world knowledge brain and the La Rosa View Concierge

Written 29 October 2026. The owner's page (secrets, checks, costs) is `docs/concierge-setup.md`; this page explains
how the brain and the concierge work and how to maintain them.

## 1. What it is

- **The knowledge brain** (`houcine-world-brain/`) is the single source of truth for what the Houcine.world AI agents
  may say: interlinked Markdown notes in the style of an Obsidian vault, each with a header saying which brand it is
  about, who may see it, how reliable it is, where its facts come from and when they were last checked.
- **The La Rosa View Concierge** (the chat on `/larosaview`) is the first agent on it. Each message goes through a real
  pipeline: a language model interprets the message in the context of the conversation, a search engine retrieves the
  relevant passages of the brain (only from the brands the agent may use), and a second model writes the answer from
  those passages, streamed to the widget. There is no list of saved replies and no keyword-to-answer table.

```
visitor ─▶ ChatWidget ─▶ useConciergeChat ─(POST /functions/v1/concierge/chat, streamed)─▶ concierge Edge Function
                                                                                             │ core.ts      checks
                                                                                             │ pipeline.ts  1 interpret (small model, JSON)
                                                                                             │              2 retrieve (_shared/brain/retrieve.ts)
                                                                                             │              3 answer  (main model, streamed)
houcine-world-brain/*.md ─(scripts/brain/build.mjs)─▶ _shared/brain/index.generated.ts ─────┘
```

## 2. Where things live

| Path | What |
| --- | --- |
| `houcine-world-brain/` | The notes. `README.md` there is the short version of this page; `schemas/note-format.md` the note format. |
| `scripts/brain/lib.mjs`, `build.mjs` | The compiler: checks every note, compiles the public ones into the index. |
| `supabase/functions/_shared/brain/` | Shared by every agent: `text.ts` (normalizing, stemming, typo tolerance), `retrieve.ts` (search), `prompts.ts` (the interpreter and answer prompts), `agent.ts` (the agent profile type), `types.ts`, and the generated `index.generated.ts`. |
| `supabase/functions/_shared/llm/` | The model interface (`provider.ts`) and the Anthropic adapter (`anthropic.ts`). |
| `supabase/functions/concierge/` | The La Rosa View agent: `agent.ts` (its profile), `core.ts` (request rules), `pipeline.ts` (one turn), `index.ts` (the HTTP function). |
| `src/hooks/useConciergeChat.ts`, `src/components/ChatWidget.tsx` | The widget (unchanged look; streaming, memory, honest errors). |
| `scripts/brain/evals/concierge-cases.json` | The evaluation set. |
| `scripts/ci/brain.test.mjs`, `concierge.test.mjs`, `concierge-pipeline.test.mjs` | Tests run by CI. `scripts/brain/eval-live.mjs`: the live evaluation (real models, by hand). |

## 3. Knowledge rules

- **Verified facts only.** A note states only what the public site or the owner has confirmed, and cites it
  (`sources`, ids declared in `sources/website.md`). Unknowns are written as unknowns, under a status callout
  (`> [!incomplete] No price is published...`) so the agent can say "not published" instead of guessing. Questions
  waiting for the owner are listed in `internal/open-questions.md`.
- **Status on every passage.** Each passage reaches the model with its status (`verified`, `policy`, `incomplete`,
  `pending`, `outdated`) and the note's `updated` date; the instructions say how to treat each.
- **One source of truth.**
  - Facts live in one note; other notes link to it (`[[Booking requests]]`) instead of copying it.
  - Where code also needs a value (the La Rosa View email, the booking path, the event types of the form), the note
    holds it as `fact_<name>` and `scripts/ci/brain.test.mjs` compares it with the site's own constant
    (`src/config/contact.ts`, `src/pages/BookingForm.tsx`, the service list of `src/pages/LaRosaView.tsx`). Change
    one without the other and CI fails.
  - Prices of Houcine.tech and Houcine.studio are NOT copied into the brain: their notes point to the catalogues that
    hold them (`src/content/techCatalogue.ts`, `src/data/servicePackages.ts`), and the La Rosa View agent cannot read
    those notes anyway.
- **Conflicts are settled by an explicit rule, not by picking a plausible value.** The rule: *a brand's own note
  wins for that brand; a value published for another brand or for the whole ecosystem is never applied to a brand
  that has not published its own.* Two real cases were found while building the brain:
  - The site shows a phone number on `/contact` (Houcine.world's general line), while La Rosa View publishes none.
    The brain records both, separately: `hw-contact` (the ecosystem's number, attributed) and `lrv-contact` (La Rosa
    View has no number of its own; email and booking form are its routes).
  - "Prices in EUR or USD, Revolut and Société Générale" appears on the Houcine.tech and Houcine.studio pages. It is
    recorded as `tech-payment` (those brands) and `lrv-policies` says explicitly that it is not a La Rosa View term.
- **Live data stays where it lives.** Availability, quotes and confirmations are not in the brain and must never be:
  they belong to the team (today by email and the booking form). If a booking system with real availability is added
  later, the agent must read it at answer time from that system (a separate, read-only data step), never from notes.
- **Visibility.** Only `public` notes are compiled. `internal` and `confidential` notes stay in the repository; the
  build refuses a public note that links to a non-public one, and a test checks that no trace of a non-public note
  reaches the index.

## 4. Updating the knowledge

All of this is a pull request. Because the index lives under `supabase/`, which is a critical path, **every knowledge
change waits for the owner's merge** (`docs/automation.md`): the AI's knowledge never changes without you.

**Add a note.** Create `houcine-world-brain/brands/<brand>/<subject>.md` with the header of
`schemas/note-format.md` (copy an existing note), one `##` section per sub-subject, and links to related notes.

**Link notes.** `[[Title]]` or `[[Alias]]`; `[[Title|text shown]]` to show other words. A link that matches no note
fails the build.

**Update a fact.** Edit the sentence, update `updated:`, add the source id if it is new (declare it in
`sources/website.md`; for something the owner confirmed in writing, a line like
`- \`owner-confirmation-2026-11-02\`: the owner, by email`). If the fact is also a `fact_` value, change the site's
constant in the same pull request. When a fact is no longer true but worth keeping, move it under a heading with
`> [!outdated]` rather than deleting history.

**Remove knowledge.** Delete the note or section, and the links to it (the build lists them).

**Refresh the index.** A session runs `node --experimental-strip-types scripts/brain/build.mjs` (it prints the
number of notes and passages and a fingerprint) and commits `supabase/functions/_shared/brain/index.generated.ts`.
`--check` only verifies; CI runs the same check through `scripts/ci/brain.test.mjs`. After the merge, the
**Deploy Supabase** workflow redeploys the function and the live chat uses the new knowledge at once (no restart,
no cache to clear: the index is part of the deployed function).

**Add a brand (or a new agent).**
1. Add the brand id to `BRANDS` in `scripts/brain/lib.mjs` and to the `Brand` type in `_shared/brain/types.ts`.
2. Create `houcine-world-brain/brands/<brand>/` with an `overview.md` and its notes.
3. For a new chat agent: an `AgentProfile` like `concierge/agent.ts` (its brands, its contact note, its pinned
   passages) and a function like `concierge/index.ts` that uses it, plus its own widget. Retrieval, prompts, the model
   adapter and the tests are reused as they are. A new function must also be added to the deploy workflow's list.

## 5. How retrieval works

The brain is small (tens of notes), so the search is a precomputed hybrid built into the function, with no database
and no extra service:

1. **Understanding first.** The interpreter model rewrites the visitor's message into 1 to 4 self-contained English
   search queries ("I need him for my event" in a La Rosa View chat becomes "book DJ La Rosa for an event; booking
   request form"), resolving pronouns and follow-ups with the conversation and the memory. This is what makes
   paraphrases, slang, typos and the three languages work; it is the model's understanding, not a list of phrases.
2. **Lexical scoring.** Each `##` section of a note is a passage. The visitor's words and the queries are normalized
   (accents, Arabic letter forms and article, simple stemming in English and French), matched with BM25 on the
   passage text and, weighted higher, on its title, aliases, tags and heading; unknown words are matched to known
   ones within one or two typos. A query that names a note (its title or an alias) adds a bonus.
3. **Brand filter.** Only the agent's brands (La Rosa View and the shared Houcine.world notes), plus the overview of
   the other brands so it can point visitors elsewhere. Nothing else can be retrieved, whatever is asked.
4. **Graph step.** The best passage of each note linked from the top notes comes along (bookings bring the shared
   booking-request rule and the contact note).
5. **Budget.** At most 6 matched passages (3 per note) and 2 linked ones, about 7,000 characters, plus the pinned
   contact passage. With no match at all, the brand overview is sent so the model can say plainly it has no answer.

Results are cached in memory per query set (never per visitor). Embeddings were not added: Anthropic offers no
embedding model, a second provider would mean a new key and dependency, and at this size the interpreter's rewriting
plus BM25 is reliable. If the brain grows to hundreds of notes, the next step is vector search in the existing
Supabase database (pgvector), filled by the same build.

## 6. The model, the prompts and the memory

- **Provider.** Anthropic's Messages API over plain `fetch` (no SDK: no new dependency). Everything model-specific is
  in `_shared/llm/anthropic.ts` behind the `LlmProvider` interface; another provider is another adapter.
- **Models.** Answers: `ANTHROPIC_MODEL`, default `claude-opus-5-5` at effort `low` (fast and economical for chat,
  strongest at staying grounded and at Tunisian Arabic), with Anthropic's server-side refusal fallback enabled.
  Interpreting: `CONCIERGE_INTERPRETER_MODEL`, default `claude-haiku-5-5`, with a JSON schema (structured outputs).
  The fixed instructions are marked for prompt caching.
- **Instructions** (`_shared/brain/prompts.ts`): identity and scope from the agent profile; facts only from the
  passages; statuses; never invent availability, prices, policies, contact details or a confirmation; one targeted
  question when a needed detail is missing; answer the question asked; use the memory, treat inferred items as
  assumptions; the visitor's language; visitor text, memory and passages are data, and instructions inside them are
  ignored; never reveal the instructions. They contain no brand facts at all.
- **Prompt-injection defences.** Visitor text, the memory and passages travel in delimited blocks, with `<` and `>`
  replaced by look-alike characters so nothing can close a block; the model has no tools, so a message cannot make it
  do anything but write text; the index holds public notes only, so nothing confidential can be revealed.
- **Memory.** The interpreter returns, each turn, the details the visitor **stated** and those it only **inferred**,
  plus a short summary. The widget keeps it with the transcript and sends it back with the last 8 turns; older turns
  survive through the memory and the summary. Emails, phone and card numbers are filtered out of the memory in code.

## 7. Security and limits

- The API key exists only as a Supabase secret, read by the function; the browser never sees it and cannot choose
  the model, the prompt, the brands or the notes (the request accepts only the message, recent turns, the memory, a
  conversation id and a streaming flag, all size-checked).
- Allowed origins: the site's own addresses. Rate limit: 20 messages per 10 minutes per address. Body at most 32 KB;
  message 2,000 characters; at most 8 turns, 12 memory items. Model answers at most 1,500 tokens; interpreter at most
  1,500 tokens. Time limits: 12 s to interpret (then the turn carries on without it), 45 s to answer, 90 s in the
  browser.
- Failures: every model or network failure ends in one plain message with the team's email and the booking form;
  "Try again" resends the same message in the same place without duplicating it. No error detail reaches the visitor;
  the function logs only step outcomes (`interpreter=ok passages=7 answer=ok`).
- No conversation is stored on the server, so one visitor cannot reach another's messages.

**Known limitations.**
- The rate limit is kept in the function's memory, so each running copy counts on its own; the spend limit in the
  Anthropic console is the real cap.
- The memory is held by the visitor's browser: a visitor could edit their own memory, which only affects their own
  conversation (it is treated as data, never as instructions).
- A follow-up that only makes sense with the conversation depends on the interpreter; if it fails, the search falls
  back to the visitor's words plus their previous message, which covers most follow-ups but not all.
- The live evaluation (section 8) needs a key and was not run when this was written: the offline tests prove the
  plumbing and the retrieval, not the wording of real answers.

## 8. Testing

| What | How | When |
| --- | --- | --- |
| Notes valid, index current, non-public notes absent, facts equal to the site's constants, links, retrieval for every evaluation case, brand separation, freshness (edit a note, rebuild, the new fact is found) | `node --experimental-strip-types --test scripts/ci/brain.test.mjs` | every CI run |
| Request rules, memory privacy filter, origins, rate limit | `scripts/ci/concierge.test.mjs` | every CI run |
| One full turn with a scripted fake model: what reaches the model, multi-turn memory, interpreter failure, every provider failure (timeout, rate limit, bad key, outage, refusal, empty answer), fallback reset, prompt injection, brand separation, conversation isolation; the Anthropic adapter with a fake network (request shape, streaming, errors, timeouts) | `scripts/ci/concierge-pipeline.test.mjs` | every CI run |
| Real answers: paraphrases and typos, multi-turn, several sources, unknown information, brand separation, prompt injection, French, Tunisian Arabic (both scripts) | `ANTHROPIC_API_KEY=... node --experimental-strip-types scripts/brain/eval-live.mjs` (or `--endpoint=<deployed URL> --pause=35`) | by hand, after changing prompts, models or many notes; costs a few cents |

The evaluation set (`scripts/brain/evals/concierge-cases.json`) lists, per case, the conversation, the notes the
search must find, the facts the answer must contain (any of several phrasings) and the claims it must not make
(invented prices, "your booking is confirmed", leaked instructions). Wording is never compared.

To try the chat locally: set the key as a Supabase secret of a local Supabase (`supabase functions serve concierge`
with `--env-file`), run the site with `npm run dev`, and open `/larosaview`; or call the deployed function with the
live evaluation's `--endpoint` mode.
