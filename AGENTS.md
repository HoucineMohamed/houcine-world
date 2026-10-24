# AGENTS.md

- Houcine.tech services and prices live only in `src/content/techCatalogue.ts`; the server copy `supabase/functions/send-notification/techPrices.ts` must match it (enforced by `scripts/dev/tech-catalogue.test.mjs`) because the edge function cannot import from `src/`.
- Quote budgets are checked twice: the form only offers ranges at or above the service's starting price, and `checkTechBudget` in send-notification refuses anything else, so the client is never the only guard.
