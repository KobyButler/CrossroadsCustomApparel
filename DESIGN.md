---
name: Crossroads Custom Apparel — The Manifest Line
description: A dark, futuristic dispatch-console system — instrument-panel graphite, disciplined signal color, real depth and motion — across the whole app.
colors:
  graphite-950: "#0a0c10"
  graphite-900: "#12151b"
  graphite-800: "#191d25"
  graphite-700: "#262b35"
  graphite-600: "#363c48"
  graphite-500: "#4d5563"
  graphite-400: "#6f7684"
  graphite-300: "#9aa0ac"
  graphite-200: "#c3c7d0"
  graphite-100: "#e3e5e9"
  signal-cyan: "#33e1ff"
  signal-cyan-dim: "#0f6478"
  signal-cyan-bright: "#a7f3ff"
  signal-green: "#3ddc84"
  signal-green-dim: "#146538"
  signal-amber: "#ffb238"
  signal-amber-dim: "#7a4d0a"
  signal-amber-bright: "#ffdca3"
  signal-red: "#ff5c5c"
  signal-red-dim: "#7a1f1f"
typography:
  display:
    fontFamily: "IBM Plex Sans, Inter, system-ui, sans-serif"
    fontWeight: 600
    letterSpacing: "-0.01em"
  body:
    fontFamily: "IBM Plex Sans, Inter, system-ui, sans-serif"
    fontWeight: 400
  data:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontWeight: 500
  label:
    fontFamily: "IBM Plex Sans, Inter, system-ui, sans-serif"
    fontWeight: 600
    letterSpacing: "0.08em"
rounded:
  sm: "0.375rem"
  md: "0.5rem"
  full: "9999px"
spacing:
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
components:
  console-panel:
    backgroundColor: "{colors.graphite-900}"
    rounded: "{rounded.md}"
  console-panel-border:
    backgroundColor: "rgba(255,255,255,0.08)"
  button-console-primary:
    backgroundColor: "{colors.signal-cyan}"
    textColor: "{colors.graphite-950}"
    rounded: "{rounded.sm}"
    padding: "0.5rem 1rem"
  button-console-primary-hover:
    backgroundColor: "{colors.signal-cyan-bright}"
  button-console-secondary:
    backgroundColor: "rgba(255,255,255,0.04)"
    textColor: "{colors.graphite-200}"
    rounded: "{rounded.sm}"
    padding: "0.5rem 1rem"
  nav-item-active:
    backgroundColor: "rgba(51,225,255,0.09)"
    textColor: "{colors.signal-cyan-bright}"
---

# Design System: Crossroads Custom Apparel — The Manifest Line

<!-- Rev. 2. Established on the admin dashboard on 2026-08-29; revised and
extended app-wide on 2026-08-30 after direct user feedback (verbatim drivers:
"more depth... animations and movement and shadows and gradients", "dynamic
depending on what device you're on", "a lot of empty whitespace" at full
screen, "apply the styling throughout the entire project"). This is now the
ONE system for the whole app — admin, storefront, checkout, and login. A
"Legacy System" section may still be recorded at the bottom during the
migration; once nothing in the codebase references it, delete that section
and the `brand`/`ink` Tailwind tokens together. -->

## Overview

**Creative North Star: "The Manifest Line"**

The app reads as a live dispatch floor, not a SaaS analytics skin: every order is a manifest line moving from pick to pack to ship. The system was chosen through a structured direction round (seed key `6153ece7`, assigned candidate 5 of 7, weighed against six catalog challengers) and confirmed by the shop's owner, who runs the whole business alone and asked explicitly for something with genuine sci-fi command-console presence — Tron and Star Wars were the named references, "futuristic and fun," something that makes someone think "wow" — rather than a polite, muted "clean SaaS" default (that default is recorded below as the declined category standard).

Near-black graphite panels stand in for a night dispatch bay; a locked set of four signal colors (cyan for primary/live, green for fulfilled, amber for overdue, red for cancelled) carries every meaningful state, and nothing else on the page is allowed to borrow those hues for decoration. **Rev. 2 adds real depth back in, deliberately**: panels sit on a subtle top-to-bottom gradient and cast a genuine layered shadow; primary actions carry a cyan gradient plus a glow that deepens on hover; two slow-drifting ambient glow fields (cyan, green) sit behind every canvas; interactive elements lift on hover; a one-time light sweep crosses primary buttons on hover. None of this is violet, none of it is glassmorphism/backdrop-blur-as-decoration — it's instrument-panel depth, not SaaS-card softness. IBM Plex Sans carries UI text; IBM Plex Mono carries every number and status word.

