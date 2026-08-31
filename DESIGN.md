---
name: Crossroads Custom Apparel — The Manifest Line & The Print Floor
description: Two systems split by mode — a dark dispatch console for the sole-operator admin/login ("The Manifest Line") and a pre-press light-table storefront for the public landing, group shops, and checkout ("The Print Floor").
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
  plate-950: "#0A0D14"
  plate-900: "#121620"
  plate-800: "#1B2029"
  plate-700: "#2B303A"
  plate-600: "#414855"
  plate-500: "#5C6472"
  plate-400: "#7A8290"
  plate-300: "#A3AAB6"
  plate-200: "#C9CDD6"
  plate-100: "#E7E9ED"
  plate-50: "#F7F8FA"
  proc-cyan: "#00AEEF"
  proc-magenta: "#EC008C"
  proc-yellow: "#FFE800"
  proc-key: "#0A0D14"
  spot-crimson: "#C93420"
  spot-crimson-bright: "#FF8A73"
  spot-cobalt: "#2657C7"
  spot-cobalt-bright: "#8FB4FF"
  spot-marigold: "#E7A22E"
  spot-marigold-bright: "#FFD37A"
  spot-emerald: "#167A4D"
  spot-emerald-bright: "#8FE0BB"
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
  storefront-display:
    fontFamily: "Big Shoulders Display, Arial Narrow, sans-serif"
    fontWeight: 700
    letterSpacing: "-0.01em"
  storefront-body:
    fontFamily: "Public Sans, system-ui, -apple-system, sans-serif"
    fontWeight: 400
  storefront-data:
    fontFamily: "Fragment Mono, ui-monospace, monospace"
    fontWeight: 400
  storefront-label:
    fontFamily: "Fragment Mono, ui-monospace, monospace"
    fontWeight: 400
    letterSpacing: "0.04em"
rounded:
  sm: "0.375rem"
  md: "0.5rem"
  full: "9999px"
  storefront-btn: "0.5rem"
  storefront-card: "0.625rem"
  storefront-panel: "0.75rem"
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
  button-press-primary:
    backgroundColor: "{colors.spot-crimson}"
    textColor: "{colors.plate-50}"
    rounded: "{rounded.storefront-btn}"
    padding: "0.5rem 1rem"
  button-press-primary-hover:
    backgroundColor: "{colors.spot-crimson-bright}"
  button-press-secondary:
    backgroundColor: "{colors.plate-800}"
    textColor: "{colors.plate-100}"
    rounded: "{rounded.storefront-btn}"
    padding: "0.5rem 1rem"
  separation-card:
    backgroundColor: "{colors.plate-900}"
    textColor: "{colors.plate-100}"
    rounded: "{rounded.storefront-card}"
  spec-panel:
    backgroundColor: "{colors.plate-900}"
    textColor: "{colors.plate-100}"
    rounded: "{rounded.storefront-panel}"
  colorbar-badge-cyan:
    backgroundColor: "rgba(0,174,239,0.10)"
    textColor: "{colors.proc-cyan}"
    rounded: "{rounded.sm}"
    padding: "0.3rem 0.6rem"
---

# Design System: Crossroads Custom Apparel — Two Systems, One App

<!-- Rev. 4. Rev. 1 established the admin dashboard 2026-08-29. Rev. 2
extended that same console system app-wide on 2026-08-30. Rev. 3 (2026-08-31,
morning) split it into two systems after feedback that the console world read
as "lifeless and bleak" for the public storefront, introducing a warm
kraft-crate world, "The Gear Drop." Rev. 4 (2026-08-31, same day) replaces
The Gear Drop outright after an explicit follow-up request for a full
redesign toward "clean, sleek, modern, futuristic... full... not a ton of
empty space or AI feel": Admin and Login keep "The Manifest Line" unchanged
for a second revision running; Landing, Group Shops, and Checkout move to
"The Print Floor," a pre-press/screen-print-production world chosen through
a structured direction round (seed key `95845a44`) — the roll assigned a
live-broadcast-graphics direction ("The Scorebug"), and the user instead
locked IMPECCABLE'S PICK, the top-ranked grounded candidate, over that
assigned card and six declined catalog challengers. The two systems never
mix on one page — the split is enforced in code at
`components/admin/AdminShell.tsx`'s `isPublic` branch, not just in this
document. This build was code-led (no image generation was available in the
session that built it), reviewed against the written direction contract
rather than a visual comp, and closed with disposition `fix` after five
material corrections: two banned kicker/eyebrow labels removed, one
generic whileInView fade-up varied across sections, a redundant trust-panel
repeated three times reduced to two genuinely different layouts, and
inconsistent icon stroke widths unified to 2. -->

