# The branded fallback and maintenance mode

Written 29 October 2026. When the site cannot be shown normally, visitors see a calm Houcine.world page instead of
an empty black screen or a technical error: the H logo with a slow orbit and a soft glow, and these words:

> **Something Better Is Taking Shape.**
> Houcine is currently working behind the scenes to improve your experience. We'll be back shortly with something better.
> *Refining the experience* · Thank you for your patience. · Houcine.world

It never says what went wrong, never shows an error code, and never promises a time.

## 1. What covers what

The site is a single-page app served as static files by Netlify (no server of its own). So each kind of failure is
caught at a different place:

| Situation | What catches it | What the visitor sees |
| --- | --- | --- |
| **A new deploy is being built or fails to build** | Netlify itself: deploys are atomic, the previous version keeps being served until a new one is fully ready, and a failed build is never published | The normal site (the previous version) |
| **Maintenance mode switched on** (section 2) | A rule in `public/_redirects` | `public/maintenance.html` at every address |
| **The app cannot start in the browser**: its main file is missing or broken after a bad deploy, or it fails while starting (for example the Supabase settings are missing from a build) | `public/boot-watchdog.js`, loaded by `index.html` before the app | `/maintenance.html`, with "Try again" pointing back to the address the visitor asked for |
| **A crash while the app runs, outside any page** (router, search, page titles) | The outermost boundary `AppErrorBoundary` in `src/main.tsx` | The branded fallback, at the same address, with "Try again" (reload) |
| **One page crashes, or its file cannot be downloaded** (offline, or the site was updated while the tab was open) | The route boundaries (`PageErrorBoundary`, `src/components/PublicShell.tsx` and `src/App.tsx`) | The branded fallback with "Try again" and "Go to the home page"; the next click on another link clears it |
| **An optional service fails** (analytics, an embedded player, a Supabase request on one page) | That page's own handling | Nothing changes: the fallback is NOT shown for these |
| **Netlify itself is completely down** | Nothing on our side can answer | Netlify's or the browser's own error page (section 4) |

The fallback page and the in-app fallback share the same words and look. The in-app one is
`src/components/BrandedFallback.tsx`; the static one is one self-contained file (section 3).

## 2. Maintenance mode (off by default)

Maintenance mode shows the maintenance page at every address of the site, instead of the normal site.

- **Switch it on:** ask a Claude session to "switch maintenance mode on". It removes the `# ` in front of the line
  `/*    /maintenance.html   200!` in `public/_redirects`. That file is a critical path, so the pull request waits for
  you: open it on GitHub, check it, click **Squash and merge**. About a minute after Netlify publishes that deploy,
  every visitor sees the maintenance page.
- **Switch it off:** the same in reverse ("switch maintenance mode off": the `# ` goes back), merged by you.
- **Who can do it:** only someone who can merge to `main` (you). There is no public button, password or secret
  anywhere in the site, and nothing in the browser can switch it.
- **No stale page afterwards:** Netlify asks browsers to check pages again on every visit (this is its default for
  pages; nothing here changes it), so returning visitors get the normal site as soon as the deploy that switches it
  off is live, without clearing anything. The maintenance page also says `noindex` so search engines do not keep it.
- **If the site's build itself is broken** and you need the page immediately, the fastest way is Netlify's
  **Deploys** page: publish the last good deploy (see "Roll back a bad deploy on Netlify" in `docs/runbook.md`).
  The maintenance page is in every deploy at `/maintenance.html`.

While maintenance is on, everything is answered with that page, including the robots and sitemap files, and the
"Try again" button simply reloads it.

## 3. The maintenance page itself (`public/maintenance.html`)

- **One file, nothing else needed.** Styles are inside the page; the logo is the official H mark
  (`src/assets/logo-h.png`) resized to 240 px and embedded in the page (about 9 KB). No web font (it uses the site's
  fonts if the device has them, otherwise the system font), no outside address, no app code, no Supabase, no login,
  no cookies, no analytics. About 25 KB in all.
- **Without JavaScript** the whole message shows and "Try again" opens the home page. If the logo cannot be drawn, its
  name is shown in its place and the rest is unchanged.
- **Motion:** the orbit, glow and fade-in stop completely when the device asks for reduced motion.
- **Recovery check (small script):** 30 seconds after opening, then 1, 2, 4 and 5 minutes apart, at most 12 times
  and only while the tab is visible, it asks this site for the home page **and** the app's main file. Only when the
  home page is the real app (not this page) and its main file answers as a script does it say "Ready again" and turn
  the button into "Return to Houcine.world". It never reloads by itself; the visitor chooses. Nothing is sent
  anywhere else.
- **Return address:** the watchdog adds `?return=/the/address`; the page accepts only an address on this same site.

## 4. Limits (what cannot be covered on Netlify)

- **A full Netlify outage** (its servers or network unreachable) cannot show any page of ours: no file can be
  served when the host that serves files is down. Netlify's static hosting offers no separate "outage page", and
  this was not changed (no new host or paid service). The only cover would be a second provider in front of the
  site, which is a separate decision for you.
- **Status code:** in maintenance mode the page is served with the normal success code (200), the one kind of rule
  this file already uses and that is certain to work on Netlify. A "temporarily unavailable" code (503) would be
  nicer for search engines; whether Netlify accepts it for this kind of rule was not verified here (confirm on
  Netlify's redirect documentation before changing it). The `noindex` tag covers the indexing side meanwhile.
- **Deploy previews:** if a preview build does not receive the Supabase settings, the app cannot start there and the
  preview now shows the fallback page instead of a blank screen. That is the preview's settings, not the site.
- **Inline script on the maintenance page:** the site's report-only content policy notes inline scripts in the
  browser console; it blocks nothing (the enforced policy does not restrict scripts).

## 5. Checks

- `node --experimental-strip-types --test scripts/dev/fallback.test.mjs` (also run in CI through
  `scripts/ci/site-files.test.mjs`): the words, the page needing no other file, the embedded logo, no technical
  words, `noindex`, reduced motion, the gentle recovery check, the watchdog, the outermost boundary.
- `scripts/dev/redirects.test.mjs`: maintenance mode is written once, off, and when on comes before the app rule.
- Checked in a headless browser against the built site (29 October 2026): normal pages and direct links stay
  untouched; maintenance mode at every address; a missing main file and a crash at start both reach the fallback
  page with the right return address; the recovery check reports "Ready again" only when the real site answers and
  the return click lands on the asked address; a crash outside the routes and a crash inside a page both show the
  branded fallback with no detail; 360 px phone without sideways scroll and 44 px buttons; reduced motion stops every
  animation; no JavaScript and a broken logo still show the message.
