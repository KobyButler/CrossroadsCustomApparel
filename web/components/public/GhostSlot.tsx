"use client";
// A dashed, unfilled slot in a shop grid — real production floors run
// multiple jobs on one light table at once, and an empty slot reads as
// "next job goes here," not as missing content. Fills a sparse grid
// honestly (no fabricated shops) instead of leaving bare dark canvas.
import { RegistrationMark } from "./RegistrationMark";

export function GhostSlot({ label = "Next job opening soon", className = "" }: { label?: string; className?: string }) {
    return (
        <div className={`rounded-[0.625rem] border border-dashed border-plate-700 flex flex-col items-center justify-center text-center gap-2 py-10 px-5 min-h-[180px] ${className}`}>
            <RegistrationMark className="w-6 h-6 text-plate-600" strokeWidth={1.25} />
            <p className="text-xs font-spec uppercase tracking-wider text-plate-500">{label}</p>
        </div>
    );
}
