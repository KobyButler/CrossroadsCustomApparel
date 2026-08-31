"use client";
// A product/shop preview tile styled like a kraft luggage tag — the
// signature object of "The Gear Drop" (see DESIGN.md). Renders as a single
// element so CSS nth-child scatter-tilt (.tag-card) lands correctly against
// its siblings in a grid.
import * as React from "react";
import { cn } from "@/lib/utils";

export function TagCard({
    interactive = true,
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
    return (
        <div
            className={cn("tag-card", interactive && "tag-card-interactive", className)}
            {...props}
        >
            {children}
        </div>
    );
}
