import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Owner emails by page
const OWNER_EMAILS: Record<string, string> = {
  "La Rosa View": "contactlarosaview@gmail.com",
  "Houcine.tech": "mohamedhoucine2024@gmail.com",
  "Houcine.studio": "mohamedhoucine2024@gmail.com",
  "Houcine.education": "mohamedhoucine2024@gmail.com",
  "Houcine.world": "mohamedhoucine2024@gmail.com",
  "Booking": "contactlarosaview@gmail.com",
  default: "mohamedhoucine2024@gmail.com",
};

interface SubmissionRequest {
  pageName: string;
  formType: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  serviceType?: string;
  message?: string;
  additionalData?: Record<string, unknown>;
}

interface SubscriptionRequest {
  email: string;
  source: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "submit") {
      const body: SubmissionRequest = await req.json();
      const { pageName, formType, userName, userEmail, userPhone, serviceType, message, additionalData } = body;

      // Validate required fields
      if (!pageName || !formType || !userName || !userEmail) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: pageName, formType, userName, userEmail" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Save to database
      const { error: dbError } = await supabase.from("submissions").insert({
        page_name: pageName,
        form_type: formType,
        user_name: userName,
        user_email: userEmail,
        user_phone: userPhone || null,
        service_type: serviceType || null,
        message: message || null,
        additional_data: additionalData || null,
      });

      if (dbError) {
        console.error("Database error:", dbError);
        return new Response(
          JSON.stringify({ error: "Failed to save submission" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Determine owner email
      const ownerEmail = OWNER_EMAILS[pageName] || OWNER_EMAILS.default;
      const timestamp = new Date().toLocaleString("en-US", { timeZone: "Africa/Tunis" });

      // Send notification email to owner
      const ownerEmailResponse = await resend.emails.send({
        from: "Houcine.world <onboarding@resend.dev>",
        to: [ownerEmail],
        subject: `New ${formType} from ${pageName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%); color: #ffffff; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #67e8f9; margin: 0; font-size: 24px;">New ${formType}</h1>
              <p style="color: #9ca3af; margin-top: 8px;">from ${pageName}</p>
            </div>
            
            <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; margin-bottom: 16px;">
              <h2 style="color: #67e8f9; font-size: 16px; margin: 0 0 16px 0;">Contact Details</h2>
              <p style="margin: 8px 0;"><strong style="color: #9ca3af;">Name:</strong> ${userName}</p>
              <p style="margin: 8px 0;"><strong style="color: #9ca3af;">Email:</strong> <a href="mailto:${userEmail}" style="color: #67e8f9;">${userEmail}</a></p>
              ${userPhone ? `<p style="margin: 8px 0;"><strong style="color: #9ca3af;">Phone:</strong> ${userPhone}</p>` : ""}
              ${serviceType ? `<p style="margin: 8px 0;"><strong style="color: #9ca3af;">Service:</strong> ${serviceType}</p>` : ""}
            </div>
            
            ${message ? `
            <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; margin-bottom: 16px;">
              <h2 style="color: #67e8f9; font-size: 16px; margin: 0 0 16px 0;">Message</h2>
              <p style="margin: 0; white-space: pre-wrap;">${message}</p>
            </div>
            ` : ""}
            
            ${additionalData && Object.keys(additionalData).length > 0 ? `
            <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; margin-bottom: 16px;">
              <h2 style="color: #67e8f9; font-size: 16px; margin: 0 0 16px 0;">Additional Details</h2>
              ${Object.entries(additionalData).map(([key, value]) => 
                `<p style="margin: 8px 0;"><strong style="color: #9ca3af;">${key}:</strong> ${value}</p>`
              ).join("")}
            </div>
            ` : ""}
            
            <div style="text-align: center; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">Received on ${timestamp}</p>
            </div>
          </div>
        `,
      });

      console.log("Owner email sent:", ownerEmailResponse);

      return new Response(
        JSON.stringify({ success: true, message: "Submission received and notification sent" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (action === "subscribe") {
      const body: SubscriptionRequest = await req.json();
      const { email, source } = body;

      if (!email || !source) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: email, source" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Check if already subscribed
      const { data: existing } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({ success: true, message: "Already subscribed" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Save subscription
      const { error: dbError } = await supabase.from("subscriptions").insert({
        email,
        source,
      });

      if (dbError) {
        console.error("Database error:", dbError);
        return new Response(
          JSON.stringify({ error: "Failed to save subscription" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Notify owner
      const ownerEmail = OWNER_EMAILS[source] || OWNER_EMAILS.default;
      const timestamp = new Date().toLocaleString("en-US", { timeZone: "Africa/Tunis" });

      await resend.emails.send({
        from: "Houcine.world <onboarding@resend.dev>",
        to: [ownerEmail],
        subject: `New Subscriber from ${source}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%); color: #ffffff; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #67e8f9; margin: 0; font-size: 24px;">🎉 New Subscriber!</h1>
              <p style="color: #9ca3af; margin-top: 8px;">from ${source}</p>
            </div>
            
            <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; margin-bottom: 16px; text-align: center;">
              <p style="margin: 0; font-size: 18px;"><a href="mailto:${email}" style="color: #67e8f9;">${email}</a></p>
            </div>
            
            <div style="text-align: center; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">Subscribed on ${timestamp}</p>
            </div>
          </div>
        `,
      });

      return new Response(
        JSON.stringify({ success: true, message: "Subscribed successfully" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use /submit or /subscribe" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in send-notification function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);