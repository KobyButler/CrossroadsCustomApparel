"use client";
// The landing hero's signature moment (see DESIGN.md FIRST VIEWPORT / FORM):
// a squeegee drags across the real Crossroads logo, printed in black (the
// exposed screen, not yet inked) — the true full-color logo is already
// there underneath, and the blade's pass is what reveals it, exactly the
// way a real screen-print pull deposits ink through a screen onto a shirt.
// The garment is a real product photo (public/TSHIRT.webp, a flat-lay
// blank tee with genuine alpha transparency around it) rather than a
// hand-drawn silhouette — swapped in by explicit request; the coordinate
// system below (LOGO_X/Y/SIZE, the viewBox, the shadow filter) is all
// measured against that photo's own 832x832 pixel space, found by
// scanning its alpha channel for the collar/sleeve/torso geometry rather
// than eyeballed.
import { useEffect, useRef, useState } from "react";
import { motion, animate } from "framer-motion";
import { RegistrationMark } from "./RegistrationMark";

const BAR_COLORS = ["#487b74", "#4c6383", "#c65f24", "#eeeade"];

// The photo's torso column is flat and stable (left≈184, right≈656,
// center≈420) from about y=405 down to the hem at y=750, well clear of
// the sleeves both above and beside it. The print sits centered on that
// column, starting just below the collar/shoulder transition.
const LOGO_X = 270;
const LOGO_Y = 200;
const LOGO_SIZE = 300;

const sweep = { duration: 1.05, ease: [0.45, 0.05, 0.55, 0.95] as [number, number, number, number] };

