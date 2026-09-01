"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { PressButton } from "@/components/public/PressButton";
import { SeparationCard } from "@/components/public/SeparationCard";
import { ColorBar } from "@/components/public/ColorBar";
import { SegmentReadout } from "@/components/public/SegmentReadout";
import { SeparationHero } from "@/components/public/SeparationHero";
import { PressFrame } from "@/components/public/PressFrame";
import { GhostSlot } from "@/components/public/GhostSlot";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicHeader } from "@/components/public/PublicHeader";
import { useCart } from "@/lib/cart";
import { getShopSpot, spotVars, SPOTS } from "@/lib/spot";

/*
THESIS: The shop looks like the actual production file that will print it —
because in-house, it is.
OWN-WORLD: a dark pre-press light-table system: film-positive cards on a
glowing table, registration crosshairs instead of decoration, one Pantone
spot ink per shop, a fixed CMYK set reserved for technical marks only.
Nothing tilts — everything registers precisely, the opposite signature from
the retired kraft-crate world. Big Shoulders Display for headlines, Public
Sans for body, Fragment Mono for data; a true seven-segment mask for the
closing countdown and live counts.
STORY: A parent or office manager taps a shared link and reads, in seconds,
that this shop's gear is really decorated in-house by a real production
floor — not a dropship template — and that their group's order batches
into one real run.
FIRST VIEWPORT: a real screen-print pull, beside the headline — a squeegee
drags across the actual Crossroads logo, printed in black (the exposed
screen, not yet inked), uncovering the true full-color logo already
underneath as it passes, on a solid-color shirt sitting on a glowing light
table — the mechanism demonstrated, not described.
FORM: The Print Floor — IMPECCABLE'S PICK (top-ranked grounded candidate,
not the roll's assigned index), locked by the user over "The Scorebug"
(broadcast-graphics direction, seed key 95845a44) and 6 declined catalog
challengers.
SCOPE: this world covers the public storefront only — Landing, Group Shops,
Checkout. Admin and Login keep "The Manifest Line" console system untouched.
FINISH: unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, DESIGN.md, and every shipping raster carrying
its provenance.
*/

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

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

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.32, 0.72, 0, 1] as [number, number, number, number] } } };
// Distinct per-section entrances (see craft-floor's motion floor: one
// identical fade on every section reads as a template, not a system) — each
// still answers to the world's own register rather than a decorative flourish.
// How It Works: a step "registers" — snaps to scale like the crosshair does.
const registerPop = { hidden: { opacity: 0, scale: 0.55 }, show: { opacity: 1, scale: 1, transition: { type: "spring" as const, stiffness: 340, damping: 20 } } };
// Shops Open Now: a tile "develops" on the light table — no vertical
// travel, just resolving into focus and full opacity.
const developIn = { hidden: { opacity: 0, scale: 0.94 }, show: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } } };

const WHAT_WE_DO = [
    {
        title: "Screen Printing",
        desc: "Vibrant, durable prints on tees, hoodies, and more — built to hold up wash after wash.",
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10M9 21v-4a3 3 0 013-3v0a3 3 0 013 3v4M5 11V7a2 2 0 012-2h10a2 2 0 012 2v4M3 11h18l-1.5 5h-15L3 11z" /></svg>
    },
    {
        title: "Embroidery",
        desc: "Clean, professional stitching for a polished, premium look on jackets, hats, and polos.",
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M3 12h18M5.5 5.5l13 13M18.5 5.5l-13 13" /></svg>
    },
    {
        title: "Locally Owned",
        desc: "Based in Castle Dale, right in the heart of Emery County, Utah.",
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    }
];

const HOW_IT_WORKS = [
    { step: "1", title: "Get your shop link", desc: "We set up a custom shop for your team, school, or event — its own Pantone spot color and all." },
    { step: "2", title: "Everyone orders their size", desc: "Share the link — each person browses and picks their own items, sizes, and colors." },
    { step: "3", title: "Pick up or ship", desc: "Pay securely online or at pickup. Get it locally or have it shipped straight to you, batched together." }
];

const HERO_PILLS: { label: string; spot: "crimson" | "cobalt" | "marigold" | "emerald" }[] = [
    { label: "Screen Printing", spot: "crimson" },
    { label: "Embroidery", spot: "cobalt" },
    { label: "Ship or Pick Up", spot: "emerald" },
    { label: "Castle Dale, UT", spot: "marigold" },
];

