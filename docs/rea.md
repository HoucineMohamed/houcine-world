# REA (reverse engineering for Claude sessions)

REA ([morluto/rea](https://github.com/morluto/rea), MIT, npm package `rea-agents`) examines shipped software: JavaScript and Electron
bundles, web pages, native and managed binaries, Android packages, firmware. It answers questions like "what does this built bundle really
contain", "what changed between two builds" or "what does this program send". It is a **development aid for Claude sessions only**: it is
not part of the product, `package.json` or any build, and nothing in the code uses it. The owner asked for it on 3 November 2026 (vetted
before use).

## What is in the repository

- `.claude/skills/reverse-engineer-anything/`: the upstream skill of release **6.8.0** (`SKILL.md`, `references/`, `LICENSE`, `NOTICE`),
  with a house-rules block at the top and `rea-agents@latest` pinned to `rea-agents@6.8.0`.
- NOT included, on purpose: the MCP server registration, the Claude Code plugin and `rea setup` (it writes `~/.claude.json` and
  `~/.claude/skills` and registers itself in every AI tool it finds). Sessions use the command line only.

## What was checked (release 6.8.0, commit `9ebbe67`)

- MIT licence; third-party licences listed upstream in `THIRD_PARTY_NOTICES.md`.
- The npm package has no install-time scripts; about 40 dependencies (among them `playwright-core` and `node-pty`), `frida` optional.
  Analysis engines (Ghidra, IDA, JADX, Binwalk, Unblob) are not installed and are not installed by REA.
- Tried in a session: `npx -y rea-agents@6.8.0 analyze-javascript-application <folder> --json` ran from the scratchpad, wrote nothing into
  the target and returned an Evidence record. npm warns that Node 22.22 is below the package's stated minimum (22.23.4); it still ran.

## Allowed targets

Only software the owner owns or is authorized to examine: this repository's own builds, the owner's other project, the MT5 agent program,
software whose licence allows it, CTF and teaching samples. Never a third party's site, app, API, broker, exchange or prop firm, and never
to get around DRM, licence checks, sign-in, bot protection or terms of service.

## How a session uses it

```bash
npx -y rea-agents@6.8.0 analyze-javascript-application /absolute/path/to/build --json > /path/in/scratchpad/evidence.json
```

```bash
npx -y rea-agents@6.8.0 --help
```

A newer version is the owner's decision: re-check the points above against its code first, then change the pin in the skill.
