"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

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
        title: "Group Shops",
        desc: "Your team, school, or event gets its own private shop link — everyone orders their own size, we handle the rest.",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m5-3.13a4 4 0 100-8 4 4 0 000 8zm6 3a4 4 0 00-3-3.87m-13 0A4 4 0 003 15" />
            </svg>
        )
    }
];

const HOW_IT_WORKS = [
    { step: "1", title: "Get your shop link", desc: "We set up a private, custom shop for your team, school, or event." },
    { step: "2", title: "Everyone orders their size", desc: "Share the link — each person browses and picks their own items, sizes, and colors." },
    { step: "3", title: "Pick up or ship", desc: "Pay securely online or at pickup. Get it locally or have it shipped straight to you." }
];

function ShopPreviewCard({ shop, idx }: { shop: ShopListing; idx: number }) {
    return (
        <motion.div variants={fadeUp} custom={idx}>
            <Link href={`/shop/${shop.slug}`}
                className="block bg-white rounded-2xl ring-1 ring-black/5 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 p-5 h-full">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-brand-500" fill="currentColor" viewBox="0 0 20 20"><path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3z"/></svg>
                </div>
                <h3 className="text-base font-bold text-slate-900">{shop.name}</h3>
                {shop.notes && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{shop.notes}</p>}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                    <span className="text-xs text-slate-400 font-medium">{shop.productCount} item{shop.productCount !== 1 ? "s" : ""}</span>
                    <span className="text-xs font-bold text-brand-600">Shop now →</span>
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
        <div className="min-h-screen flex flex-col" style={{ background: "#f4f3fb" }}>
            {/* ── Hero + nav ─────────────────────────────────────────────────── */}
            <header className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #08080f 0%, #1a0a2e 50%, #0f0520 100%)" }}>
                <div className="orb absolute top-0 left-1/4 w-96 h-96 opacity-20" style={{ background: "radial-gradient(circle, #7c3aed, transparent 70%)" }} />
                <div className="orb absolute -bottom-24 right-0 w-96 h-96 opacity-15" style={{ background: "radial-gradient(circle, #a78bfa, transparent 70%)" }} />

                {/* Nav bar */}
                <div className="relative z-10 border-b border-white/5">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                        <Image src="/logo.png" alt="Crossroads Custom Apparel" width={130} height={52} className="object-contain" priority />
                        <nav aria-label="Primary" className="hidden sm:flex items-center gap-7 text-sm font-medium text-slate-300">
                            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
                            <a href="#shops" className="hover:text-white transition-colors">Group Shops</a>
                            <a href="#contact" className="hover:text-white transition-colors">Contact</a>
                        </nav>
                        <Link href="/shops"
                            className="btn-shine inline-flex items-center gap-1.5 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all"
                            style={{ background: "linear-gradient(135deg,#8b5cf6 0%,#7c3aed 100%)", boxShadow: "0 4px 16px rgba(124,58,237,0.4)" }}>
                            Browse Shops
                        </Link>
                    </div>
                </div>

                {/* Hero content */}
                <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
                    <motion.div initial="hidden" animate="show" variants={stagger}>
                        <motion.p variants={fadeUp} className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300 mb-4">
                            Screen Printing &amp; Embroidery
                        </motion.p>
                        <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.05] tracking-tight mb-5">
                            Custom apparel, made simple for groups
                        </motion.h1>
                        <motion.p variants={fadeUp} className="text-base sm:text-lg text-slate-300/80 max-w-2xl mx-auto leading-relaxed mb-9">
                            We print and embroider custom gear for teams, schools, and events. Your group gets its own
                            private shop link, so everyone can order exactly what they need — in their own size.
                        </motion.p>
                        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-3">
                            <Link href="/shops"
                                className="btn-shine w-full sm:w-auto inline-flex items-center justify-center gap-2 text-white text-sm font-semibold px-6 py-3.5 rounded-xl transition-all"
                                style={{ background: "linear-gradient(135deg,#8b5cf6 0%,#7c3aed 100%)", boxShadow: "0 6px 24px rgba(124,58,237,0.45)" }}>
                                Browse Group Shops
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                            </Link>
                            <a href="#contact"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-white text-sm font-semibold px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 transition-colors">
                                Get in Touch
                            </a>
                        </motion.div>
                        <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-2.5 mt-10">
                            {["🖨️ Screen Printing", "🧵 Embroidery", "📦 Ship or Pick Up"].map(pill => (
                                <span key={pill} className="text-xs font-medium text-slate-300 bg-white/5 border border-white/10 rounded-full px-3.5 py-1.5">
                                    {pill}
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
                        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-3">What We Do</h2>
                        <p className="text-sm sm:text-base text-slate-500 leading-relaxed">
                            Quality decoration and an ordering process built for groups — not one-off gifts.
                        </p>
                    </motion.div>
                    <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger}
                        className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        {WHAT_WE_DO.map(f => (
                            <motion.div key={f.title} variants={fadeUp}
                                className="bg-white rounded-2xl ring-1 ring-black/5 shadow-card p-6 text-center sm:text-left">
                                <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4 mx-auto sm:mx-0">
                                    {f.icon}
                                </div>
                                <h3 className="text-base font-bold text-slate-900 mb-1.5">{f.title}</h3>
                                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </section>

                {/* ── How It Works ───────────────────────────────────────────── */}
                <section id="how-it-works" className="bg-white border-y border-slate-100">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
                        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }}
                            transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }} className="text-center max-w-xl mx-auto mb-12">
                            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-3">How It Works</h2>
                            <p className="text-sm sm:text-base text-slate-500 leading-relaxed">
                                Three steps from "we need shirts" to everyone wearing them.
                            </p>
                        </motion.div>
                        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger}
                            className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6">
                            {HOW_IT_WORKS.map(s => (
                                <motion.div key={s.step} variants={fadeUp} className="text-center sm:text-left">
                                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base mb-4 mx-auto sm:mx-0"
                                        style={{ background: "linear-gradient(135deg,#8b5cf6 0%,#7c3aed 100%)" }}>
                                        {s.step}
                                    </div>
                                    <h3 className="text-base font-bold text-slate-900 mb-1.5">{s.title}</h3>
                                    <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </section>

                {/* ── Group Shops preview ────────────────────────────────────── */}
                <section id="shops" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
                    <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }}
                        transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                        className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8">
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-2">Group Shops Open Now</h2>
                            <p className="text-sm sm:text-base text-slate-500">Have a link from your group already? Jump straight to it below.</p>
                        </div>
                        <Link href="/shops" className="text-sm font-bold text-brand-600 hover:text-brand-700 transition-colors shrink-0">
                            View all shops →
                        </Link>
                    </motion.div>

                    {shops === null ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                            {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl ring-1 ring-black/5 p-5 animate-pulse h-40" />)}
                        </div>
                    ) : previewShops.length === 0 ? (
                        <div className="text-center bg-white rounded-2xl ring-1 ring-black/5 py-16 px-6">
                            <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <svg className="w-7 h-7 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                            </div>
                            <p className="text-slate-600 font-semibold">No group shops are open right now.</p>
                            <p className="text-sm text-slate-400 mt-1">Check back soon, or reach out below to set one up for your team.</p>
                        </div>
                    ) : (
                        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger}
                            className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                            {previewShops.map((s, idx) => <ShopPreviewCard key={s.id} shop={s} idx={idx} />)}
                        </motion.div>
                    )}
                </section>

                {/* ── Contact ─────────────────────────────────────────────────── */}
                <section id="contact" className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #08080f 0%, #1a0a2e 50%, #0f0520 100%)" }}>
                    <div className="orb absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] opacity-15" style={{ background: "radial-gradient(circle, #7c3aed, transparent 70%)" }} />
                    <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
                        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }}
                            transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}>
                            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3">Have a group that needs gear?</h2>
                            <p className="text-slate-300/80 text-sm sm:text-base leading-relaxed mb-8">
                                Tell us about your team, school, or event and we'll get a shop set up for you.
                                Based in Castle Dale, Utah.
                            </p>
                            <a href="mailto:hello@crossroadscustomapparel.com"
                                className="btn-shine inline-flex items-center gap-2 text-white text-sm font-semibold px-6 py-3.5 rounded-xl transition-all"
                                style={{ background: "linear-gradient(135deg,#8b5cf6 0%,#7c3aed 100%)", boxShadow: "0 6px 24px rgba(124,58,237,0.45)" }}>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                                hello@crossroadscustomapparel.com
                            </a>
                        </motion.div>
                    </div>
                </section>
            </main>

            {/* ── Footer ──────────────────────────────────────────────────────── */}
            <footer className="border-t border-slate-200 bg-white">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <Image src="/logo.png" alt="Crossroads Custom Apparel" width={100} height={40} className="object-contain" />
                    <div className="text-center sm:text-right">
                        <p className="text-xs text-slate-400">Screen printing &amp; embroidery · <a href="mailto:hello@crossroadscustomapparel.com" className="hover:text-violet-600 transition-colors">hello@crossroadscustomapparel.com</a></p>
                        <p className="text-xs text-slate-300 mt-0.5">
                            © {new Date().getFullYear()} Crossroads Custom Apparel. All rights reserved. · <Link href="/login" className="hover:text-slate-500 transition-colors">Staff Login</Link>
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
