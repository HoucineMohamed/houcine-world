// Netlify Function "assert": POST /api/assert (same origin). See core.mjs and docs/trades-integration.md.
// Settings come from the Netlify environment: SSO_PRIVATE_KEY, OWNER_USER_ID, TRADES_AUDIENCE, plus the
// site's existing public VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.
import { createHandler } from "./core.mjs";

const handler = createHandler({ env: process.env });

export default (request) => handler(request);

export const config = { path: "/api/assert" };
