---
id: maps-roadmap
title: Brain roadmap
brand: houcine-world
type: index
visibility: internal
status: verified
tags: [maps, roadmap, plan]
updated: 2026-10-30
---

# Brain roadmap

As of 30 October 2026. Pull request numbers are in the houcine-world repository; the plan is issue #76 (epic #74).
No date is promised for anything not done.

## Timeline
```mermaid
timeline
  title The knowledge brain and Knowledge Studio
  29 October 2026 : The knowledge brain and the AI concierge built on it
  30 October 2026 : Knowledge Studio : The audit of every brand : Coverage score in the Playground, merged
  In review : Coverage on Overview : Site pages checked : Publish status and token warning : Feedback by brand : Duplicates and contact checks : Guided Teach the AI : Phone targets : Site colours : Houcine.education wording : These maps
  Waiting : GitHub Actions minutes, about 1 November : Studio setup by the owner : Owner answers for La Rosa View
  Later : Review of notes not checked for six months, from about April 2027
```

## Status board
```mermaid
flowchart LR
  subgraph Done
    D1["Knowledge brain"]
    D2["Concierge on the brain"]
    D3["Knowledge Studio"]
    D4["Coverage score"]
  end
  subgraph Review["In review, waiting for the owner's merge"]
    R1["Overview coverage"]
    R2["Site pages check"]
    R3["Publish status and token warning"]
    R4["Feedback by brand"]
    R5["Duplicates and contact checks"]
    R6["Guided Teach the AI"]
    R7["Phone targets"]
    R8["Site colours"]
    R9["Houcine.education wording"]
  end
  subgraph Waiting
    W1["Actions minutes, then Deploy Supabase"]
    W2["Token and key set up by the owner"]
    W3["Owner answers"]
  end
  Done --> Review --> Waiting
```
See also [[Publishing flow]] and [[Open questions map]].
