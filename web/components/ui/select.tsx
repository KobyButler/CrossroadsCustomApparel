import * as React from "react";
import { cn } from "@/lib/utils";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
}

export function Select({ label, error, className, id, children, ...props }: SelectProps) {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
        <div className={cn("w-full", className)}>
            {label && (
                <label htmlFor={selectId} className="mb-1.5 block text-xs font-semibold text-graphite-200">
                    {label}
                </label>
            )}
            <div className="relative">
                <select
                    id={selectId}
                    className={cn(
                        "w-full appearance-none rounded-md border bg-white/[0.03] text-sm text-white",
                        "pr-9 px-3 py-2.5 transition-all duration-200 cursor-pointer",
                        "shadow-[var(--dot-glow)] hover:shadow-[var(--dot-glow-hover)]",
                        "focus:outline-none focus:ring-2 focus:ring-signal-cyan/30 focus:border-signal-cyan/60",
                        "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-white/[0.02]",
                        error
                            ? "border-signal-red/40"
                            : "border-white/10 hover:border-white/20"
                    )}
                    {...props}
                >
                    {children}
                </select>
                {/* chevron */}
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-graphite-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                </span>
            </div>
            {error && <p className="mt-1 text-xs text-signal-red">{error}</p>}
        </div>
    );
}
