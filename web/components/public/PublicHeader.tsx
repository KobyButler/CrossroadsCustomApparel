"use client";
// The persistent nav banner for every public-facing page (Landing, Shops
// directory, an individual Group Shop, Checkout) — sticky, so it's always
// on screen no matter how far a visitor has scrolled or which of those
// pages they're on, with the same links available everywhere. Pages that
// need extra context of their own (shop-detail's cart-status bar,
// checkout's step-aware back link) stack a second sticky bar directly
// underneath this one rather than replacing it. See DESIGN.md.
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const fmt = (cents: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

const NAV_LINKS: { href: string; label: string; match: (path: string) => boolean }[] = [
    { href: "/", label: "Home", match: p => p === "/" },
    { href: "/shops", label: "Shops", match: p => p === "/shops" || p.startsWith("/shop/") },
    { href: "/#how-it-works", label: "How It Works", match: () => false },
    { href: "/#contact", label: "Contact", match: () => false },
];

export function PublicHeader({
    backHref, backLabel, itemCount = 0, subtotalCents = 0,
}: {
    backHref?: string;
    backLabel?: string;
    itemCount?: number;
    subtotalCents?: number;
}) {
    const pathname = usePathname() ?? "/";
    const [open, setOpen] = useState(false);

    // Close the mobile menu on route change, not just on link click — covers
    // browser back/forward too.
    useEffect(() => { setOpen(false); }, [pathname]);

    return (
        <div className="sticky top-0 z-40 border-b border-plate-800 bg-plate-950/90 backdrop-blur-md">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0 shrink-0">
                    {backHref && (
                        <Link href={backHref} title={backLabel} aria-label={backLabel} className="flex items-center gap-2 group shrink-0">
                            <span className="w-7 h-7 rounded-md bg-plate-800 border border-plate-700 flex items-center justify-center text-plate-300 group-hover:text-plate-100 group-hover:bg-plate-700 transition-colors">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                            </span>
                        </Link>
                    )}
                    <Link href="/" className="flex items-center gap-2 shrink-0">
                        {/* logo.png is actually a square (1024x1024) source, not the
                            landscape ratio these props imply — with a mismatched
                            width/height, Next's optimizer emits a square image and
                            Tailwind preflight's `img { height: auto }` then renders the
                            box at width×width instead of width×height, overflowing
                            whatever container it's in. An explicit h-* / w-* pins the
                            actual box regardless; object-contain still letterboxes the
                            (slightly portrait) crest inside it. See DESIGN.md. */}
                        <Image src="/logo.png" alt="Crossroads Custom Apparel" width={44} height={44} className="object-contain h-[44px] w-[44px] shrink-0" priority />
                    </Link>
                </div>

                <nav aria-label="Primary" className="hidden md:flex items-center gap-7 text-sm font-bold text-plate-300">
                    {NAV_LINKS.map(link => {
                        const active = link.match(pathname);
                        return (
                            <Link key={link.href} href={link.href} className="relative py-1.5 transition-colors hover:text-plate-100"
                                style={active ? { color: "#7DDBFF" } : undefined}>
                                {link.label}
                                {active && (
                                    <motion.span layoutId="public-nav-active" className="absolute -bottom-0.5 left-0 right-0 h-0.5 rounded-full bg-proc-cyan"
                                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="flex items-center gap-2 shrink-0">
                    <AnimatePresence>
                        {itemCount > 0 && (
                            <Link href="/checkout">
                                <motion.span
                                    initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
                                    whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}
                                    className="flex items-center gap-2 press-btn press-btn-secondary h-9 px-3.5 cursor-pointer"
                                >
                                    <svg className="w-4 h-4 text-proc-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                    <span className="text-sm font-bold hidden sm:inline">{itemCount} item{itemCount !== 1 ? "s" : ""}</span>
                                    <span className="text-sm font-spec text-proc-cyan">· {fmt(subtotalCents)}</span>
                                </motion.span>
                            </Link>
                        )}
                    </AnimatePresence>

                    <button type="button" onClick={() => setOpen(o => !o)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open}
                        className="md:hidden w-9 h-9 rounded-md border border-plate-700 bg-plate-800/60 flex items-center justify-center text-plate-200 hover:bg-plate-700 hover:border-plate-600 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            {open
                                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
                        </svg>
                    </button>
                </div>
            </div>

            <AnimatePresence initial={false}>
                {open && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }} className="md:hidden overflow-hidden border-t border-plate-800">
                        <nav aria-label="Primary mobile" className="max-w-6xl mx-auto px-4 sm:px-6 py-2 flex flex-col">
                            {NAV_LINKS.map(link => {
                                const active = link.match(pathname);
                                return (
                                    <Link key={link.href} href={link.href} onClick={() => setOpen(false)}
                                        className="flex items-center justify-between px-2 py-3 rounded-md text-sm font-bold text-plate-300 hover:bg-plate-800/60 hover:text-plate-100 transition-colors"
                                        style={active ? { color: "#7DDBFF" } : undefined}>
                                        {link.label}
                                        {active && <span className="w-1.5 h-1.5 rounded-full bg-proc-cyan" aria-hidden="true" />}
                                    </Link>
                                );
                            })}
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
