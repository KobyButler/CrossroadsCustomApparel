"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

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

const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08 } }
};

const WHAT_WE_DO = [
    {
        title: "Screen Printing",
        desc: "Vibrant, durable prints on tees, hoodies, and more — built to hold up wash after wash.",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10M9 21v-4a3 3 0 013-3v0a3 3 0 013 3v4M5 11V7a2 2 0 012-2h10a2 2 0 012 2v4M3 11h18l-1.5 5h-15L3 11z" />
            </svg>
        )
    },
    {
        title: "Embroidery",
        desc: "Clean, professional stitching for a polished, premium look on jackets, hats, and polos.",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M3 12h18M5.5 5.5l13 13M18.5 5.5l-13 13" />
            </svg>
        )
    },
    {
        title: "Locally Owned",
        desc: "Based in Castle Dale, right in the heart of Emery County, Utah.",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        )
    }
];

const HOW_IT_WORKS = [
    { step: "1", title: "Get your shop link", desc: "We set up a custom shop for your team, school, or event." },
    { step: "2", title: "Everyone orders their size", desc: "Share the link — each person browses and picks their own items, sizes, and colors." },
    { step: "3", title: "Pick up or ship", desc: "Pay securely online or at pickup. Get it locally or have it shipped straight to you." }
];

// Real inline icons for the hero pills — no emoji shipped as UI icons.
const HERO_PILLS = [
    {
        label: "Screen Printing",
        icon: (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10M9 21v-4a3 3 0 013-3v0a3 3 0 013 3v4M5 11V7a2 2 0 012-2h10a2 2 0 012 2v4M3 11h18l-1.5 5h-15L3 11z" />
            </svg>
        )
    },
    {
        label: "Embroidery",
        icon: (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M3 12h18M5.5 5.5l13 13M18.5 5.5l-13 13" />
            </svg>
        )
    },
    {
        label: "Ship or Pick Up",
        icon: (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
        )
    }
];

function ShopPreviewCard({ shop, idx }: { shop: ShopListing; idx: number }) {
    return (
        <motion.div variants={fadeUp} custom={idx}>
            <Link href={`/shop/${shop.slug}`}
                className="console-panel console-panel-interactive block rounded-lg p-5 h-full">
                <div className="w-10 h-10 rounded-md bg-signal-cyan/10 flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-signal-cyan" fill="currentColor" viewBox="0 0 20 20"><path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3z"/></svg>
                </div>
                <h3 className="text-base font-bold text-white">{shop.name}</h3>
                {shop.notes && <p className="text-sm text-graphite-300 mt-1 line-clamp-2">{shop.notes}</p>}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.06]">
                    <span className="text-xs text-graphite-300 font-medium">{shop.productCount} item{shop.productCount !== 1 ? "s" : ""}</span>
                    <span className="text-xs font-bold text-signal-cyan">Shop now →</span>
                </div>
            </Link>
        </motion.div>
    );
}

