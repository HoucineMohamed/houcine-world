---
id: maps-how-the-ai-answers
title: How the AI answers
brand: houcine-world
type: index
visibility: internal
status: verified
tags: [maps, concierge, ai, retrieval]
updated: 2026-10-30
---

# How the AI answers

The La Rosa View Concierge, the chat on `/larosaview` (docs/knowledge-brain.md).

## One question, step by step
```mermaid
sequenceDiagram
  actor V as Visitor
  participant C as Concierge
  participant U as Understanding step
  participant S as Search over the index
  participant A as Answer model
  V->>C: a question, in any language
  C->>U: the question and the conversation so far
  U-->>C: what is asked, the language, search queries
  C->>S: the queries, within the brands it may read
  S-->>C: the best passages, each with its brand and confidence
  C->>A: the passages and the rules
  A-->>V: the answer, streamed
  Note over A,V: Incomplete, unconfirmed or outdated passages are never stated as facts
```

## What the search may read
```mermaid
flowchart LR
  I["The public index"] --> F{"Brand of the note"}
  F -->|La Rosa View or Houcine.world| Full["Every public passage"]
  F -->|Houcine.tech, studio, education, management| Over["The overview note only, to point visitors elsewhere"]
  N["Internal and restricted notes, drafts, archive"] -.->|never compiled| X(["Never read by any AI"])
```
The access is set in Knowledge Studio, Settings, AI access; the dashboard (`maps/generated/dashboard.md`) draws it from
the notes. See also [[Knowledge architecture]].
