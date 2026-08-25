"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ZoomableImageProps {
    src: string;
    alt?: string;
    /** Classes for the visible thumbnail <img> itself (size, rounding, object-fit, etc.) */
    className?: string;
    /** Classes for the clickable wrapper — usually just `shrink-0`. Defaults to matching the thumbnail's rounding. */
    wrapperClassName?: string;
}

// Small product thumbnails all over the admin (product list, order report, …) are too
// small to make out any detail in. This wraps one in a hover affordance (a magnifying-
// glass icon over a slight dark overlay) and, on click, opens a large preview of the
// same image in a lightbox — without needing every call site to manage its own modal state.
export function ZoomableImage({ src, alt = "", className, wrapperClassName }: ZoomableImageProps) {
    const [open, setOpen] = React.useState(false);
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => setMounted(true), []);

    React.useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
        window.addEventListener("keydown", handler);
        document.body.style.overflow = "hidden";
        return () => { window.removeEventListener("keydown", handler); document.body.style.overflow = ""; };
    }, [open]);

    if (!src) return null;

    return (
        <>
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setOpen(true); }}
                title="Click to enlarge"
                aria-label="Enlarge image"
                className={cn("relative group/zoom block shrink-0 rounded-[inherit] cursor-zoom-in", wrapperClassName)}
            >
                <img src={src} alt={alt} className={className} />
                <span className="absolute inset-0 flex items-center justify-center rounded-[inherit] bg-black/0 group-hover/zoom:bg-black/30 transition-colors">
                    <svg
                        className="w-1/3 h-1/3 min-w-[13px] min-h-[13px] max-w-[22px] max-h-[22px] text-white/0 group-hover/zoom:text-white/90 transition-colors drop-shadow"
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0a7.5 7.5 0 10-10.6 0 7.5 7.5 0 0010.6 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 8v6m3-3H8" />
                    </svg>
                </span>
            </button>

            {mounted && createPortal(
                <AnimatePresence>
                    {open && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6" role="dialog" aria-modal="true">
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
                                onClick={() => setOpen(false)}
                            />
                            <motion.img
                                key={src}
                                src={src}
                                alt={alt}
                                initial={{ opacity: 0, scale: 0.94 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.96 }}
                                transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
                                className="relative max-w-[90vw] max-h-[85vh] object-contain rounded-2xl shadow-2xl"
                            />
                            <button
                                type="button"
                                aria-label="Close image preview"
                                onClick={() => setOpen(false)}
                                className="absolute top-5 right-5 w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
}
