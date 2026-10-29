# La Rosa View Concierge: what you need to do

The chat on the La Rosa View page is a real AI assistant. When a visitor writes, a Supabase Edge Function
(`concierge`) works out what they mean, looks up the answer in the **Houcine.world knowledge brain** (the notes in
`houcine-world-brain/`), and has an AI model write a reply from those notes only, word by word as it is written.
How it all works, and how to change what it knows, is in `docs/knowledge-brain.md`.

Until the secret below is set, the chat still opens, but every message gets a clear notice instead of an answer:
*"The concierge's AI is switched off for the moment, so it can't answer questions right now."*, followed by the La
Rosa View email and a link to the booking form. It never pretends to answer.

## 1. The one secret to set

1. Get an API key: open **console.anthropic.com**, sign in (or create an account for the business), go to
   **API Keys**, and create a key. Anthropic bills by usage (see "What it costs" below). In the same console, under
   **Limits** (or **Billing**), set a monthly spend limit you are comfortable with: that limit is the real hard stop.
2. Open **supabase.com/dashboard**, pick the project, then **Edge Functions**, then **Secrets** (in some versions:
   **Project Settings**, **Edge Functions**), and click **Add new secret**.
3. Name: `ANTHROPIC_API_KEY`. Value: the key from step 1. Click **Save**.

The function reads the secret on its next message: no code change and no redeploy needed.

## 2. Optional settings (same Secrets screen)

| Secret | What it does | If you leave it unset |
| --- | --- | --- |
| `ANTHROPIC_MODEL` | The model that writes the answers. | `claude-opus-5-5` (Anthropic's current Opus: the best at staying grounded and at French and Tunisian Arabic). `claude-sonnet-5-5` costs about half; `claude-haiku-5-5` about a twentieth, with weaker answers. |
| `CONCIERGE_INTERPRETER_MODEL` | The small model that reads each message first (what the visitor means, what to look up, what they already told). | `claude-haiku-5-5`. Write `off` to skip that step: answers still work, but follow-up questions and paraphrases are understood less well. |

If you had already set `ANTHROPIC_MODEL` to an older model (for example `claude-sonnet-4-5`), it keeps working; the
function only sends the newer options to models that accept them.

## 3. Make sure the function is deployed

From the merge of the pull request that brought the knowledge brain, the **Deploy Supabase** workflow deploys the
`concierge` function every time something is merged into `main` (that is how knowledge updates go live). To check: on
GitHub, open **Actions**, then **Deploy Supabase**, and look for a green run after the merge; in its log, the step
"Deploy edge functions" lists `concierge`.

## 4. Check it

1. Open the La Rosa View page and click the rose button (bottom right).
2. Ask something the old chat could not handle, for example: "I need him for my wedding in Sousse", then "and how
   much would that cost?". You should see the answer appear word by word, understand that "him" is DJ La Rosa, keep
   the wedding and Sousse in mind, and say plainly that no price is published and how to ask for a quote.
3. Ask in French and in Tunisian Arabic: it answers in the same language.

If you still get the "switched off" notice: check the secret's exact name (`ANTHROPIC_API_KEY`) and that the key is
active in the Anthropic console. Supabase, **Edge Functions**, `concierge`, **Logs** shows one line per message such
as `concierge: turn interpreter=ok passages=7 answer=ok`; `answer=auth` means the key was refused, `answer=rate_limited`
that Anthropic asked to slow down. The logs never contain a visitor's message, an answer or a secret.

## What it will and will not do

- It talks about La Rosa View: the brand, DJ La Rosa, services, events, bookings, releases, contact. For another
  Houcine.world brand it only says what that brand is and where to go. It declines anything unrelated.
- It never invents a price, a free date, a deposit or cancellation rule, a phone number, or a confirmed booking. When
  the notes do not say, it says so and points to `larosaview@houcine.world` or the booking form.
- It answers in the visitor's language (English, French, Tunisian Arabic in Arabic script or in Latin letters).
- Messages that try to make it ignore its rules or reveal its instructions do not work; nor does text that tries the
  same from inside a note.

## Privacy

- Conversations are not stored on the server. The visitor's browser tab keeps the conversation and a short memory
  ("stated: wedding, December 15, Sousse"; "inferred: ...") for up to 24 hours, and sends the recent part with each
  message. Closing the tab or clicking "Start a new conversation" clears it.
- The memory never keeps an email address, a phone number or payment details, even if the visitor typed them.
- Each message is sent to Anthropic to be answered (that is what the API key is for), under Anthropic's API terms.
- At most 20 messages every 10 minutes from the same connection, to keep costs bounded.

## What it costs (estimates, Anthropic's list prices of October 2026)

Each visitor message makes two calls: a small one (interpreting, about $0.0005) and the answer. With the default
model, an answer costs roughly **$0.02 to $0.04** (more for long conversations); with `claude-sonnet-5-5` about half
that; with `claude-haiku-5-5` about $0.002. So 1,000 messages a month is roughly $20 to $40 with the default. These
are estimates: the Anthropic console shows the real usage, and its spend limit is the hard stop.
