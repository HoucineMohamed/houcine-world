# How Houcine.world is built (architecture)

A plain-language map of the code, for a beginner. Nothing here needs to be memorised; use it to
know where to look.

## 1. The big picture

- **The website** is a single-page React app (Vite, TypeScript, Tailwind CSS, shadcn/ui components),
  edited with Lovable and stored in this GitHub repository.
- **Netlify** builds the site from the `main` branch and serves it. Every pull request gets its own
  **deploy preview** link.
- **Supabase** is the back end: the database (with row-level security, "RLS", deciding who may read or
  write each row), the workspace sign-in (magic links), and small server functions ("edge functions").
- **Resend** sends notification emails when someone submits a form.

## 2. Folders

| Folder | What lives there |
| --- | --- |
| `src/pages/` | One file per public page (`Index.tsx` is the home page, `Dev.tsx` Houcine.tech, `Designs.tsx` Houcine.studio, `Reads.tsx` Houcine.education, `Manages.tsx` Houcine.management, `LaRosaView.tsx`, the legal pages, …) |
| `src/pages/workspace/` | The private brand workspace (dashboard, bookings, messages, analytics, settings, ecosystem, login) |
| `src/components/` | Building blocks: `ui/` (shadcn components), `workspace/` (workspace shell and guards), `service/` (service-page sections), `legal/`, `hero/`, `owner/` (the private Houcine.Trades entries), `Footer.tsx`, `RouteMeta.tsx` (page titles and descriptions) |
| `src/hooks/` | Reusable logic: session, memberships and roles, analytics page tracking, form submission |
| `src/services/` | Small functions that read or write Supabase tables (brands, bookings, messages, …) |
| `src/data/` | Text and lists shown on pages (service packages, books, profile, `legal.ts` for the legal pages) |
| `src/content/` | "Selected work" galleries (empty by default) |
| `src/config/` | Small settings: `contact.ts` (public contact email), `trades.ts` (the private app's address) |
| `src/integrations/supabase/` | The Supabase client and generated database types (generated; never edit by hand) |
| `src/assets/` | Images bundled with the site |
| `public/` | Files served as they are: `robots.txt`, `sitemap.xml`, `_redirects`, the favicon |
| `supabase/` | Database migrations, edge functions and Supabase configuration (managed by the owner) |
| `scripts/ci/` | The auto-merge decision and its tests |
| `.github/workflows/` | GitHub Actions: CI, session-pr, auto-merge, and the owner's Supabase checks |
| `docs/` | These documents |

## 3. Routing (which address shows which page)

All addresses are listed in `src/App.tsx`. Netlify sends every address to the same `index.html`
(`public/_redirects`), and React Router then picks the page.

- **Public:** `/`, `/about`, `/dev`, `/designs`, `/reads`, `/manages`, `/larosaview`, `/about-dj`,
  `/booking`, `/review`, `/terms`, `/privacy`, `/data-deletion`. Anything unknown shows the "not found" page.
- **Workspace:** `/workspace/login` is open; everything else under `/workspace` sits behind two guards:
  `AuthGuard` (you must be signed in; it loads your roles once) and, for brand pages, `BrandGuard` (you
  must belong to that brand, or be the super admin).
- **Old admin area:** `/admin` and `/admin/login` (an earlier admin system, still present).

## 4. How data moves

1. **A visitor opens a page.** The browser downloads the site from Netlify. A small analytics record
   (page, device type, referrer, a random visitor id kept in the browser) is written to Supabase.
2. **A visitor sends a form** (booking, contact, newsletter). The page calls the `send-notification`
   edge function, which stores the request in the database and emails the right inbox through Resend.
3. **A workspace member signs in** with a magic link. Supabase checks the link; the app then reads only
   the rows that RLS allows for that person (their brands' bookings, messages, notifications, analytics).
4. **A brand admin connects a social or music account.** The OAuth connection runs through edge
   functions; the access tokens are stored in a table that the app itself can never read. Later, metrics
   functions use those tokens on the server and save snapshots the dashboard can show.

## 5. Roles (who can do what)

| Who | How the app knows | What they can do |
| --- | --- | --- |
| Visitor | not signed in | See public pages, send forms |
| Brand member | a row in `brand_admins` with a role: viewer, editor, content manager, moderator or brand admin | See and work on their own brand(s) only; higher roles can edit more; brand admins manage members and connected accounts |
| Super admin | the platform role on their profile | See every brand, the Ecosystem page, platform credentials, and the private Houcine.Trades entries |
| Old "admin" | a row in `user_roles` | The old `/admin` page and the raw analytics tables |

The database enforces these rules (RLS and database functions); the checks in the app only decide what
to show. A database trigger prevents anyone except a super admin from changing someone's platform role.
See `docs/security-review.md` for known weaknesses.

## 6. Where the safety rules are written

- `docs/automation.md`: how pull requests are opened and merged, and what always needs the owner.
- `.github/critical-paths.txt`: files that are never merged automatically.
- `docs/trades-integration.md`: the private Houcine.Trades entries.
