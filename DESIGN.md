---
name: Crossroads Custom Apparel — The Manifest Line & The Gear Drop
description: Two systems split by mode — a dark dispatch console for the sole-operator admin/login ("The Manifest Line") and a warm kraft-crate storefront for the public landing, group shops, and checkout ("The Gear Drop").
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
  crate-paper: "#F8F1E1"
  crate-paper-deep: "#EFE2C4"
  crate-plywood: "#DEC9A0"
  crate-plywood-dark: "#C7AD7C"
  crate-ink: "#2A2015"
  crate-ink-soft: "#5B4B35"
  crate-ink-faint: "#7C6A4E"
  stencil-red: "#BE3B27"
  stencil-red-dim: "#7A2115"
  stencil-red-bright: "#E2694F"
  stencil-gold: "#C98B22"
  stencil-gold-dim: "#7A560F"
  stencil-gold-bright: "#E8B45C"
  stencil-teal: "#1D7268"
  stencil-teal-dim: "#0F3F39"
  stencil-teal-bright: "#4FA89C"
  stencil-green: "#4C7A34"
  stencil-green-dim: "#2C481F"
  stencil-green-bright: "#7FAE5C"
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
    fontFamily: "Allerta Stencil, Arial Narrow, sans-serif"
    fontWeight: 400
    letterSpacing: "normal"
  storefront-body:
    fontFamily: "Barlow, system-ui, -apple-system, sans-serif"
    fontWeight: 400
  storefront-data:
    fontFamily: "Space Mono, ui-monospace, monospace"
    fontWeight: 500
  storefront-label:
    fontFamily: "Space Mono, ui-monospace, monospace"
    fontWeight: 700
    letterSpacing: "0.05em"
rounded:
  sm: "0.375rem"
  md: "0.5rem"
  full: "9999px"
  storefront-btn: "0.625rem"
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
  button-gear-primary:
    backgroundColor: "{colors.stencil-red}"
    textColor: "{colors.crate-paper}"
    rounded: "{rounded.storefront-btn}"
    padding: "0.5rem 1rem"
  button-gear-primary-hover:
    backgroundColor: "{colors.stencil-red-bright}"
  button-gear-secondary:
    backgroundColor: "{colors.crate-paper-deep}"
    textColor: "{colors.crate-ink}"
    rounded: "{rounded.storefront-btn}"
    padding: "0.5rem 1rem"
  tag-card:
    backgroundColor: "{colors.crate-paper-deep}"
    textColor: "{colors.crate-ink}"
    rounded: "{rounded.storefront-btn}"
  crate-panel:
    backgroundColor: "{colors.crate-paper-deep}"
    textColor: "{colors.crate-ink}"
    rounded: "{rounded.storefront-panel}"
  stamp-badge-red:
    backgroundColor: "rgba(190,59,39,0.10)"
    textColor: "{colors.stencil-red}"
    rounded: "{rounded.sm}"
    padding: "0.25rem 0.55rem"
---

# Design System: Crossroads Custom Apparel — Two Systems, One App

<!-- Rev. 3. Rev. 1 established the admin dashboard 2026-08-29. Rev. 2
extended that same console system app-wide on 2026-08-30. Rev. 3 (2026-08-31)
splits it back into two systems after direct user feedback that the console
world, applied to the public storefront, read as "lifeless and bleak" and
needed "color, animations... FUN": Admin and Login keep "The Manifest Line"
unchanged; Landing, Group Shops, and Checkout move to a new system, "The
Gear Drop," chosen through a structured direction round (seed key
`8bfab481`, assigned candidate 6 of 7, weighed against six catalog
challengers, none of which won on both audience-identification and product-
clarity) and confirmed by the shop's owner. The two systems never mix on one
page — the split is enforced in code at `components/admin/AdminShell.tsx`'s
`isPublic` branch, not just in this document. -->

## Overview

