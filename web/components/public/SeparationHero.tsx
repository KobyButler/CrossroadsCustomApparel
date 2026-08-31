"use client";
// The landing hero's signature moment (see DESIGN.md FIRST VIEWPORT / FORM):
// a garment illustration reconstitutes itself from four misregistered CMYK
// halftone separations snapping into alignment on a glowing light table —
// dramatizing the actual mechanism (everything here really is decorated
// in-house, screen by screen) in one unbroken beat, closed by a single
// exposure-unit flash. All artwork is authored, flat-schematic illustration
// (a tech-pack-style garment diagram) — no photography is implied.
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RegistrationMark } from "./RegistrationMark";

const CHANNELS = [
    { id: "cyan", color: "#00AEEF", angle: 15, from: { x: -20, y: -12 } },
    { id: "magenta", color: "#EC008C", angle: 75, from: { x: 18, y: -14 } },
    { id: "yellow", color: "#D6C400", angle: 0, from: { x: -16, y: 16 } },
    { id: "key", color: "#12151A", angle: 45, from: { x: 20, y: 14 } },
] as const;

const BAR_COLORS = ["#00AEEF", "#EC008C", "#FFE800", "#0A0D14"];

export function SeparationHero() {
    const [assembled, setAssembled] = useState(false);
    const [flash, setFlash] = useState(false);

    useEffect(() => {
        const t1 = setTimeout(() => setAssembled(true), 450);
        const t2 = setTimeout(() => setFlash(true), 450 + 4 * 120 + 700);
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
                <svg viewBox="0 0 320 340" className="w-full h-full p-8" aria-hidden="true">
                    <defs>
                        <mask id="garmentMask" maskUnits="userSpaceOnUse">
                            <rect width="320" height="340" fill="black" />
                            <g fill="white">
                                {/* hood */}
                                <path d="M118,72 Q160,22 202,72 L214,102 Q160,80 106,102 Z" />
                                {/* body */}
                                <rect x="85" y="96" width="150" height="196" rx="22" />
                                {/* sleeves */}
                                <polygon points="85,112 34,100 45,197 85,177" />
                                <polygon points="235,112 286,100 275,197 235,177" />
                            </g>
                            {/* pocket seam + drawstrings cut back out as darker (still mid-gray = partial) — keep simple: skip subtractive detail, mask stays solid silhouette */}
                        </mask>
                        {CHANNELS.map(c => (
                            <pattern key={c.id} id={`dots-${c.id}`} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform={`rotate(${c.angle})`}>
                                <rect width="9" height="9" fill="white" />
                                <circle cx="4.5" cy="4.5" r="2.9" fill={c.color} />
                            </pattern>
                        ))}
                        <clipPath id="emblemClip">
                            <circle cx="160" cy="195" r="44" />
                        </clipPath>
                    </defs>

                    {CHANNELS.map((c, i) => (
                        <motion.g
                            key={c.id}
                            mask="url(#garmentMask)"
                            style={{ mixBlendMode: "multiply" }}
                            initial={{ x: c.from.x, y: c.from.y, opacity: 0.6 }}
                            animate={assembled ? { x: 0, y: 0, opacity: 1 } : {}}
                            transition={{ duration: 0.85, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <rect x="0" y="0" width="320" height="340" fill={`url(#dots-${c.id})`} />
                        </motion.g>
                    ))}

                    {/* Emblem — a registration-mark ring holding a mountain skyline,
                        the chest print. Drawn last so it stays crisp (not halftoned)
                        as the "already registered" reference the four channels
                        converge toward. */}
                    <motion.g
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={assembled ? { opacity: 1, scale: 1 } : {}}
                        transition={{ duration: 0.5, delay: 0.12 * 4 + 0.3, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <circle cx="160" cy="195" r="44" fill="none" stroke="#12151A" strokeWidth="2" />
                        <g clipPath="url(#emblemClip)">
                            <circle cx="160" cy="168" r="7" fill="#E7A22E" />
                            <polygon points="118,214 138,182 152,200 174,164 202,214" fill="#12151A" />
                        </g>
                        <line x1="160" y1="139" x2="160" y2="151" stroke="#12151A" strokeWidth="2" />
                        <line x1="160" y1="239" x2="160" y2="251" stroke="#12151A" strokeWidth="2" />
                        <line x1="105" y1="195" x2="117" y2="195" stroke="#12151A" strokeWidth="2" />
                        <line x1="203" y1="195" x2="215" y2="195" stroke="#12151A" strokeWidth="2" />
                    </motion.g>
                </svg>

                {flash && <motion.div className="exposure-flash-overlay" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.85, 0] }} transition={{ duration: 0.5 }} />}

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
