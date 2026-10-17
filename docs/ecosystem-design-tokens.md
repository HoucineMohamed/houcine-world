# Ecosystem design tokens

The design tokens of **Houcine.world**, written down so that every app of the ecosystem can match it.
Sources of truth: `src/index.css` (colours and radius, as CSS custom properties) and
`tailwind.config.ts` (fonts, breakpoints, radius steps). A machine-readable copy is
**`src/design/tokens.json`**; `scripts/dev/tokens.test.mjs` fails if that copy disagrees with
`src/index.css`. The public page **`/brand`** shows the same tokens live, with copy buttons.

**How to change a token:** edit `src/index.css` (or `tailwind.config.ts`), then the same value in
`src/design/tokens.json`, then this page. The test tells you if the first two disagree.

## 1. Where each value is used

| | Public site (`/`, the vertical pages, legal pages, `/brand`) | Workspace (`/workspace`, `/admin`) |
| --- | --- | --- |
| Colours, radius, focus ring, fonts | yes, all of them | yes, the same tokens through shadcn/ui |
| Header | fixed, `bg-background/80` or `/95` with `backdrop-blur`, `border-b border-border/40` | sticky top bar `bg-card/50 backdrop-blur-sm`, sidebar `bg-card/40 border-r border-border` |
| Custom cursor (`CustomCursor`, the native cursor hidden) | yes (pointer devices) | no (`body.workspace-active` restores the cursor) |
| Neon glows, scroll reveals, hover lift | yes | no |
| Footer | yes | no |

## 2. Colours

All colours are HSL triplets used as `hsl(var(--name))` (Tailwind: `bg-background`,
`text-muted-foreground`, and so on). **`:root` is the palette in use everywhere**, and it is already a
dark palette (black and greys, white text). The `.dark` block exists but no page switches it on; it is
listed for completeness. Hex values are converted for convenience; the HSL value is the reference.

| Token | `:root` HSL (in use) | Hex | `.dark` HSL (unused) | Hex |
| --- | --- | --- | --- | --- |
| `--background` | `0 0% 0%` | `#000000` | `0 0% 0%` | `#000000` |
| `--foreground` | `0 0% 96%` | `#f5f5f5` | `0 0% 96%` | `#f5f5f5` |
| `--card` | `0 0% 5%` | `#0d0d0d` | `0 0% 4%` | `#0a0a0a` |
| `--card-foreground` | `0 0% 96%` | `#f5f5f5` | `0 0% 96%` | `#f5f5f5` |
| `--popover` | `0 0% 5%` | `#0d0d0d` | `0 0% 4%` | `#0a0a0a` |
| `--popover-foreground` | `0 0% 96%` | `#f5f5f5` | `0 0% 96%` | `#f5f5f5` |
| `--primary` | `0 0% 96%` | `#f5f5f5` | `0 0% 96%` | `#f5f5f5` |
| `--primary-foreground` | `0 0% 0%` | `#000000` | `0 0% 0%` | `#000000` |
| `--secondary` | `0 0% 9%` | `#171717` | `0 0% 7%` | `#121212` |
| `--secondary-foreground` | `0 0% 96%` | `#f5f5f5` | `0 0% 96%` | `#f5f5f5` |
| `--muted` | `0 0% 9%` | `#171717` | `0 0% 7%` | `#121212` |
| `--muted-foreground` | `0 0% 65%` | `#a6a6a6` | `0 0% 60%` | `#999999` |
| `--accent` | `0 0% 80%` | `#cccccc` | `0 0% 80%` | `#cccccc` |
| `--accent-foreground` | `0 0% 0%` | `#000000` | `0 0% 0%` | `#000000` |
| `--tech-blue` | `0 0% 80%` | `#cccccc` | `0 0% 80%` | `#cccccc` |
| `--tech-blue-foreground` | `0 0% 0%` | `#000000` | `0 0% 0%` | `#000000` |
| `--metallic` | `0 0% 85%` | `#d9d9d9` | `0 0% 85%` | `#d9d9d9` |
| `--metallic-foreground` | `0 0% 0%` | `#000000` | `0 0% 0%` | `#000000` |
| `--destructive` | `0 84% 45%` | `#d31212` | `0 63% 31%` | `#811d1d` |
| `--destructive-foreground` | `0 0% 98%` | `#fafafa` | `0 0% 98%` | `#fafafa` |
| `--border` | `0 0% 14%` | `#242424` | `0 0% 12%` | `#1f1f1f` |
| `--input` | `0 0% 14%` | `#242424` | `0 0% 12%` | `#1f1f1f` |
| `--ring` | `0 0% 80%` | `#cccccc` | `0 0% 80%` | `#cccccc` |
| `--sidebar-background` | `0 0% 4%` | `#0a0a0a` | `0 0% 3%` | `#080808` |
| `--sidebar-foreground` | `0 0% 96%` | `#f5f5f5` | `0 0% 96%` | `#f5f5f5` |
| `--sidebar-primary` | `0 0% 80%` | `#cccccc` | `0 0% 80%` | `#cccccc` |
| `--sidebar-primary-foreground` | `0 0% 0%` | `#000000` | `0 0% 0%` | `#000000` |
| `--sidebar-accent` | `0 0% 9%` | `#171717` | `0 0% 7%` | `#121212` |
| `--sidebar-accent-foreground` | `0 0% 96%` | `#f5f5f5` | `0 0% 96%` | `#f5f5f5` |
| `--sidebar-border` | `0 0% 14%` | `#242424` | `0 0% 12%` | `#1f1f1f` |
| `--sidebar-ring` | `0 0% 80%` | `#cccccc` | `0 0% 80%` | `#cccccc` |

