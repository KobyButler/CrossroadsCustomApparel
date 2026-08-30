"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
export type ButtonSize = "xs" | "sm" | "md" | "lg";

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "size" | "children"> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    icon?: React.ReactNode;
    children?: React.ReactNode;
}

const variants: Record<ButtonVariant, string> = {
    primary:
        "bg-signal-cyan-gradient text-graphite-950 shadow-glow-cyan-sm " +
        "hover:shadow-glow-cyan console-sheen",
    secondary:
        "bg-white/[0.06] text-graphite-100 ring-1 ring-white/10 hover:bg-white/[0.10] hover:ring-white/20",
    outline:
        "border border-white/15 bg-transparent text-graphite-200 " +
        "hover:border-signal-cyan/40 hover:text-signal-cyan hover:bg-signal-cyan/[0.06]",
    ghost:
        "text-graphite-300 hover:bg-white/[0.06] hover:text-white",
    danger:
        "bg-signal-red text-graphite-950 hover:shadow-glow-red",
    success:
        "bg-signal-green text-graphite-950 hover:shadow-glow-green",
};

const sizes: Record<ButtonSize, string> = {
    xs: "h-7  px-2.5 text-xs  gap-1.5 rounded-md",
    sm: "h-8  px-3   text-xs  gap-1.5 rounded-md",
    md: "h-9  px-4   text-sm  gap-2   rounded-md",
    lg: "h-11 px-5   text-sm  gap-2   rounded-lg",
};

export function Button({
    variant = "primary",
    size = "md",
    loading = false,
    icon,
    className,
    children,
    disabled,
    type = "button",
    ...props
}: ButtonProps) {
    return (
        <motion.button
            type={type}
            whileTap={{ scale: 0.96 }}
            whileHover={{ y: -1 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            disabled={disabled || loading}
            className={cn(
                "inline-flex items-center justify-center font-semibold",
                "transition-[color,background-color,border-color,box-shadow] duration-200 select-none cursor-pointer",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
                "focus-visible:ring-2 focus-visible:ring-signal-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-graphite-950",
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