**Key Characteristics:**
- Near-black graphite grounds, never pure white cards
- Exactly four signal colors, each meaning one real thing
- Real layered depth — gradient panels, true shadows, signal-color glow on emphasis surfaces, hover-lift everywhere interactive
- Two slow ambient glow fields drifting behind every canvas (cyan + green, `.console-canvas::before/::after`) — the "alive" feeling, always present, never distracting
- IBM Plex Mono for all data (money, counts, dates, IDs); IBM Plex Sans for everything else
- Sharp, small radii (6–8px) — engineered, not bubbly
- Content fills the viewport (`max-w-[1800px]`, centered, padding scales through `xl`) instead of a narrow left-hugging column — no dead space at full screen
- One motion grammar throughout: staggered exponential-ease-out entrances, hover-lift with a real shadow, a reserved lamp-pulse for genuine urgency, a one-time sheen sweep on primary actions

## Colors

The palette is deliberately locked: four signal hues, each carrying exactly one semantic meaning, over a ten-step graphite neutral scale. No fifth semantic-state accent may be introduced without revisiting this file. (Non-state categorical tags — e.g. `Badge`'s `purple`/`pink`/`orange`/`teal` variants used for things like vendor labels — may use a few additional non-violet hues; see Badge in Components.)

### Primary
- **Signal Cyan** (`#33e1ff`): the one interactive/brand accent — primary buttons, active nav state, links, the "live" KPI icon tint. Rendered as a gradient (`bg-signal-cyan-gradient`) plus a glow shadow on primary actions, not a flat fill. Bright text on cyan uses `graphite-950`, never white, for contrast.

### Secondary
- **Signal Green** (`#3ddc84`): fulfilled/paid/success state only.
- **Signal Amber** (`#ffb238`): overdue/needs-action state only. This is the hue most often paired with a pulse — see the Named Rule below.
- **Signal Red** (`#ff5c5c`): cancelled/critical state only.

### Neutral
- **Graphite 950** (`#0a0c10`): the base canvas.
- **Graphite 900** (`#12151b`): panel/card surfaces (`.console-panel`, itself a subtle gradient toward `#161b23`, not a flat fill).
- **Graphite 700–600** (`#262b35`–`#363c48`): borders, dividers, scrollbar thumb.
- **Graphite 300** (`#9aa0ac`): the floor for any real body/secondary text on this canvas — see the Named Rule below. Graphite 400/500/600 are reserved for decorative icon fills and chevrons that carry no reading content.
- **White / Graphite 100**: primary headings and values.

### Named Rules
**The Locked Palette Rule.** A signal color never appears for decoration — only to report the specific state it's assigned to. If a new UI element wants a fifth *semantic* color, the answer is "reuse one of the four" or "stay graphite," never "add a state color." (Non-state category tags are the one exception — see Colors intro.)

**The Graphite-300 Floor Rule.** On the graphite-950 canvas, no real text drops below `graphite-300` (verified ≈7.5:1 contrast). `graphite-400` alone measures ≈4.3:1 against `#0a0c10` — under the 4.5:1 floor — so it is icon-only, never text.

**The Earned Glow Rule** (rev. 2, replaces the retired "No Ambient Glow Rule"). Glow and gradient are welcome now — on primary actions, emphasis panels, and the two ambient canvas fields — but every use still answers to something real: a primary action people actually take, a panel reporting genuine urgency, or the app's own "alive" ambience. It is never sprinkled onto a data table row or a neutral card just to look busy.

## Typography

**Display/Body Font:** IBM Plex Sans (with Inter, system-ui fallback — Inter is a fallback name only, no longer downloaded)
**Data/Mono Font:** IBM Plex Mono (with ui-monospace fallback)

**Character:** A technical, workhorse instrument face — legible and calm in prose, exact and tabular wherever a number or a status word needs to be scanned at speed.

### Hierarchy
- **Headline** (600, 1.5rem/24px up to 1.75rem at `xl`, tight tracking): page titles ("Dashboard").
- **Title** (600, 0.875rem/14px): panel headers ("Recent Orders", "Quick Actions").
- **Body** (400–500, 0.875rem/14px): names, labels, descriptions.
- **Data** (500–600, IBM Plex Mono, `tabular-nums`): every dollar amount, count, date, and ID.
- **Label** (600, 11px, 0.08em tracking, uppercase, `graphite-300`): eyebrow-style field names above a value (`.console-label` / `.section-title`) — used only above a real number, never as a decorative kicker over a heading.

### Named Rules
**The Mono-Means-Data Rule.** IBM Plex Mono is reserved for numbers, dates, IDs, and status words in a lamp — never for a heading or a sentence, so its presence always signals "this is a measured value."

## Layout

The shell is a fixed 220px (248px at `xl`) dark sidebar on desktop plus a fluid content column that collapses to a slide-in drawer below `lg`. **Rev. 2:** content is no longer capped at a narrow 1200px — the padded content column now runs `w-full max-w-[1800px] mx-auto`, with padding scaling `p-4 → sm:p-6 → lg:p-8 → xl:p-10`, so a full-screen laptop or ultrawide monitor is actually filled rather than leaving a dead right-hand gap. The dashboard's own grid: a `2-up`→`4-up` KPI row (tiles grow slightly at `xl`), then a `2:1` split between the order manifest and a right rail (alert + quick actions), collapsing to one column below `lg`. Every surface must be genuinely responsive, not just "doesn't break": verify at a phone width, a tablet width, a laptop width, and a full-screen/ultrawide width — a page that only looks considered at one of those has not finished its layout pass.

## Elevation & Depth

**Rev. 2 — real, layered depth**, replacing the flat hairline-only system from rev. 1. Panels (`.console-panel`) sit on a subtle top-to-bottom gradient (`#161b23` → `#12151b`) with a 1px hairline border AND a true two-layer shadow (`shadow-console`: a tight near-black contact shadow plus a soft wide falloff). Interactive panels/rows lift 2–3px on hover with the shadow deepening (`shadow-console-hover`) and the border brightening slightly — real, felt motion, not just a color change. Primary actions and "this matters right now" panels (an urgent alert, the login card) additionally carry a signal-colored glow (`shadow-glow-cyan`/`-amber`/`-green`/`-red`, `.console-panel-glow-*`). Two soft, slow-drifting radial glow fields (cyan top-left, green bottom-right, `.console-canvas::before/::after`, 14–20s ease-in-out loops) sit behind every canvas at the shell level — the app's ambient "it's alive" signal, always present, never fast or attention-stealing. A one-time light sheen sweeps across primary buttons on hover (`.console-sheen`).

### Named Rules
**The Earned Glow Rule.** See Colors. Depth and glow are the system's default now, not an exception — but every instance still answers to something real (see above), never applied for its own sake.

## Shapes

Small, sharp radii throughout — `0.375rem` (buttons, icon chips, nav items) to `0.5rem` (panels). Nothing in the current system uses the prior world's `rounded-2xl`/`rounded-3xl` bubble radii.

## Components

### Buttons (`components/ui/button.tsx`, shared everywhere)
- **Shape:** `rounded-md` (6px) for `xs`/`sm`/`md`, `rounded-lg` for `lg`.
- **Primary:** `signal-cyan` gradient (`bg-signal-cyan-gradient`), `graphite-950` text, `shadow-glow-cyan-sm` at rest deepening to `shadow-glow-cyan` on hover, plus a one-time `.console-sheen` light sweep on hover.
- **Secondary:** `white/[0.06]` fill, `white/10` ring, `graphite-100` text.
- **Outline/Ghost/Danger/Success:** transparent/graphite text at rest; danger/success are flat `signal-red`/`signal-green` with a matching glow on hover.
- **Focus:** `signal-cyan` ring, 2px offset (offset color `graphite-950`).

### Console Panels (`.console-panel`, and the shared `<Card>`)
- **Corner:** `rounded-lg` (8px).
- **Background:** graphite gradient (`#161b23` → `#12151b`), not flat.
- **Border:** 1px `white/[0.08]` hairline.
- **Shadow:** `shadow-console` at rest; panels meant to be interacted with add `.console-panel-interactive` (or per-instance `hover:shadow-console-hover hover:border-white/[0.14]` + a small `whileHover` lift) for the hover-lift.
- **Emphasis variant:** `.console-panel-glow-{cyan,amber,green}` for a panel reporting real urgency/importance (adds a signal-tinted border + soft glow).
- **Header:** `white/[0.06]` bottom divider, `text-sm font-semibold text-white` title.

### Badge (`components/ui/badge.tsx`, shared everywhere)
- Tinted-dark fill (10% signal color) + bright signal-color text + matching ring, never a pastel pill.
- `default`/`success`/`warning`/`danger`/`info`/`neutral` map onto graphite/green/amber/red/cyan/graphite — these carry real state meaning and must follow the Locked Palette Rule.
- `purple`/`pink`/`orange`/`teal` are non-violet category tags (indigo `#5b8def`, rose `#ff6b8b`, orange `#ff9142`, teal `#2dd4bf`) for non-state categorical labels only (e.g. a vendor tag) — never reused for order/payment/fulfillment status.

### Signal Lamp (status — `app/page.tsx`'s `SignalLamp`, the preferred pattern for order/fulfillment/payment state specifically)
- A colored dot (`w-1.5 h-1.5 rounded-full`) plus a label in the same hue, `text-xs font-medium`. One of exactly four states (Unfulfilled/amber, Fulfilled/green, Cancelled/red, Draft/graphite). Not a filled pill — the dot-plus-word pairing is the signature for this specific use; `Badge` remains correct for everything else.

### KPI / Console Stat Tile
- `console-panel` + `p-5` (`xl:p-6`). Header row: `.console-label` left, an icon chip (tinted to the metric's signal color, `xl:w-9 xl:h-9`) right. Value in `text-2xl xl:text-3xl font-semibold font-mono tabular-nums text-white`. Optional sub-caption in `graphite-300`. Hover lifts the tile (`y: -3`) with a deepening shadow. The lamp-pulse ring applies only to a tile currently reporting urgency (e.g. Unfulfilled > 0).

### Navigation (sidebar, `components/admin/AdminShell.tsx`)
- **Style:** `graphite-950` ground with a faint cyan top gradient wash; items `text-graphite-300`, hover lightens toward `graphite-100` with a subtle background wash; active item gets a `signal-cyan` text tint, a `signal-cyan/[0.09]` background wash, and a 2px glowing cyan rail on the left edge — the sidebar's one signature glow, load-bearing (marks the current route), not decorative.
- **Mobile:** identical content in a slide-in drawer (backdrop blur + dim), same dark treatment; the mobile top bar matches.
- This shell now wraps every admin route uniformly — there is no longer a per-route light/dark split.

## Do's and Don'ts

### Do:
- **Do** keep every *state* signal color tied to its one real meaning (cyan=primary/live, green=fulfilled, amber=overdue, red=cancelled).
- **Do** render all data — money, counts, dates, order IDs — in IBM Plex Mono with `tabular-nums`.
- **Do** use `graphite-300` or lighter for any text a user actually reads on the graphite-950/900 canvas.
- **Do** give interactive panels, rows, and buttons a real hover-lift + shadow change, not just a color swap — depth and motion are load-bearing parts of this identity now.
- **Do** verify every surface at phone, tablet, laptop, and full-screen/ultrawide widths.
- **Do** prefer the shared `components/ui/*` primitives (`Button`, `Card`, `Badge`, `Input`, `Select`, `Modal`, `Toast`) over hand-rolled markup — they already carry the system.

### Don't:
- **Don't** reintroduce violet/purple as a brand or state color anywhere.
- **Don't** add a fifth *semantic/state* accent color; reuse one of the four signal hues or stay graphite.
- **Don't** use a colored `border-left`/`border-right` accent above 1px on any panel or list row (craft-floor ban) — state lives in the lamp/icon/glow, not a stripe.
- **Don't** reintroduce glassmorphism/backdrop-blur as pure decoration (a functional blur — e.g. a modal backdrop, a sticky header's legibility scrim — is fine; an ornamental frosted panel is not).
- **Don't** cap primary content width narrowly without centering it — the full-viewport dead-space problem this revision fixed.
