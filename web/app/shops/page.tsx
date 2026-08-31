"use client";
// "The Gear Drop" storefront — Group Shops directory. See DESIGN.md and the
// direction contract in app/page.tsx.
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useCart } from "@/lib/cart";
import { TagCard } from "@/components/public/TagCard";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } } };

type ShopListing = { id: string; name: string; slug: string; notes?: string; expiresAt?: string; productCount: number };

async function publicFetch(path: string) {
    const base = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000/api";
    const res = await fetch(`${base}${path}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

export default function ShopsLandingPage() {
    const { itemCount, subtotalCents } = useCart();
    const [shops, setShops] = useState<ShopListing[] | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        publicFetch("/shops/directory").then(setShops).catch(() => setError(true));
    }, []);

    return (
        <div className="gear-canvas min-h-screen flex flex-col relative font-gear">
            <div className="relative z-10">
                <PublicHeader itemCount={itemCount} subtotalCents={subtotalCents} />

                <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 text-center">
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}>
                        <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl text-crate-ink leading-tight mb-3">Shops</h1>
                        <p className="text-base text-crate-ink-soft max-w-xl mx-auto leading-relaxed">
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
                        <p className="text-crate-ink font-bold">Couldn&apos;t load shops right now.</p>
                        <p className="text-sm text-crate-ink-soft mt-1">Please try again in a moment.</p>
                    </div>
                ) : shops === null ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pt-2">
                        {[1, 2, 3].map(i => <div key={i} className="skeleton rounded-lg h-40 bg-crate-plywood/30" />)}
                    </div>
                ) : shops.length === 0 ? (
                    <TagCard interactive={false} className="text-center py-16 px-6">
                        <div className="w-16 h-16 bg-crate-paper border border-crate-plywood rounded-lg flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-crate-ink-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                        </div>
                        <p className="text-crate-ink font-bold">No shops are open right now.</p>
                        <p className="text-sm text-crate-ink-soft mt-1">Check back soon, or use the link your group shared with you.</p>
                    </TagCard>
                ) : (
                    <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pt-2">
                        {shops.map(s => (
                            <motion.div key={s.id} variants={item}>
                                <Link href={`/shop/${s.slug}`} className="block h-full">
                                    <TagCard className="p-5 pt-6 h-full">
                                        <div className="w-10 h-10 rounded-md bg-stencil-teal/10 flex items-center justify-center mb-3">
                                            <svg className="w-5 h-5 text-stencil-teal" fill="currentColor" viewBox="0 0 20 20"><path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3z" /></svg>
                                        </div>
                                        <h3 className="text-base font-extrabold text-crate-ink">{s.name}</h3>
                                        {s.notes && <p className="text-sm text-crate-ink-soft mt-1 line-clamp-2">{s.notes}</p>}
                                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-crate-plywood">
                                            <span className="text-xs text-crate-ink-soft font-ticket">{s.productCount} item{s.productCount !== 1 ? "s" : ""}</span>
                                            <span className="text-xs font-extrabold text-stencil-red">Shop now →</span>
                                        </div>
                                    </TagCard>
                                </Link>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </main>

            <PublicFooter />
        </div>
    );
}
