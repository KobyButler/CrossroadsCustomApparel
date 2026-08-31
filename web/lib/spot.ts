// "The Print Floor" — the storefront's per-shop spot color. Every real print
// job specs exactly one Pantone-style spot ink; every Group Shop here gets
// one too, hashed deterministically from its id so the same shop always
// lands on the same color without needing an admin field or a schema change.
// See DESIGN.md.
import type { CSSProperties } from "react";

export type SpotKey = "crimson" | "cobalt" | "marigold" | "emerald";

export const SPOT_ORDER: SpotKey[] = ["crimson", "cobalt", "marigold", "emerald"];

type SpotDef = {
    label: string;
    /** Solid fill — text on top must be `on`, per the contrast pass in DESIGN.md. */
    DEFAULT: string;
    /** Lighter gradient top for buttons/fills — never used alone. */
    top: string;
    /** Light tint for real text/icons directly on the plate-950/900 canvas (≥8:1). */
    bright: string;
    /** Translucent wash for tinted badge/chip backgrounds behind `bright` text. */
    dim: string;
    /** The one text color that reads on `DEFAULT`. */
    on: string;
};

export const SPOTS: Record<SpotKey, SpotDef> = {
    crimson: {
        label: "Crimson",
        DEFAULT: "#C93420",
        top: "#DE4A34",
        bright: "#FF8A73",
        dim: "rgba(201,52,32,0.16)",
        on: "#F7F8FA",
    },
    cobalt: {
        label: "Cobalt",
        DEFAULT: "#2657C7",
        top: "#3E72E0",
        bright: "#8FB4FF",
        dim: "rgba(38,87,199,0.16)",
        on: "#F7F8FA",
    },
    marigold: {
        label: "Marigold",
        DEFAULT: "#E7A22E",
        top: "#EEB454",
        bright: "#FFD37A",
        dim: "rgba(231,162,46,0.18)",
        on: "#0A0D14", // the one spot too light for off-white text — see DESIGN.md
    },
    emerald: {
        label: "Emerald",
        DEFAULT: "#167A4D",
        top: "#219362",
        bright: "#8FE0BB",
        dim: "rgba(22,122,77,0.16)",
        on: "#F7F8FA",
    },
};

/** Deterministic hash → the same shop always lands on the same spot color. */
export function getShopSpot(idOrSlug: string): SpotKey {
    let h = 0;
    for (let i = 0; i < idOrSlug.length; i++) h = (h * 31 + idOrSlug.charCodeAt(i)) >>> 0;
    return SPOT_ORDER[h % SPOT_ORDER.length];
}

/** CSS custom properties a page/card sets inline to carry one shop's spot color. */
export function spotVars(key: SpotKey): CSSProperties {
    const s = SPOTS[key];
    return {
        ["--spot" as any]: s.DEFAULT,
        ["--spot-top" as any]: s.top,
        ["--spot-bright" as any]: s.bright,
        ["--spot-dim" as any]: s.dim,
        ["--spot-on" as any]: s.on,
    } as CSSProperties;
}
