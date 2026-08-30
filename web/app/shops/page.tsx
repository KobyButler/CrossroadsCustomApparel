"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useCart } from "@/lib/cart";

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06 } }
};
const item = {
    hidden: { opacity: 0, y: 16 },
    show:  { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } }
};

type ShopListing = { id: string; name: string; slug: string; notes?: string; expiresAt?: string; productCount: number };

async function publicFetch(path: string) {
    const base = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000/api";
    const res = await fetch(`${base}${path}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

const fmt = (cents: number) =>
    new Intl.NumberFormat("en-US", { style:"currency", currency:"USD" }).format(cents / 100);

export default function ShopsLandingPage() {
    const { itemCount, subtotalCents } = useCart();
    const [shops, setShops] = useState<ShopListing[] | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        publicFetch("/shops/directory").then(setShops).catch(() => setError(true));
    }, []);

    return (
        <div className="console-canvas min-h-screen flex flex-col relative overflow-hidden">
            {/* Header */}
            <div className="relative z-10">
                <div className="border-b border-white/[0.06]">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
                        <Link href="/shops" className="flex items-center gap-2">
                            <Image src="/logo.png" alt="Crossroads Custom Apparel" width={110} height={44} className="object-contain" priority />
                        </Link>
                        {itemCount > 0 && (
                            <Link href="/checkout"
                                className="flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.10] border border-white/10 hover:border-white/20 rounded-md px-3.5 py-2 transition-colors">
                                <svg className="w-4 h-4 text-signal-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                                <span className="text-sm text-white font-semibold">{itemCount} item{itemCount !== 1 ? "s" : ""}</span>
                                <span className="text-sm text-signal-cyan">· {fmt(subtotalCents)}</span>
                            </Link>
                        )}
                    </div>
                </div>

                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 text-center">
                    <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4, ease:EASE }}>
                        <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-graphite-300 mb-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-signal-green animate-signal-pulse" />
                            Now shopping
                        </p>
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-white leading-tight mb-3 tracking-tight">
                            Group Shops
                        </h1>
                        <p className="text-base text-graphite-300 max-w-xl mx-auto leading-relaxed">
                            Custom screen printed &amp; embroidered apparel for teams, schools, and events. Pick a shop below to start shopping —
                            your cart carries over if you order from more than one.
                        </p>
                    </motion.div>
                </div>
            </div>

            {/* Shop list */}
            <main className="relative z-10 flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10">
                {error ? (
                    <div className="text-center py-24">
                        <p className="text-graphite-200 font-medium">Couldn&apos;t load shops right now.</p>
                        <p className="text-sm text-graphite-300 mt-1">Please try again in a moment.</p>
                    </div>
                ) : shops === null ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                        {[1,2,3].map(i => (
                            <div key={i} className="skeleton rounded-lg h-40" />
                        ))}
                    </div>
                ) : shops.length === 0 ? (
                    <div className="text-center py-24">
                        <div className="w-16 h-16 bg-white/[0.04] border border-white/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-graphite-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                        </div>
                        <p className="text-graphite-200 font-medium">No shops are open right now.</p>
                        <p className="text-sm text-graphite-300 mt-1">Check back soon, or use the link your group shared with you.</p>
                    </div>
                ) : (
                    <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                        {shops.map((s) => (
                            <motion.div key={s.id} variants={item} whileHover={{ y:-3 }} transition={{ duration:0.2, ease:EASE }}>
                                <Link href={`/shop/${s.slug}`}
                                    className="block console-panel hover:shadow-console-hover hover:border-white/[0.14] rounded-lg transition-all duration-200 p-5 h-full">
                                    <div className="w-10 h-10 rounded-md bg-signal-cyan/10 flex items-center justify-center mb-3">
                                        <svg className="w-5 h-5 text-signal-cyan" fill="currentColor" viewBox="0 0 20 20"><path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3z"/></svg>
                                    </div>
                                    <h3 className="text-base font-semibold text-white">{s.name}</h3>
                                    {s.notes && <p className="text-sm text-graphite-300 mt-1 line-clamp-2">{s.notes}</p>}
                                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.06]">
                                        <span className="text-xs text-graphite-300 font-medium font-mono">{s.productCount} item{s.productCount !== 1 ? "s" : ""}</span>
                                        <span className="text-xs font-semibold text-signal-cyan">Shop now →</span>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </main>

            <footer className="relative z-10 border-t border-white/[0.06]">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <Image src="/logo.png" alt="Crossroads Custom Apparel" width={100} height={40} className="object-contain" />
                    <div className="text-center sm:text-right">
                        <p className="text-xs text-graphite-300">Screen printing &amp; embroidery · <a href="mailto:hello@crossroadscustomapparel.com" className="hover:text-signal-cyan transition-colors">hello@crossroadscustomapparel.com</a></p>
                        <p className="text-xs text-graphite-500 mt-0.5">© {new Date().getFullYear()} Crossroads Custom Apparel. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
