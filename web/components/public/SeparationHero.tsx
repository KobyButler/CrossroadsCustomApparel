"use client";
// The landing hero's signature moment (see DESIGN.md FIRST VIEWPORT / FORM):
// a squeegee drags across the real Crossroads logo, printed in black (the
// exposed screen, not yet inked) — the true full-color logo is already
// there underneath, and the blade's pass is what reveals it, exactly the
// way a real screen-print pull deposits ink through a screen onto a shirt.
// The garment itself is an honest flat silhouette in one solid fabric
// tone — the halftone-separation concept this hero used before is retired
// in favor of dramatizing the actual printing motion instead.
import { useEffect, useRef, useState } from "react";
import { motion, animate } from "framer-motion";
import { RegistrationMark } from "./RegistrationMark";

const BAR_COLORS = ["#487b74", "#4c6383", "#c65f24", "#eeeade"];

// Logo bounding box inside the 320x340 shirt viewBox — square, centered
// roughly where the old emblem sat (cx 160, cy 195).
const LOGO_X = 100;
const LOGO_Y = 105;
const LOGO_SIZE = 115;

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
                {/* Cropped tight around the full garment silhouette (shoulder line at
                    y=85 through hem at y=292, sleeve tip to sleeve tip at x=34..286)
                    plus a slim margin — as tight as the shape can go without losing
                    the collar/shoulder line that reads it as a shirt, centered near
                    the logo (160,195) so the logo lands dead center. */}
                <svg viewBox="24 67 272 246" className="w-full h-full p-5" aria-hidden="true">
                    <defs>
                        <mask id="garmentMask" maskUnits="userSpaceOnUse">
                            <rect width="320" height="340" fill="black" />
                            <g fill="white">
                                <path d="M98,98 L130,85 C138,100 172,100 180,85 L222,98 Q160,126 90,105 Z" />
                                <rect x="85" y="96" width="150" height="196" rx="22" />
                                <polygon points="95,100 34,150 60,190 85,177" />
                                <polygon points="225,100 286,150 260,190 235,177" />
                            </g>
                        </mask>
                        {/* Maps every opaque logo pixel to solid black while keeping its
                            real alpha — the "screen exposed, not yet pulled" state. */}
                        <filter id="toBlack" colorInterpolationFilters="sRGB">
                            <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" />
                        </filter>
                        {/* A soft ambient shadow cast by the garment itself onto the light
                            table beneath it, so it reads as sitting on the surface rather
                            than pasted flat on top of it. */}
                        <filter id="shirtShadow" x="-30%" y="-30%" width="160%" height="160%">
                            <feDropShadow dx="0" dy="9" stdDeviation="7" floodColor="#14161c" floodOpacity="0.28" />
                        </filter>
                        {/* Vertical now (top-to-bottom pull) — the bright stop sits at
                            100%, the blade's bottom/leading edge in the direction of
                            travel. */}
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
                                x={LOGO_X} y={LOGO_Y - 6} width={LOGO_SIZE} height={LOGO_SIZE + 12}
                                transform={`rotate(-90 ${LOGO_X + LOGO_SIZE / 2} ${LOGO_Y + LOGO_SIZE / 2})`}
                            />
                        </clipPath>
                    </defs>

                    {/* Shirt — one honest flat fabric tone, no separations. */}
                    <g mask="url(#garmentMask)" filter="url(#shirtShadow)">
                        <rect width="320" height="340" fill="#AFB4BC" />
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
                            left as the squeegee passes. */}
                        <g clipPath="url(#squeegeeClip)">
                            <image href="/logo.png" x={LOGO_X} y={LOGO_Y} width={LOGO_SIZE} height={LOGO_SIZE} filter="url(#toBlack)" />
                        </g>
                    </motion.g>

                    {/* The squeegee itself — a slight rubber-blade gradient with a
                        bright leading edge, dragging top to bottom in exact sync with
                        the clip boundary above. */}
                    <motion.g
                        initial={{ y: LOGO_Y }}
                        animate={printing ? { y: LOGO_Y + LOGO_SIZE } : {}}
                        transition={sweep}
                    >
                        <motion.rect
                            x={LOGO_X - 14} y={-7} width={LOGO_SIZE + 28} height={14} rx="3"
                            fill="url(#squeegeeBlade)"
                            transform="skewY(-8)"
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

                {/* Color bar — the press sheet's own calibration strip */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                    {BAR_COLORS.map(c => (
                        <span key={c} className="w-3 h-3 rounded-[1px]" style={{ background: c }} />
                    ))}
                </div>
            </div>
        </div>
    );
}
