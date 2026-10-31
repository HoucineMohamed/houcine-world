# Brain dashboard

> [!info] Generated from the notes by `scripts/brain/build.mjs` and by every Knowledge Studio publication. Do not edit:
> it is rewritten each time. Charts are Mermaid diagrams, which Obsidian and GitHub draw without any plugin.
> AI index fingerprint `dde65f925c572593`.

## At a glance

| | |
| --- | --- |
| Active notes | 34 (24 public, 10 internal, 0 restricted) |
| Archived notes | 0 |
| Passages the public AI can read | 62 |
| Links between notes | 52 |
| Sections waiting for the owner | 8 |

## Notes by brand

```mermaid
pie showData title Active notes by brand
  "Houcine.world (shared)" : 14
  "La Rosa View" : 13
  "Houcine.tech" : 3
  "Houcine.studio" : 2
  "Houcine.management" : 1
  "Houcine.education" : 1
```

## How sure the public knowledge is

Every passage the public AI can read, by its confidence. The AI never states an incomplete, unconfirmed or outdated passage as a fact.

```mermaid
pie showData title Public passages by confidence
  "Verified" : 48
  "Current policy" : 6
  "Incomplete" : 8
```

## Passages per brand in the AI's index

| Brand | Passages | |
| --- | ---: | --- |
| Houcine.world (shared) | 11 | █████ |
| La Rosa View | 43 | ████████████████████ |
| Houcine.tech | 4 | ██ |
| Houcine.studio | 2 | █ |
| Houcine.management | 1 | ▏ |
| Houcine.education | 1 | ▏ |

## Visitor questions answered

The fixed visitor questions of `supabase/functions/_shared/brain/coverage-questions.ts`, searched without any AI call (Knowledge Studio, AI Playground, Coverage).

| Brand | Answered | Awaiting confirmation | Known gaps | Not found | Answered share |
| --- | ---: | ---: | ---: | ---: | --- |
| Houcine.world (shared) | 6 | 0 | 3 | 0 | ███████░░░ 6/9 |
| La Rosa View | 9 | 4 | 2 | 1 | ██████░░░░ 9/16 |
| Houcine.tech | 6 | 0 | 3 | 0 | ███████░░░ 6/9 |
| Houcine.studio | 3 | 0 | 3 | 0 | █████░░░░░ 3/6 |
| Houcine.management | 2 | 1 | 3 | 0 | ███░░░░░░░ 2/6 |
| Houcine.education | 1 | 1 | 2 | 0 | ███░░░░░░░ 1/4 |

## What each public AI may read

```mermaid
flowchart LR
  n_agent_la_rosa_view_concierge(["la-rosa-view-concierge"])
  n_agent_la_rosa_view_concierge -->|all public notes| n_brand_la_rosa_view["La Rosa View"]
  n_agent_la_rosa_view_concierge -->|all public notes| n_brand_houcine_world["Houcine.world (shared)"]
  n_agent_la_rosa_view_concierge -.->|overview only| n_brand_houcine_tech["Houcine.tech"]
  n_agent_la_rosa_view_concierge -.->|overview only| n_brand_houcine_studio["Houcine.studio"]
  n_agent_la_rosa_view_concierge -.->|overview only| n_brand_houcine_management["Houcine.management"]
  n_agent_la_rosa_view_concierge -.->|overview only| n_brand_houcine_education["Houcine.education"]
```

Internal and restricted notes, drafts and archived notes never reach any AI, whatever this shows.

## Every note and its links

One box per note, grouped by brand; dashed boxes are internal (never sent to an AI). The same graph is in [[knowledge-map.canvas|the Canvas board]] and in Obsidian's graph view.