Rules: one accent, a light grey (`--accent`, `--ring`); no brand colour beyond black, white and greys
on the main site. The La Rosa View pages add a rose accent (`rose-400` to `rose-600`, Tailwind's
default palette) in their own components only. `--tech-blue` is a grey despite its name. Text pairs
reach at least 4.5:1 contrast (checked by `scripts/dev/a11y-check.mjs`).

## 3. Fonts

| Role | Stack | Tailwind class | Weights loaded | Where it comes from | Licence |
| --- | --- | --- | --- | --- | --- |
| Text | Poppins, system-ui, -apple-system, sans-serif | `font-sans` | 300, 400, 500, 600, 700, 800, 900 | Google Fonts, one stylesheet link in `index.html` | SIL Open Font License 1.1 |
| Display (large headings) | Space Grotesk, Poppins, sans-serif | `font-display` | 400, 500, 600, 700 | Google Fonts, same link | SIL Open Font License 1.1 |
| Code, numbers | Tailwind default `font-mono` (ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace) | `font-mono` | system | the visitor's computer | system fonts |

There are **no font files in the repository**: both web fonts are served by Google Fonts
(`fonts.googleapis.com` for the stylesheet, `fonts.gstatic.com` for the files). Two defaults in
`src/index.css` name fonts that are **not loaded**: `body` uses `'Inter', -apple-system, …` and `h1`–`h6`
use `'Orbitron', 'Inter', sans-serif`. Text without `font-sans` therefore shows the system font, and
headings without `font-display` too. Components that want the brand look set `font-sans` or
`font-display` explicitly.

## 4. Type scale

Tailwind's default scale (size, line height). On phones (up to 640px) `src/index.css` shrinks the large
sizes, and on tablets (641px to 1023px) it shrinks `text-3xl` to `text-5xl` a little; the base layer also
gives `h1`–`h4`, `p`, `span` and `li` responsive sizes (a size class on the element wins).

| Class | Size | Line height |
| --- | --- | --- |
| `text-xs` | 0.75rem | 1rem |
| `text-sm` | 0.875rem | 1.25rem |
| `text-base` | 1rem | 1.5rem |
| `text-lg` | 1.125rem | 1.75rem |
| `text-xl` | 1.25rem | 1.75rem |
| `text-2xl` | 1.5rem | 2rem |
| `text-3xl` | 1.875rem | 2.25rem |
| `text-4xl` | 2.25rem | 2.5rem |
| `text-5xl` | 3rem | 1 |
| `text-6xl` | 3.75rem | 1 |
| `text-7xl` | 4.5rem | 1 |

