"use client";
// "The Print Floor" storefront — Group Shops directory. See DESIGN.md and
// the direction contract in app/page.tsx.
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useCart } from "@/lib/cart";
import { SeparationCard } from "@/components/public/SeparationCard";
import { SegmentReadout } from "@/components/public/SegmentReadout";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PressFrame } from "@/components/public/PressFrame";
import { GhostSlot } from "@/components/public/GhostSlot";
import { getShopSpot, spotVars, SPOTS } from "@/lib/spot";

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

function daysUntil(iso?: string): number | null {
    if (!iso) return null;
    const ms = new Date(iso).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / 86_400_000));
}

export default function ShopsLandingPage() {
    const { itemCount, subtotalCents } = useCart();
    const [shops, setShops] = useState<ShopListing[] | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        publicFetch("/shops/directory").then(setShops).catch(() => setError(true));
    }, []);

    return (
        <div className="press-canvas min-h-screen flex flex-col relative font-press">
            <PressFrame />
            {/* PublicHeader is a direct child of this min-h-screen root — not
                nested inside the (short) hero block below — so its sticky
                positioning stays anchored for the full scroll length of the
                page instead of releasing once the hero's own container
                scrolls out of view. See DESIGN.md. */}
            <PublicHeader itemCount={itemCount} subtotalCents={subtotalCents} />
            <div className="relative z-10">
                <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 text-center">
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}>
                        <h1 className="font-display uppercase text-3xl sm:text-4xl lg:text-5xl text-plate-50 leading-tight mb-3 tracking-tight">Shops</h1>
                        <p className="text-base text-plate-300 max-w-xl mx-auto leading-relaxed">
                            Custom screen printed &amp; embroidered apparel for teams, schools, and events. Each shop below runs its own
                            production job, spot color and all — pick one to start shopping. Your cart carries over if you order from more than one.
                        </p>
                    </motion.div>
                </div>
            </div>

            {/* Shop list */}
            <main className="relative z-10 flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10">
                {error ? (
                    <div className="text-center py-24">
                        <p className="text-plate-50 font-bold">Couldn&apos;t load shops right now.</p>
                        <p className="text-sm text-plate-300 mt-1">Please try again in a moment.</p>
                    </div>
                ) : shops === null ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pt-2">
                        {[1, 2, 3].map(i => <div key={i} className="skeleton rounded-lg h-40 bg-plate-800" />)}
                    </div>
                ) : shops.length === 0 ? (
                    <SeparationCard interactive={false} className="text-center py-16 px-6">
                        <div className="w-16 h-16 bg-plate-900 border border-plate-700 rounded-lg flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-plate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                        </div>
                        <p className="text-plate-50 font-bold">No shops are open right now.</p>
                        <p className="text-sm text-plate-300 mt-1">Check back soon, or use the link your group shared with you.</p>
                    </SeparationCard>
                ) : (
                    <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pt-2">
                        {shops.map(s => {
                            const spot = getShopSpot(s.id);
                            const days = daysUntil(s.expiresAt);
                            return (
                                <motion.div key={s.id} variants={item} style={spotVars(spot)}>
                                    <Link href={`/shop/${s.slug}`} className="block h-full">
                                        <SeparationCard className="p-5 pt-11 h-full flex flex-col">
                                            <div className="flex items-start justify-between gap-2">
                                                <h3 className="text-base font-extrabold text-plate-100 leading-snug">{s.name}</h3>
                                                <span className="w-3 h-3 rounded-full shrink-0 mt-1" style={{ background: "var(--spot)" }} aria-hidden="true" />
                                            </div>
                                            {s.notes && <p className="text-sm text-plate-300 mt-1 line-clamp-2">{s.notes}</p>}
                                            <div className="mt-auto pt-4">
                                                {days !== null && (
                                                    <div className="flex items-center gap-1.5 mb-3 text-plate-400">
                                                        <SegmentReadout value={String(days).padStart(2, "0")} color={SPOTS[spot].bright} className="text-base" label={`Closes in ${days} days`} />
                                                        <span className="text-[10px] font-spec uppercase tracking-wider">day{days === 1 ? "" : "s"} left</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-between pt-3 border-t border-dashed border-plate-700">
                                                    <span className="text-xs text-plate-400 font-spec">{s.productCount} item{s.productCount !== 1 ? "s" : ""}</span>
                                                    <span className="text-xs font-extrabold" style={{ color: "var(--spot-bright)" }}>Shop now →</span>
                                                </div>
                                            </div>
                                        </SeparationCard>
                                    </Link>
                                </motion.div>
                            );
                        })}
                        {shops.length > 0 && shops.length < 3 &&
                            Array.from({ length: 3 - shops.length }).map((_, i) => <GhostSlot key={i} className={i > 0 ? "hidden sm:flex" : ""} />)}
                    </motion.div>
                )}

                {/* Contact strip — real substance below the grid rather than
                    bare canvas when only a shop or two is open. A 2-up spec
                    plate (vertical divider on sm+, horizontal on mobile),
                    deliberately not a third copy of the 3-row trust ticket
                    already used on the landing and shop-detail pages. */}
                {shops !== null && !error && (
                    <div className="mt-16 spec-panel rounded-xl max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-dashed divide-plate-700">
                        <div className="p-6 sm:p-7">
                            <p className="text-xs font-spec uppercase tracking-wider text-proc-cyan mb-2">How ordering works</p>
                            <p className="text-sm text-plate-300 leading-relaxed">One link per group — everyone picks their own size, we run and ship the whole batch as one job.</p>
                        </div>
                        <div className="p-6 sm:p-7">
                            <p className="text-xs font-spec uppercase tracking-wider" style={{ color: "#8FE0BB" }}>Don&apos;t see your shop?</p>
                            <p className="text-sm text-plate-300 leading-relaxed mt-2">
                                Tell us about your team, school, or event at <a href="mailto:hello@crossroadscustomapparel.com" className="text-proc-cyan hover:underline">hello@crossroadscustomapparel.com</a> and we&apos;ll get one set up.
                            </p>
                        </div>
                    </div>
                )}
            </main>

            <PublicFooter />
        </div>
    );
}
