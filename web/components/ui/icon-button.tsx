"use client";
import * as React from "react";

export type IconButtonTone = "slate" | "brand" | "emerald" | "amber" | "red";

// Prop name kept as "slate"/"brand"/"emerald" for backward compatibility with
// every call site; each now renders the console system's graphite/signal
// equivalent — see DESIGN.md's Locked Palette Rule.
const toneCls: Record<IconButtonTone, string> = {
    slate:   "text-graphite-400 hover:text-graphite-100 hover:bg-white/[0.08]",
    brand:   "text-graphite-400 hover:text-signal-cyan hover:bg-signal-cyan/10",
    emerald: "text-graphite-400 hover:text-signal-green hover:bg-signal-green/10",
    amber:   "text-graphite-400 hover:text-signal-amber hover:bg-signal-amber/10",
    red:     "text-graphite-400 hover:text-signal-red hover:bg-signal-red/10",
};

// Compact icon-only action button for table actions columns — keeps the
// column a fixed, predictable width no matter how many actions a row needs,
// instead of stacking text pills that wrap or crowd out neighboring columns
// as more actions get added. Used consistently across every admin list
// (Shops, Orders, Products, Discounts, Shipping Labels, …) so the "what can I
// do with this row" affordance always looks and behaves the same way.
export function IconButton({
    title, onClick, tone = "slate", disabled = false, loading = false, type = "button", children,
}: {
    title: string;
    onClick?: () => void;
    tone?: IconButtonTone;
    disabled?: boolean;
    loading?: boolean;
    type?: "button" | "submit";
    children: React.ReactNode;
}) {
    return (
        <button type={type} title={title} aria-label={title} onClick={onClick} disabled={disabled || loading}
            className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${toneCls[tone]}`}>
            {loading ? (
                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin opacity-60" />
            ) : children}
        </button>
    );
}

// Row wrapper for a group of IconButtons in a table's actions column — fixed
// gap, right-aligned, never wraps.
export function IconButtonRow({ children }: { children: React.ReactNode }) {
    return <div className="flex items-center justify-end gap-1 shrink-0">{children}</div>;
}
