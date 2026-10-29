# Houcine.world knowledge brain

The single, editable source of truth for what the Houcine.world AI agents may say. It is a folder of plain
Markdown notes that link to each other with `[[wiki links]]`, the way an Obsidian vault does: you can open this
folder in Obsidian (File, Open folder as vault) and browse the graph, or edit the files on GitHub.

The first agent that reads it is the **La Rosa View Concierge** (the chat on `/larosaview`). The full guide, with
every step, is `docs/knowledge-brain.md`. In short:

- **One note, one subject.** A note is a `.md` file with a small header (between two `---` lines) that says which
  brand it belongs to, what kind of note it is, who may see it, how sure we are, where the facts come from and when
  it was last checked. The fields are explained in `schemas/note-format.md`.
- **Link instead of repeating.** If a fact already lives in another note, link to it (`[[Booking requests]]`)
  rather than copying it. The search follows these links.
- **Only verified facts.** Write only what the public site or the owner has confirmed. Anything unknown goes under
  a `> [!pending]` or `> [!incomplete]` marker, or in `internal/open-questions.md`, never as a fact.
- **Public or not.** Only notes with `visibility: public` ever reach an AI agent. `internal` and `confidential`
  notes stay in this repository and are never compiled into the agents' index.
- **After an edit**, a session (or you, on a computer with Node) runs
  `node --experimental-strip-types scripts/brain/build.mjs`, which checks every note and rewrites the agents'
  index (`supabase/functions/_shared/brain/index.generated.ts`). CI fails if the index is out of date or a note is
  invalid. Merging to `main` redeploys the concierge with the new knowledge.

Folders:

| Folder | What goes there |
| --- | --- |
| `brands/<brand>/` | Everything about one brand: overview, services, bookings, policies, FAQ... |
| `people/` | People, with only what is published about them |
| `policies/` | Rules shared by several brands (for example the booking-request rule of the Terms) |
| `relationships/` | How brands, people and projects connect |
| `sources/` | Where facts come from (each note cites these ids) |
| `schemas/` | The note format (not indexed) |
| `internal/` | Notes for the owner and the maintainers only (never sent to an AI agent) |
