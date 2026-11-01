---
id: maps-booking-journey
title: Booking journey
brand: la-rosa-view
type: index
visibility: internal
status: verified
tags: [maps, booking, journey]
sources: [site-booking-form, site-terms]
updated: 2026-10-30
---

# Booking journey

## From request to event
```mermaid
flowchart TD
  V(["A visitor wants La Rosa View for an event"]) --> F["The booking form, /booking"]
  F --> R["Full name, email, event type, date and location are required; phone and details are optional"]
  R --> S["The request is sent"]
  S --> N{{"A request is not a booking"}}
  N --> T["The team reviews it and replies directly, typically within 24 hours"]
  T -->|declines| X(["Not booked"])
  T -->|confirms| C["The team confirms the date"]
  C --> D["Price, deposit, payment and cancellation are agreed directly with the team"]
  D --> E(["The event"])
```
From [[Booking La Rosa View]], [[Booking requests]] and [[La Rosa View policies]].

## What is published and what is not
```mermaid
flowchart LR
  subgraph P["Published"]
    P1["How to book"]
    P2["What the form asks"]
    P3["Reply typically within 24 hours"]
    P4["Event types: Private Party, Wedding, Corporate Event, Festival, Club Night, Other"]
  end
  subgraph U["Not published: the AI says so"]
    U1["Prices and quotes"]
    U2["Availability of a date"]
    U3["Deposit, payment, cancellation"]
    U4["Cities and travel"]
  end
```
The open questions behind the second box: [[Open questions for the owner]].