Phone sizes: `text-xl` 1rem, `text-2xl` 1.125rem, `text-3xl` 1.25rem, `text-4xl` 1.5rem, `text-5xl`
1.75rem. Tablet sizes: `text-3xl` 1.5rem, `text-4xl` 1.875rem, `text-5xl` 2.25rem. Small labels above a
heading: `text-sm uppercase tracking-[0.2em] text-muted-foreground`.

## 5. Spacing, layout and breakpoints

- Spacing is Tailwind's 4px scale (`1` = 0.25rem, `4` = 1rem, `6` = 1.5rem, `8` = 2rem, `20` = 5rem).
- `container`: centred, at most 1400px, padding 1rem / 1.5rem (sm) / 2rem (lg); `src/index.css` sets
  `px-4 sm:px-6 md:px-8`. Content pages use `max-w-5xl` inside it.
- Every `<section>` gets `py-8 sm:py-12 md:py-16 lg:py-20`; every `.grid` gets `gap-3 sm:gap-4 md:gap-6 lg:gap-8`.
- On phones `src/index.css` also tightens `p-6`/`p-8`, `gap-6`/`gap-8` and margins (see the file).
- Breakpoints: `xs` 375px, `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px, `2xl` 1536px.

## 6. Radius, borders, shadows, focus ring

| Token | Value |
| --- | --- |
| `--radius` | `0.75rem` (12px); `rounded-lg` = `var(--radius)`, `rounded-md` = 10px, `rounded-sm` = 8px; buttons and inputs use `rounded-md`, cards `rounded-lg`, badges `rounded-full` |
| Radius on phones | every `rounded-*` element is 0.5rem below 641px (`src/index.css`) |
| Border | 1px, `hsl(var(--border))` on every element by default; soft rule `border-border/40` (header, footer) |
| Card shadow | `shadow-sm` |
| Glow button | `0 0 20px rgba(255,255,255,0.15)`, on hover `0 0 30px rgba(255,255,255,0.25), 0 0 40px rgba(255,255,255,0.1)` (`.neon-button`) |
| Hover lift | `translateY(-4px)` and `0 20px 40px -10px rgba(255,255,255,0.08)` (`.hover-lift`) |
| Input focus | `0 0 0 2px rgba(255,255,255,0.1), 0 0 20px rgba(255,255,255,0.05)`, border `rgba(255,255,255,0.3)` |
| Focus ring | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background` (2px light grey ring, 2px gap) |

## 7. Motion

| Use | Value |
| --- | --- |
| Links and buttons | `all 0.3s cubic-bezier(0.4, 0, 0.2, 1)` |
| Hover scale | `hover:scale-105` (nav links), `hover:scale-110` (icons), `hover:scale-[1.02]` (cards), 200 to 300ms |
| Scroll reveal | `fadeInUp`, `fadeInLeft`, `fadeInRight` 0.6s ease-out; `scaleIn` 0.5s |
| Accordion | 0.2s ease-out |
| Ambient loops (hero) | `neon-glow` 3s, `neon-ring-1` 2s, `neon-ring-2` 2.5s, `pulse-text` 2s, `soundwave-line` 1.5s, ease-in-out, infinite |
| Reduced motion | `prefers-reduced-motion: reduce` sets every animation and transition to 0.01ms, one iteration (`src/index.css`); the 3D hero and the portraits also check it in code |

## 8. Layers (z-index)

| Layer | Class |
| --- | --- |
| Content above backgrounds | `z-10` (`z-20` in a few places) |
| Workspace top bar | `z-40` |
| Public header, dialogs, sheets, menus, popovers, toasts | `z-50` |

## 9. Logo and images

| File | Size | Use |
| --- | --- | --- |
| `src/assets/logo-h.png` (same file as `src/assets/houcine-logo-h.png`) | 500 × 500 px PNG | the H mark: header `h-8` to `h-10`, footer `h-6`, workspace sidebar `h-10` |
| `public/og-default.png` | 1200 × 630 px PNG | default share image (Open Graph, Twitter) |
| `public/favicon.ico` | | browser tab |