export default function HomePage() {
    const [shops, setShops] = useState<ShopListing[] | null>(null);

    useEffect(() => {
        publicFetch("/shops/directory").then(setShops).catch(() => setShops([]));
    }, []);

    const previewShops = (shops ?? []).slice(0, 3);

    return (
        <div className="console-canvas min-h-screen flex flex-col">
            {/* ── Photo banner ───────────────────────────────────────────────── */}
            <div className="relative h-56 sm:h-72 lg:h-[380px] overflow-hidden shrink-0">
                <Image
                    src="/san-rafael-swell.jpg"
                    alt="The San Rafael Swell near Castle Dale, Utah"
                    fill
                    priority
                    sizes="100vw"
                    className="object-cover"
                    style={{ objectPosition: "center 60%" }}
                />
                <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(10,12,16,0.1) 0%, rgba(10,12,16,0.5) 65%, #0a0c10 100%)" }} />
                <p className="absolute bottom-2 right-3 text-[10px] text-white/40">San Rafael Swell, Emery County, UT</p>
            </div>

            {/* ── Hero + nav ─────────────────────────────────────────────────── */}
            <header className="relative overflow-hidden">
                {/* Nav bar */}
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}
                    className="relative z-10 border-b border-white/[0.06]">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                        <Image src="/logo.png" alt="Crossroads Custom Apparel" width={44} height={44} className="object-contain rounded-md" priority />
                        <nav aria-label="Primary" className="hidden sm:flex items-center gap-7 text-sm font-medium text-graphite-300">
                            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
                            <a href="#shops" className="hover:text-white transition-colors">Shops</a>
                            <a href="#contact" className="hover:text-white transition-colors">Contact</a>
                        </nav>
                        <Link href="/shops">
                            <Button variant="primary" size="sm">Browse Shops</Button>
                        </Link>
                    </div>
                </motion.div>

                {/* Hero content */}
                <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
                    <motion.div initial="hidden" animate="show" variants={stagger}>
                        <motion.div variants={fadeUp} className="mb-6">
                            <Image
                                src="/logo.png"
                                alt="Crossroads Custom Apparel"
                                width={200}
                                height={200}
                                priority
                                className="w-28 h-28 sm:w-36 sm:h-36 lg:w-40 lg:h-40 object-contain mx-auto"
                            />
                        </motion.div>
                        <motion.p variants={fadeUp} className="text-sm text-graphite-300 mb-4">
                            Locally Owned &middot; Castle Dale, Utah
                        </motion.p>
                        <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.05] tracking-tight mb-5">
                            Custom Screen Printing &amp; Embroidery
                        </motion.h1>
                        <motion.p variants={fadeUp} className="text-base sm:text-lg text-graphite-300 max-w-2xl mx-auto leading-relaxed mb-9">
                            Vibrant prints and clean, professional embroidery on tees, hoodies, hats, and more.
                            Browse our shops or reach out to get your order started.
                        </motion.p>
                        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-3">
                            <Link href="/shops" className="w-full sm:w-auto">
                                <Button variant="primary" size="lg" className="w-full sm:w-auto">
                                    Browse Shops
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                                </Button>
                            </Link>
                            <a href="#contact" className="w-full sm:w-auto">
                                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                                    Get in Touch
                                </Button>
                            </a>
                        </motion.div>
                        <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-2.5 mt-10">
                            {HERO_PILLS.map(pill => (
                                <span key={pill.label}
                                    className="inline-flex items-center gap-1.5 text-xs font-medium text-graphite-300 bg-white/[0.05] border border-white/10 rounded-full px-3.5 py-1.5">
                                    {pill.icon}
                                    {pill.label}
                                </span>
                            ))}
                        </motion.div>
                    </motion.div>
                </div>
            </header>

            <main className="flex-1">
                {/* ── What We Do ─────────────────────────────────────────────── */}
                <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
                    <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }}
                        transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }} className="text-center max-w-xl mx-auto mb-12">
                        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3">What We Do</h2>
                        <p className="text-sm sm:text-base text-graphite-300 leading-relaxed">
                            Quality decoration for tees, hoodies, hats, and more.
                        </p>
                    </motion.div>
                    <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger}
                        className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        {WHAT_WE_DO.map(f => (
                            <motion.div key={f.title} variants={fadeUp}
                                className="console-panel rounded-lg p-6 text-center sm:text-left">
                                <div className="w-11 h-11 rounded-md bg-signal-cyan/10 text-signal-cyan flex items-center justify-center mb-4 mx-auto sm:mx-0">
                                    {f.icon}
                                </div>
                                <h3 className="text-base font-bold text-white mb-1.5">{f.title}</h3>
                                <p className="text-sm text-graphite-300 leading-relaxed">{f.desc}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </section>

                {/* ── How It Works ───────────────────────────────────────────── */}
                <section id="how-it-works" className="border-y border-white/[0.06]">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
                        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }}
                            transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }} className="text-center max-w-xl mx-auto mb-12">
                            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3">How It Works</h2>
                            <p className="text-sm sm:text-base text-graphite-300 leading-relaxed">
                                Three steps from "we need shirts" to everyone wearing them.
                            </p>
                        </motion.div>
                        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger}
                            className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6">
                            {HOW_IT_WORKS.map(s => (
                                <motion.div key={s.step} variants={fadeUp} className="text-center sm:text-left">
                                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-graphite-950 font-bold text-base mb-4 mx-auto sm:mx-0 bg-signal-cyan-gradient shadow-glow-cyan-sm">
                                        {s.step}
                                    </div>
                                    <h3 className="text-base font-bold text-white mb-1.5">{s.title}</h3>
                                    <p className="text-sm text-graphite-300 leading-relaxed">{s.desc}</p>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </section>

                {/* ── Shops preview ──────────────────────────────────────────── */}
                <section id="shops" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
                    <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }}
                        transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                        className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8">
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">Shops Open Now</h2>
                            <p className="text-sm sm:text-base text-graphite-300">Have a link already? Jump straight to it below.</p>
                        </div>
                        <Link href="/shops" className="text-sm font-bold text-signal-cyan hover:text-signal-cyan-bright transition-colors shrink-0">
                            View all shops →
                        </Link>
                    </motion.div>

                    {shops === null ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                            {[1, 2, 3].map(i => <div key={i} className="skeleton rounded-lg h-40" />)}
                        </div>
                    ) : previewShops.length === 0 ? (
                        <div className="text-center console-panel rounded-lg py-16 px-6">
                            <div className="w-14 h-14 bg-signal-cyan/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                                <svg className="w-7 h-7 text-signal-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                            </div>
                            <p className="text-graphite-100 font-semibold">No shops are open right now.</p>
                            <p className="text-sm text-graphite-300 mt-1">Check back soon, or reach out below to get one set up.</p>
                        </div>
                    ) : (
                        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger}
                            className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                            {previewShops.map((s, idx) => <ShopPreviewCard key={s.id} shop={s} idx={idx} />)}
                        </motion.div>
                    )}
                </section>

                {/* ── Contact ─────────────────────────────────────────────────── */}
                <section id="contact" className="relative overflow-hidden border-t border-white/[0.06]">
                    <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
                        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }}
                            transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}>
                            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3">Ready to Get Started?</h2>
                            <p className="text-graphite-300 text-sm sm:text-base leading-relaxed mb-8">
                                Tell us about your team, school, or event and we'll get a shop set up for you.
                                Based in Castle Dale, Utah.
                            </p>
                            <a href="mailto:hello@crossroadscustomapparel.com" className="inline-block">
                                <Button variant="primary" size="lg">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                                    hello@crossroadscustomapparel.com
                                </Button>
                            </a>
                        </motion.div>
                    </div>
                </section>
            </main>

            {/* ── Footer ──────────────────────────────────────────────────────── */}
            <footer className="border-t border-white/[0.06]">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <Image src="/logo.png" alt="Crossroads Custom Apparel" width={44} height={44} className="object-contain opacity-80" />
                    <div className="text-center sm:text-right">
                        <p className="text-xs text-graphite-300">Screen printing &amp; embroidery · <a href="mailto:hello@crossroadscustomapparel.com" className="hover:text-signal-cyan transition-colors">hello@crossroadscustomapparel.com</a></p>
                        <p className="text-xs text-graphite-500 mt-0.5">
                            © {new Date().getFullYear()} Crossroads Custom Apparel. All rights reserved. · <Link href="/login" className="hover:text-graphite-300 transition-colors">Staff Login</Link>
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
