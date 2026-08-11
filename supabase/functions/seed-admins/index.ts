import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

/**
 * ONE-TIME seeding routine (Step 3).
 * Creates the two workspace accounts with the Admin API, promotes the super admin
 * via the sanctioned bootstrap_admins() routine, and grants the brand admin his
 * single brand_admins row on La Rosa View.
 *
 * Protected: requires a caller-supplied x-seed-key matching SEED_SUPER_ADMIN_PASSWORD.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const superEmail = Deno.env.get("SEED_SUPER_ADMIN_EMAIL");
  const superPassword = Deno.env.get("SEED_SUPER_ADMIN_PASSWORD");
  const brandEmail = Deno.env.get("SEED_BRAND_ADMIN_EMAIL");
  const brandPassword = Deno.env.get("SEED_BRAND_ADMIN_PASSWORD");

  if (!superEmail || !superPassword || !brandEmail || !brandPassword) {
    return json({ error: "Seed credentials are not configured" }, 500);
  }

  if (req.headers.get("x-seed-key") !== superPassword) {
    return json({ error: "Unauthorized" }, 401);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const ensureUser = async (email: string, password: string, fullName: string) => {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (!error && data.user) return { id: data.user.id, created: true };

    // Already exists → find and reset the password so the temp credentials work.
    const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listErr) throw listErr;
    const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!existing) throw error ?? new Error(`Could not create or find ${email}`);
    await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    return { id: existing.id, created: false };
  };

  try {
    const superUser = await ensureUser(superEmail, superPassword, "Si Houcine");
    const brandUser = await ensureUser(brandEmail, brandPassword, "Mohamed Hajri");

    // Profiles are created by the on_auth_user_created trigger; make sure they exist
    // (covers users that predate the trigger).
    await admin.from("profiles").upsert(
      [
        { id: superUser.id, email: superEmail, full_name: "Si Houcine" },
        { id: brandUser.id, email: brandEmail, full_name: "Mohamed Hajri" },
      ],
      { onConflict: "id" },
    );

    const { data: result, error: rpcError } = await admin.rpc("bootstrap_admins", {
      p_super_email: superEmail,
      p_brand_admin_email: brandEmail,
      p_brand_slug: "la-rosa-view",
    });
    if (rpcError) throw rpcError;

    const { data: profiles } = await admin
      .from("profiles")
      .select("email, platform_role")
      .in("email", [superEmail, brandEmail]);
    const { data: memberships } = await admin
      .from("brand_admins")
      .select("user_id, brand_id, role");

    return json({ ok: true, result, profiles, memberships });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
