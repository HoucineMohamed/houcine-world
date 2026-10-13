# Ecosystem design tokens (reference for Houcine.studio)

A side-by-side list of the design tokens of **Houcine.Trades** and their nearest equivalent on
**Houcine.world** (this site). It is a **reference only**: no Trades token is applied to this site,
and nothing here changes either app.

Sources:

- Houcine.Trades: `src/app/styles/tokens.css` in the Houcine.Trades repository (read only, as of
  module 16). Plain CSS custom properties, hex colours, system fonts, no web fonts.
- Houcine.world: `src/index.css` (HSL values in `:root`) and `tailwind.config.ts`. Tailwind CSS with
  shadcn/ui components; colours are written as `hsl(var(--name))`.

Notes on Houcine.world:

- Only the `:root` values are in use: the `.dark` block in `src/index.css` is never switched on, and
  `:root` is already a dark, black-and-grey palette.
- Hex values below are converted from the HSL values for easy comparison.

## 1. Colours

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
| Alert / danger | `--alert` | `#8a2d1f` | `#eb9686` | `#f0907f` | `--destructive` `0 84% 60%` = about `#ef4343` |
| Soft alert background | `--alert-soft` | `#f6e3de` | `#3b2420` | `#35201c` | none |
| Note background | `--note-soft` | `#f1ead6` | `#2c2819` | `#272414` | none |
| Primary button | `--accent` | (as above) | | | `--primary` `0 0% 96%` = `#f5f5f5` on `--primary-foreground` `#000000` |
| Extra brand greys | none | | | | `--metallic` `0 0% 85%` = `#d9d9d9`; `--tech-blue` `0 0% 80%` = `#cccccc` (despite the name, a grey) |

Trades also has chart colours (`--chart-line`, `--chart-band`, `--chart-grid`, `--chart-up`,
`--chart-down`, `--chart-ov-1..3`, `--chart-plan`, `--chart-stop`, `--chart-target`,
`--chart-level`, `--chart-last`, `--chart-gap`, `--chart-pane`). Houcine.world has no chart tokens. Trades deliberately does **not** use green and red for
profit and loss.

## 2. Type

| Role | Houcine.Trades | Houcine.world |
| --- | --- | --- |
| Body font | `--font-sans`: `system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif` | Tailwind `font-sans`: `Poppins` (loaded from Google Fonts). Note: `src/index.css` also sets `body { font-family: 'Inter', ... }`, and Inter is not loaded, so the body text falls back to the system font unless a component uses `font-sans`. |
| Heading / display font | `--font-serif`: `'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, 'Times New Roman', serif` | Tailwind `font-display`: `Space Grotesk` (Google Fonts). Note: `src/index.css` sets `h1–h6 { font-family: 'Orbitron', 'Inter', sans-serif }`, and Orbitron is not loaded. |
| Numbers / code | `--font-mono`: `ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace` | Tailwind default `font-mono` |
| Web fonts | None (its Content-Security-Policy allows none) | Google Fonts (Poppins, Space Grotesk) |
| Sizes | `--text-xs` 0.78rem, `--text-sm` 0.875rem, `--text-md` 1rem, `--text-lg` 1.25rem, `--text-xl` 1.625rem, `--text-2xl` 2.125rem | Tailwind scale: `text-xs` 0.75rem, `text-sm` 0.875rem, `text-base` 1rem, `text-lg` 1.125rem, `text-xl` 1.25rem, `text-2xl` 1.5rem, `text-3xl` 1.875rem, `text-4xl` 2.25rem (made smaller on phones and tablets by `src/index.css`) |
| Terminal look sizes | xs 0.72, sm 0.8, md 0.875, lg 1.05, xl 1.25, 2xl 1.6 (rem) | none |
| Line height | `--leading` 1.5 (Terminal 1.35) | Tailwind defaults per size |

## 3. Spacing

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

## 4. Radii, rules and motion

| Role | Houcine.Trades | Houcine.world |
| --- | --- | --- |
| Small radius | `--radius-sm` 3px (Terminal 0) | `rounded-sm` = `calc(var(--radius) - 4px)` = 8px |
| Medium radius | `--radius-md` 6px (Terminal 2px) | `rounded-md` = `calc(var(--radius) - 2px)` = 10px |
| Large radius | none | `rounded-lg` = `var(--radius)` = 0.75rem (12px), used by cards |
| Rule width | `--rule-width` 1px | Tailwind `border` = 1px |
| Focus ring | `--focus-width` 3px | shadcn `ring-2` with `ring-offset-2`, colour `--ring` |
| Transition | `--transition` 120ms ease | mostly `duration-300` (300ms), some 200ms and 700ms |

## 5. Character of each look, in one line

- **Houcine.Trades, Ledger:** calm and editorial, warm paper and ink, thin rules, serif headings,
  small radii.
- **Houcine.Trades, Terminal:** the same tokens, denser, dark first, square corners.
- **Houcine.world:** pure black and greys, white text, soft glass cards (`bg-card/50 backdrop-blur`),
  large radii, hover lift and scale.

## 6. What is missing

Nothing was missing to write this page: the Trades tokens file was read directly. If the Trades tokens
change later, this page does not update itself; compare it again with `src/app/styles/tokens.css`.