The H mark sits on black, usually at 80 % opacity rising to 100 % on hover. There is no SVG version of
the logo in the repository; a vector file would be a request to the owner (sessions do not add images).

## 10. Component anatomy (exact classes)

**Header (public pages):** `fixed top-0 left-0 right-0 z-50 border-b border-border/40 backdrop-blur
bg-background/80` (home) or `/95` (other pages); inside `container mx-auto px-6 py-4 flex items-center
justify-between`; logo `h-8 w-auto` (or `h-10`); nav links `hover:text-accent transition-all
hover:scale-105 duration-200`; on phones a `Sheet` menu.

**Footer:** `py-8 px-6 border-t border-border/40`; links `text-sm hover:text-accent transition-colors`;
social icons `h-6 w-6 hover:text-accent hover:scale-110`.

**Button** (`src/components/ui/button.tsx`): base `inline-flex items-center justify-center gap-2
whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors` plus the
focus ring and `disabled:pointer-events-none disabled:opacity-50`. Variants: `default` `bg-primary
text-primary-foreground hover:bg-primary/90`; `secondary` `bg-secondary text-secondary-foreground
hover:bg-secondary/80`; `outline` `border border-input bg-background hover:bg-accent
hover:text-accent-foreground`; `ghost` `hover:bg-accent hover:text-accent-foreground`; `destructive`
`bg-destructive text-destructive-foreground hover:bg-destructive/90`; `link` `text-primary
underline-offset-4 hover:underline`. Sizes: `default` `h-10 px-4 py-2`, `sm` `h-9 px-3`, `lg` `h-11 px-8`,
`icon` `h-10 w-10`.

**Card** (`src/components/ui/card.tsx`): `rounded-lg border bg-card text-card-foreground shadow-sm`;
header `flex flex-col space-y-1.5 p-6`; title `text-2xl font-semibold leading-none tracking-tight`;
description `text-sm text-muted-foreground`; content `p-6 pt-0`. Public pages often add the glass look
`border-border/50 bg-card/50 backdrop-blur` and on hover `hover:border-accent/50`.

**Input** (`src/components/ui/input.tsx`): `flex h-10 w-full rounded-md border border-input
bg-background px-3 py-2 text-base md:text-sm placeholder:text-muted-foreground` plus the focus ring and
`disabled:cursor-not-allowed disabled:opacity-50`.

**Badge** (`src/components/ui/badge.tsx`): `inline-flex items-center rounded-full border px-2.5 py-0.5
text-xs font-semibold transition-colors`; variants `default` (primary), `secondary`, `destructive`,
`outline` (`text-foreground`).

## 11. Token change protocol

Houcine.world and Houcine.Trades share a look but not code: each repository keeps its own tokens. A change
here must be mirrored there by hand, or the two drift apart. `scripts/dev/tokens.test.mjs` guards this side:
it fails when `src/index.css`, `src/design/tokens.json` and this page disagree (both colour palettes, the hex
value printed beside each colour, and the radius). It does **not** guard the fonts, the type sizes or the
spacing: a change to those is compared by eye with the appendix.

**On this side (Houcine.world), in one pull request:**

1. Change the value in `src/index.css` (the source of truth).
2. Change the same value in `src/design/tokens.json`.
3. Change the row in the tables of this page (sections 2 and 6), including the hex value.
4. Run `node --experimental-strip-types --test scripts/dev/tokens.test.mjs`: it must pass.
5. Write in the pull request description which tokens changed, from what to what.

**What the Trades session must mirror:** only the shared brand values, which are the logo, the greys and
white of the public look, the radius scale and the font stacks. Houcine.Trades keeps its own palettes
(Ledger and Terminal); it maps the shared values onto its own slots in `src/app/styles/tokens.css` (see the
appendix below for the correspondence).

**How to tell it:** after the pull request merges, add a line to `docs/trades-findings.md` under "Design" with
the token names, the old and new values and the pull request link. The Trades sessions read that file; the
owner can also paste the line into a Trades session. Then update the appendix of this page once the Trades
side has changed.

