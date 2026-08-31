"use client";
// A product/shop preview tile rendered like a film positive on a backlit
// light table — the signature object of "The Print Floor" (see DESIGN.md).
// Renders as a single element so its registration crosshair (.separation-
// card::before/::after in globals.css) lands correctly relative to its own
// box. Unlike the retired tag-card, nothing here tilts — depth comes from
// the light-table glow intensifying and the crosshair snapping into
// register on hover.
import * as React from "react";
import { cn } from "@/lib/utils";

export function SeparationCard({
    interactive = true,
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
    return (
        <div
            className={cn("separation-card", interactive && "separation-card-interactive", className)}
            {...props}
        >
            {children}
        </div>
    );
}
