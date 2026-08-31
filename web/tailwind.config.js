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
                sans: ["IBM Plex Sans", "Inter", "system-ui", "-apple-system", "sans-serif"],
                mono: ["IBM Plex Mono", "ui-monospace", "SFMono-Regular", "monospace"],
                // "The Gear Drop" — public storefront system (see DESIGN.md). Kept
                // separate from the admin console's IBM Plex stack on purpose: the
                // storefront is a different world (Persuade, not Operate).
                display: ["Allerta Stencil", "Arial Narrow", "sans-serif"],
                gear: ["Barlow", "system-ui", "-apple-system", "sans-serif"],
                ticket: ["Space Mono", "ui-monospace", "SFMono-Regular", "monospace"],
            },
            colors: {
                // Console/instrument system — "The Manifest Line" (see DESIGN.md).
                // Graphite is the panel scale; signal colors are semantic only
                // (never decorative) and named for what they mean, not what they look like.
                graphite: {
                    50:  "#f3f4f6",
                    100: "#e3e5e9",
                    200: "#c3c7d0",
                    300: "#9aa0ac",
                    400: "#6f7684",
                    500: "#4d5563",
                    600: "#363c48",
                    700: "#262b35",
                    800: "#191d25",
                    900: "#12151b",
                    950: "#0a0c10",
                },
                signal: {
                    cyan:  { DEFAULT: "#33e1ff", dim: "#0f6478", bright: "#a7f3ff" },
                    green: { DEFAULT: "#3ddc84", dim: "#146538", bright: "#b6f5d2" },
                    amber: { DEFAULT: "#ffb238", dim: "#7a4d0a", bright: "#ffdca3" },
                    red:   { DEFAULT: "#ff5c5c", dim: "#7a1f1f", bright: "#ffc2c2" },
                },
                // "The Gear Drop" — public storefront (landing, group shops,
                // checkout). A warm kraft/cardboard neutral scale (never pure
                // white, never black) plus four stencil-ink accents rotating
                // across categories and state — see DESIGN.md.
                crate: {
                    paper:      "#F8F1E1", // page ground — raw manila/cardboard
                    "paper-deep":"#EFE2C4", // card/panel ground, one shade deeper
                    plywood:    "#DEC9A0", // hairline borders, dividers
                    "plywood-dark": "#C7AD7C",
                    ink:        "#2A2015", // primary text — warm near-black, never pure black
                    "ink-soft": "#5B4B35", // secondary text
                    "ink-faint":"#7C6A4E", // tertiary/placeholder text (≥4.5:1 on paper)
                },
                stencil: {
                    red:  { DEFAULT: "#BE3B27", dim: "#7A2115", bright: "#E2694F" },
                    gold: { DEFAULT: "#C98B22", dim: "#7A560F", bright: "#E8B45C" },
                    teal: { DEFAULT: "#1D7268", dim: "#0F3F39", bright: "#4FA89C" },
                    green:{ DEFAULT: "#4C7A34", dim: "#2C481F", bright: "#7FAE5C" },
                },
            },
            backgroundImage: {
                "shine": "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)",
                // Console/instrument gradients — cyan-family only, never violet.
                "console-gradient":        "linear-gradient(180deg, #161b23 0%, #0d1015 100%)",
                "console-gradient-raised": "linear-gradient(180deg, #1a2029 0%, #12151b 100%)",
                "signal-cyan-gradient":      "linear-gradient(135deg, #6df0ff 0%, #33e1ff 45%, #0f9dbd 100%)",
                "signal-cyan-gradient-soft": "linear-gradient(135deg, #33e1ff 0%, #1c8fae 100%)",
                "console-sheen": "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)",
                "scan-sweep": "linear-gradient(90deg, transparent, rgba(51,225,255,0.55), transparent)",
            },
            boxShadow: {
                "card":       "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
                "card-hover": "0 8px 24px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)",
                "modal":      "0 25px 60px rgba(0,0,0,0.25), 0 10px 24px rgba(0,0,0,0.15)",
                "inner-glow": "inset 0 1px 0 rgba(255,255,255,0.08)",
                // Console depth system — real elevation, cyan/signal glow, no violet.
                "console":       "0 1px 2px rgba(0,0,0,0.5), 0 10px 24px -8px rgba(0,0,0,0.6)",
                "console-hover": "0 2px 6px rgba(0,0,0,0.55), 0 20px 44px -10px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)",
                "console-inset": "inset 0 1px 0 rgba(255,255,255,0.05), inset 0 0 0 1px rgba(255,255,255,0.06)",
                "glow-cyan":    "0 0 1px rgba(51,225,255,0.5), 0 0 28px rgba(51,225,255,0.40), 0 6px 20px rgba(0,0,0,0.45)",
                "glow-cyan-sm": "0 0 14px rgba(51,225,255,0.35)",
                "glow-green":   "0 0 20px rgba(61,220,132,0.35)",
                "glow-amber":   "0 0 20px rgba(255,178,56,0.4)",
                "glow-red":     "0 0 20px rgba(255,92,92,0.4)",
                // "The Gear Drop" — paper/tag elevation, warm ink shadows instead
                // of the console's neon glow. Two-layer like .console-panel's
                // shadow-console, but warm-toned to read as paper on a table.
                "tag":       "0 1px 2px rgba(42,32,21,0.14), 0 8px 18px -6px rgba(42,32,21,0.22)",
                "tag-hover": "0 2px 4px rgba(42,32,21,0.16), 0 18px 32px -8px rgba(42,32,21,0.30)",
                "stamp":     "0 1px 1px rgba(42,32,21,0.25), 0 3px 8px rgba(42,32,21,0.18)",
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
            },
            animation: {
                "signal-pulse": "signal-pulse 1.8s cubic-bezier(0.16,1,0.3,1) infinite",
                "manifest-in":  "manifest-in 0.5s cubic-bezier(0.16,1,0.3,1) both",
                "scan-sweep":   "scan-sweep 6s linear infinite",
                "ambient-drift":"ambient-drift 14s ease-in-out infinite",
                "rise-in":      "rise-in 0.5s cubic-bezier(0.16,1,0.3,1) both",
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
