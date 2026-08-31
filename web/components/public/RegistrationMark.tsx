"use client";
// A reusable pre-press registration crosshair (⊕) — the recurring mark this
// world uses wherever the retired kraft world used a rubber stamp or a
// twine loop: section markers, How-It-Works stops, spec-panel corners. See
// DESIGN.md.
import * as React from "react";

export function RegistrationMark({ className = "w-5 h-5", strokeWidth = 1.5 }: { className?: string; strokeWidth?: number }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth={strokeWidth} />
            <path d="M12 1v6M12 17v6M1 12h6M17 12h6" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
        </svg>
    );
}
