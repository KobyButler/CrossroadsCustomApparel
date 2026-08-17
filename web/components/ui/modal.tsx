"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    size?: "sm" | "md" | "lg" | "xl";
    children: React.ReactNode;
}

const sizes = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
};

export function Modal({ open, onClose, title, description, size = "md", children }: ModalProps) {
    React.useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, onClose]);

    // Prevent body scroll
    React.useEffect(() => {
        if (open) document.body.style.overflow = "hidden";
        else document.body.style.overflow = "";
        return () => { document.body.style.overflow = ""; };
    }, [open]);

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:static print:block print:p-0">
                    {/* Backdrop — decorative only, not needed on a printed page */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm print:hidden"
                        onClick={onClose}
                    />

                    {/* Panel — un-clip from the viewport and let content flow fully when printing,
                        so a scrolled-past item list isn't silently cut off the printout. */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.93, y: 12 }}
                        animate={{ opacity: 1, scale: 1,    y: 0  }}
                        exit={{   opacity: 0, scale: 0.95,  y: 8  }}
                        transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                        className={cn(
                            "relative w-full bg-white rounded-2xl shadow-modal",
                            "ring-1 ring-black/8 flex flex-col",
                            sizes[size],
                            "max-h-[90vh]",
                            "print:max-h-none print:shadow-none print:ring-0 print:rounded-none"
                        )}
                    >
                        {/* Header */}
                        {(title || description) && (
                            <div className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
                                {title && (
                                    <h2 className="text-base font-bold text-slate-900 leading-snug">
                                        {title}
                                    </h2>
                                )}
                                {description && (
                                    <p className="text-sm text-slate-500 mt-0.5">{description}</p>
                                )}
                            </div>
                        )}

                        {/* Close button */}
                        <button
                            type="button"
                            aria-label="Close modal"
                            onClick={onClose}
                            className={cn(
                                "absolute top-4 right-4 p-1.5 rounded-lg text-slate-400",
                                "hover:text-slate-600 hover:bg-slate-100 transition-colors print:hidden"
                            )}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {/* Body */}
                        <div className="px-6 py-5 overflow-y-auto flex-1 print:overflow-visible print:max-h-none">
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

export function ModalFooter({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-100", className)}>
            {children}
        </div>
    );
}