export function SeparationHero() {
    const [printing, setPrinting] = useState(false);
    const [flash, setFlash] = useState(false);
    const clipRectRef = useRef<SVGRectElement>(null);

    useEffect(() => {
        const t1 = setTimeout(() => {
            setPrinting(true);
            // Framer's own declarative animate/initial on a <clipPath> child
            // silently never took effect here — confirmed via a DOM probe
            // (the attribute lands correctly, `<clipPath>` just never
            // re-clips from it) even though the identical width value set
            // via a plain setAttribute call (verified in isolation) works
            // every time. Driving it through Framer's imperative animate()
            // with a ref + setAttribute sidesteps whatever that automatic
            // path is doing wrong, while keeping the exact same easing/
            // timing as everything else in this sweep.
            animate(LOGO_SIZE, 0, {
                duration: sweep.duration,
                ease: sweep.ease,
                onUpdate: (v) => clipRectRef.current?.setAttribute("width", String(v)),
            });
        }, 500);
        const t2 = setTimeout(() => setFlash(true), 500 + 1100);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, []);

    return (
        <div className="relative w-full max-w-md mx-auto">
            <div
                className="relative aspect-[4/3.6] rounded-2xl overflow-hidden"
                style={{
                    background: "linear-gradient(165deg, #FBFAF7 0%, #E9EBEF 100%)",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.6), 0 0 70px -6px rgba(247,248,250,0.4), 0 40px 70px -24px rgba(0,0,0,0.75)",
                }}
            >
                {/* The photo's own alpha bbox is x:[10,822] y:[86,750] (812x664,
                    aspect 1.22 — close to this card's own 4/3.6≈1.11), so a small
                    padding around the full bbox both keeps the whole garment in
                    frame (collar through hem, sleeve tip to sleeve tip) and reads
                    as a confident, filled close-up rather than a small product
                    thumbnail floating in empty space. */}
                <svg viewBox="-4 44 828 748" className="w-full h-full p-5" aria-hidden="true">
                    <defs>
                        {/* Maps every opaque logo pixel to solid black while keeping its
                            real alpha — the "screen exposed, not yet pulled" state. */}
                        <filter id="toBlack" colorInterpolationFilters="sRGB">
                            <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" />
                        </filter>
                        {/* A soft ambient shadow cast by the garment itself onto the light
                            table beneath it, so it reads as sitting on the surface rather
                            than pasted flat on top of it. Scaled up from the old hand-
                            drawn version's values to match this photo's much larger
                            (832x832) coordinate space. */}
                        <filter id="shirtShadow" x="-30%" y="-30%" width="160%" height="160%">
                            <feDropShadow dx="0" dy="18" stdDeviation="14" floodColor="#14161c" floodOpacity="0.3" />
                        </filter>
                        {/* Vertical (top-to-bottom pull) — the bright stop sits at 100%,
                            the blade's bottom/leading edge in the direction of travel. */}
                        <linearGradient id="squeegeeBlade" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3A3D42" />
                            <stop offset="35%" stopColor="#0A0A0C" />
                            <stop offset="82%" stopColor="#0A0A0C" />
                            <stop offset="100%" stopColor="#F7F8FA" />
                        </linearGradient>
                        {/* Confirmed via a DOM probe across several isolated tests: a
                            <clipPath> child driven by Framer's own declarative
                            animate/initial silently never re-clips in this browser,
                            for ANY animated geometry attribute (x, y, and eventually
                            width all reproduced it) — the attribute lands correctly on
                            the element, the clip just never recomputes from it. A
                            hand-written <rect> whose width is mutated via plain
                            setAttribute (verified in an isolated static-HTML test) DOES
                            re-clip correctly every time. So this rect is a plain (non-
                            motion) element; its width is driven imperatively from the
                            useEffect below via Framer's animate() + a ref +
                            setAttribute, keeping the same easing/timing as everything
                            else in the sweep while sidestepping whatever the automatic
                            path does wrong. x stays static (LOGO_X, a real attribute
                            since it's a plain prop) so only the right edge retreats as
                            width shrinks: right clears first, left clears last.
                            Rotating that -90° around the logo's own center turns
                            "right clears first" into "top clears first" — i.e.
                            top-to-bottom. */}
                        <clipPath id="squeegeeClip">
                            <rect
                                ref={clipRectRef}
                                x={LOGO_X} y={LOGO_Y - 10} width={LOGO_SIZE} height={LOGO_SIZE + 20}
                                transform={`rotate(-90 ${LOGO_X + LOGO_SIZE / 2} ${LOGO_Y + LOGO_SIZE / 2})`}
                            />
                        </clipPath>
                    </defs>

                    {/* Shirt — the real product photo, alpha-cut, casting its own
                        soft shadow onto the card. */}
                    <g filter="url(#shirtShadow)">
                        <image href="/TSHIRT.webp" x="0" y="0" width="832" height="832" />
                    </g>

                    {/* The printed logo group — the true full-color logo underneath
                        plus the black "unprinted screen" layer clipped away on top —
                        settles with a small "stamped down" bounce once the pass
                        completes. */}
                    <motion.g
                        initial={{ scale: 1 }}
                        animate={printing ? { scale: [1, 1, 1.04, 1] } : {}}
                        transition={{ duration: 0.4, delay: sweep.duration, ease: [0.16, 1, 0.3, 1], times: [0, 0.85, 0.93, 1] }}
                        style={{ transformOrigin: `${LOGO_X + LOGO_SIZE / 2}px ${LOGO_Y + LOGO_SIZE / 2}px` }}
                    >
                        {/* The true full-color logo sits underneath the whole time —
                            the blade doesn't paint it in, it just uncovers what's
                            already there. */}
                        <image href="/logo.png" x={LOGO_X} y={LOGO_Y} width={LOGO_SIZE} height={LOGO_SIZE} />

                        {/* The black "unprinted screen" layer, clipped away from the
                            top as the squeegee passes. */}
                        <g clipPath="url(#squeegeeClip)">
                            <image href="/logo.png" x={LOGO_X} y={LOGO_Y} width={LOGO_SIZE} height={LOGO_SIZE} filter="url(#toBlack)" />
                        </g>
                    </motion.g>

                    {/* The squeegee itself — a slight rubber-blade gradient with a
                        bright leading edge, dragging top to bottom in exact sync with
                        the clip boundary above. Held perfectly flat/horizontal by
                        explicit request (no skew), instead of a printer's usual
                        drag-angle lean. */}
                    <motion.g
                        initial={{ y: LOGO_Y }}
                        animate={printing ? { y: LOGO_Y + LOGO_SIZE } : {}}
                        transition={sweep}
                    >
                        <motion.rect
                            x={LOGO_X - 20} y={-11} width={LOGO_SIZE + 40} height={22} rx="5"
                            fill="url(#squeegeeBlade)"
                            initial={{ opacity: 0 }}
                            animate={printing ? { opacity: [0, 1, 1, 0] } : {}}
                            transition={{ ...sweep, times: [0, 0.08, 0.92, 1] }}
                        />
                    </motion.g>
                </svg>

                {flash && <motion.div className="exposure-flash-overlay" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.55, 0] }} transition={{ duration: 0.4 }} />}

                {/* Corner registration marks — the light table's own crop marks */}
                <RegistrationMark className="absolute top-3 left-3 w-4 h-4 text-plate-600" strokeWidth={1.25} />
                <RegistrationMark className="absolute top-3 right-3 w-4 h-4 text-plate-600" strokeWidth={1.25} />
                <RegistrationMark className="absolute bottom-3 left-3 w-4 h-4 text-plate-600" strokeWidth={1.25} />
                <RegistrationMark className="absolute bottom-3 right-3 w-4 h-4 text-plate-600" strokeWidth={1.25} />

                {/* Color bar — the press sheet's own calibration strip. A thin
                    border keeps every swatch legible against the card's own
                    off-white ground — without it, the palest swatch (#eeeade)
                    all but disappears into the background. */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                    {BAR_COLORS.map(c => (
                        <span key={c} className="w-3 h-3 rounded-[1px] border border-black/15" style={{ background: c }} />
                    ))}
                </div>
            </div>
        </div>
    );
}
