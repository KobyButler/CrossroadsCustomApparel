"use client";
import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastItem {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextValue {
    toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

const icons: Record<ToastType, React.ReactNode> = {
    success: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
    ),
    error: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
    ),
    warning: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
        </svg>
    ),
    info: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
    ),
};

const styles: Record<ToastType, { wrap: string; icon: string }> = {
    success: { wrap: "border-signal-green/25 bg-graphite-900/95", icon: "bg-signal-green/15 text-signal-green" },
    error:   { wrap: "border-signal-red/25   bg-graphite-900/95", icon: "bg-signal-red/15   text-signal-red"   },
    warning: { wrap: "border-signal-amber/25 bg-graphite-900/95", icon: "bg-signal-amber/15 text-signal-amber" },
    info:    { wrap: "border-signal-cyan/25  bg-graphite-900/95", icon: "bg-signal-cyan/15  text-signal-cyan"  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const toast = useCallback((message: string, type: ToastType = "success") => {
        const id = Math.random().toString(36).slice(2);
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    }, []);

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
                <AnimatePresence mode="popLayout">
                    {toasts.map(t => (
                        <motion.div
                            key={t.id}
                            layout
                            initial={{ opacity: 0, y: 16, scale: 0.92 }}
                            animate={{ opacity: 1, y: 0,  scale: 1    }}
                            exit={{   opacity: 0, y: 8,   scale: 0.95 }}
                            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                            className={cn(
                                "pointer-events-auto flex items-start gap-3",
                                "min-w-[260px] max-w-sm px-4 py-3",
                                "rounded-lg border shadow-console-hover backdrop-blur-sm",
                                styles[t.type].wrap
                            )}
                        >
                            <span className={cn(
                                "flex items-center justify-center w-6 h-6 rounded-md shrink-0 mt-0.5",
                                styles[t.type].icon
                            )}>
                                {icons[t.type]}
                            </span>
                            <p className="text-sm font-medium text-graphite-100 leading-snug pt-0.5">
                                {t.message}
                            </p>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    return useContext(ToastContext);
}
