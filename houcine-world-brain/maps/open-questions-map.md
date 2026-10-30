---
id: maps-open-questions
title: Open questions map
brand: houcine-world
type: index
visibility: internal
status: verified
tags: [maps, owner, questions]
updated: 2026-10-30
---

# Open questions map

What only the owner can answer, from [[Open questions for the owner]]. Until an answer is confirmed, the AI says the
detail is not published.

```mermaid
mindmap
  root((Owner answers needed))
    La Rosa View bookings
      Prices, packages or a starting rate, and travel costs
      Deposit, payment methods and cancellation terms
    La Rosa View events
      Cities or countries it travels to
      Set length, equipment and technical needs
      A public calendar of performances
    La Rosa View contact
      Its own phone or WhatsApp number
```

## How an answer reaches the AI
```mermaid
flowchart LR
  O["The owner answers"] --> N["A session or Knowledge Studio edits the public note, with a source"]
  N --> V["Validated and published"] --> AI(["The AI states it as a fact"])
```