## Appendix: side by side with Houcine.Trades (as of module 16)

A reference only: no Trades token is applied to this site. Source: `src/app/styles/tokens.css` in the
Houcine.Trades repository, read when this appendix was first written; it does not update itself.

### A1. Colours

Houcine.Trades has three palettes: **Ledger light** (default), **Ledger dark** (system dark mode or
the toggle) and **Terminal dark** (the denser look). Houcine.world has one.

| Role | Trades token | Ledger light | Ledger dark | Terminal dark | Houcine.world equivalent |
| --- | --- | --- | --- | --- | --- |
| Page background | `--bg` | `#f6f3ec` | `#171613` | `#0c0e11` | `--background` `0 0% 0%` = `#000000` |
| Card / panel | `--surface` | `#fffdf8` | `#1f1d19` | `#12151a` | `--card` `0 0% 5%` = `#0d0d0d` |
| Second surface | `--surface-2` | `#efebe1` | `#2a2823` | `#1a1e25` | `--secondary` / `--muted` `0 0% 9%` = `#171717` |
| Main text | `--ink` | `#23211d` | `#ece7da` | `#e6e8ec` | `--foreground` `0 0% 96%` = `#f5f5f5` |
| Secondary text | `--ink-2` | `#565146` | `#b9b2a1` | `#aeb4bf` | `--muted-foreground` `0 0% 65%` = `#a6a6a6` |
| Quiet text | `--ink-3` | `#686256` | `#a29b88` | `#98a0ac` | `--muted-foreground` (no separate step) |
| Thin rule / border | `--rule` | `#d8d1c2` | `#3a372f` | `#262b33` | `--border` / `--input` `0 0% 14%` = `#242424` |
| Strong rule | `--rule-strong` | `#b9b09d` | `#57534a` | `#3b424d` | none |
| Accent | `--accent` | `#234a7a` | `#93b7e8` | `#7db0f5` | `--accent` / `--ring` `0 0% 80%` = `#cccccc` |
| Text on accent | `--accent-ink` | `#ffffff` | `#11151b` | `#0c0e11` | `--accent-foreground` `0 0% 0%` = `#000000` |
| Soft accent background | `--accent-soft` | `#e3eaf3` | `#232c3a` | `#1b2636` | `bg-accent/10` (accent at 10 % opacity) |
| Gain (always with sign and word) | `--gain` | `#1d5f8f` | `#86b6e3` | `#74b2ec` | none |
| Loss (always with sign and word) | `--loss` | `#8f5208` | `#e2ac62` | `#e3ab5e` | none |
| Alert / danger | `--alert` | `#8a2d1f` | `#eb9686` | `#f0907f` | `--destructive` `0 84% 45%` = about `#d41313` (was `0 84% 60%` until the contrast fix in #22) |
| Soft alert background | `--alert-soft` | `#f6e3de` | `#3b2420` | `#35201c` | none |
| Note background | `--note-soft` | `#f1ead6` | `#2c2819` | `#272414` | none |
| Primary button | `--accent` | (as above) | | | `--primary` `0 0% 96%` = `#f5f5f5` on `--primary-foreground` `#000000` |
| Extra brand greys | none | | | | `--metallic` `0 0% 85%` = `#d9d9d9`; `--tech-blue` `0 0% 80%` = `#cccccc` (despite the name, a grey) |

Trades also has chart colours (`--chart-line`, `--chart-band`, `--chart-grid`, `--chart-up`,
`--chart-down`, `--chart-ov-1..3`, `--chart-plan`, `--chart-stop`, `--chart-target`,
`--chart-level`, `--chart-last`, `--chart-gap`, `--chart-pane`). Houcine.world has no chart tokens. Trades deliberately does **not** use green and red for
profit and loss.

### A2. Type

| Role | Houcine.Trades | Houcine.world |
| --- | --- | --- |
| Body font | `--font-sans`: `system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif` | Tailwind `font-sans`: `Poppins` (loaded from Google Fonts). Note: `src/index.css` also sets `body { font-family: 'Inter', ... }`, and Inter is not loaded, so the body text falls back to the system font unless a component uses `font-sans`. |
| Heading / display font | `--font-serif`: `'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, 'Times New Roman', serif` | Tailwind `font-display`: `Space Grotesk` (Google Fonts). Note: `src/index.css` sets `h1–h6 { font-family: 'Orbitron', 'Inter', sans-serif }`, and Orbitron is not loaded. |
| Numbers / code | `--font-mono`: `ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace` | Tailwind default `font-mono` |
| Web fonts | None (its Content-Security-Policy allows none) | Google Fonts (Poppins, Space Grotesk) |
| Sizes | `--text-xs` 0.78rem, `--text-sm` 0.875rem, `--text-md` 1rem, `--text-lg` 1.25rem, `--text-xl` 1.625rem, `--text-2xl` 2.125rem | Tailwind scale: `text-xs` 0.75rem, `text-sm` 0.875rem, `text-base` 1rem, `text-lg` 1.125rem, `text-xl` 1.25rem, `text-2xl` 1.5rem, `text-3xl` 1.875rem, `text-4xl` 2.25rem (made smaller on phones and tablets by `src/index.css`) |
| Terminal look sizes | xs 0.72, sm 0.8, md 0.875, lg 1.05, xl 1.25, 2xl 1.6 (rem) | none |
| Line height | `--leading` 1.5 (Terminal 1.35) | Tailwind defaults per size |

### A3. Spacing

| Trades token | Ledger | Terminal | Houcine.world (Tailwind, 4 px base) |
| --- | --- | --- | --- |
| `--space-1` | 0.25rem | 0.125rem | `1` = 0.25rem |
| `--space-2` | 0.5rem | 0.25rem | `2` = 0.5rem |
| `--space-3` | 0.75rem | 0.5rem | `3` = 0.75rem |
| `--space-4` | 1rem | 0.625rem | `4` = 1rem |
| `--space-5` | 1.5rem | 1rem | `6` = 1.5rem |
| `--space-6` | 2rem | 1.5rem | `8` = 2rem |
| `--space-7` | 3rem | 2rem | `12` = 3rem |
| `--measure` (page width) | 70rem | 100rem | `container`: max 1400px, padding 1rem / 1.5rem (sm) / 2rem (lg); the Services grid uses `max-w-6xl` (72rem) |
| Workspace grid | `--ws-gap` = space-4, `--ws-row` 8.5rem (7.5rem), `--ws-pad` = space-4, `--ws-head-pad` = space-2 | none (cards use `gap-6` = 1.5rem, card padding `p-6` = 1.5rem) |

### A4. Radii, rules and motion

| Role | Houcine.Trades | Houcine.world |
| --- | --- | --- |
| Small radius | `--radius-sm` 3px (Terminal 0) | `rounded-sm` = `calc(var(--radius) - 4px)` = 8px |
| Medium radius | `--radius-md` 6px (Terminal 2px) | `rounded-md` = `calc(var(--radius) - 2px)` = 10px |
| Large radius | none | `rounded-lg` = `var(--radius)` = 0.75rem (12px), used by cards |
| Rule width | `--rule-width` 1px | Tailwind `border` = 1px |
| Focus ring | `--focus-width` 3px | shadcn `ring-2` with `ring-offset-2`, colour `--ring` |
| Transition | `--transition` 120ms ease | mostly `duration-300` (300ms), some 200ms and 700ms |

### A5. Character of each look, in one line

- **Houcine.Trades, Ledger:** calm and editorial, warm paper and ink, thin rules, serif headings,
  small radii.
- **Houcine.Trades, Terminal:** the same tokens, denser, dark first, square corners.
- **Houcine.world:** pure black and greys, white text, soft glass cards (`bg-card/50 backdrop-blur`),
  large radii, hover lift and scale.

### A6. What is missing

Nothing was missing to write this page: the Trades tokens file was read directly. If the Trades tokens
change later, this page does not update itself; compare it again with `src/app/styles/tokens.css`.
