// send-notification: the public forms (contact, quote requests, the booking form) and the newsletter sign-ups.
// POST /send-notification/submit and /send-notification/subscribe. The rules and the pure code are in core.ts;
// this file only reads the request, saves the row and sends the email.
//
// Secrets (Supabase → Edge Functions → Secrets; names only, docs/owner-review-guide.md):
//   RESEND_API_KEY        the mail service key (already set)
//   NOTIFY_FROM           the sender, e.g. "Houcine.world <notifications@your-domain>"
//   NOTIFY_TO             the inbox for every page except La Rosa View
//   NOTIFY_TO_LAROSAVIEW  the inbox for La Rosa View and its booking form (NOTIFY_TO when not set)
// Without NOTIFY_FROM or a recipient, the row is still saved (it shows in the workspace) and no email is sent.
//
// Logs never contain a visitor's name, email, phone, message or address, nor any secret.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  checkSubmission,
  checkTechBudget,
  checkSubscription,
  clientAddress,
  createRateLimiter,
  headerSafe,
  isAllowedOrigin,
  recipientFor,
  submissionEmail,
  subscriptionEmail,
} from "./core.ts";
import { TECH_PRICES } from "./techPrices.ts";

const MAX_BODY = 20_000;
const allow = createRateLimiter();

const json = (status: number, body: Record<string, unknown>, origin: string | null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...(origin ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}),
    },
  });

const secrets = () => ({
  from: headerSafe(Deno.env.get("NOTIFY_FROM") ?? ""),
  toDefault: Deno.env.get("NOTIFY_TO") ?? undefined,
  toLaRosaView: Deno.env.get("NOTIFY_TO_LAROSAVIEW") ?? undefined,
});

const sendMail = async (to: string | null, mail: { subject: string; html: string }): Promise<boolean> => {
  const { from } = secrets();
  const key = Deno.env.get("RESEND_API_KEY");
  if (!from || !to || !key) {
    // Names only, never values: the owner sees in the function logs which secret to set.
    const missing = [!from && "NOTIFY_FROM", !to && "NOTIFY_TO (or NOTIFY_TO_LAROSAVIEW)", !key && "RESEND_API_KEY"].filter(Boolean).join(", ");
    console.warn(`send-notification: email not sent, missing or invalid secret: ${missing}; the row is saved`);
    return false;
  }
  try {
    const { error } = await new Resend(key).emails.send({ from, to: [to], subject: mail.subject, html: mail.html });
    if (error) console.error("send-notification: email refused by the mail service:", error.name ?? "unknown", "(the row is saved)");
    return !error;
  } catch (e) {
    console.error("send-notification: email failed:", e instanceof Error ? e.name : "unknown");
    return false;
  }
};

const receivedAt = () => new Date().toLocaleString("en-GB", { timeZone: "Africa/Tunis" }) + " (Tunis)";

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const allowed = isAllowedOrigin(origin);

  if (req.method === "OPTIONS") {
    if (!allowed) return new Response(null, { status: 403 });
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin!,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        // The headers supabase-js may send (its own documented list), so an SDK update cannot break the forms.
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-retry-count, traceparent, tracestate, baggage",
        "Access-Control-Max-Age": "600",
        Vary: "Origin",
      },
    });
  }
  if (!allowed) return json(403, { error: "Origin not allowed" }, null);
  if (req.method !== "POST") return json(405, { error: "Method not allowed" }, origin);

  const action = new URL(req.url).pathname.split("/").pop();
  if (action !== "submit" && action !== "subscribe") return json(400, { error: "Invalid action. Use /submit or /subscribe" }, origin);

  const address = clientAddress(req.headers);
  if (!address) console.warn("send-notification: refused, the platform sent no caller address");
  if (!allow(address, Date.now())) return json(429, { error: "Too many requests. Please try again later." }, origin);

  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY) return json(413, { error: "Request too large" }, origin);
  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY) return json(413, { error: "Request too large" }, origin);
    body = JSON.parse(text);
  } catch {
    return json(400, { error: "Invalid request body" }, origin);
  }

  try {
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (action === "submit") {
      const checked = checkSubmission(body);
      if (!checked.ok) return json(400, { error: checked.error }, origin);
      const budgetError = checkTechBudget(checked.value, TECH_PRICES);
      if (budgetError) return json(400, { error: budgetError }, origin);
      // A robot filled the hidden field: same answer as a person, nothing saved or sent.
      if (checked.trap) {
        console.info("send-notification: hidden field filled, dropped");
        return json(200, { success: true, message: "Submission received and notification sent" }, origin);
      }
      const s = checked.value;
      const { error: dbError } = await db.from("submissions").insert({
        page_name: s.pageName,
        form_type: s.formType,
        user_name: s.userName,
        user_email: s.userEmail,
        user_phone: s.userPhone ?? null,
        service_type: s.serviceType ?? null,
        message: s.message ?? null,
        additional_data: s.additionalData ?? null,
      });
      if (dbError) {
        console.error("send-notification: saving the submission failed:", dbError.code ?? "unknown");
        return json(500, { error: "Failed to save submission" }, origin);
      }
      const sent = await sendMail(recipientFor(s.pageName, secrets()), submissionEmail(s, receivedAt()));
      return json(200, { success: true, message: sent ? "Submission received and notification sent" : "Submission received" }, origin);
    }

    const checked = checkSubscription(body);
    if (!checked.ok) return json(400, { error: checked.error }, origin);
    if (checked.trap) {
      console.info("send-notification: hidden field filled, dropped");
      return json(200, { success: true, message: "Subscribed successfully" }, origin);
    }
    const s = checked.value;
    // One statement, safe against a double click: an address already there is left as it is. The answer is the
    // same either way, so nobody can use it to find out whether an address is subscribed.
    const { data: inserted, error: dbError } = await db
      .from("subscriptions")
      .upsert({ email: s.email, source: s.source }, { onConflict: "email", ignoreDuplicates: true })
      .select("id");
    if (dbError) {
      console.error("send-notification: saving the subscription failed:", dbError.code ?? "unknown");
      return json(500, { error: "Failed to save subscription" }, origin);
    }
    if (Array.isArray(inserted) && inserted.length > 0) await sendMail(recipientFor(s.source, secrets()), subscriptionEmail(s, receivedAt()));
    return json(200, { success: true, message: "Subscribed successfully" }, origin);
  } catch (e) {
    console.error("send-notification: unexpected error:", e instanceof Error ? e.name : "unknown");
    return json(500, { error: "Something went wrong" }, origin);
  }
};

serve(handler);
