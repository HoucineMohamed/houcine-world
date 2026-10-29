# La Rosa View Concierge: what you need to do before it answers

This page is a real chat, not a script: a visitor types a question, it goes to a new Supabase Edge
Function (`concierge`), which asks an AI provider (Anthropic) for a grounded answer and sends it
back. Until you set one secret below, the widget still opens and works, but every reply is this
exact sentence: *"I don't have enough verified information to answer that accurately. Please
contact La Rosa View directly so the team can help you."* Nothing is broken meanwhile; visitors
just can't get an AI answer yet.

## The one secret to set

1. Get an API key: open **console.anthropic.com**, sign in (or create an account for the
   business), go to **API Keys**, and create a new key. Anthropic bills by usage — check their
   current pricing page before turning this on for a busy site.
2. Open **supabase.com/dashboard** → the project → **Edge Functions** → **Secrets** (in some
   versions: **Project Settings** → **Edge Functions**) → **Add new secret**.
3. Name: `ANTHROPIC_API_KEY`. Value: the key from step 1. **Save**.

That's it — no code change, no redeploy needed; the function reads the secret on its next request.

## Optional: choosing a different model

The function defaults to `claude-sonnet-4-5`. To use a different Claude model (for example a
cheaper or newer one), add a second secret named `ANTHROPIC_MODEL` with that model's exact name
from Anthropic's documentation. Leave it unset to keep the default.

## What it will and won't do

- It answers only questions about La Rosa View — its services, how to book, published policies,
  and how to contact the team. It's instructed to decline and redirect anything else (coding
  help, other topics, the rest of Houcine.world).
- It never invents a price, a date's availability, or a confirmed booking — none of those exist in
  a system it can check, so it's told to say so and point to `larosaview@houcine.world` or the
  `/booking` form instead.
- Everything it's allowed to say comes from `supabase/functions/concierge/knowledgeBase.ts` — the
  same verified facts already on the public pages (`src/pages/LaRosaView.tsx`, `AboutDJ.tsx`, the
  booking form, the Terms page's booking-policy section). If the public pages change, that file
  should be updated to match, the same way `supabase/functions/send-notification/techPrices.ts`
  is kept in sync with `src/content/techCatalogue.ts` (see `AGENTS.md`).
- Conversations are not stored anywhere on the server — each reply is generated fresh from the
  visitor's recent messages, which live only in that visitor's own browser tab (and are cleared
  when they start a new conversation or clear their browser data). The Edge Function's own logs
  never include a visitor's message or the AI's reply.
- A visitor can send at most 20 messages every 10 minutes from the same connection before the
  function asks them to wait — this keeps costs bounded if someone sends a flood of messages.

## Checking it after you set the key

Open the site, click the rose chat button (bottom-right on La Rosa View pages), ask "Tell me about
La Rosa View," and confirm you get a real, specific answer instead of the fallback sentence above.
If it still shows the fallback, re-check the secret's exact name (`ANTHROPIC_API_KEY`, no typos)
and that the key is still valid in your Anthropic account. For any other error, Supabase →
**Edge Functions** → `concierge` → **Logs** names what went wrong (never a secret value).
