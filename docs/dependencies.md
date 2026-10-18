# Dependencies and lockfiles (notes only)

Written 16 October 2026. **Nothing here has been applied**: changing a lockfile changes what gets installed
on Netlify and in CI, so it is the owner's decision, in its own pull request.

## Today

| File | Used by | State |
| --- | --- | --- |
| `package.json` | everything | the source of truth for versions (ranges such as `^1.2.3`) |
| `package-lock.json` | npm | out of date with `package.json` (CI therefore installs with `npm install --no-package-lock`, which ignores it) |
| `bun.lock`, `bun.lockb` | Bun | left by the original site builder; not read by CI |

What Netlify installs with is chosen in the Netlify site settings or from the lockfiles it finds; it has not
been checked from here (the session cannot open the Netlify dashboard). To see it: app.netlify.com → the
**houcineworld** site → **Deploys** → open the latest deploy → the log near the top says "Installing
dependencies" with npm or bun.

## Bringing them in line (when you decide to)

1. Keep one package manager. npm is what CI uses, so the simplest is npm.
2. A session regenerates `package-lock.json` from `package.json` (`npm install --package-lock-only`), removes
   `bun.lock` and `bun.lockb`, and switches CI to `npm ci` (exact versions from the lockfile).
3. That pull request touches critical files, so it waits for you: check the Netlify preview, then merge.
4. If the Netlify log in "Today" showed bun, the first deploy after that change installs with npm instead:
   look at the deploy log once to confirm it succeeded.

## Update notes

- Versions move only inside the ranges of `package.json` today, because CI and (probably) Netlify resolve the
  ranges at every install. A pinned lockfile (above) would make every build use the same versions.
- Upgrading a package beyond its range (a new major version) is a separate pull request per package, with the
  full checks of `docs/runbook.md`.
