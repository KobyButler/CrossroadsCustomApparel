import * as React from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
    leftIcon?: React.ReactNode;
}

export function Input({ label, error, hint, leftIcon, className, id, ...props }: InputProps) {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
        <div className="w-full">
            {label && (
                <label htmlFor={inputId} className="console-label mb-1.5 block normal-case tracking-normal text-xs font-semibold text-graphite-200">
                    {label}
                    {props.required && <span className="text-signal-cyan ml-0.5">*</span>}
                </label>
            )}
            <div className="relative">
                {leftIcon && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-graphite-500 pointer-events-none">
                        {leftIcon}
                    </span>
                )}
                <input
                    id={inputId}
                    className={cn(
                        "w-full rounded-md border bg-white/[0.03] text-sm text-white",
                        "placeholder:text-graphite-500 transition-all duration-200",
                        "focus:outline-none focus:ring-2 focus:ring-signal-cyan/30 focus:border-signal-cyan/60",
                        "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-white/[0.02]",
                        error
                            ? "border-signal-red/40 focus:ring-signal-red/30 focus:border-signal-red/60"
                            : "border-white/10 hover:border-white/20",
                        leftIcon ? "pl-9 pr-3 py-2.5" : "px-3 py-2.5",
                        className
                    )}
                    {...props}
                />
            </div>
            {error && <p className="mt-1 text-xs text-signal-red">{error}</p>}
            {hint && !error && <p className="mt-1 text-xs text-graphite-300">{hint}</p>}
        </div>
    );
}
