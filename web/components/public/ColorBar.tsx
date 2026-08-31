"use client";
// A printer's calibration color-bar mark, standing in for status/urgency
// ("CLOSES IN 3D", item counts, "secure checkout"). See .colorbar-badge in
// globals.css and DESIGN.md. Unlike the retired rubber ink-stamp, this one
// never tilts — see the Nothing-Tilts rule.
import * as React from "react";
import { cn } from "@/lib/utils";
import { SPOTS, spotVars, type SpotKey } from "@/lib/spot";

// "cyan"/"magenta"/"yellow" read the fixed process-mark colors — reserve
// them for genuinely technical chrome (a calibration strip, a status tied
// to press mechanics), never as decorative category tags; see the
// Process-Marks-Are-Chrome rule in DESIGN.md. For an expressive/categorical
// badge (a service, a shop's own identity), pass `spotKey` instead — those
// four colors are meant to carry variety.
export type ColorBarTone = "cyan" | "magenta" | "yellow" | "spot" | "muted";

const tones: Record<ColorBarTone, string> = {
    cyan:    "text-proc-cyan bg-proc-cyan/10",
    magenta: "text-proc-magenta bg-proc-magenta/10",
    yellow:  "text-proc-yellow bg-proc-yellow/10",
    spot:    "text-[var(--spot-bright,#FF8A73)] bg-[var(--spot-dim,rgba(201,52,32,0.16))]",
    muted:   "text-plate-300 bg-plate-700/40",
};

export function ColorBar({
    tone = "muted",
    spotKey,
    className,
    style,
    children,
    ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: ColorBarTone; spotKey?: SpotKey }) {
    const resolvedTone = spotKey ? "spot" : tone;
    const spotStyle = spotKey ? spotVars(spotKey) : undefined;
    return (
        <span
            className={cn("colorbar-badge", tones[resolvedTone], className)}
            style={{ color: spotKey ? SPOTS[spotKey].bright : undefined, ...spotStyle, ...style }}
            {...props}
        >
            {children}
        </span>
    );
}
