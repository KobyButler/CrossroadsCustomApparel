---
name: Crossroads Custom Apparel — The Print Floor
description: One dark pre-press light-table system across the whole app — a denser, calmer Operate register for the sole-operator admin console and login, a fuller Persuade register for the public landing page, group shops, and checkout.
colors:
  graphite-950: "#0A0D14"
  graphite-900: "#121620"
  graphite-800: "#1B2029"
  graphite-700: "#2B303A"
  graphite-600: "#414855"
  graphite-500: "#5C6472"
  graphite-400: "#7A8290"
  graphite-300: "#A3AAB6"
  graphite-200: "#C9CDD6"
  graphite-100: "#E7E9ED"
  signal-cyan: "#00AEEF"
  signal-cyan-dim: "#0a4a63"
  signal-cyan-bright: "#7DDBFF"
  signal-green: "#167A4D"
  signal-green-dim: "#0c4029"
  signal-green-bright: "#8FE0BB"
  signal-amber: "#E7A22E"
  signal-amber-dim: "#6b4813"
  signal-amber-bright: "#FFD37A"
  signal-red: "#C93420"
  signal-red-dim: "#5c1810"
  signal-red-bright: "#FF8A73"
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
    fontFamily: "Big Shoulders Display, Arial Narrow, sans-serif"
    fontWeight: 700
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Public Sans, system-ui, -apple-system, sans-serif"
    fontWeight: 400
  data:
    fontFamily: "Fragment Mono, ui-monospace, monospace"
    fontWeight: 400
  label:
    fontFamily: "Fragment Mono, ui-monospace, monospace"
    fontWeight: 400
    letterSpacing: "0.06em"
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
    backgroundColor: "rgba(0,174,239,0.09)"
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

# Design System: Crossroads Custom Apparel — The Print Floor

