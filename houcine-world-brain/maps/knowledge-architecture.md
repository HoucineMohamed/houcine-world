---
id: maps-knowledge-architecture
title: Knowledge architecture
brand: houcine-world
type: index
visibility: internal
status: verified
tags: [maps, architecture, index]
updated: 2026-10-30
---

# Knowledge architecture

## From a note to the AI
```mermaid
flowchart LR
  subgraph Brain["houcine-world-brain, Markdown notes"]
    Pub["Public notes"]
    Int["Internal notes"]
    Conf["Restricted notes"]
    Arch["archive"]
  end
  Studio["Knowledge Studio drafts"] -->|Publish| Brain
  Brain --> Check{"The one compiler checks every note: header, links, sources, site pages"}
  Check -->|any problem| Stop(["Nothing is published"])
  Check -->|all valid| Index["The AI index, public notes only"]
  Index --> Deploy["Deploy Supabase"] --> Concierge["The live concierge"]
  Int -.-> Never(["Never compiled"])
  Conf -.-> Never
  Arch -.-> Never
  Studio -.->|drafts| Never
```

## Folders
```mermaid
mindmap
  root((houcine-world-brain))
    brands
      one folder per brand
    people
    policies
    relationships
    sources
      where each fact comes from
    agents
      what each AI may read
    internal
      owner only
    maps
      these diagrams
      generated dashboard and canvas
    archive
      kept, never used
    schemas
      the note format
```
The format of a note: `schemas/note-format.md`. The guide: docs/knowledge-brain.md. See also [[How the AI answers]] and
[[Publishing flow]].