function ShopTile({ shop, idx }: { shop: ShopListing; idx: number }) {
    const spot = getShopSpot(shop.id);
    const days = daysUntil(shop.expiresAt);
    return (
        <motion.div variants={developIn} custom={idx} style={spotVars(spot)}>
            <Link href={`/shop/${shop.slug}`} className="block h-full">
                <SeparationCard className="p-5 pt-11 h-full flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-extrabold text-plate-100 leading-snug">{shop.name}</h3>
                        <span className="w-3 h-3 rounded-full shrink-0 mt-1" style={{ background: "var(--spot)" }} aria-hidden="true" />
                    </div>
                    {shop.notes && <p className="text-sm text-plate-300 mt-1 line-clamp-2">{shop.notes}</p>}
                    <div className="mt-auto pt-4">
                        {days !== null && (
                            <div className="flex items-center gap-1.5 mb-3 text-plate-400">
                                <SegmentReadout value={String(days).padStart(2, "0")} color={SPOTS[spot].bright} className="text-base" label={`Closes in ${days} days`} />
                                <span className="text-[10px] font-spec uppercase tracking-wider">day{days === 1 ? "" : "s"} left</span>
                            </div>
                        )}
                        <div className="flex items-center justify-between pt-3 border-t border-dashed border-plate-700">
                            <span className="text-xs text-plate-400 font-spec">{shop.productCount} item{shop.productCount !== 1 ? "s" : ""}</span>
                            <span className="text-xs font-extrabold" style={{ color: "var(--spot-bright)" }}>Shop now →</span>
                        </div>
                    </div>
                </SeparationCard>
            </Link>
        </motion.div>
    );
}

