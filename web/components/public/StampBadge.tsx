"use client";
// A rubber ink-stamp mark for status/urgency — "OPEN", "RUSH", item counts,
// size tags. See .stamp-badge in globals.css and DESIGN.md. Gold carries
// dark ink text (it's the one accent too light for paper-cream text); the
// other three tones carry paper-cream text — see the contrast note in
// tailwind.config.js.
import * as React from "react";
import { cn } from "@/lib/utils";

export type StampTone = "red" | "gold" | "teal" | "green" | "ink";

const tones: Record<StampTone, string> = {
    red:  "text-stencil-red bg-stencil-red/10",
    gold: "text-stencil-gold-dim bg-stencil-gold/15",
    teal: "text-stencil-teal bg-stencil-teal/10",
    green:"text-stencil-green bg-stencil-green/10",
    ink:  "text-crate-ink-soft bg-crate-plywood/25",
};

export function StampBadge({
    tone = "ink",
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: StampTone }) {
    return (
        <span className={cn("stamp-badge", tones[tone], className)} {...props}>
            {children}
        </span>
    );
}
