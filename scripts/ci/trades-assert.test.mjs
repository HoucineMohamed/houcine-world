// Runs the Houcine.Trades hand-off tests in CI (CI runs scripts/ci/*.test.mjs only): the assert function
// (netlify/functions/assert/assert.test.mjs, with a fake Supabase and a fixed clock) and the owner screen's
// pure decisions (src/components/owner/card/handoff.test.mjs) and the setup steps (src/components/owner/sso-setup/steps.test.mjs).
import "../../netlify/functions/assert/assert.test.mjs";
import "../../src/components/owner/card/handoff.test.mjs";
import "../../src/components/owner/sso-setup/steps.test.mjs";
