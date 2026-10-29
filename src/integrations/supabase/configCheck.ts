// The browser's own check of the Supabase settings baked in at build time. supabase-js throws at start-up on an invalid URL
// ("Invalid supabaseUrl"), before anything is drawn, which once left the site as a blank page. src/main.tsx runs this check
// first and shows a plain "Configuration error" screen instead of loading the app. The strict check (exact project host,
// project id) runs at build time in scripts/ci/supabase-ref.mjs; this one only refuses what would crash the client.
// It returns short reasons and never the values themselves (the key is never shown or logged).

// A quote, a backtick or any whitespace: a value pasted together with its `.env` quoting.
const DIRTY = /["'`\s]/;

export type SupabaseConfigProblem =
  | "url-missing"
  | "url-dirty"
  | "url-invalid"
  | "url-not-https"
  | "key-missing"
  | "key-dirty";

export function supabaseConfigProblems(url: unknown, key: unknown): SupabaseConfigProblem[] {
  const problems: SupabaseConfigProblem[] = [];
  if (typeof url !== "string" || url === "") problems.push("url-missing");
  else if (DIRTY.test(url)) problems.push("url-dirty");
  else {
    let parsed: URL | null = null;
    try {
      parsed = new URL(url);
    } catch {
      problems.push("url-invalid");
    }
    if (parsed && parsed.protocol !== "https:") problems.push("url-not-https");
  }
  if (typeof key !== "string" || key === "") problems.push("key-missing");
  else if (DIRTY.test(key)) problems.push("key-dirty");
  return problems;
}