**Creative North Star — Admin & Login: "The Manifest Line."** **Creative North Star — Public Storefront: "The Gear Drop."**

The app now reads as two different rooms in the same shop, because its two audiences are in genuinely different scenes. Admin and Login are Koby, alone, running the whole business from a console — the app reads as a live dispatch floor, every order a manifest line moving from pick to pack to ship, near-black graphite panels lit by four disciplined instrument signals (cyan/green/amber/red). That system is unchanged by this revision; see its Overview text preserved below.

Landing, Group Shops, and Checkout are a parent in a carpool line or an office manager at their desk, tapping a shared link in daylight to grab their group's size and color — not operating anything. The Gear Drop renders the storefront as the shop's own fulfillment made visible: a packed gear crate on a sunlit workbench. Warm kraft/cardboard grounds (never white, never black, never the console's near-black); four stencil-ink accents (barn red, marigold gold, teal, forest green) rotate across categories and emphasis the way spray paint through a stencil marks a real shipping crate; every shop/product tile is a punched-hole kraft luggage tag scattered at a slight tilt that straightens on hover; a manifest-ticket panel (dashed tear-lines between line items) replaces the generic three-icon-card grid everywhere the storefront would otherwise reach for one; a crate lid tips open once on the landing hero's load. Allerta Stencil carries display type, Barlow carries body text, Space Mono carries every price/count/SKU — deliberately a different stack from the console's IBM Plex, because these are different rooms.

**Key Characteristics — The Manifest Line (Admin & Login):**
- Near-black graphite grounds, never pure white cards
- Exactly four signal colors, each meaning one real thing
- Real layered depth — gradient panels, true shadows, signal-color glow on emphasis surfaces, hover-lift everywhere interactive
- Two slow ambient glow fields drifting behind every canvas (cyan + green, `.console-canvas::before/::after`)
- IBM Plex Mono for all data; IBM Plex Sans for everything else
- Sharp, small radii (6–8px) — engineered, not bubbly
- Content fills the viewport (`max-w-[1800px]`, centered) instead of a narrow left-hugging column
- One motion grammar: staggered exponential-ease-out entrances, hover-lift with a real shadow, a reserved lamp-pulse, a one-time sheen sweep on primary actions

**Key Characteristics — The Gear Drop (Public Storefront):**
- Warm kraft/cardboard grounds, never white, never the console's near-black
- Four stencil-ink accents (barn red, marigold gold, teal, forest green) — expressive/categorical, not state-locked the way the console's signals are
- Every product/shop tile is a punched-hole tag, scattered tilt at rest, straightens + lifts on hover (`.tag-card`)
- Structured content (forms, trust info, "What We Do") renders as a flat manifest ticket with dashed tear-line dividers between items, never a row of same-size icon cards (`.crate-panel`)
- A continuous dashed "twine" line strings sequential steps together (`.twine-line`)
- A rubber ink-stamp badge (`.stamp-badge`) carries status/urgency, rotated slightly like it landed crooked
- Allerta Stencil display / Barlow body / Space Mono data — a different stack from the console on purpose
- One signature load moment: a crate lid tips open on the landing hero, never repeated elsewhere

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

### The Gear Drop (Public Storefront)

A warm kraft/cardboard neutral scale (never pure white, never black) carries the ground and structure; four stencil-ink accents rotate across categories and emphasis. Unlike the console's locked four-signal-state system, these accents are expressive/categorical — this is a Persuade surface, not an Operate one — but they still follow a consistent register (see the Named Rule below).

**Primary accents**
- **Stencil Red** (`#BE3B27`): primary CTAs, prices, primary emphasis links ("Shop now →"). Carries `crate-paper` (warm off-white) text, never pure white.
- **Stencil Teal** (`#1D7268`): secondary interactive/informational — links, the "Ship to you" selected state, info stamp badges.
- **Stencil Green** (`#4C7A34`): success/confirmation — "Pick up" selected state, order-confirmed states.
- **Stencil Gold** (`#C98B22`): caution/urgency/reminder — a shop's closing date, a pay-at-pickup reminder. The one accent light enough that it carries dark `crate-ink` text instead of paper-cream (`#C98B22` only reaches ≈2.9:1 with white/paper text; ≈5.5:1 with `crate-ink`).

**Neutral**
- **Crate Paper** (`#F8F1E1`): the base canvas.
- **Crate Paper Deep** (`#EFE2C4`): card/panel/ticket surfaces, itself a subtle gradient toward `#E9D6AC`/`#ECD9B2`.
- **Crate Plywood / Plywood Dark** (`#DEC9A0` / `#C7AD7C`): borders, dividers, dashed tear-lines.
- **Crate Ink** (`#2A2015`): primary headings and values — a warm near-black, never pure black.
- **Crate Ink Soft** (`#5B4B35`, ≈7.4:1 on paper): the floor for any real text a visitor reads, including on the deepest panel tone.
- **Crate Ink Faint** (`#7C6A4E`): icon-only — measures ≈4.6:1 on the page ground but drops under 4.5:1 on the deepest panel tone, so it never carries real text (see the Named Rule below).

**Named Rules**
**The Crate-Ink-Soft Floor Rule.** No real text — labels, captions, placeholders, footer copy — drops below `crate-ink-soft` anywhere on this system, including inside a `.crate-panel`/`.tag-card`'s deeper gradient tone. `crate-ink-faint` is icon-only, the same discipline as the console's Graphite-300 Floor Rule, chosen for the same reason: it reads safe against the lightest ground but fails contrast against the panel system's darker tone.

**The Gold-Carries-Dark-Text Rule.** `stencil-gold` is the one accent too light for paper-cream foreground text; anything set on a gold fill uses `crate-ink`, not `crate-paper`.

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

### The Gear Drop (Public Storefront)

**Display Font:** Allerta Stencil (Arial Narrow fallback) · **Body Font:** Barlow · **Data/Ticket Font:** Space Mono

A stenciled crate-marking display voice at large sizes only, paired with Barlow — a body face drawn from California highway/signage lettering, the same industrial-vernacular register as the stencil world, chosen deliberately over reflexive AI-UI defaults (Inter, Plus Jakarta Sans, DM Sans). Space Mono carries every number, the storefront's own version of the console's Mono-Means-Data discipline.

- **Display** (Allerta Stencil, clamp ~2.25rem–3.75rem): the landing hero headline only — this face is illegible below display size, never used for body or UI chrome.
- **Section headline** (Barlow-adjacent via `font-display` at smaller sizes is avoided; section H2s use the same Allerta Stencil display voice at 1.5–1.875rem): "What We Do," "How It Works," "Shops Open Now," "Checkout."
- **Body** (Barlow, 400–500, 0.875rem–1.125rem): names, descriptions, form labels, copy.
- **Data/Ticket** (Space Mono, 500–700, `tabular-nums`): every price, item count, quantity, SKU, "ITEM 0X" ticket label.
- **Stamp label** (Space Mono, 700, 11px, 0.05em tracking, uppercase): `.stamp-badge` text only.

**Named Rules**
**The Ticket-Means-Data Rule.** Space Mono is reserved for prices, counts, dates, and SKUs — the storefront's version of the console's Mono-Means-Data Rule, kept as a deliberately different mono face so the two systems are never mistaken for one another in a screenshot.

**The Stencil-Is-Display-Only Rule.** Allerta Stencil never drops below section-headline size; its stencil gaps make small text illegible, so body copy, labels, and buttons are set in Barlow even where a heading nearby is stenciled.

## Layout

### The Manifest Line (Admin & Login)

The shell is a fixed 220px (248px at `xl`) dark sidebar on desktop plus a fluid content column collapsing to a slide-in drawer below `lg`. Content runs `w-full max-w-[1800px] mx-auto`, padding scaling `p-4 → sm:p-6 → lg:p-8 → xl:p-10`. Verify every surface at phone, tablet, laptop, and full-screen/ultrawide widths.

### The Gear Drop (Public Storefront)

No sidebar — a full-bleed canvas with a centered `max-w-5xl`–`max-w-6xl` content column and a simple top header (logo, optional back link, cart pill), consistent with the storefront being a browsing/reading surface, not an operating console. Section rhythm is generous (`py-16`–`py-20` between major sections, more space above a heading than below it). Grids collapse `sm:grid-cols-3 → grid-cols-1` for product/shop tiles and `lg:grid-cols-5 (3+2) → grid-cols-1` for the Checkout review step. The mobile cart bar is a fixed bottom sheet on Group Shop pages; the desktop equivalent lives in the sticky top nav bar.

## Elevation & Depth

### The Manifest Line (Admin & Login)

Panels (`.console-panel`) sit on a subtle top-to-bottom gradient (`#161b23` → `#12151b`) with a hairline border and a true two-layer shadow (`shadow-console`). Interactive panels/rows lift 2–3px on hover with the shadow deepening (`shadow-console-hover`). Primary actions and urgent panels carry a signal-colored glow (`shadow-glow-cyan`/`-amber`/`-green`/`-red`). Two soft, slow-drifting radial glow fields (cyan top-left, green bottom-right) sit behind every canvas. A one-time light sheen sweeps across primary buttons on hover (`.console-sheen`).

**Named Rules**
**The Earned Glow Rule.** Depth and glow are the default now, but every instance still answers to something real.

### The Gear Drop (Public Storefront)

Two elevation objects, deliberately different registers. **Tag cards** (`.tag-card`) sit at a slight scattered tilt (alternating ±0.3–0.7° via `nth-child`) with a warm two-layer paper shadow (`shadow-tag`), a punched circular "tag hole" cut at the top-left filled with the canvas color, and straighten + lift 4px on hover with a deepening shadow (`shadow-tag-hover`) — the signature object for anything a visitor picks (a shop, a product). **Crate panels** (`.crate-panel`) share the same kraft-gradient material and shadow language but hold still, no tilt, no hole — the register for structured content (forms, order summaries, "What We Do," trust info) that should read as legible and calm rather than playful. Two soft, slow-drifting warm glow fields (marigold top-left, teal bottom-right, `.gear-canvas::before/::after`) sit behind every canvas — the storefront's own version of the console's ambient glow, same discipline, warm instead of neon. A one-time light sheen (shared `.console-sheen`, theme-agnostic) sweeps primary buttons on hover. One unrepeated signature moment: the landing hero's crate lid tips open via a 3D `rotateX` reveal on load.

**Named Rules**
**The Tag-vs-Ticket Rule.** Tilt and the punched hole are reserved for `.tag-card` — anything a visitor selects or browses. Structured content never tilts; it's a `.crate-panel`. Mixing the two registers on one object is a defect, not a style choice.

## Shapes

### The Manifest Line (Admin & Login)

Small, sharp radii throughout — `0.375rem` (buttons, icon chips, nav items) to `0.5rem` (panels). No `rounded-2xl`/`rounded-3xl` bubble radii anywhere.

### The Gear Drop (Public Storefront)

Slightly warmer radii than the console — `0.625rem` (buttons, tag cards) to `0.75rem` (crate panels) — legible as "cut paper tag," not sharp instrument-panel edges and not bubbly SaaS cards. The one recurring cutout silhouette is the tag hole: a 14px circle inset at each tag card's top-left corner.

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

### The Gear Drop (Public Storefront)

**Buttons** (`components/public/GearButton.tsx`) — same variant/size API as the console's `Button` so call sites are a drop-in swap, styled entirely differently.
- **Shape:** `rounded-[0.625rem]` (`.stencil-btn`).
- **Primary:** a `stencil-red` top-light gradient, `crate-paper` text, `shadow-stamp` deepening on hover, `.console-sheen` sweep, a real "stamped down" thud on `:active` (`translateY(1px) scale(0.98)`).
- **Secondary:** `crate-paper-deep` fill, `crate-plywood` border, `crate-ink` text.
- **Focus:** `stencil-teal` ring, 2px offset, offset color `crate-paper`.

**Tag Card** (`components/public/TagCard.tsx`, `.tag-card`) — the signature object for a product or shop preview. `rounded-[0.625rem]`, kraft gradient (`#F2E4C6`→`#E9D6AC`), 1px `crate-plywood` border, `shadow-tag`, a punched hole (`::before`) at top-left, scattered `nth-child` tilt straightening + lifting on hover (`.tag-card-interactive`).

**Crate Panel** (`.crate-panel`) — the flat structured-content surface (checkout sections, order summaries, "What We Do," trust info). Same kraft material as `.tag-card`, no tilt, no hole. Multi-line content inside one panel is divided by a dashed tear-line (`border-dashed border-crate-plywood-dark`) between items, never split into same-size icon cards.

**Stamp Badge** (`components/public/StampBadge.tsx`, `.stamp-badge`) — a rubber ink-stamp mark for status/urgency (open date, item count, "secure checkout"). Space Mono, outlined in its own tone color, permanently rotated −1.5°. Tones: `red`/`teal`/`green` carry their own hue as both text and ring; `gold` carries `stencil-gold-dim` text (see the Gold-Carries-Dark-Text Rule); `ink` is the neutral/default tone.

**Twine Line** (`.twine-line`) — a dashed SVG connector stringing sequential steps together (currently: the landing page's three How-It-Works stops), drawn in on scroll via `pathLength`. Desktop only; a tiny dashed line at phone width reads as clutter, not connection, so it's hidden below `sm`.

**Public Header/Footer** (`components/public/PublicHeader.tsx`, `PublicFooter.tsx`) — shared across Group Shops and Checkout; the logo, an optional back link, and the cart pill (a `.stencil-btn-secondary` styled chip). Landing keeps its own richer nav; Checkout keeps its own step-aware back link.

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
- **Don't** use `components/public/*` (GearButton, TagCard, StampBadge, the kraft/stencil palette) on any admin or login surface — the two systems never mix on one page.

### The Gear Drop (Public Storefront)

**Do:**
- **Do** keep the ground warm kraft — never white, never black, never the console's near-black graphite.
- **Do** render every price, count, date, and SKU in Space Mono with `tabular-nums`.
- **Do** use `crate-ink-soft` or darker for any real text, including inside a `.crate-panel`'s deeper gradient tone (see the Crate-Ink-Soft Floor Rule).
- **Do** reserve tag-card tilt and the punched hole for things a visitor selects; keep structured content (forms, summaries) flat as a `.crate-panel`.
- **Do** recompose multi-item content as one manifest-ticket panel with dashed tear-lines, never as three same-size icon cards — the craft-floor's own refused default.
- **Do** use `components/public/GearButton.tsx` for every storefront action so the stamped-thud/sheen behavior stays consistent.

**Don't:**
- **Don't** use IBM Plex Sans/Mono, `signal-*` colors, or `graphite-*` neutrals anywhere on Landing, Group Shops, or Checkout — that's the console system, a different room.
- **Don't** set Allerta Stencil below section-headline size; it's illegible as body or button text.
- **Don't** put a kicker/eyebrow label above a heading (craft-floor ban, no exception) — the "Ship From" label over the Contact heading was cut for exactly this during the finish review.
- **Don't** use `crate-ink-faint` for real text anywhere — icon-only, the same discipline as the console's Graphite-400 rule.
- **Don't** fake a material the page doesn't actually render (embossed/stamped-metal CSS, photographic textures) — the kraft/paper material here is an honest gradient-and-shadow language, not a skeuomorphic imitation.
