"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { GearButton } from "@/components/public/GearButton";
import { TagCard } from "@/components/public/TagCard";
import { StampBadge } from "@/components/public/StampBadge";
import { PublicFooter } from "@/components/public/PublicFooter";

/*
THESIS: The storefront looks like the actual fulfillment — a packed gear
crate on a sunlit workbench, not a software product grid.
OWN-WORLD: warm kraft/cardboard ground (never white, never black); four
stencil-ink accents (barn red, marigold gold, teal, forest green) carry
category and state the way spray paint through a stencil marks a real crate;
rubber ink-stamps carry urgency; every shop/product tile is a kraft luggage
tag, punched hole and all, scattered at a slight tilt and straightening on
hover; Allerta Stencil for display, Barlow for body, Space Mono
for every price/count/SKU.
STORY: A parent or office manager taps a shared link, immediately reads this
as a real local print shop (not a template), and can tell in seconds this is
where their group's gear ships from as one batch.
FIRST VIEWPORT: A crate lid tips open (one signature 3D reveal on load) onto
the headline; hero pills read like ink-stamp marks; a stack of stencil-color
swatches stands in for "the shirts" since no product photography exists yet.
FORM: The Gear Drop — assigned, index 6 of 7 grounded candidates, seed key
8bfab481, weighed against 6 catalog challengers (none won both axes; kept
raises: a UPC ticket strip on packing-slip cards, isolate/dim manifest-row
interaction, a continuous twine line through How-It-Works, palette restraint
at body text).
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

const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.32, 0.72, 0, 1] as [number, number, number, number] } }
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.55 } } };

const WHAT_WE_DO = [
    {
        title: "Screen Printing", tone: "red" as const,
        desc: "Vibrant, durable prints on tees, hoodies, and more — built to hold up wash after wash.",
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10M9 21v-4a3 3 0 013-3v0a3 3 0 013 3v4M5 11V7a2 2 0 012-2h10a2 2 0 012 2v4M3 11h18l-1.5 5h-15L3 11z" /></svg>
    },
    {
        title: "Embroidery", tone: "teal" as const,
        desc: "Clean, professional stitching for a polished, premium look on jackets, hats, and polos.",
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M3 12h18M5.5 5.5l13 13M18.5 5.5l-13 13" /></svg>
    },
    {
        title: "Locally Owned", tone: "green" as const,
        desc: "Based in Castle Dale, right in the heart of Emery County, Utah.",
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    }
];

const HOW_IT_WORKS = [
    { step: "1", title: "Get your shop link", desc: "We set up a custom shop for your team, school, or event." },
    { step: "2", title: "Everyone orders their size", desc: "Share the link — each person browses and picks their own items, sizes, and colors." },
    { step: "3", title: "Pick up or ship", desc: "Pay securely online or at pickup. Get it locally or have it shipped straight to you, batched together." }
];

const HERO_PILLS = [
    { label: "Screen Printing", tone: "red" as const },
    { label: "Embroidery", tone: "teal" as const },
    { label: "Ship or Pick Up", tone: "green" as const },
    { label: "Castle Dale, UT", tone: "gold" as const }
];

// Literal class strings (not built with a template literal) so Tailwind's
// scanner can actually find them — see the craft note on WHAT_WE_DO below.
const TONE_ICON_CLS = {
    red:  "bg-stencil-red/10 text-stencil-red",
    teal: "bg-stencil-teal/10 text-stencil-teal",
    green:"bg-stencil-green/10 text-stencil-green",
    gold: "bg-stencil-gold/15 text-stencil-gold-dim",
} as const;

const SWATCH_STACK = [
    { name: "Barn Red", cls: "bg-stencil-red" },
    { name: "Marigold", cls: "bg-stencil-gold" },
    { name: "Teal Ink", cls: "bg-stencil-teal" },
    { name: "Forest", cls: "bg-stencil-green" },
];

function ShopTag({ shop, idx }: { shop: ShopListing; idx: number }) {
    return (
        <motion.div variants={fadeUp} custom={idx}>
            <Link href={`/shop/${shop.slug}`} className="block h-full">
                <TagCard className="p-5 pt-6 h-full">
                    <div className="w-10 h-10 rounded-md bg-stencil-teal/10 flex items-center justify-center mb-3">
                        <svg className="w-5 h-5 text-stencil-teal" fill="currentColor" viewBox="0 0 20 20"><path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3z" /></svg>
                    </div>
                    <h3 className="text-base font-extrabold text-crate-ink">{shop.name}</h3>
                    {shop.notes && <p className="text-sm text-crate-ink-soft mt-1 line-clamp-2">{shop.notes}</p>}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-crate-plywood">
                        <span className="text-xs text-crate-ink-soft font-ticket">{shop.productCount} item{shop.productCount !== 1 ? "s" : ""}</span>
                        <span className="text-xs font-extrabold text-stencil-red">Shop now →</span>
                    </div>
                </TagCard>
            </Link>
        </motion.div>
    );
}

export default function HomePage() {
    const [shops, setShops] = useState<ShopListing[] | null>(null);
    const [lidOpen, setLidOpen] = useState(false);

    useEffect(() => {
        publicFetch("/shops/directory").then(setShops).catch(() => setShops([]));
    }, []);
    useEffect(() => { const t = setTimeout(() => setLidOpen(true), 120); return () => clearTimeout(t); }, []);

    const previewShops = (shops ?? []).slice(0, 3);

    return (
        <div className="gear-canvas min-h-screen flex flex-col font-gear">

            {/* ── Hero + nav ─────────────────────────────────────────────────── */}
            <header className="relative overflow-hidden" style={{ perspective: 1400 }}>
                {/* Nav bar */}
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE, delay: 0.5 }}
                    className="relative z-30 border-b border-crate-plywood/70">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                        <Image src="/logo.png" alt="Crossroads Custom Apparel" width={44} height={44} className="object-contain rounded-md" priority />
                        <nav aria-label="Primary" className="hidden sm:flex items-center gap-7 text-sm font-bold text-crate-ink-soft">
                            <a href="#how-it-works" className="hover:text-crate-ink transition-colors">How It Works</a>
                            <a href="#shops" className="hover:text-crate-ink transition-colors">Shops</a>
                            <a href="#contact" className="hover:text-crate-ink transition-colors">Contact</a>
                        </nav>
                        <Link href="/shops"><GearButton variant="primary" size="sm">Browse Shops</GearButton></Link>
                    </div>
                </motion.div>

                {/* Hero content */}
                <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
                    <motion.div initial="hidden" animate="show" variants={stagger}>
                        <motion.div variants={fadeUp} className="mb-9">
                            {/* Logo hung as a tag: a real grommet at the badge's top edge with a
                                twisted-twine loop that visibly threads through it — sized relative
                                to the badge itself so it stays centered at every breakpoint, rather
                                than a floating dashed arc guessed at a fixed offset. */}
                            <div className="relative w-28 h-28 sm:w-32 sm:h-32 mx-auto">
                                <svg className="absolute left-1/2 -translate-x-1/2 -top-6 w-14 h-8 overflow-visible" viewBox="0 0 56 32" fill="none" aria-hidden="true">
                                    <path d="M14 30 C14 8 42 8 42 30" className="twine-base" />
                                    <path d="M14 30 C14 8 42 8 42 30" className="twine-highlight" />
                                </svg>
                                <span aria-hidden="true" className="absolute left-1/2 -translate-x-1/2 top-1 w-[18px] h-[18px] rounded-full z-10"
                                    style={{
                                        background: "radial-gradient(circle at 34% 30%, #F8F1E1 0%, #F8F1E1 52%, #E4D2A9 100%)",
                                        border: "2px solid #B8985F",
                                        boxShadow: "inset 0 2px 3px rgba(42,32,21,0.40), inset 0 -1px 0 rgba(255,255,255,0.35), 0 1px 0 rgba(255,255,255,0.30)"
                                    }} />
                                <div className="w-full h-full rounded-full bg-crate-paper-deep border-2 border-crate-plywood shadow-tag flex items-center justify-center">
                                    <Image src="/logo.png" alt="Crossroads Custom Apparel" width={160} height={160} priority className="w-20 h-20 sm:w-24 sm:h-24 object-contain" />
                                </div>
                            </div>
                        </motion.div>
                        <motion.h1 variants={fadeUp} className="font-display text-4xl sm:text-5xl lg:text-[3.75rem] text-crate-ink leading-[1.08] mb-5">
                            Custom Screen Printing &amp; Embroidery
                        </motion.h1>
                        <motion.p variants={fadeUp} className="text-base sm:text-lg text-crate-ink-soft max-w-2xl mx-auto leading-relaxed mb-9">
                            Vibrant prints and clean, professional embroidery on tees, hoodies, hats, and more.
                            Browse our shops or reach out to get your order started.
                        </motion.p>
                        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
                            <Link href="/shops" className="w-full sm:w-auto">
                                <GearButton variant="primary" size="lg" className="w-full sm:w-auto">
                                    Browse Shops
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                                </GearButton>
                            </Link>
                            <a href="#contact" className="w-full sm:w-auto">
                                <GearButton variant="secondary" size="lg" className="w-full sm:w-auto">Get in Touch</GearButton>
                            </a>
                        </motion.div>
                        <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-2.5 mb-10">
                            {HERO_PILLS.map(pill => (
                                <StampBadge key={pill.label} tone={pill.tone}>{pill.label}</StampBadge>
                            ))}
                        </motion.div>
                        {/* Stand-in for "the shirts" until real product photography exists —
                            a stack of the shop's own stencil-ink swatches, not a stock photo. */}
                        <motion.div variants={fadeUp} className="flex items-end justify-center gap-2.5" aria-hidden="true">
                            {SWATCH_STACK.map((s, i) => (
                                <div key={s.name} className={`${s.cls} rounded-t-md shadow-stamp`} style={{ width: 34, height: 44 + i * 10 }} />
                            ))}
                        </motion.div>
                    </motion.div>
                </div>

                {/* Crate lid — the signature reveal: one panel tips open on load to
                    disclose the hero, transform-origin at the top like a real lid. */}
                <motion.div
                    aria-hidden="true"
                    initial={{ rotateX: 0, opacity: 1 }}
                    animate={lidOpen ? { rotateX: -115, opacity: 0 } : {}}
                    transition={{ duration: 0.85, ease: [0.6, 0.02, 0.15, 1] }}
                    style={{ transformOrigin: "top center", transformStyle: "preserve-3d" }}
                    className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-b from-crate-plywood-dark to-[#A9895A]"
                >
                    <div className="absolute inset-x-0 bottom-8 flex justify-center gap-6">
                        <span className="stamp-badge border-crate-paper text-crate-paper">Fragile</span>
                        <span className="stamp-badge border-crate-paper text-crate-paper">This Side Up</span>
                    </div>
                </motion.div>
            </header>

            <main className="flex-1">
                {/* ── What We Do — one manifest ticket, three itemized lines,
                     never three identical icon cards ── */}
                <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
                    <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }}
                        transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }} className="text-center max-w-xl mx-auto mb-12">
                        <h2 className="font-display text-2xl sm:text-3xl text-crate-ink mb-3">What We Do</h2>
                        <p className="text-sm sm:text-base text-crate-ink-soft leading-relaxed">Quality decoration for tees, hoodies, hats, and more.</p>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }}
                        transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                        className="crate-panel rounded-xl max-w-3xl mx-auto overflow-hidden">
                        {WHAT_WE_DO.map((f, i) => (
                            <div key={f.title}
                                className={`flex items-start gap-4 sm:gap-5 p-6 sm:p-7 ${i > 0 ? "border-t border-dashed border-crate-plywood-dark" : ""}`}>
                                <span className="font-ticket text-[11px] text-crate-ink-soft pt-1.5 w-16 shrink-0 hidden sm:block">ITEM 0{i + 1}</span>
                                <span className={`w-11 h-11 rounded-md flex items-center justify-center shrink-0 ${TONE_ICON_CLS[f.tone]}`}>
                                    {f.icon}
                                </span>
                                <div>
                                    <h3 className="text-base font-extrabold text-crate-ink mb-1">{f.title}</h3>
                                    <p className="text-sm text-crate-ink-soft leading-relaxed">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                </section>

                {/* ── How It Works — a twine line strings the three stops together ── */}
                <section id="how-it-works" className="border-y border-crate-plywood/70 bg-crate-paper-deep/40">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
                        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }}
                            transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }} className="text-center max-w-xl mx-auto mb-14">
                            <h2 className="font-display text-2xl sm:text-3xl text-crate-ink mb-3">How It Works</h2>
                            <p className="text-sm sm:text-base text-crate-ink-soft leading-relaxed">Three stops from "we need shirts" to everyone wearing them.</p>
                        </motion.div>
                        <div className="relative">
                            {/* Twine connecting the three steps — desktop only, draws in on scroll.
                                The SVG's own box is exactly the circle's height (h-12 = 48px = 3rem)
                                and starts flush with the grid's top, so viewBox unit == 1px and the
                                path's y (24, the circle's true vertical center) needs no guessed
                                offset. A gentle sag between anchors plus a second, dashed, lighter
                                stroke on the same path (.twine-highlight over .twine-base) reads as
                                twisted cord instead of a ruled line. */}
                            <svg className="hidden sm:block absolute top-0 left-0 w-full h-12" viewBox="0 0 100 48" preserveAspectRatio="none" aria-hidden="true">
                                <motion.path d="M16.7,22 Q33,30 50,24 Q67,30 83.3,22" className="twine-base" pathLength={0}
                                    initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true, margin: "-80px" }}
                                    transition={{ duration: 1.1, ease: "easeInOut" }} />
                                <motion.path d="M16.7,22 Q33,30 50,24 Q67,30 83.3,22" className="twine-highlight" pathLength={0}
                                    initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true, margin: "-80px" }}
                                    transition={{ duration: 1.1, ease: "easeInOut", delay: 0.05 }} />
                            </svg>
                            <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger}
                                className="relative grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-6">
                                {HOW_IT_WORKS.map(s => (
                                    <motion.div key={s.step} variants={fadeUp} className="text-center">
                                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-crate-paper font-ticket font-bold text-lg mb-4 mx-auto bg-stencil-red shadow-stamp border-2 border-crate-paper-deep relative z-10">
                                            {s.step}
                                        </div>
                                        <h3 className="text-base font-extrabold text-crate-ink mb-1.5">{s.title}</h3>
                                        <p className="text-sm text-crate-ink-soft leading-relaxed">{s.desc}</p>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* ── Shops preview ──────────────────────────────────────────── */}
                <section id="shops" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
                    <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }}
                        transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                        className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-10">
                        <div>
                            <h2 className="font-display text-2xl sm:text-3xl text-crate-ink mb-2">Shops Open Now</h2>
                            <p className="text-sm sm:text-base text-crate-ink-soft">Have a link already? Jump straight to it below.</p>
                        </div>
                        <Link href="/shops" className="text-sm font-extrabold text-stencil-red hover:text-stencil-red-bright transition-colors shrink-0">
                            View all shops →
                        </Link>
                    </motion.div>

                    {shops === null ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
                            {[1, 2, 3].map(i => <div key={i} className="skeleton rounded-lg h-40 bg-crate-plywood/30" />)}
                        </div>
                    ) : previewShops.length === 0 ? (
                        <TagCard interactive={false} className="text-center py-16 px-6">
                            <div className="w-14 h-14 bg-stencil-teal/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                                <svg className="w-7 h-7 text-stencil-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                            </div>
                            <p className="text-crate-ink font-bold">No shops are open right now.</p>
                            <p className="text-sm text-crate-ink-soft mt-1">Check back soon, or reach out below to get one set up.</p>
                        </TagCard>
                    ) : (
                        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger}
                            className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
                            {previewShops.map((s, idx) => <ShopTag key={s.id} shop={s} idx={idx} />)}
                        </motion.div>
                    )}
                </section>

                {/* ── Contact — a mailing label over the real Castle Dale scenery ── */}
                <section id="contact" className="relative overflow-hidden border-t border-crate-plywood/70">
                    <div className="absolute inset-0">
                        <Image src="/san-rafael-swell.jpg" alt="The San Rafael Swell near Castle Dale, Utah" fill sizes="100vw"
                            className="object-cover" style={{ objectPosition: "center 60%" }} />
                        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(248,241,225,0.55) 0%, rgba(42,32,21,0.55) 100%)" }} />
                    </div>
                    <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
                        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }}
                            transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}>
                            <div className="inline-block bg-crate-paper border-2 border-crate-plywood-dark rounded-lg shadow-console p-6 sm:p-8">
                                <h2 className="font-display text-2xl sm:text-3xl text-crate-ink mb-3">Ships From Castle Dale, Utah</h2>
                                <p className="text-crate-ink-soft text-sm sm:text-base leading-relaxed mb-7 max-w-md mx-auto">
                                    Tell us about your team, school, or event and we&apos;ll get a shop set up for you.
                                </p>
                                <a href="mailto:hello@crossroadscustomapparel.com" className="inline-block">
                                    <GearButton variant="primary" size="lg">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                        hello@crossroadscustomapparel.com
                                    </GearButton>
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
