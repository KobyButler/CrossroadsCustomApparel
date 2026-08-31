"use client";
// "The Gear Drop" — the storefront's stencil-stamped button. Same interface
// as components/ui/button.tsx (the console system's Button) so call sites
// swap one import; the admin Button is untouched and unrelated to this file.
import * as React from "react";
import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";

export type GearButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
export type GearButtonSize = "xs" | "sm" | "md" | "lg";

interface GearButtonProps extends Omit<HTMLMotionProps<"button">, "size" | "children"> {
    variant?: GearButtonVariant;
    size?: GearButtonSize;
    loading?: boolean;
    icon?: React.ReactNode;
    children?: React.ReactNode;
}

// Gold (stencil-gold) is the one accent light enough to need dark ink text
// instead of paper-cream — see the contrast note in tailwind.config.js.
const variants: Record<GearButtonVariant, string> = {
    primary: "stencil-btn stencil-btn-primary console-sheen",
    secondary: "stencil-btn stencil-btn-secondary",
    outline: "stencil-btn border-2 border-crate-plywood-dark bg-transparent text-crate-ink hover:bg-crate-paper-deep hover:border-stencil-teal/50",
    ghost: "stencil-btn stencil-btn-ghost",
    danger: "stencil-btn bg-stencil-red text-crate-paper hover:bg-stencil-red-bright",
    success: "stencil-btn bg-stencil-green text-crate-paper hover:bg-stencil-green-bright",
};

const sizes: Record<GearButtonSize, string> = {
    xs: "h-7  px-2.5 text-xs  gap-1.5",
    sm: "h-8  px-3   text-xs  gap-1.5",
    md: "h-9  px-4   text-sm  gap-2",
    lg: "h-11 px-5   text-sm  gap-2",
};

export function GearButton({
    variant = "primary",
    size = "md",
    loading = false,
    icon,
    className,
    children,
    disabled,
    type = "button",
    ...props
}: GearButtonProps) {
    return (
        <motion.button
            type={type}
            whileTap={{ scale: 0.97 }}
            whileHover={{ y: -1 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            disabled={disabled || loading}
            className={cn(
                "inline-flex items-center justify-center font-gear font-bold select-none cursor-pointer",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
                "focus-visible:ring-2 focus-visible:ring-stencil-teal focus-visible:ring-offset-2 focus-visible:ring-offset-crate-paper",
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