<!-- Rev. 5. Rev. 1 established the admin dashboard 2026-08-29 as a violet SaaS
theme. Rev. 2 (2026-08-30) restyled it into "The Manifest Line," a near-black
instrument console, and extended it app-wide. Rev. 3 (2026-08-31 morning)
split the app into two unrelated systems after feedback that the console
world read as "lifeless and bleak" for the public storefront, introducing a
warm kraft-crate world for Landing/Group Shops/Checkout, "The Gear Drop."
Rev. 4 (2026-08-31, same day) replaced The Gear Drop outright with "The
Print Floor," a pre-press/screen-print-production world, after an explicit
request for a full public-storefront redesign toward "clean, sleek,
modern, futuristic... full... not a ton of empty space or AI feel" — chosen
through a structured direction round (seed key `95845a44`; the roll assigned
a live-broadcast direction, "The Scorebug," and the user locked IMPECCABLE'S
PICK instead). Rev. 5 (2026-09-01) is not a new world: it is Rev. 4's
already-approved Print Floor identity extended over the admin console and
login by explicit request ("extend it to the rest of the site... should
look like this"), retiring The Manifest Line as a separate palette and
type system. The console keeps its own denser Operate-mode shape language
(sharper, smaller radii; a persistent sidebar shell; dense data tables) —
what changed is color and type, not structure or density. This revision
was executed as a token-value swap rather than a markup rewrite: `graphite`
and `signal` (the console's original Tailwind color names) now resolve to
the exact same hex values as `plate` and the storefront's process/spot
inks, so every admin page inherited the new identity without a per-page
edit. `.console-canvas` was retired in favor of the shared `.press-canvas`
(same file, same rules, one definition instead of two that only ever
existed to match each other). SCOPE: every route in the app now shares one
palette, one type system, and one canvas — the only remaining split is
register (Operate vs Persuade, see Overview), not identity.

Rev. 6 (2026-09-01, same day) is a polish pass over Rev. 5's unified
system, in four parts, all by explicit request. (1) The landing hero's
garment crop was tightened from the whole shirt with generous margin to a
close-up centered on the logo (`SeparationHero`'s `viewBox`), reading
noticeably larger while still keeping the full shoulder line in frame — a
tighter crop that loses the collar reads as an unrecognizable gray blob,
not a bigger shirt, so the crop stops exactly at the shoulder line, no
tighter. (2) The soft white "dot-glow" halo first added to
`.separation-card`/`.spec-panel`/`.console-panel` (an ambient shadow term
that brightens the canvas's dot texture just outside a surface's edge, not
a real drop shadow) now runs on every shadowed surface in the app —
buttons (`.press-btn-*`, both `Button` variants), badges
(`.colorbar-badge`), and form fields (`Input`/`Select`) — via two shared
tokens, `--dot-glow`/`--dot-glow-hover` (`globals.css` `:root`), appended
as the last term of every relevant shadow, including the shared Tailwind
`console`/`console-hover`/`glow-*`/`plate`/`plate-hover` tokens so Modal,
Toast, and AdminShell's mobile sidebar inherited it for free. See the
Dot-Glow Rule under Elevation & Depth. (3) Size and color selection in a
Group Shop now answers to the shop's own `var(--spot)` ink on hover and
selection, the same register `.separation-card-interactive` already uses
— new `.spot-chip`/`.spot-swatch` classes, replacing bespoke per-instance
inline styling at all four call sites (product-grid and detail-drawer,
size and color). (4) `PublicHeader` was elevated from a per-page logo/cart
strip into the one persistent navigation banner for every Persuade page
(Home, Shops, How It Works, Contact, plus the cart pill and a
route-specific back link), `position: sticky` so it never leaves the
viewport regardless of scroll depth, with its own mobile slide-down menu
below `md`. It is now a direct child of each page's `min-h-screen` root
rather than nested inside a shorter hero-only wrapper — sticky's
containing block is its nearest block-level ancestor, so nesting it inside
a block that ends after the hero released the header early once that
block scrolled out of view; hoisting it fixed that. Shop-detail's own
cart-status bar and Checkout's step-aware back link now stack in a second
sticky bar directly beneath it (`top-16`, the header's exact height)
instead of duplicating header chrome.

Rev. 6.1 (2026-09-01, same day), three more explicit follow-ups. (1) The
hero garment now casts a soft ambient drop shadow onto the card beneath it
(`SeparationHero`'s `#shirtShadow` SVG filter, `feDropShadow`), so it
reads as sitting on the light table rather than pasted flat on top of it.
(2) The squeegee pull was reversed from left-to-right to top-to-bottom by
explicit request, which surfaced a real Framer Motion limitation worth
recording: a `<clipPath>` child driven by Framer's declarative
animate/initial silently never re-clips in this browser for ANY animated
geometry attribute — the attribute lands on the element correctly, the
clip just never recomputes from it, confirmed by DOM probes across
several isolated tests (a hand-written `<rect>` mutated via plain
`setAttribute` DOES re-clip correctly every time). The fix: the clip
rect's `width` is now driven imperatively from a `useEffect`, via Framer's
own `animate()` function calling `setAttribute` through a ref on every
frame — same easing/timing, different application path. Direction itself
comes from a static (non-animated) `rotate(-90 ...)` on the rect, applied
directly on the shape rather than a wrapping `<g>` (a `<g>` wrapper inside
`<clipPath>` isn't reliably honored either). See the comment at
`SeparationHero.tsx`'s `squeegeeClip` definition for the full mechanism.
(3) The dot-glow tokens (`--dot-glow`/`--dot-glow-hover`, Rev. 6 above)
were widened to a two-layer 100px+50px blur by explicit spec, plus a new
`--text-glow` variant of the same geometry applied once on `body` (`text-
shadow` inherits, so this alone reaches every piece of text in the app).
Opacity on both was kept low relative to the old 44–56px values
specifically because blur radii this large read as a flat wash rather
than a glow at typical box-shadow/text-shadow alpha.

Rev. 6.2 (2026-09-01, same day), two bug fixes surfaced by explicit
reports. (1) `logo.png` is actually a square 1024x1024 source (0.887:1
content once you exclude its transparent padding), but all six `<Image>`
call sites across the app passed it a wide landscape width/height (e.g.
110×44). Tailwind preflight's `img { height: auto }` combined with
Next.js's optimizer emitting a square output for a mismatched target
meant every one of them actually rendered at width×width instead of
width×height — invisible where there was headroom (the login card, the
admin sidebar) but a hard overflow in `PublicHeader`'s fixed `h-16` bar,
where a 110×110 box poked 23px above the sticky header's own bounds.
Fixed by giving each instance a matching square width/height plus an
explicit `h-[Npx] w-[Npx]` class, which overrides preflight's `height:
auto` regardless of what the optimizer emits — the fix generalizes to any
future `logo.png` placement, not just the six caught here. (2) The h1-h5
text-shadow request (Rev. 6.1's `--text-glow`, tuned low specifically to
avoid a "haze over paragraphs" look) wasn't visible enough on actual
headings — white glow behind white text reads as far subtler than the
same value on colored text, so a second explicit rule, `h1,h2,h3,h4,h5 {
text-shadow: 0 0 100px; }` (no color given, so it resolves to that
heading's own currentColor at full strength), now overrides the inherited
`--text-glow` for headings specifically, both registers.

Rev. 6.3 (2026-09-01, same day): the landing hero's garment is now a real
product photo (`public/TSHIRT.webp`, a flat-lay blank tee with genuine
alpha transparency, supplied by the user) in place of the hand-drawn
vector silhouette every earlier revision of this hero used — by explicit
request. `SeparationHero`'s coordinate system (the logo placement, the
viewBox, the shadow filter's offsets) was rebuilt entirely against the
photo's own 832×832 pixel space rather than eyeballed: its alpha channel
was scanned row-by-row to find the collar/sleeve/torso geometry, landing
the print on the torso's own stable, sleeve-clear column (center ≈420,
starting just below the collar) rather than guessing a position that
might sit on a sleeve or a fold. The squeegee-pull mechanism itself (the
clipPath rotation trick from Rev. 6.1, the ref+setAttribute animation)
carried over unchanged — only the LOGO_X/Y/SIZE constants and the
viewBox needed new numbers for the new asset's scale. The squeegee blade
was also flattened to perfectly horizontal by explicit request, dropping
the `skewY(-8)` lean the original printer's-drag-angle version used.

Rev. 6.4 (2026-09-01, same day): three more small hero adjustments, all
by explicit request. The print size grew from 200 to 300 (still centered
on the same torso column). The color-bar swatches gained a thin
`border-black/15` — the palest one (`#eeeade`) was blending into the
card's own off-white background without it. And the two flourishes the
original squeegee-hero concept shipped with are gone entirely: the "UV
flash bed" white overlay that fired after the sweep, and the "stamped
down" bounce (`scale: [1,1,1.04,1]`) on the logo group once the pass
completed. Both are removed outright, not just disabled — the `flash`
state, its timer, its JSX, and the now-orphaned `.exposure-flash-overlay`
CSS class are gone from `SeparationHero.tsx`/`globals.css`, and the logo
group is a plain (non-motion) `<g>` again. The hero's motion now ends the
moment the squeegee finishes its pass and fades out — no epilogue beat. -->



## Overview

**Creative North Star: "The Print Floor."** One dark pre-press light-table world — the shop reads like the actual production file that prints it, and the tool that runs the shop reads like the floor that room sits on — expressed in two registers rather than two rooms.

The public storefront (Landing, Group Shops, Checkout) is a parent in a carpool line or an office manager at their desk, tapping a shared link — not operating anything, but wanting the shop to feel like a real, current, well-made production floor rather than a template or a dropship storefront. This is the **Persuade** register: full commitment, a signature load-in moment (a real squeegee pull drags across the actual Crossroads logo on the landing hero, printed in black — the exposed screen, not yet inked — until the pass reveals the true full-color logo already underneath; updated 2026-09-01 from the halftone-separation moment this hero launched with, by direct request; never repeated elsewhere), a dynamic Pantone-style spot ink per shop, generous rhythm.

Admin and Login are Koby, alone, running the whole business from a console — an operator who lives inside registration marks, calibration bars, and spot-color job tickets all day, so the same pre-press vocabulary is simply what surrounds a press operator's own station. This is the **Operate** register: the identical dark plate ground, the identical fixed CMYK process set, the identical Big Shoulders Display / Public Sans / Fragment Mono type stack — but denser, calmer, and restrained where the storefront is expressive. A persistent sidebar instead of a full-bleed canvas. Small, sharp radii instead of the storefront's slightly warmer ones. No hero theatrics, no per-shop dynamic spot color (admin has no single shop context) — instead the four spot inks (crimson/cobalt/marigold/emerald) do double duty as a **locked four-state semantic system**, filling the exact role the console's original signal colors held: cyan for the one interactive/brand accent, emerald for fulfilled/paid/success, marigold for needs-action/overdue, crimson for cancelled/critical. Scanability, consistency, and native table/form/sidebar expectations still outrank expression here — brand lives in the material (the same near-black plate, the same registration crosshair, the same mono for every number), not in animated flourish.

**Key Characteristics — shared everywhere:**
- A near-black plate ground (`#0A0D14`), never pure white, never a different near-black between registers
- Big Shoulders Display for page-level headlines only, Public Sans for body, Fragment Mono for every price/count/ID/SKU
- A fixed four-color process set (cyan/magenta/yellow/key) reserved for technical marks and small informational chrome, never a large decorative fill
- Two soft blurred glow fields behind every canvas — white top-right, steel-blue bottom-left (`.press-canvas::before/::after`) — over a faint halftone dot texture
- A one-time light sheen sweep on primary actions (`.console-sheen`, theme-agnostic, used by both registers)

**Key Characteristics — Operate (Admin & Login):**
- Persistent 220–248px dark sidebar; content fills the viewport (`max-w-[1800px]`) instead of a narrow column
- The four spot inks run as a locked, meaning-per-hue system (cyan=interactive, emerald=success, marigold=needs-action, crimson=critical) — never decorative, never a fifth hue added
- Sharp, small radii (6–8px) — engineered, not bubbly
- Dense data tables, real hover-lift + shadow on every interactive row/panel/button
- Registration-mark tilt discipline still applies: nothing in this system rotates

**Key Characteristics — Persuade (Public Storefront):**
- No sidebar — a full-bleed canvas, `max-w-5xl`–`max-w-6xl` content column, generous section rhythm
- Each shop's own dynamic Pantone spot color (crimson/cobalt/marigold/emerald, hashed per shop id, `lib/spot.ts`) drives every button/price/selection once inside that shop's context
- Film-positive `.separation-card` tiles with a registration crosshair at the corner — nothing tilts
- A true seven-segment digit mask for every countdown and live count
- The one signature load moment: the landing hero's squeegee-pull sequence — the real logo, printed black, revealed in full color as a blade drags across it — never reprised elsewhere

## Colors

One neutral scale and one process-color set now cover the whole app; only the semantic layer on top differs by register.

**Neutral (`plate` / `graphite` — the same scale under two historical names)**
- **950** (`#0A0D14`): the base canvas everywhere — the darkroom.
- **900** (`#121620`): panel surfaces, itself a subtle gradient toward `#171B21`.
- **700–600** (`#2B303A`–`#414855`): borders, dividers.
- **300** (`#A3AAB6`, ≈8.3:1 on 950): the floor for any real text on this canvas, both registers.
- **400** (`#7A8290`, ≈5.0:1): icon-only, never real text.
- **50/100**: primary headings and values (`#F7F8FA` / `#E7E9ED`).

**Process (technical marks only, both registers)**
- **Cyan** (`#00AEEF`): registration crosshairs, the calibration bar, links, informational badges — and, in Operate, the one interactive/brand accent (buttons, active nav, focus rings), directly inheriting the console's original one-accent role.
- **Magenta** (`#EC008C`): the calibration bar's second swatch, a secondary informational badge tone.
- **Yellow** (`#FFE800`): the calibration bar's third swatch only — never a UI fill.

**The four inks (`spot` in Persuade, `signal` in Operate — same hexes, two roles)**
- **Crimson** (`#C93420`, bright `#FF8A73`): a shop's dynamic ink in Persuade, or fixed *critical/cancelled* in Operate; also the platform's own default ink wherever no shop context applies (checkout spanning multiple shops, any `PressButton` outside a shop).
- **Cobalt** (`#2657C7`, bright `#8FB4FF`): Persuade-only dynamic spot ink — not part of Operate's locked four (Operate reuses cyan for its interactive role instead, so cobalt has no fixed Operate meaning).
- **Marigold** (`#E7A22E`, bright `#FFD37A`): a shop's dynamic ink in Persuade, or fixed *needs-action/overdue* in Operate. The one ink too light for off-white fill text — see the Marigold-Carries-Dark-Text rule.
- **Emerald** (`#167A4D`, bright `#8FE0BB`): a shop's dynamic ink in Persuade, or fixed *fulfilled/paid/success* in Operate.

**Named Rules**
**The Plate-300 Floor Rule.** No real text drops below `plate-300`/`graphite-300` (≈8.3:1) on the 950/900 canvas, in either register. `plate-400`/`graphite-400` is icon-only.

**The Process-Marks-Are-Chrome Rule.** `proc-cyan`/`magenta`/`yellow` mark technical state and small informational chrome — never a large decorative fill — in both registers. (Operate's use of cyan as its interactive/brand accent is the one deliberate exception, inherited directly from the console's original Locked Palette Rule.)

**The Locked-Four Rule (Operate only).** In admin/login, the four inks carry exactly one meaning each (cyan=interactive, emerald=success, marigold=needs-action, crimson=critical) and never decorate. No fifth state color without revisiting this file. (Non-state categorical tags — `Badge`'s `purple`/`pink`/`orange`/`teal` variants for things like vendor labels — may still use a few additional non-violet hues.)

**The Spot-Carries-Everything Rule (Persuade only).** Once a public page or section sits inside a shop's context, `--spot`/`--spot-bright`/`--spot-dim`/`--spot-on` (set once via `spotVars()`) drive every accent, button, price, and selection state in that context — never a hardcoded hex reintroduced alongside it.

**The Marigold-Carries-Dark-Text Rule.** `marigold`/`signal-amber` is the one ink too light for off-white fill text (`#E7A22E` reaches only ≈2.1:1 with `plate-50`; ≈8.9:1 with `plate-950`) — anything set on a marigold fill uses dark text, in both registers.

## Typography

One type system, one hierarchy, both registers.

**Display Font:** Big Shoulders Display (Arial Narrow fallback) · **Body Font:** Public Sans · **Data/Mono Font:** Fragment Mono

A condensed, heavy industrial display face at page-title/hero size only, paired with Public Sans — a body face drawn from federal technical-form typography, the spec-sheet register the whole product lives in, chosen deliberately over reflexive AI-UI defaults (Inter, Plus Jakarta Sans, DM Sans, Space Grotesk, IBM Plex). Fragment Mono carries every number app-wide — order totals, SKUs, customer counts, KPI values — and every digit that actually counts something live (a shop's closing countdown, a How-It-Works step) renders through `SegmentReadout`'s seven-segment mask instead, never plain Fragment Mono digits.

- **Display** (Big Shoulders Display, 700–900, uppercase, tight leading): the landing hero headline and every `.page-title` in admin (`Dashboard`, `Orders`, `Products`, …) — display never drops below page-title/hero size.
- **Section headline** (Big Shoulders Display, uppercase, 1.5–1.875rem): storefront section H2s ("What We Do," "How It Works") only — admin panel headers stay Public Sans bold, since Operate's density means a condensed display face at every panel/table header would cost scanability the storefront's sparser hierarchy doesn't pay.
- **Body** (Public Sans, 400–500): names, descriptions, form labels, copy, table cell text, sidebar nav — both registers.
- **Data/Mono** (Fragment Mono, `tabular-nums`): every price, count, date, SKU, ID, KPI value, field label — both registers. Field/section labels (`.console-label`, storefront `ColorBar`) use Fragment Mono at 11px specifically so a scanned label and a scanned value share one register.
- **Segment readout** (`SegmentReadout`, seven-segment mask, ghost cells included): storefront-only — a live countdown or step count, never plain type.

**Named Rules**
**The Mono-Means-Data Rule.** Fragment Mono is reserved for numbers, dates, IDs, and SKUs, app-wide — never a heading or a sentence. (Unifies the console's original Mono-Means-Data rule and the storefront's Spec-Means-Data rule into one rule, since they're now the same face.)

**The Display-Is-Titles-Only Rule.** Big Shoulders Display never drops below a page title or section headline; body copy, table content, labels, and buttons are set in Public Sans everywhere, even directly beside a display-set heading.

## Layout

### Operate (Admin & Login)

The shell is a fixed 220px (248px at `xl`) dark sidebar on desktop plus a fluid content column collapsing to a slide-in drawer below `lg`. Content runs `w-full max-w-[1800px] mx-auto`, padding scaling `p-4 → sm:p-6 → lg:p-8 → xl:p-10`. Verify every surface at phone, tablet, laptop, and full-screen/ultrawide widths.

### Persuade (Public Storefront)

No sidebar — a full-bleed canvas with a centered `max-w-5xl`–`max-w-6xl` content column and one persistent sticky navigation banner (`PublicHeader`: logo, Home/Shops/How It Works/Contact, cart pill, optional route back-link, a slide-down menu below `md`) pinned to the top of every Persuade page regardless of scroll depth — consistent with browsing rather than operating. `PublicHeader` is always a direct child of the page's own `min-h-screen` root, never nested inside a shorter block, so `position: sticky` has the full page as its containing block. A page with its own contextual sub-bar (Shop-detail's cart-status strip, Checkout's step-aware back link) stacks it directly beneath the header in a second `sticky top-16` bar rather than replacing the header. Section rhythm is generous (`py-16`–`py-20`, more space above a heading than below it) except the landing hero (`py-12`–`py-14`, kept tight to hold the squeegee-pull hero visual near the fold). Grids collapse `sm:grid-cols-3 → grid-cols-1`; a shop/product grid with fewer than three real items fills remaining slots with a dashed `GhostSlot` rather than bare canvas (capped to one on mobile). Fixed-position registration-mark corners (`PressFrame`) sit pinned to every viewport's four corners on every page, both registers — structural chrome, not decoration.

## Elevation & Depth

One canvas, one glow treatment, one sheen, both registers — only the panel object differs.

`.press-canvas` (the single canvas class for the whole app — `.console-canvas` was retired in Rev. 5) carries a faint halftone dot texture plus two soft blurred glow fields behind the content: a white wash top-right (`inset: 10% -10% auto auto; width/height: 60vw; radial-gradient(circle, rgba(255,255,255,0.08), transparent 70%); blur(10px)`) and a steel-blue wash bottom-left (`inset: auto auto -20% -10%; width/height: 50vw; radial-gradient(circle, rgba(64,110,165,0.2), transparent 70%); blur(20px)`), both `position: fixed` so they stay pinned to the viewport rather than scrolling with the page. A one-time light sheen sweeps across primary buttons on hover (`.console-sheen`, theme-agnostic, shared by both registers).

**Operate panels** (`.console-panel`, `<Card>`) sit on the plate gradient (`#171B21 → #121620`) with a hairline white-alpha border and a true two-layer shadow (`shadow-console`); interactive panels/rows lift 2–3px on hover with the shadow deepening (`shadow-console-hover`, `.console-panel-interactive`). Primary actions and urgent panels carry a signal-colored glow (`shadow-glow-cyan`/`-amber`/`-green`/`-red`, `.console-panel-glow-*`).

**Persuade objects** are deliberately different registers, and neither ever tilts. **Separation cards** (`.separation-card`) sit dead square with a registration crosshair fixed at the top-left corner that snaps to `var(--spot-bright)` on hover, lifting 4px with a spot-colored glow (`shadow-plate-hover`). **Spec panels** (`.spec-panel`) share the same plate material but hold still, no crosshair — the register for structured content that should read as legible and calm.

**Named Rules**
**The Dot-Glow Rule.** Every shadowed surface in the app — panels, cards, buttons, badges, form fields, both registers — closes its box-shadow with one of two shared tokens, `--dot-glow` (rest) / `--dot-glow-hover` (hover/interactive), defined once in `globals.css` `:root` and reused everywhere, including inside the shared Tailwind `console`/`console-hover`/`glow-*`/`plate`/`plate-hover` shadow tokens. Each is a two-layer wide, soft, low-opacity white halo (0 0 100px + 0 0 50px, an outer haze and a tighter brighter core) — not a real drop shadow — that brightens the canvas's own dot texture in a ring just outside the surface's edge, so every object reads as if it's casting a little light onto the light table or instrument panel behind it. `--text-glow` is the same geometry applied once as `text-shadow` on `body` (inherited app-wide) since text-shadow reads as a halo around whole words at this blur radius rather than a per-letter effect, so its opacity runs lower than the box-shadow tokens'. New shadowed components extend one of these tokens rather than inventing a new white glow value.

**The Earned Glow Rule.** Depth and glow answer to something real — a primary action, genuine urgency, the app's own ambience — never sprinkled on for its own sake, in either register.

**The Nothing-Tilts Rule.** No card, badge, or tile in this system ever rotates, in either register — registration crosshairs snapping square is the whole depth vocabulary. This is the deliberate opposite of the retired kraft-crate world's scattered tag tilt, not an oversight.

## Shapes

### Operate (Admin & Login)

Small, sharp radii throughout — `0.375rem` (buttons, icon chips, nav items) to `0.5rem` (panels). No `rounded-2xl`/`rounded-3xl` bubble radii anywhere. Deliberately sharper than Persuade's own scale — Operate's density and native-table expectations want engineered edges, not the storefront's slightly warmer ones.

### Persuade (Public Storefront)

Precise, technical radii — `0.5rem` (buttons) to `0.625rem` (separation cards) to `0.75rem` (spec panels). The one recurring mark is the registration crosshair (⊕): a small circle-plus-ticks glyph (`RegistrationMark`) at a separation card's top-left corner, a spec panel's corners implicitly, and pinned to every page's four viewport corners via `PressFrame` — both registers use `PressFrame`.

## Components

### Operate (Admin & Login)

**Buttons** (`components/ui/button.tsx`)
- **Shape:** `rounded-md` (6px) `xs`/`sm`/`md`, `rounded-lg` `lg`.
- **Primary:** cyan gradient (`bg-signal-cyan-gradient`), `graphite-950` text, `shadow-glow-cyan-sm` deepening to `shadow-glow-cyan` on hover, `.console-sheen` sweep.
- **Secondary:** `white/[0.06]` fill, `white/10` ring, `graphite-100` text.
- **Focus:** `signal-cyan` ring, 2px offset.

**Console Panels** (`.console-panel`, `<Card>`) — `rounded-lg`, plate gradient, `white/[0.08]` hairline border, `shadow-console` at rest, `.console-panel-interactive` for hover-lift, `.console-panel-glow-{cyan,amber,green}` for urgency emphasis.

**Badge** (`components/ui/badge.tsx`) — tinted-dark fill + bright signal-color text + matching ring; `success`/`warning`/`danger`/`info` map to emerald/marigold/crimson/cyan per the Locked-Four Rule; `purple`/`pink`/`orange`/`teal` reserved for non-state category tags.

**Console Label** (`.console-label`) — Fragment Mono, 11px, uppercase, `plate-300` — the admin's field/section-label voice, matching the storefront's own mono-label discipline.

**Navigation** (sidebar, `components/admin/AdminShell.tsx`) — `plate-950` ground, faint cyan top wash; active item gets `signal-cyan-bright` text, `signal-cyan/[0.09]` background, and a 2px glowing cyan left rail (the sidebar's one load-bearing glow).

### Persuade (Public Storefront)

**Buttons** (`components/public/PressButton.tsx`) — same variant/size API as the console's `Button` so call sites are a drop-in swap, styled entirely differently.
- **Shape:** `rounded-[0.5rem]` (`.press-btn`).
- **Primary:** a gradient from `var(--spot-top)` to `var(--spot)`, `var(--spot-on)` text, glow shadow tinted `var(--spot-dim)`, `.console-sheen` sweep, a real mechanical thud on `:active`. Falls back to the platform's crimson ink wherever no shop context sets `--spot`.
- **Secondary:** `plate-800` fill, `plate-700` border, `plate-100` text.
- **Focus:** `proc-cyan` ring, 2px offset.

**Separation Card** (`components/public/SeparationCard.tsx`, `.separation-card`) — the signature object for a product or shop preview. `rounded-[0.625rem]`, plate gradient, 1px `plate-700` border, `shadow-plate`, a registration crosshair fixed at the top-left corner. Never tilts.

**Spec Panel** (`.spec-panel`) — the flat structured-content surface. Same plate material as `.separation-card`, no crosshair. Multi-line content is divided by a dashed line between items, never same-size icon cards.

**Color Bar** (`components/public/ColorBar.tsx`, `.colorbar-badge`) — a calibration-strip badge for status/count. Fragment Mono, a small solid dot before the label, dead square. `cyan`/`magenta` tones are process-chrome only; `spotKey` tints it with a shop's own ink.

**Segment Readout** (`components/public/SegmentReadout.tsx`) — a true seven-segment digit mask for the shop-closing countdown and How-It-Works step numbers.

**Ghost Slot** (`components/public/GhostSlot.tsx`) — a dashed, unfilled grid slot ("Next job opening soon") that fills a sparse shop grid honestly rather than fabricating shops. Capped to one on mobile.

**Press Frame** (`components/public/PressFrame.tsx`) — four fixed-position registration crosshairs pinned to the viewport's corners on every page, both registers.

**Public Header** (`components/public/PublicHeader.tsx`) — the one persistent, sticky navigation banner for every Persuade page: logo, Home/Shops/How It Works/Contact (the active route underlined in `proc-cyan`), the cart pill, an optional route-specific back link, and a slide-down mobile menu below `md`. Always a direct child of the page's own `min-h-screen` root so its `sticky` positioning spans the full page.

**Spot Chip / Spot Swatch** (`.spot-chip`, `.spot-swatch`, `globals.css`) — size and color selection in a Group Shop. Same hover/selected language as `.separation-card-interactive`: `var(--spot)` border and glow on hover, a filled `var(--spot)` background once selected — never a hardcoded accent color.

## Do's and Don'ts

### Shared (both registers)

**Do:**
- **Do** keep the ground a near-black plate tone (`#0A0D14`) — never pure white, never a second near-black.
- **Do** render every price, count, date, SKU, and ID in Fragment Mono with `tabular-nums`.
- **Do** use `plate-300`/`graphite-300` or lighter for any real text on the 950/900 canvas.
- **Do** hold every drawn icon in the system to one consistent stroke width (2px) — `RegistrationMark`'s own thinner default is the one deliberate exception, a separate "technical mark" glyph family.
- **Do** vary a repeated whileInView entrance by section register rather than stamping the identical fade-up on every section of a page.

**Don't:**
- **Don't** reintroduce violet/purple as a brand or state color.
- **Don't** tilt or rotate any card, badge, or tile in this system — the Nothing-Tilts Rule.
- **Don't** put a kicker/eyebrow label above a heading (craft-floor ban, no exception).
- **Don't** fake a material the page doesn't actually render (embossed/stamped-metal CSS, photographic textures).

### Operate only (Admin & Login)

**Do:**
- **Do** keep every one of the four locked signal colors tied to its one real meaning (cyan/green/amber/red — see the Locked-Four Rule).
- **Do** give interactive panels, rows, and buttons a real hover-lift + shadow change.
- **Do** prefer `components/ui/*` (`Button`, `Card`, `Badge`, `Input`, `Select`, `Modal`, `Toast`) over hand-rolled markup.

**Don't:**
- **Don't** add a fifth semantic/state accent color.
- **Don't** use a colored `border-left`/`border-right` accent above 1px on any panel or list row.
- **Don't** use `components/public/*` (PressButton, SeparationCard, ColorBar) on any admin or login surface, or vice versa — the two component libraries stay separate even though the tokens beneath them match.

### Persuade only (Public Storefront)

**Do:**
- **Do** set a shop's own spot color once (`spotVars()`) at the top of that shop's context and let every button, price, and selection state inherit it via CSS custom properties.
- **Do** reserve the process colors for technical marks and small informational badges; a shop's expressive color is always its spot ink.
- **Do** fill a shop/product grid with fewer than three real items using a `GhostSlot`, never bare canvas.

**Don't:**
- **Don't** hardcode a spot hex inline where `var(--spot)` should be inherited instead.
- **Don't** set Allerta Stencil, Barlow, or Space Mono anywhere — that world is fully retired.
