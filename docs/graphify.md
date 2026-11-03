# graphify (code map for Claude sessions)

graphify ([Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify), Apache-2.0 with an MIT file, PyPI package `graphifyy`)
turns the code into a graph that Claude can query ("what calls this", "how does A reach B") instead of reading files one by one. It
is a **development aid for Claude sessions only**: it is not part of the site, `package.json`, the Netlify build or any Supabase function, and nothing in
the site uses it. The owner asked for it on 3 November 2026 (new tools are vetted before use).

## What is in the repository

- `.claude/skills/graphify/`: the upstream Claude skill of release **0.9.101** (`SKILL.md`, `references/`, `LICENSE`, `NOTICE`), with a
  house-rules block at the top and its install lines pinned to `graphifyy==0.9.101`.
- `.gitignore`: `graphify-out/` (the graphs are rebuilt in each session, about a minute, and never committed).
- NOT included, on purpose: the PreToolUse hooks and the `CLAUDE.md` section that `graphify install` writes. Hooks need the owner's
  explicit approval and the owner approves hooks and CLAUDE.md changes by hand (critical paths).

## What was checked (release 0.9.101, commit `8e6a6d2`)

- Code is parsed locally with tree-sitter; with `GRAPHIFY_BACKEND=none` and `--code-only` nothing leaves the computer and no key is read.
- No telemetry and no update check in the code. The network is used only by `graphify add <url>`, `clone`, the optional AI backends
  and the cloud product, all forbidden by the house rules. The local query log is switched off with `GRAPHIFY_QUERY_LOG_DISABLE=1`.
- `graphify install` writes `.claude/settings.json` hooks and edits `CLAUDE.md` (seen in an empty test folder): never run it here.
- It installs about 25 tree-sitter grammar packages from PyPI (compiled code). It runs in its own environment, outside the repository.

## How a session uses it

```bash
uv tool install graphifyy==0.9.101
```

```bash
GRAPHIFY_BACKEND=none GRAPHIFY_QUERY_LOG_DISABLE=1 graphify extract . --code-only && graphify cluster-only .
```

```bash
graphify path "loginAction" "verifyTotp"
```

A newer version is the owner's decision: re-check the points above against its code first, then change the pin in the skill.
