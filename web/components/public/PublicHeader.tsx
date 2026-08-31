"use client";
// Shared header for the Group Shops directory and an individual Group Shop
// page — logo, optional back link, and the cart pill. Landing keeps its own
// richer nav; Checkout keeps its own step-aware back link. See DESIGN.md.
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

const fmt = (cents: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

export function PublicHeader({
    backHref, backLabel, itemCount = 0, subtotalCents = 0,
}: {
    backHref?: string;
    backLabel?: string;
    itemCount?: number;
    subtotalCents?: number;
}) {
    return (
        <div className="border-b border-crate-plywood/70">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {backHref && (
                        <Link href={backHref} title={backLabel} className="flex items-center gap-2 group">
                            <span className="w-7 h-7 rounded-md bg-crate-paper-deep border border-crate-plywood flex items-center justify-center text-crate-ink-soft group-hover:text-crate-ink group-hover:bg-crate-plywood/40 transition-colors shrink-0">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                            </span>
                        </Link>
                    )}
                    <Link href="/shops" className="flex items-center gap-2">
                        <Image src="/logo.png" alt="Crossroads Custom Apparel" width={110} height={44} className="object-contain" priority />
                    </Link>
                </div>
                {itemCount > 0 && (
                    <Link href="/checkout">
                        <motion.span
                            initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                            whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}
                            className="flex items-center gap-2 stencil-btn stencil-btn-secondary h-9 px-3.5 cursor-pointer"
                        >
                            <svg className="w-4 h-4 text-stencil-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                            <span className="text-sm font-bold">{itemCount} item{itemCount !== 1 ? "s" : ""}</span>
                            <span className="text-sm font-ticket text-stencil-teal">· {fmt(subtotalCents)}</span>
                        </motion.span>
                    </Link>
                )}
            </div>
        </div>
    );
}
