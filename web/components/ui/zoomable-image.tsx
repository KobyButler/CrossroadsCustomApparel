"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ImageLightboxProps {
    /** The full set of images to browse. A single-entry array renders with no arrows/counter. */
    images: string[];
    /** Index into `images` currently shown. */
    index: number;
    onIndexChange: (index: number) => void;
    onClose: () => void;
    alt?: string;
}

// The actual full-screen viewer — a controlled component so both ZoomableImage
// (uncontrolled, manages its own open/index state for a single thumbnail) and
// any call site that needs to trigger it from elsewhere (e.g. ImageManager's
// drag-to-reorder thumbnails, where the image itself can't own a click handler)
// can share one implementation and one consistent look.
export function ImageLightbox({ images, index, onIndexChange, onClose, alt = "" }: ImageLightboxProps) {
    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => setMounted(true), []);

    const gallery = images.length > 1 ? images : null;
    const src = images[index];

    const goPrev = React.useCallback(() => {
        if (!gallery) return;
        onIndexChange((index - 1 + gallery.length) % gallery.length);
    }, [gallery, index, onIndexChange]);
    const goNext = React.useCallback(() => {
        if (!gallery) return;
        onIndexChange((index + 1) % gallery.length);
    }, [gallery, index, onIndexChange]);

    React.useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
            else if (e.key === "ArrowLeft") goPrev();
            else if (e.key === "ArrowRight") goNext();
        };
        window.addEventListener("keydown", handler);
        document.body.style.overflow = "hidden";
        return () => { window.removeEventListener("keydown", handler); document.body.style.overflow = ""; };
    }, [goPrev, goNext, onClose]);

    if (!mounted || !src) return null;

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6" role="dialog" aria-modal="true">
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="absolute inset-0 bg-graphite-950/85 backdrop-blur-sm"
                    onClick={onClose}
                />

                {gallery && (
                    <button
                        type="button"
                        aria-label="Previous image"
                        onClick={(e) => { e.stopPropagation(); goPrev(); }}
                        className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                )}

                <motion.img
                    key={src}
                    src={src}
                    alt={alt}
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
                    className="relative max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-console-hover"
                />

                {gallery && (
                    <button
                        type="button"
                        aria-label="Next image"
                        onClick={(e) => { e.stopPropagation(); goNext(); }}
                        className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </button>
                )}

                {gallery && (
                    <span className="absolute bottom-5 left-1/2 -translate-x-1/2 text-xs font-mono font-medium text-white/70 bg-white/10 border border-white/15 rounded-full px-3 py-1 backdrop-blur-sm">
                        {index + 1} / {gallery.length}
                    </span>
                )}

                <button
                    type="button"
                    aria-label="Close image preview"
                    onClick={onClose}
                    className="absolute top-5 right-5 w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </AnimatePresence>,
        document.body
    );
}

interface ZoomableImageProps {
    src: string;
    alt?: string;
    /** Classes for the visible thumbnail <img> itself (size, rounding, object-fit, etc.) */
    className?: string;
    /** Classes for the clickable wrapper — usually just `shrink-0`. Defaults to matching the thumbnail's rounding. */
    wrapperClassName?: string;
    /**
     * The full set of images this thumbnail belongs to (e.g. every photo on a
     * product), so the lightbox can offer prev/next navigation instead of
     * showing just this one picture in isolation. `src` should be one of the
     * entries in `images` — if omitted, or only one image is passed, the
     * lightbox behaves exactly like a single static image (no arrows).
     */
    images?: string[];
    /** Index into `images` that this thumbnail represents. Defaults to the position of `src` within `images`, or 0. */
    startIndex?: number;
}

// Small product thumbnails all over the admin (product list, order report, …) are too
// small to make out any detail in. This wraps one in a hover affordance (a magnifying-
// glass icon over a slight dark overlay) and, on click, opens a large preview of the
// same image via ImageLightbox — without needing every call site to manage its own
// modal state. When a gallery (`images`) is passed, the lightbox also gets prev/next
// arrows, left/right-arrow-key navigation, and a position counter.
export function ZoomableImage({ src, alt = "", className, wrapperClassName, images, startIndex }: ZoomableImageProps) {
    const gallery = images && images.length > 0 ? images : [src];
    const initialIndex = images
        ? (startIndex ?? Math.max(0, images.indexOf(src)))
        : 0;

    const [open, setOpen] = React.useState(false);
    const [index, setIndex] = React.useState(initialIndex);

    if (!src) return null;

    function handleOpen(e: React.SyntheticEvent) {
        e.stopPropagation();
        setIndex(initialIndex);
        setOpen(true);
    }

    return (
        <>
            <button
                type="button"
                onClick={handleOpen}
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

            {open && (
                <ImageLightbox images={gallery} index={index} onIndexChange={setIndex} onClose={() => setOpen(false)} alt={alt} />
            )}
        </>
    );
}