```mermaid
flowchart LR
  subgraph n_group_houcine_world["Houcine.world (shared)"]
    n_hw_contact["Contacting Houcine.world"]
    n_hw_overview["Houcine.world"]
    n_person_houcine_mohamed["Houcine Mohamed"]
    n_policy_booking_requests["Booking requests"]
    n_rel_ecosystem["How the Houcine.world brands connect"]
  end
  subgraph n_group_la_rosa_view["La Rosa View"]
    n_lrv_bookings["Booking La Rosa View"]
    n_lrv_contact["Contacting La Rosa View"]
    n_lrv_dj_hajri["DJ Hajri Mohamed"]
    n_lrv_events_releases["La Rosa View events and releases"]
    n_lrv_faq["La Rosa View questions and answers"]
    n_lrv_identity["La Rosa View identity"]
    n_lrv_overview["La Rosa View"]
    n_lrv_partnerships["La Rosa View partnerships and collaborations"]
    n_lrv_policies["La Rosa View policies"]
    n_lrv_services["La Rosa View services"]
    n_internal_open_questions["Open questions for the owner"]:::internal
  end
  subgraph n_group_houcine_tech["Houcine.tech"]
    n_tech_overview["Houcine.tech"]
    n_tech_payment["Houcine.tech payment terms"]
    n_tech_services["Houcine.tech services"]
  end
  subgraph n_group_houcine_studio["Houcine.studio"]
    n_studio_overview["Houcine.studio"]
    n_studio_services["Houcine.studio services"]
  end
  subgraph n_group_houcine_management["Houcine.management"]
    n_management_overview["Houcine.management"]
  end
  subgraph n_group_houcine_education["Houcine.education"]
    n_education_overview["Houcine.education"]
  end
  n_management_overview --> n_lrv_overview
  n_studio_overview --> n_studio_services
  n_studio_services --> n_tech_payment
  n_tech_overview --> n_tech_payment
  n_tech_overview --> n_tech_services
  n_tech_payment --> n_studio_services
  n_hw_contact --> n_lrv_contact
  n_hw_overview --> n_education_overview
  n_hw_overview --> n_lrv_overview
  n_hw_overview --> n_management_overview
  n_hw_overview --> n_studio_overview
  n_hw_overview --> n_tech_overview
  n_lrv_bookings --> n_lrv_contact
  n_lrv_bookings --> n_policy_booking_requests
  n_lrv_contact --> n_hw_contact
  n_lrv_contact --> n_lrv_bookings
  n_lrv_dj_hajri --> n_lrv_bookings
  n_lrv_dj_hajri --> n_lrv_events_releases
  n_lrv_dj_hajri --> n_lrv_overview
  n_lrv_events_releases --> n_lrv_contact
  n_lrv_faq --> n_lrv_bookings
  n_lrv_faq --> n_lrv_dj_hajri
  n_lrv_faq --> n_lrv_events_releases
  n_lrv_faq --> n_policy_booking_requests
  n_lrv_overview --> n_hw_overview
  n_lrv_overview --> n_lrv_bookings
  n_lrv_overview --> n_lrv_contact
  n_lrv_overview --> n_lrv_dj_hajri
  n_lrv_overview --> n_lrv_events_releases
  n_lrv_overview --> n_lrv_identity
  n_lrv_overview --> n_lrv_services
  n_lrv_overview --> n_management_overview
  n_lrv_overview --> n_person_houcine_mohamed
  n_lrv_overview --> n_rel_ecosystem
  n_lrv_partnerships --> n_lrv_contact
  n_lrv_policies --> n_policy_booking_requests
  n_lrv_policies --> n_studio_overview
  n_lrv_policies --> n_tech_overview
  n_lrv_services --> n_lrv_bookings
  n_lrv_services --> n_lrv_partnerships
  n_person_houcine_mohamed --> n_hw_overview
  n_person_houcine_mohamed --> n_lrv_overview
  n_rel_ecosystem --> n_education_overview
  n_rel_ecosystem --> n_hw_contact
  n_rel_ecosystem --> n_hw_overview
  n_rel_ecosystem --> n_lrv_contact
  n_rel_ecosystem --> n_lrv_dj_hajri
  n_rel_ecosystem --> n_lrv_overview
  n_rel_ecosystem --> n_management_overview
  n_rel_ecosystem --> n_person_houcine_mohamed
  n_rel_ecosystem --> n_studio_overview
  n_rel_ecosystem --> n_tech_overview
  classDef internal stroke-dasharray: 4 3
```

## Waiting for the owner

Public sections the AI must not state as facts until the owner confirms them (the questions to ask: [[Open questions for the owner]]).

| Note | Section | Status |
| --- | --- | --- |
| [[Houcine.education]] | What it is | Incomplete |
| [[Booking La Rosa View]] | Availability | Incomplete |
| [[Booking La Rosa View]] | Prices and quotes | Incomplete |
| [[Booking La Rosa View]] | Deposits, payment, cancellation | Incomplete |
| [[Contacting La Rosa View]] | Phone | Incomplete |
| [[La Rosa View events and releases]] | Upcoming events | Incomplete |
| [[La Rosa View policies]] | Payment, deposits, cancellation | Incomplete |
| [[La Rosa View services]] | Prices | Incomplete |
