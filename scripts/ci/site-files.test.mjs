// Runs the checks of the site's hosting files in CI (CI runs scripts/ci/*.test.mjs only): the redirects
// (public/_redirects: the app rule active and last, the future-domain rules inactive), the security headers
// (public/_headers), the share tags of index.html and the booking form's markup.
import "../dev/redirects.test.mjs";
import "../dev/headers.test.mjs";
import "../dev/share-tags.test.mjs";
import "../dev/booking-form.test.mjs";
