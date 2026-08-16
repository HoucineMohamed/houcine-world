import { supabase } from "@/lib/supabaseClient";

export interface PlatformCredentialStatus {
  platform: string;
  configured: boolean;
  redirectUri: string;
}

/**
 * Status only — never the client_id/client_secret themselves. Any
 * authenticated workspace member can call this; it's what gates each
 * platform's "Connect" button in the brand-level Connected Accounts list.
 */
export const fetchCredentialsStatus = async (): Promise<PlatformCredentialStatus[]> => {
  const { data, error } = await supabase.functions.invoke<{ platforms: PlatformCredentialStatus[] }>(
    "platform-credentials",
    { method: "GET" },
  );
  if (error) throw error;
  return data?.platforms ?? [];
};

/**
 * Super-admin only (re-checked server-side). Saves straight to the
 * service-role-only `platform_credentials` table via the edge function —
 * the secret is never written to any client-readable table or echoed back.
 */
export const savePlatformCredentials = async (platform: string, clientId: string, clientSecret: string) => {
  const { data, error } = await supabase.functions.invoke<{ ok: boolean; error?: string }>("platform-credentials", {
    method: "POST",
    body: { platform, client_id: clientId, client_secret: clientSecret },
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error ?? "Could not save credentials");
};