## Overview

**Creative North Star — Admin & Login: "The Manifest Line."** **Creative North Star — Public Storefront: "The Print Floor."**

The app reads as two different rooms in the same shop, because its two audiences are in genuinely different scenes. Admin and Login are Koby, alone, running the whole business from a console — the app reads as a live dispatch floor, every order a manifest line moving from pick to pack to ship, near-black graphite panels lit by four disciplined instrument signals (cyan/green/amber/red). That system is unchanged by this revision; see its Overview text preserved below.

Landing, Group Shops, and Checkout are a parent in a carpool line or an office manager at their desk, tapping a shared link to grab their group's size and color — not operating anything, but wanting the shop to feel like a real, current, well-made production floor rather than a template or a dropship storefront. The Print Floor renders the storefront as the shop's own pre-press process made visible: a dark room lit by a glowing light table, where a screen gets registered before it's exposed. Near-black plate grounds (never pure white, never the console's exact graphite hue); a fixed CMYK set (cyan/magenta/yellow/key) reserved for technical marks — registration crosshairs, calibration color bars — never a decorative fill; one Pantone-style "spot" ink per shop (crimson, cobalt, marigold, or emerald, hashed deterministically from the shop's id) carrying every button, price, and selected state inside that shop's context; every product/shop tile is a film positive on the light table with a registration crosshair at its corner, holding dead square — nothing tilts, the deliberate opposite of the retired world's scattered kraft tags; structured content renders as a flat spec panel with dashed divider lines between items, never a row of same-size icon cards; a true seven-segment digit mask (ghost cells included) carries every countdown and live count instead of a plain numeral; four misregistered CMYK halftone separations of a hand-drawn garment snap into alignment on the landing hero's light table, once, closing with a single exposure-unit flash. Big Shoulders Display carries headlines, Public Sans carries body text, Fragment Mono carries every price/count/SKU — deliberately a different stack from the console's IBM Plex and the retired world's Allerta Stencil/Barlow/Space Mono, so a screenshot never confuses the two rooms.

**Key Characteristics — The Manifest Line (Admin & Login):**
- Near-black graphite grounds, never pure white cards
- Exactly four signal colors, each meaning one real thing
- Real layered depth — gradient panels, true shadows, signal-color glow on emphasis surfaces, hover-lift everywhere interactive
- Two slow ambient glow fields drifting behind every canvas (cyan + green, `.console-canvas::before/::after`)
- IBM Plex Mono for all data; IBM Plex Sans for everything else
- Sharp, small radii (6–8px) — engineered, not bubbly
- Content fills the viewport (`max-w-[1800px]`, centered) instead of a narrow left-hugging column
- One motion grammar: staggered exponential-ease-out entrances, hover-lift with a real shadow, a reserved lamp-pulse, a one-time sheen sweep on primary actions

**Key Characteristics — The Print Floor (Public Storefront):**
- Near-black plate grounds lit like a light table in a dark room, never pure white, never the console's exact graphite hue
- A fixed CMYK set (proc-cyan/magenta/yellow/key) reserved for technical marks and small informational badges only — never a decorative fill (the Process-Marks-Are-Chrome rule)
- One dynamic Pantone "spot" color per shop (crimson/cobalt/marigold/emerald, hashed from the shop id, `lib/spot.ts`) drives every button, price, and selected state once inside that shop's context (the Spot-Carries-Everything rule)
- Every product/shop tile is a film-positive `.separation-card` with a registration crosshair at its corner; nothing tilts anywhere in this system (the Nothing-Tilts rule — the deliberate opposite of the retired world's scattered kraft-tag tilt)
- Structured content renders as a flat `.spec-panel` with dashed divider lines between items, never a row of same-size icon cards
- A true seven-segment digit mask (`SegmentReadout`, ghost cells included) carries every countdown and live count — never a plain bold numeral
- One signature load moment: four misregistered CMYK halftone separations of a hand-drawn garment snap into register on the landing hero's light table, closing with one exposure-unit flash — never repeated elsewhere
- Big Shoulders Display / Public Sans / Fragment Mono — a different stack from the console on purpose

## Colors

### The Manifest Line (Admin & Login)

The palette is deliberately locked: four signal hues, each carrying exactly one semantic meaning, over a ten-step graphite neutral scale. No fifth semantic-state accent may be introduced without revisiting this file. (Non-state categorical tags — e.g. `Badge`'s `purple`/`pink`/`orange`/`teal` variants used for things like vendor labels — may use a few additional non-violet hues; see Badge in Components.)

**Primary**
- **Signal Cyan** (`#33e1ff`): the one interactive/brand accent — primary buttons, active nav state, links, the "live" KPI icon tint. Rendered as a gradient plus a glow shadow on primary actions. Bright text on cyan uses `graphite-950`, never white.

**Secondary**
- **Signal Green** (`#3ddc84`): fulfilled/paid/success state only.
- **Signal Amber** (`#ffb238`): overdue/needs-action state only, most often paired with a pulse.
- **Signal Red** (`#ff5c5c`): cancelled/critical state only.

**Neutral**
- **Graphite 950** (`#0a0c10`): the base canvas.
- **Graphite 900** (`#12151b`): panel/card surfaces, itself a subtle gradient toward `#161b23`.
- **Graphite 700–600** (`#262b35`–`#363c48`): borders, dividers, scrollbar thumb.
- **Graphite 300** (`#9aa0ac`): the floor for any real body/secondary text on this canvas.
- **White / Graphite 100**: primary headings and values.

**Named Rules**
**The Locked Palette Rule.** A signal color never appears for decoration — only to report the specific state it's assigned to. Reuse one of the four, or stay graphite; never add a fifth state color.

**The Graphite-300 Floor Rule.** No real text drops below `graphite-300` (≈7.5:1) on the graphite-950 canvas. `graphite-400` (≈4.3:1) is icon-only, never text.

**The Earned Glow Rule.** Glow and gradient answer to something real — a primary action, genuine urgency, or the app's own ambience — never sprinkled on for its own sake.

### The Print Floor (Public Storefront)

A near-black plate neutral scale carries the ground and structure — the darkroom a screen gets registered and exposed in. A fixed four-color process set (proc-cyan/magenta/yellow/key) is technical chrome only: registration crosshairs, the calibration color bar, small informational badges (item counts, "secure checkout"). Everything expressive or categorical — a shop's own identity — comes from its one dynamic spot color instead, computed by `lib/spot.ts` and carried as CSS custom properties (`--spot`/`--spot-top`/`--spot-bright`/`--spot-dim`/`--spot-on`) rather than a static token, since a shop's ink is data, not a fixed brand hue.

**Neutral**
- **Plate 950** (`#0A0D14`): the base canvas — the darkroom.
- **Plate 900** (`#121620`): panel surfaces, itself a subtle gradient toward `#171B21`.
- **Plate 700–600** (`#2B303A`–`#414855`): borders, dividers.
- **Plate 300** (`#A3AAB6`, ≈8.3:1 on plate-950): the floor for any real text on this canvas.
- **Plate 400** (`#7A8290`, ≈5.0:1): icon-only, never real text.
- **Plate 50 / 100**: primary headings and values (`#F7F8FA` / `#E7E9ED`).

**Process (technical marks only)**
- **Proc Cyan** (`#00AEEF`): registration crosshairs, the sticky-nav accent, links, informational badges.
- **Proc Magenta** (`#EC008C`): the calibration color bar's second swatch, a secondary informational badge tone.
- **Proc Yellow** (`#FFE800`): the calibration color bar's third swatch only — never a UI fill, its contrast is too extreme for text or backgrounds at normal size.
- **Proc Key**: identical to plate-950; the "K" plate in the color bar.

**Spot (one per shop, dynamic)**
- **Crimson** (`#C93420`, bright `#FF8A73`): also the platform's own default ink wherever no shop context applies (checkout, which can span multiple shops, and every `PressButton` with no `--spot` in scope).
- **Cobalt** (`#2657C7`, bright `#8FB4FF`).
- **Marigold** (`#E7A22E`, bright `#FFD37A`): the one spot color too light for off-white fill text — see the Marigold-Carries-Dark-Text rule below.
- **Emerald** (`#167A4D`, bright `#8FE0BB`).

**Named Rules**
**The Plate-300 Floor Rule.** No real text drops below `plate-300` (≈8.3:1) on the plate-950/900 canvas — the same discipline as the console's Graphite-300 Floor Rule, independently verified for this palette. `plate-400` is icon-only.

**The Process-Marks-Are-Chrome Rule.** `proc-cyan`/`magenta`/`yellow`/`key` mark technical state (registration, calibration, a small count) — never a large decorative fill. A shop's expressive color is always its spot ink, never a process color.

**The Spot-Carries-Everything Rule.** Once a page or section sits inside a shop's context, `--spot`/`--spot-bright`/`--spot-dim`/`--spot-on` (set once via `spotVars()`) drive every accent, button, price, and selection state in that context — never a hardcoded hex reintroduced alongside it.

**The Marigold-Carries-Dark-Text Rule.** `spot-marigold` is the one spot color too light for off-white fill text (`#E7A22E` reaches only ≈2.1:1 with `plate-50`; ≈8.9:1 with `plate-950`) — anything set on a marigold fill uses `--spot-on` resolved to `plate-950`, mirroring the retired world's analogous gold rule.

## Typography

### The Manifest Line (Admin & Login)

**Display/Body Font:** IBM Plex Sans (Inter is a fallback name only, not downloaded) · **Data/Mono Font:** IBM Plex Mono

A technical, workhorse instrument face — legible and calm in prose, exact and tabular wherever a number or status word needs to be scanned at speed.

- **Headline** (600, 1.5–1.75rem, tight tracking): page titles.
- **Title** (600, 0.875rem): panel headers.
- **Body** (400–500, 0.875rem): names, labels, descriptions.
- **Data** (500–600, IBM Plex Mono, `tabular-nums`): every dollar amount, count, date, ID.
- **Label** (600, 11px, 0.08em tracking, uppercase, `graphite-300`): eyebrow-style field names above a value only, never a decorative kicker over a heading.

**Named Rules**
**The Mono-Means-Data Rule.** IBM Plex Mono is reserved for numbers, dates, IDs, and status words — never a heading or a sentence.

### The Print Floor (Public Storefront)

**Display Font:** Big Shoulders Display (Arial Narrow fallback) · **Body Font:** Public Sans · **Data/Spec Font:** Fragment Mono

A condensed, heavy industrial display face at large sizes only, paired with Public Sans — a body face drawn from federal technical-form typography, the same spec-sheet register as the pre-press world, chosen deliberately over reflexive AI-UI defaults (Inter, Plus Jakarta Sans, DM Sans, Space Grotesk). Fragment Mono carries every number, the storefront's own version of the console's Mono-Means-Data discipline, and every digit that actually counts something (a countdown, a live total) renders through `SegmentReadout`'s seven-segment mask instead, never plain Fragment Mono digits.

- **Display** (Big Shoulders Display, 700–900, uppercase, clamp ~2.25rem–3.5rem, tight leading): the landing hero headline only.
- **Section headline** (Big Shoulders Display, uppercase, 1.5–1.875rem): "What We Do," "How It Works," "Shops Open Now," "Shops," "Checkout," a shop's own name.
- **Body** (Public Sans, 400–500, 0.875rem–1.125rem): names, descriptions, form labels, copy.
- **Data/Spec** (Fragment Mono, 400, `tabular-nums`): every price, item count, SKU, "ITEM 0X" label, job caption.
- **Segment readout** (`SegmentReadout`, seven-segment mask, ghost cells included): the shop-closing countdown and live order/step counts specifically — never these numbers in plain type.

**Named Rules**
**The Spec-Means-Data Rule.** Fragment Mono is reserved for prices, counts, dates, and SKUs — the storefront's version of the console's Mono-Means-Data Rule, kept as a deliberately different mono face so the two systems are never mistaken for one another in a screenshot.

**The Segment-Means-Countdown Rule.** A number that counts down or ticks live (a shop's closing date, a How-It-Works step) renders as a true seven-segment mask, not Fragment Mono digits — the raise this direction kept from its seven-segment catalog challenger.

## Layout

### The Manifest Line (Admin & Login)

The shell is a fixed 220px (248px at `xl`) dark sidebar on desktop plus a fluid content column collapsing to a slide-in drawer below `lg`. Content runs `w-full max-w-[1800px] mx-auto`, padding scaling `p-4 → sm:p-6 → lg:p-8 → xl:p-10`. Verify every surface at phone, tablet, laptop, and full-screen/ultrawide widths.

### The Print Floor (Public Storefront)

No sidebar — a full-bleed canvas with a centered `max-w-5xl`–`max-w-6xl` content column and a simple top header (logo, optional back link, cart pill), consistent with the storefront being a browsing surface, not an operating console. Section rhythm is generous (`py-16`–`py-20` between major sections, more space above a heading than below it), except the landing hero itself, tightened to `py-12`–`py-14` specifically to keep the signature separations-hero visual close to the fold. Grids collapse `sm:grid-cols-3 → grid-cols-1` for product/shop tiles and `lg:grid-cols-5 (3+2) → grid-cols-1` for the Checkout review step. A shop/product grid with fewer than three real items fills the remaining slots with a dashed `GhostSlot` ("Next job opening soon") rather than leaving bare canvas — capped to one ghost slot on mobile so the pattern doesn't itself read as repetitive filler. Fixed-position registration-mark corners (`PressFrame`) sit pinned to every viewport's four corners on every page, purely structural chrome that answers the brief's "full, not empty" requirement without competing with content. The mobile cart bar is a fixed bottom sheet on Group Shop pages; the desktop equivalent lives in the sticky top nav bar.

## Elevation & Depth

### The Manifest Line (Admin & Login)

Panels (`.console-panel`) sit on a subtle top-to-bottom gradient (`#161b23` → `#12151b`) with a hairline border and a true two-layer shadow (`shadow-console`). Interactive panels/rows lift 2–3px on hover with the shadow deepening (`shadow-console-hover`). Primary actions and urgent panels carry a signal-colored glow (`shadow-glow-cyan`/`-amber`/`-green`/`-red`). Two soft, slow-drifting radial glow fields (cyan top-left, green bottom-right) sit behind every canvas. A one-time light sheen sweeps across primary buttons on hover (`.console-sheen`).

**Named Rules**
**The Earned Glow Rule.** Depth and glow are the default now, but every instance still answers to something real.

### The Print Floor (Public Storefront)

Two elevation objects, deliberately different registers, and neither ever tilts. **Separation cards** (`.separation-card`) sit dead square with a true two-layer dark shadow (`shadow-plate`), a registration crosshair fixed at the top-left corner that snaps into a brighter, spot-colored register on hover, and lift 4px with the shadow deepening plus a spot-colored glow (`shadow-plate-hover`) — the signature object for anything a visitor picks (a shop, a product). **Spec panels** (`.spec-panel`) share the same plate-gradient material and shadow language but hold still, no crosshair — the register for structured content (forms, order summaries, trust info) that should read as legible and calm. Two soft, slow-drifting process-color glow fields (cyan top-left, magenta bottom-right, `.press-canvas::before/::after`) sit behind every canvas — the storefront's own version of the console's ambient glow, same discipline, process-tinted instead of neon. A one-time light sheen (shared `.console-sheen`, theme-agnostic) sweeps primary buttons on hover. One unrepeated signature moment: the landing hero's four CMYK halftone separations of a hand-drawn garment snap into register on load, closing with a single exposure-unit flash overlay.

**Named Rules**
**The Nothing-Tilts Rule.** No card, badge, or tile in this system ever rotates — registration crosshairs snapping square is the whole depth vocabulary. This is the deliberate opposite of the retired kraft-crate world's scattered tag tilt, not an oversight.

## Shapes

### The Manifest Line (Admin & Login)

Small, sharp radii throughout — `0.375rem` (buttons, icon chips, nav items) to `0.5rem` (panels). No `rounded-2xl`/`rounded-3xl` bubble radii anywhere.

### The Print Floor (Public Storefront)

Precise, technical radii — `0.5rem` (buttons) to `0.625rem` (separation cards) to `0.75rem` (spec panels) — legible as "registered production plate," not sharp instrument-panel edges and not bubbly SaaS cards. The one recurring mark is the registration crosshair (⊕): a small circle-plus-ticks glyph (`RegistrationMark`) at a separation card's top-left corner, a spec panel's corners implicitly, and pinned to every page's four viewport corners via `PressFrame`.

## Components

### The Manifest Line (Admin & Login)

**Buttons** (`components/ui/button.tsx`, admin/login only)
- **Shape:** `rounded-md` (6px) `xs`/`sm`/`md`, `rounded-lg` `lg`.
- **Primary:** `signal-cyan` gradient, `graphite-950` text, `shadow-glow-cyan-sm` deepening to `shadow-glow-cyan` on hover, `.console-sheen` sweep.
- **Secondary:** `white/[0.06]` fill, `white/10` ring, `graphite-100` text.
- **Focus:** `signal-cyan` ring, 2px offset.

**Console Panels** (`.console-panel`, `<Card>`) — `rounded-lg`, graphite gradient, `white/[0.08]` hairline border, `shadow-console` at rest, `.console-panel-interactive` for hover-lift, `.console-panel-glow-{cyan,amber,green}` for urgency emphasis.

**Badge** (`components/ui/badge.tsx`) — tinted-dark fill + bright signal-color text + matching ring; `purple`/`pink`/`orange`/`teal` reserved for non-state category tags.

**Signal Lamp** (`app/page.tsx`'s `SignalLamp`) — colored dot + label, the preferred pattern for order/fulfillment/payment state specifically.

**Navigation** (sidebar, `components/admin/AdminShell.tsx`) — `graphite-950` ground, faint cyan top wash; active item gets `signal-cyan` text, `signal-cyan/[0.09]` background, and a 2px glowing cyan left rail (the sidebar's one load-bearing glow).

### The Print Floor (Public Storefront)

**Buttons** (`components/public/PressButton.tsx`) — same variant/size API as the console's `Button` so call sites are a drop-in swap, styled entirely differently.
- **Shape:** `rounded-[0.5rem]` (`.press-btn`).
- **Primary:** a gradient from `var(--spot-top)` to `var(--spot)`, `var(--spot-on)` text, glow shadow tinted `var(--spot-dim)`, `.console-sheen` sweep, a real mechanical thud on `:active` (`translateY(1px) scale(0.98)`). Falls back to the platform's crimson ink wherever no shop context sets `--spot`.
- **Secondary:** `plate-800` fill, `plate-700` border, `plate-100` text.
- **Focus:** `proc-cyan` ring, 2px offset.

**Separation Card** (`components/public/SeparationCard.tsx`, `.separation-card`) — the signature object for a product or shop preview. `rounded-[0.625rem]`, plate gradient, 1px `plate-700` border, `shadow-plate`, a registration crosshair (`::before`/`::after`) fixed at the top-left corner that snaps to `var(--spot-bright)` on hover. Never tilts.

**Spec Panel** (`.spec-panel`) — the flat structured-content surface (checkout sections, order summaries, "What We Do," trust info). Same plate material as `.separation-card`, no crosshair. Multi-line content inside one panel is divided by a dashed line (`border-dashed border-plate-700`) between items, never split into same-size icon cards.

**Color Bar** (`components/public/ColorBar.tsx`, `.colorbar-badge`) — a printer's calibration-strip badge for status/count (item count, "secure checkout," a shop's spot-job label). Fragment Mono, a small solid dot before the label, dead square — never rotated. `cyan`/`magenta` tones are process-chrome only; `spotKey` tints it with a shop's own ink for identity-carrying badges.

**Segment Readout** (`components/public/SegmentReadout.tsx`, `.segment-cell`) — a true seven-segment digit mask with designed-off ghost cells, used for the shop-closing countdown and How-It-Works step numbers. Always paired with a plain-text `aria-label`; the mask is decorative typography, not the accessible name.

**Ghost Slot** (`components/public/GhostSlot.tsx`) — a dashed, unfilled grid slot ("Next job opening soon") that fills out a shop grid with fewer than three real items, honestly rather than fabricating shops. Capped to one instance on mobile.

**Press Frame** (`components/public/PressFrame.tsx`) — four fixed-position registration crosshairs pinned to the viewport's corners on every page; purely structural, `pointer-events-none`, hidden below `sm`.

**Public Header/Footer** (`components/public/PublicHeader.tsx`, `PublicFooter.tsx`) — shared across Group Shops and Checkout; the logo, an optional back link, and the cart pill (a `.press-btn-secondary` styled chip). Landing keeps its own richer nav; Checkout keeps its own step-aware back link.

## Do's and Don'ts

### The Manifest Line (Admin & Login)

**Do:**
- **Do** keep every state signal color tied to its one real meaning (cyan/green/amber/red).
- **Do** render all data in IBM Plex Mono with `tabular-nums`.
- **Do** use `graphite-300` or lighter for any real text on the graphite-950/900 canvas.
- **Do** give interactive panels, rows, and buttons a real hover-lift + shadow change.
- **Do** prefer `components/ui/*` (`Button`, `Card`, `Badge`, `Input`, `Select`, `Modal`, `Toast`) over hand-rolled markup.

**Don't:**
- **Don't** reintroduce violet/purple as a brand or state color.
- **Don't** add a fifth semantic/state accent color.
- **Don't** use a colored `border-left`/`border-right` accent above 1px on any panel or list row (craft-floor ban).
- **Don't** reintroduce glassmorphism/backdrop-blur as pure decoration.
- **Don't** cap primary content width narrowly without centering it.
- **Don't** use `components/public/*` (PressButton, SeparationCard, ColorBar, the plate/spot palette) on any admin or login surface — the two systems never mix on one page.

### The Print Floor (Public Storefront)

**Do:**
- **Do** keep the ground a near-black plate tone — never pure white, never the console's exact graphite hue.
- **Do** render every price, count, date, and SKU in Fragment Mono with `tabular-nums`; render every countdown or live count as a true `SegmentReadout` seven-segment mask instead.
- **Do** use `plate-300` or lighter for any real text on the plate-950/900 canvas.
- **Do** set a shop's own spot color once (`spotVars()`) at the top of that shop's context and let every button, price, and selection state inherit it via CSS custom properties — never hardcode a spot hex inline.
- **Do** reserve the process colors (proc-cyan/magenta/yellow) for technical marks and small informational badges; a shop's expressive color is always its spot ink.
- **Do** recompose multi-item content as one spec panel with dashed dividers, never as three same-size icon cards — and when reusing that panel pattern on a second or third page, give each instance genuinely different content and, where reasonable, a different internal layout, not a near-duplicate of the first.
- **Do** fill a shop/product grid with fewer than three real items using a `GhostSlot`, never bare canvas.
- **Do** use `components/public/PressButton.tsx` for every storefront action so the sheen/thud behavior stays consistent.
- **Do** hold every drawn icon in this system to one consistent stroke width (2px) — `RegistrationMark`'s own default (a deliberately thinner, separate "technical mark" glyph family, not a feature icon) is the one exception.

**Don't:**
- **Don't** use IBM Plex Sans/Mono, `signal-*` colors, or `graphite-*` neutrals anywhere on Landing, Group Shops, or Checkout — that's the console system, a different room.
- **Don't** tilt or rotate any card, badge, or tile in this system — the Nothing-Tilts Rule, checked on every new component before it ships.
- **Don't** put a kicker/eyebrow label above a heading (craft-floor ban, no exception) — a "spot job" label and an "in-house production" label were both cut from directly above their headings during the finish review; the same information now lives in the badge row below the heading, and inline in the heading itself, instead.
- **Don't** give every whileInView section on a page the identical fade-up entrance — vary the reveal by section register (a spring "register-pop" for How It Works, a scale "develop-in" for shop tiles, a scale-in for the closing CTA) the way this revision's finish review required.
- **Don't** fake a material the page doesn't actually render (embossed/stamped-metal CSS, photographic textures) — the light-table material here is an honest gradient-and-shadow language plus a real animated halftone-separation effect, not a skeuomorphic imitation.
