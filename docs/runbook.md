# Runbook: common tasks, step by step

Everything here is done in the browser. When a step says "edit a file", the simplest way is to ask a
Claude session to do it (it opens a pull request that merges itself if it is not critical). You can
also edit on GitHub: open the file, click the pencil, change it, choose **"Create a new branch for this
commit and start a pull request"**, then merge that pull request yourself.

## Add a portfolio item ("Selected work")

1. Open `src/content/management.ts` (the Houcine.management page; other pages can get the same kind of
   file later).
2. Add an entry inside the square brackets, for example:

   ```ts
   { title: "Project name", summary: "One or two plain sentences.", tags: ["Brand strategy"] },
   ```

   Optional fields: `href` (an internal address such as `/larosaview`, or an `https://` address you
   own), and `image` with `imageAlt` (the image must be a file in `src/assets/`, imported at the top of
   the file). Only add real, published work you have the right to show.
3. While the list is empty, the page shows "Coming soon".

## Change the public contact email

1. Open `src/config/contact.ts`.
2. Put your address between the quotes: `export const CONTACT_EMAIL = "you@example.com";`
3. Until it is set, the "Get in touch" buttons say "Contact details coming soon".

## Fill in the legal placeholders

1. Open `src/data/legal.ts`.
2. Replace each value in square brackets: `[LEGAL ENTITY NAME]`, `[GOVERNING JURISDICTION]`,
   `[CONTACT EMAIL FOR PRIVACY / LEGAL REQUESTS]`, `[POSTAL ADDRESS]`.
3. Update `LEGAL_LAST_UPDATED` to today's date.
4. Have the Terms, Privacy and Data Deletion pages reviewed by a professional before relying on them.

## Preview a change before it goes live

1. Open the pull request on GitHub.
2. In the checks list near the bottom, find **netlify/houcineworld/deploy-preview** and click
   **Details**. This opens the preview site for exactly that pull request.
3. Look at the pages it changes, signed out and (if relevant) signed in.

## Roll back a bad deploy on Netlify

1. Go to app.netlify.com, open the **houcineworld** site, then **Deploys**.
2. Click the last deploy that was good (it shows the commit message and time).
3. Click **Publish deploy**. The live site switches back at once.
4. Then fix or revert the change on GitHub; otherwise the next merge publishes it again. On the merged
   pull request, GitHub offers a **Revert** button that opens a new pull request undoing it.

## Pause the automation

- **One pull request:** add the label **hold** (right side of the pull request, "Labels"). Remove it to
  allow merging again.
- **Everything:** **Actions** tab → pick **auto-merge** (or **session-pr**) → **"..."** → **Disable
  workflow**. Enable it the same way.

## Approve a "needs-owner" pull request

1. Open the pull request. The bot's comment lists the sensitive files or words it found.
2. Read **Files changed**, and open the Netlify deploy preview (see above).
3. If you agree: **Squash and merge**, then **Confirm**. If not: leave a comment, or **Close pull request**.

## If something looks wrong with sign-in

Do not change anything in Supabase or the code in a hurry. Note what you see (the page, the message,
the time), roll back the last deploy if it started after a merge, and ask a session to investigate with
read-only checks first.