export default function HomePage() {
    const [shops, setShops] = useState<ShopListing[] | null>(null);
    const { itemCount, subtotalCents } = useCart();

    useEffect(() => {
        publicFetch("/shops/directory").then(setShops).catch(() => setShops([]));
    }, []);

    const previewShops = (shops ?? []).slice(0, 3);

    return (
        <div className="press-canvas min-h-screen flex flex-col font-press">
            <PressFrame />

            {/* ── Nav — persistent across every public page, see PublicHeader ── */}
            <PublicHeader itemCount={itemCount} subtotalCents={subtotalCents} />

            {/* ── Hero ───────────────────────────────────────────────────────── */}
            <header className="relative overflow-hidden">
                <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-14 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: EASE }}
                        className="text-center lg:text-left order-2 lg:order-1">
                        <h1 className="font-display uppercase text-4xl sm:text-5xl lg:text-[3.5rem] text-plate-50 leading-[0.98] tracking-tight mb-5">
                            Custom Screen Printing &amp; Embroidery
                        </h1>
                        <p className="text-base sm:text-lg text-plate-300 max-w-xl mx-auto lg:mx-0 leading-relaxed mb-8">
                            Every order is decorated in-house, registered and run like the real production job it is.
                            Browse our shops or reach out to get your group's order started.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3 mb-9">
                            <Link href="/shops" className="w-full sm:w-auto">
                                <PressButton variant="primary" size="lg" className="w-full sm:w-auto">
                                    Browse Shops
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                                </PressButton>
                            </Link>
                            <a href="#contact" className="w-full sm:w-auto">
                                <PressButton variant="secondary" size="lg" className="w-full sm:w-auto">Get in Touch</PressButton>
                            </a>
                        </div>
                        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5">
                            {HERO_PILLS.map(pill => (
                                <ColorBar key={pill.label} spotKey={pill.spot}>{pill.label}</ColorBar>
                            ))}
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
                        className="order-1 lg:order-2">
                        <SeparationHero />
                        <p className="text-center font-spec text-[11px] uppercase tracking-wider text-plate-500 mt-4 max-w-md mx-auto">
                            Job #001 · screen registered · print pass complete
                        </p>
                    </motion.div>
                </div>
            </header>

            <main className="flex-1">
                {/* ── What We Do — one spec panel, three itemized lines ── */}
                <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
                    <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }}
                        transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }} className="text-center max-w-xl mx-auto mb-12">
                        <h2 className="font-display uppercase text-2xl sm:text-3xl text-plate-50 mb-3 tracking-tight">What We Do</h2>
                        <p className="text-sm sm:text-base text-plate-300 leading-relaxed">Quality decoration for tees, hoodies, hats, and more.</p>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }}
                        transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                        className="spec-panel rounded-xl max-w-3xl mx-auto overflow-hidden">
                        {WHAT_WE_DO.map((f, i) => (
                            <div key={f.title}
                                className={`flex items-start gap-4 sm:gap-5 p-6 sm:p-7 ${i > 0 ? "border-t border-dashed border-plate-700" : ""}`}>
                                <span className="font-spec text-[11px] text-plate-400 pt-1.5 w-16 shrink-0 hidden sm:block">ITEM 0{i + 1}</span>
                                <span className="w-11 h-11 rounded-md flex items-center justify-center shrink-0 bg-proc-cyan/10 text-proc-cyan">
                                    {f.icon}
                                </span>
                                <div>
                                    <h3 className="text-base font-extrabold text-plate-50 mb-1">{f.title}</h3>
                                    <p className="text-sm text-plate-300 leading-relaxed">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                </section>

                {/* ── How It Works — a registration guide strings the three stops ── */}
                <section id="how-it-works" className="scroll-mt-20 border-y border-plate-800 bg-plate-900/40">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
                        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }}
                            transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }} className="text-center max-w-xl mx-auto mb-14">
                            <h2 className="font-display uppercase text-2xl sm:text-3xl text-plate-50 mb-3 tracking-tight">How It Works</h2>
                            <p className="text-sm sm:text-base text-plate-300 leading-relaxed">Three stops from "we need shirts" to everyone wearing them.</p>
                        </motion.div>
                        <div className="relative">
                            <svg className="hidden sm:block absolute top-0 left-0 w-full h-12" viewBox="0 0 100 48" preserveAspectRatio="none" aria-hidden="true">
                                <motion.path d="M16.7,24 L83.3,24" className="guide-line" pathLength={0}
                                    initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true, margin: "-80px" }}
                                    transition={{ duration: 1, ease: "easeInOut" }} />
                                <motion.path d="M16.7,24 L83.3,24" className="guide-line-tick" pathLength={0}
                                    initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true, margin: "-80px" }}
                                    transition={{ duration: 1, ease: "easeInOut", delay: 0.1 }} />
                            </svg>
                            <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger}
                                className="relative grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-6">
                                {HOW_IT_WORKS.map(s => (
                                    <motion.div key={s.step} variants={registerPop} className="text-center">
                                        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 mx-auto bg-plate-900 shadow-plate border-2 border-proc-cyan relative z-10">
                                            <SegmentReadout value={s.step} color="#00AEEF" className="text-lg" />
                                        </div>
                                        <h3 className="text-base font-extrabold text-plate-50 mb-1.5">{s.title}</h3>
                                        <p className="text-sm text-plate-300 leading-relaxed">{s.desc}</p>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* ── Shops preview ──────────────────────────────────────────── */}
                <section id="shops" className="scroll-mt-20 max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
                    <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }}
                        transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                        className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-10">
                        <div>
                            <h2 className="font-display uppercase text-2xl sm:text-3xl text-plate-50 mb-2 tracking-tight">Shops Open Now</h2>
                            <p className="text-sm sm:text-base text-plate-300">Have a link already? Jump straight to it below.</p>
                        </div>
                        <Link href="/shops" className="text-sm font-extrabold text-proc-cyan hover:brightness-125 transition-all shrink-0">
                            View all shops →
                        </Link>
                    </motion.div>

                    {shops === null ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
                            {[1, 2, 3].map(i => <div key={i} className="skeleton rounded-lg h-40 bg-plate-800" />)}
                        </div>
                    ) : previewShops.length === 0 ? (
                        <SeparationCard interactive={false} className="text-center py-16 px-6">
                            <div className="w-14 h-14 bg-proc-cyan/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                                <svg className="w-7 h-7 text-proc-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                            </div>
                            <p className="text-plate-50 font-bold">No shops are open right now.</p>
                            <p className="text-sm text-plate-300 mt-1">Check back soon, or reach out below to get one set up.</p>
                        </SeparationCard>
                    ) : (
                        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger}
                            className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
                            {previewShops.map((s, idx) => <ShopTile key={s.id} shop={s} idx={idx} />)}
                            {previewShops.length > 0 && previewShops.length < 3 &&
                                Array.from({ length: 3 - previewShops.length }).map((_, i) => <GhostSlot key={i} className={i > 0 ? "hidden sm:flex" : ""} />)}
                        </motion.div>
                    )}
                </section>

                {/* ── Contact — a spec plate over the real Castle Dale scenery ── */}
                <section id="contact" className="scroll-mt-20 relative overflow-hidden border-t border-plate-800">
                    <div className="absolute inset-0">
                        <Image src="/san-rafael-swell.jpg" alt="The San Rafael Swell near Castle Dale, Utah" fill sizes="100vw"
                            className="object-cover grayscale" style={{ objectPosition: "center 60%" }} />
                        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(10,13,20,0.75) 0%, rgba(10,13,20,0.92) 100%)" }} />
                    </div>
                    <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
                        <motion.div initial={{ opacity: 0, scale: 0.92 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, margin: "-80px" }}
                            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}>
                            <div className="inline-block spec-panel rounded-lg shadow-plate p-6 sm:p-8">
                                <h2 className="font-display uppercase text-2xl sm:text-3xl text-plate-50 mb-3 tracking-tight">Ships From Castle Dale, Utah</h2>
                                <p className="text-plate-300 text-sm sm:text-base leading-relaxed mb-7 max-w-md mx-auto">
                                    Tell us about your team, school, or event and we&apos;ll get a shop set up for you.
                                </p>
                                <a href="mailto:hello@crossroadscustomapparel.com" className="inline-block">
                                    <PressButton variant="primary" size="lg">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                        hello@crossroadscustomapparel.com
                                    </PressButton>
                                </a>
                            </div>
                        </motion.div>
                    </div>
                </section>
            </main>

            <PublicFooter />
        </div>
    );
}
