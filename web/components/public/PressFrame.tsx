"use client";
// The press sheet's own crop marks, fixed to the viewport corners on every
// Print Floor page — the frame a real production sheet always carries.
// Purely structural chrome: it gives the canvas presence at rest (the
// brief's "full, not empty" requirement) without competing with content,
// so it sits low z-index, ignores pointer events, and never moves.
import { RegistrationMark } from "./RegistrationMark";

export function PressFrame() {
    return (
        <div className="fixed inset-0 z-0 pointer-events-none hidden sm:block" aria-hidden="true">
            <RegistrationMark className="absolute top-5 left-5 w-4 h-4 text-plate-700" strokeWidth={1.25} />
            <RegistrationMark className="absolute top-5 right-5 w-4 h-4 text-plate-700" strokeWidth={1.25} />
            <RegistrationMark className="absolute bottom-5 left-5 w-4 h-4 text-plate-700" strokeWidth={1.25} />
            <RegistrationMark className="absolute bottom-5 right-5 w-4 h-4 text-plate-700" strokeWidth={1.25} />
        </div>
    );
}
