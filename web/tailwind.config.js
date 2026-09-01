/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{ts,tsx}",
        "./components/**/*.{ts,tsx}",
        "./lib/**/*.{ts,tsx}"
    ],
    theme: {
        extend: {
            fontFamily: {
                // One shared type system app-wide now (see DESIGN.md Rev. 5) — the
                // console (admin/login) and "The Print Floor" (public storefront)
                // read as one identity everywhere, not two rooms. `sans`/`mono` are
                // what the console's own markup calls by default (body text, every
                // `font-mono` data value); `display`/`press`/`spec` are the same
                // three faces under the storefront's own names, kept so existing
                // storefront call sites (`font-display`, `font-press`, `font-spec`)
                // don't need touching. Condensed industrial display + a
                // technical-form body face + a spec-sheet mono — none reflexive
                // AI-UI defaults.
                sans: ["Public Sans", "system-ui", "-apple-system", "sans-serif"],
                mono: ["Fragment Mono", "ui-monospace", "SFMono-Regular", "monospace"],
                display: ["Big Shoulders Display", "Arial Narrow", "sans-serif"],
                press: ["Public Sans", "system-ui", "-apple-system", "sans-serif"],
                spec: ["Fragment Mono", "ui-monospace", "SFMono-Regular", "monospace"],
            },
            colors: {
                // Console/instrument system — "The Manifest Line" (see DESIGN.md).
                // `graphite` is now the exact same neutral scale as `plate` below,
                // just kept under its original name since the console's markup
                // (hundreds of call sites) already addresses it that way — the two
                // names are one scale, not two. Signal colors are semantic only
                // (never decorative), named for what they mean, and now resolve to
                // "The Print Floor"'s own process/spot hues instead of a separate
                // palette: cyan is the shared process-cyan brand accent; green/
                // amber/red borrow the storefront's emerald/marigold/crimson spot
                // inks as this app's own fixed four-state system (admin has no
                // per-shop context, so these read as constants here, unlike the
                // storefront's dynamic --spot).
                graphite: {
                    50:  "#F7F8FA",
                    100: "#E7E9ED",
                    200: "#C9CDD6",
                    300: "#A3AAB6",
                    400: "#7A8290",
                    500: "#5C6472",
                    600: "#414855",
                    700: "#2B303A",
                    800: "#1B2029",
                    900: "#121620",
                    950: "#0A0D14",
                },
                signal: {
                    cyan:  { DEFAULT: "#00AEEF", dim: "#0a4a63", bright: "#7DDBFF" },
                    green: { DEFAULT: "#167A4D", dim: "#0c4029", bright: "#8FE0BB" },
                    amber: { DEFAULT: "#E7A22E", dim: "#6b4813", bright: "#FFD37A" },
                    red:   { DEFAULT: "#C93420", dim: "#5c1810", bright: "#FF8A73" },
                },
                // "The Print Floor" — a dark light-table neutral scale (the
                // pre-press darkroom a screen gets exposed and registered in) plus
                // a fixed, technical-only process-color set, now shared by every
                // surface in the app (public storefront and admin/login alike).
                // Each shop's own accent — its "spot color" — is dynamic, computed
                // by lib/spot.ts and carried as CSS custom properties
                // (--spot/--spot-bright/--spot-dim/--spot-on), never a static
                // Tailwind color, so it is not declared here. See DESIGN.md.
                plate: {
                    50:  "#F7F8FA",
                    100: "#E7E9ED",
                    200: "#C9CDD6",
                    300: "#A3AAB6", // text floor — 8.3:1 on plate-950
                    400: "#7A8290", // icon-only floor
                    500: "#5C6472",
                    600: "#414855",
                    700: "#2B303A",
                    800: "#1B2029",
                    900: "#121620", // panel ground
                    950: "#0A0D14", // canvas ground — the darkroom
                },
                proc: {
                    // Fixed CMYK separation colors — technical marks only
                    // (registration crosshairs, color-bar chrome), never a
                    // decorative fill. See the Process-Marks-Are-Chrome rule.
                    cyan:    "#00AEEF",
                    magenta: "#EC008C",
                    yellow:  "#FFE800",
                    key:     "#0A0D14",
                },
            },
            backgroundImage: {
                "shine": "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)",
                // Console/instrument gradients — cyan-family only, never violet.
                "console-gradient":        "linear-gradient(180deg, #171B21 0%, #0F1319 100%)",
                "console-gradient-raised": "linear-gradient(180deg, #1F2530 0%, #171B21 100%)",
                "signal-cyan-gradient":      "linear-gradient(135deg, #7DDBFF 0%, #00AEEF 45%, #0a6f94 100%)",
                "signal-cyan-gradient-soft": "linear-gradient(135deg, #00AEEF 0%, #086e91 100%)",
                "console-sheen": "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)",
                "scan-sweep": "linear-gradient(90deg, transparent, rgba(0,174,239,0.55), transparent)",
            },
            boxShadow: {
                "card":       "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
                "card-hover": "0 8px 24px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)",
                "modal":      "0 25px 60px rgba(0,0,0,0.25), 0 10px 24px rgba(0,0,0,0.15)",
                "inner-glow": "inset 0 1px 0 rgba(255,255,255,0.08)",
                // Console depth system — real elevation, cyan/signal glow, no violet.
                // Every token below closes with var(--dot-glow)/--dot-glow-hover (see
                // globals.css :root) — the same wide, soft, low-opacity white halo the
                // hand-authored .console-panel/.separation-card/.spec-panel/.press-btn-*
                // rules carry, so every shadowed surface in the app (panels, modals,
                // toasts, buttons, badges) casts the same light onto the dot grid.
                "console":       "0 1px 2px rgba(0,0,0,0.5), 0 10px 24px -8px rgba(0,0,0,0.6), var(--dot-glow)",
                "console-hover": "0 2px 6px rgba(0,0,0,0.55), 0 20px 44px -10px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06), var(--dot-glow-hover)",
                "console-inset": "inset 0 1px 0 rgba(255,255,255,0.05), inset 0 0 0 1px rgba(255,255,255,0.06)",
                "glow-cyan":    "0 0 1px rgba(0,174,239,0.5), 0 0 28px rgba(0,174,239,0.40), 0 6px 20px rgba(0,0,0,0.45), var(--dot-glow)",
                "glow-cyan-sm": "0 0 14px rgba(0,174,239,0.35), var(--dot-glow)",
                "glow-green":   "0 0 20px rgba(22,122,77,0.4), var(--dot-glow)",
                "glow-amber":   "0 0 20px rgba(231,162,46,0.4), var(--dot-glow)",
                "glow-red":     "0 0 20px rgba(201,52,32,0.4), var(--dot-glow)",
                // "The Print Floor" — light-table elevation: cards read as
                // backlit film sitting on a glowing surface in a dark room,
                // never a warm paper drop shadow. Spot-color glow is added
                // inline via var(--spot-dim) since the accent is per-shop.
                "plate":       "0 1px 2px rgba(0,0,0,0.5), 0 10px 26px -8px rgba(0,0,0,0.7), var(--dot-glow)",
                "plate-hover": "0 2px 6px rgba(0,0,0,0.55), 0 22px 46px -10px rgba(0,0,0,0.75), 0 0 0 1px rgba(247,248,250,0.06), var(--dot-glow-hover)",
                "plate-lit":   "0 1px 2px rgba(0,0,0,0.5), 0 0 32px -6px rgba(247,248,250,0.20), 0 10px 26px -8px rgba(0,0,0,0.7)",
            },
            borderRadius: {
                "2xl": "1rem",
                "3xl": "1.25rem",
                "4xl": "1.5rem",
            },
            keyframes: {
                shimmer: {
                    "0%":   { backgroundPosition: "-200% 0" },
                    "100%": { backgroundPosition: "200% 0" },
                },
                "float": {
                    "0%, 100%": { transform: "translateY(0px)" },
                    "50%":      { transform: "translateY(-6px)" },
                },
                "glow-pulse": {
                    "0%, 100%": { boxShadow: "0 0 20px rgba(124,58,237,0.3)" },
                    "50%":      { boxShadow: "0 0 40px rgba(124,58,237,0.6)" },
                },
                "slide-in-right": {
                    "0%":   { transform: "translateX(100%)", opacity: "0" },
                    "100%": { transform: "translateX(0)",    opacity: "1" },
                },
                "slide-out-right": {
                    "0%":   { transform: "translateX(0)",    opacity: "1" },
                    "100%": { transform: "translateX(100%)", opacity: "0" },
                },
                "scale-in": {
                    "0%":   { transform: "scale(0.94) translateY(4px)", opacity: "0" },
                    "100%": { transform: "scale(1)    translateY(0)",    opacity: "1" },
                },
                "fade-up": {
                    "0%":   { transform: "translateY(12px)", opacity: "0" },
                    "100%": { transform: "translateY(0)",    opacity: "1" },
                },
                "count-up": {
                    "0%":   { opacity: "0", transform: "translateY(8px)" },
                    "100%": { opacity: "1", transform: "translateY(0)"   },
                },
                "spin-slow": {
                    "0%":   { transform: "rotate(0deg)"   },
                    "100%": { transform: "rotate(360deg)" },
                },
                "signal-pulse": {
                    "0%, 100%": { opacity: "1" },
                    "50%":      { opacity: "0.45" },
                },
                "manifest-in": {
                    "0%":   { transform: "translateX(-10px)", opacity: "0" },
                    "100%": { transform: "translateX(0)",     opacity: "1" },
                },
                "scan-sweep": {
                    "0%":   { backgroundPosition: "-150% 0" },
                    "100%": { backgroundPosition: "250% 0" },
                },
                "ambient-drift": {
                    "0%, 100%": { transform: "translate(0, 0) scale(1)" },
                    "50%":      { transform: "translate(24px, -16px) scale(1.05)" },
                },
                "rise-in": {
                    "0%":   { transform: "translateY(14px)", opacity: "0" },
                    "100%": { transform: "translateY(0)",    opacity: "1" },
                },
                // "The Print Floor" motion grammar — see DESIGN.md.
                "registration-snap": {
                    "0%":   { transform: "translate(-1.5px, 1.5px)", opacity: "0.6" },
                    "60%":  { transform: "translate(0.5px, -0.5px)", opacity: "1" },
                    "100%": { transform: "translate(0, 0)",          opacity: "1" },
                },
                "halftone-drift": {
                    "0%, 100%": { backgroundPosition: "0px 0px" },
                    "50%":      { backgroundPosition: "6px 6px" },
                },
                "exposure-flash": {
                    "0%":   { opacity: "0" },
                    "8%":   { opacity: "0.9" },
                    "100%": { opacity: "0" },
                },
                "segment-glow": {
                    "0%, 100%": { opacity: "1" },
                    "50%":      { opacity: "0.88" },
                },
                "press-canvas-drift": {
                    "0%, 100%": { transform: "translate(0, 0) scale(1)" },
                    "50%":      { transform: "translate(-20px, 14px) scale(1.05)" },
                },
            },
            animation: {
                "signal-pulse": "signal-pulse 1.8s cubic-bezier(0.16,1,0.3,1) infinite",
                "manifest-in":  "manifest-in 0.5s cubic-bezier(0.16,1,0.3,1) both",
                "scan-sweep":   "scan-sweep 6s linear infinite",
                "ambient-drift":"ambient-drift 14s ease-in-out infinite",
                "rise-in":      "rise-in 0.5s cubic-bezier(0.16,1,0.3,1) both",
                "registration-snap": "registration-snap 0.4s cubic-bezier(0.16,1,0.3,1) both",
                "halftone-drift":    "halftone-drift 5s ease-in-out infinite",
                "exposure-flash":    "exposure-flash 0.5s ease-out both",
                "segment-glow":      "segment-glow 2.2s ease-in-out infinite",
                "press-canvas-drift":"press-canvas-drift 17s ease-in-out infinite",
                "shimmer":        "shimmer 2s linear infinite",
                "float":          "float 3s ease-in-out infinite",
                "glow-pulse":     "glow-pulse 2s ease-in-out infinite",
                "slide-in-right": "slide-in-right 0.3s cubic-bezier(0.32,0.72,0,1)",
                "slide-out-right":"slide-out-right 0.25s ease-in",
                "scale-in":       "scale-in 0.2s cubic-bezier(0.32,0.72,0,1)",
                "fade-up":        "fade-up 0.4s cubic-bezier(0.32,0.72,0,1)",
                "count-up":       "count-up 0.5s cubic-bezier(0.32,0.72,0,1)",
                "spin-slow":      "spin-slow 3s linear infinite",
            },
            transitionTimingFunction: {
                "spring": "cubic-bezier(0.32, 0.72, 0, 1)",
            },
        }
    },
    plugins: [require("tailwindcss-animate")]
};
