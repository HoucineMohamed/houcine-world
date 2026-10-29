---
id: agent-la-rosa-view-concierge
title: La Rosa View Concierge access
brand: la-rosa-view
type: agent
visibility: internal
status: policy
agent: la-rosa-view-concierge
tags: [agent, access, permissions]
brands: [la-rosa-view, houcine-world]
referral_brands: [houcine-tech, houcine-studio, houcine-management, houcine-education]
fallback_note: lrv-overview
pinned: [lrv-contact#0]
updated: 2026-10-30
---

# La Rosa View Concierge access

## What this note controls
Which knowledge the public La Rosa View Concierge (the chat on `/larosaview`) may read. It is enforced by the
concierge's search on the server: whatever a visitor asks, nothing outside these brands can be retrieved.

- `brands`: brands whose PUBLIC notes the concierge may use in full.
- `referral_brands`: brands of which it may only read the public overview note, to point a visitor elsewhere.
- `fallback_note`: what it reads when nothing matches the question.
- `pinned`: passages it always receives (the team's contact).

Internal and restricted (confidential) notes are never available to it, whatever is written here: they are never
compiled into its index. Change these lists in Knowledge Studio, under Settings, AI access.
