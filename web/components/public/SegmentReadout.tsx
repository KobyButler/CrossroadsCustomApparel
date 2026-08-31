"use client";
// A true seven-segment digit mask — ghost (unlit) cells included — for the
// shop-closing countdown and live order ticker. This is the raise this
// direction kept from the seven-segment-totem challenger: numbers that
// matter (a countdown, a live count) render as real segment glyphs, not
// just bold numerals, while every other UI face reads in plain type. See
// .segment-cell in globals.css and DESIGN.md.
import * as React from "react";

const DIGIT_SEGMENTS: Record<string, string[]> = {
    "0": ["a", "b", "c", "d", "e", "f"],
    "1": ["b", "c"],
    "2": ["a", "b", "g", "e", "d"],
    "3": ["a", "b", "g", "c", "d"],
    "4": ["f", "g", "b", "c"],
    "5": ["a", "f", "g", "c", "d"],
    "6": ["a", "f", "g", "e", "c", "d"],
    "7": ["a", "b", "c"],
    "8": ["a", "b", "c", "d", "e", "f", "g"],
    "9": ["a", "b", "c", "d", "f", "g"],
    "-": ["g"],
};

const SEGMENTS = ["a", "b", "c", "d", "e", "f", "g"] as const;

function DigitCell({ char, pulse }: { char: string; pulse?: boolean }) {
    const lit = new Set(DIGIT_SEGMENTS[char] ?? []);
    return (
        <span className={`segment-cell${pulse ? " pulse" : ""}`} aria-hidden="true">
            {SEGMENTS.map(s => (
                <span key={s} className={`seg seg-${s}${lit.has(s) ? " on" : ""}`} />
            ))}
        </span>
    );
}

/**
 * Renders `value` (digits, and ":" for a colon separator) as a row of
 * seven-segment cells. `color` sets --seg-color for the lit strokes/glow.
 * Always pair with a plain-text sr-only label — the segment mask is
 * decorative typography, not the accessible name.
 */
export function SegmentReadout({
    value,
    color = "#00AEEF",
    pulse = false,
    label,
    className = "",
}: {
    value: string;
    color?: string;
    pulse?: boolean;
    label?: string;
    className?: string;
}) {
    return (
        <span
            className={`inline-flex items-end font-spec text-2xl ${className}`}
            style={{ ["--seg-color" as any]: color }}
            role="img"
            aria-label={label ?? value}
        >
            {value.split("").map((ch, i) =>
                ch === ":" ? (
                    <span key={i} className="inline-flex flex-col justify-center gap-[0.14em] w-[0.22em] h-[1em] mx-[0.06em] shrink-0" aria-hidden="true">
                        <span className="block w-[0.16em] h-[0.16em] rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
                        <span className="block w-[0.16em] h-[0.16em] rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
                    </span>
                ) : (
                    <DigitCell key={i} char={ch} pulse={pulse} />
                )
            )}
        </span>
    );
}
