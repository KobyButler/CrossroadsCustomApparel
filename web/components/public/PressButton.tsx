"use client";
// "The Print Floor" — the storefront's registered, precision-cut button.
// Same interface as components/ui/button.tsx (the console system's Button)
// so call sites swap one import; the admin Button is untouched and
// unrelated to this file. Color rides on --spot/--spot-top/--spot-on/
// --spot-dim, set by lib/spot.ts wherever a shop's own ink applies —
// fall back to crimson (the platform's own ink) outside any shop context.
import * as React from "react";
import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";

export type PressButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
export type PressButtonSize = "xs" | "sm" | "md" | "lg";

interface PressButtonProps extends Omit<HTMLMotionProps<"button">, "size" | "children"> {
    variant?: PressButtonVariant;
    size?: PressButtonSize;
    loading?: boolean;
    icon?: React.ReactNode;
    children?: React.ReactNode;
}

const variants: Record<PressButtonVariant, string> = {
    primary: "press-btn press-btn-primary console-sheen",
    secondary: "press-btn press-btn-secondary",
    outline: "press-btn border-2 border-plate-700 bg-transparent text-plate-100 hover:bg-plate-800 hover:border-proc-cyan/50",
    ghost: "press-btn press-btn-ghost",
    danger: "press-btn bg-[#C93420] text-[#F7F8FA] hover:bg-[#DE4A34]",
    success: "press-btn bg-[#167A4D] text-[#F7F8FA] hover:bg-[#219362]",
};

const sizes: Record<PressButtonSize, string> = {
    xs: "h-7  px-2.5 text-xs  gap-1.5",
    sm: "h-8  px-3   text-xs  gap-1.5",
    md: "h-9  px-4   text-sm  gap-2",
    lg: "h-11 px-5   text-sm  gap-2",
};

export function PressButton({
    variant = "primary",
    size = "md",
    loading = false,
    icon,
    className,
    children,
    disabled,
    type = "button",
    style,
    ...props
}: PressButtonProps) {
    // No inline --spot default here on purpose: an inline style on this
    // element would shadow a --spot inherited from a shop-context ancestor
    // (see lib/spot.ts), even though it's less specific. The CSS var()
    // fallback in .press-btn-primary (globals.css) supplies the platform's
    // own crimson ink when no shop context is present instead.
    return (
        <motion.button
            type={type}
            whileTap={{ scale: 0.97 }}
            whileHover={{ y: -1 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            disabled={disabled || loading}
            style={style}
            className={cn(
                "inline-flex items-center justify-center font-press font-bold select-none cursor-pointer",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
                "focus-visible:ring-2 focus-visible:ring-proc-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-plate-950",
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        >
            {loading ? (
                <svg className="animate-spin w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            ) : icon ? (
                <span className="shrink-0 flex items-center">{icon}</span>
            ) : null}
            {children}
        </motion.button>
    );
}
