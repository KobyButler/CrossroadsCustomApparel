import * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant =
    | "default" | "success" | "warning" | "danger" | "info"
    | "purple" | "pink" | "orange" | "teal" | "neutral";

// Console system, dark ground: tinted-dark fill + bright text, never a pastel
// pill. `purple`/`pink` keep their prop names for backward compatibility but
// render as non-violet hues (indigo / rose) — no variant renders violet.
const styles: Record<BadgeVariant, string> = {
    default: "bg-white/[0.06]        text-graphite-200      ring-white/10",
    success: "bg-signal-green/10     text-signal-green      ring-signal-green/25",
    warning: "bg-signal-amber/10     text-signal-amber      ring-signal-amber/25",
    danger:  "bg-signal-red/10       text-signal-red        ring-signal-red/25",
    info:    "bg-signal-cyan/10      text-signal-cyan       ring-signal-cyan/25",
    purple:  "bg-[#5b8def]/10        text-[#8fb4ff]         ring-[#5b8def]/25",
    pink:    "bg-[#ff6b8b]/10        text-[#ff9fb3]         ring-[#ff6b8b]/25",
    orange:  "bg-[#ff9142]/10        text-[#ffb073]         ring-[#ff9142]/25",
    teal:    "bg-[#2dd4bf]/10        text-[#5eead4]         ring-[#2dd4bf]/25",
    neutral: "bg-white/[0.04]        text-graphite-300      ring-white/8",
};

const dots: Record<BadgeVariant, string> = {
    default: "bg-graphite-300",
    success: "bg-signal-green",
    warning: "bg-signal-amber",
    danger:  "bg-signal-red",
    info:    "bg-signal-cyan",
    purple:  "bg-[#5b8def]",
    pink:    "bg-[#ff6b8b]",
    orange:  "bg-[#ff9142]",
    teal:    "bg-[#2dd4bf]",
    neutral: "bg-graphite-400",
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: BadgeVariant;
    dot?: boolean;
    size?: "sm" | "md";
}

export function Badge({ variant = "default", dot = false, size = "md", className, children, ...props }: BadgeProps) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 rounded-full ring-1 font-semibold",
                size === "sm" ? "px-2 py-px text-[11px]" : "px-2.5 py-0.5 text-xs",
                styles[variant],
                className
            )}
            {...props}
        >
            {dot && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dots[variant])} />}
            {children}
        </span>
    );
}

export function statusVariant(status: string): BadgeVariant {
    const s = status?.toUpperCase();
    if (s === "FULFILLED" || s === "PAID" || s === "ACTIVE")    return "success";
    if (s === "UNFULFILLED" || s === "PENDING")                  return "warning";
    if (s === "CANCELLED" || s === "FAILED" || s === "INACTIVE") return "danger";
    if (s === "DRAFT")                                           return "default";
    if (s === "PROCESSING" || s === "SUBMITTED")                 return "info";
    if (s === "RECOVERED")                                       return "teal";
    if (s === "ABANDONED")                                       return "orange";
    return "default";
}
