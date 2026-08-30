"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

const cards = [
    {
        href: "/admin/discounts",
        title: "Discount Codes",
        desc: "Create percent-off or fixed-amount codes for customers to apply at checkout.",
        cta: "Manage discounts",
        icon: <path fillRule="evenodd" clipRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" />,
    },
    {
        href: "/admin/shops",
        title: "Group Shops",
        desc: "Share a unique link with a team or group so everyone can order at the same time.",
        cta: "Manage shops",
        icon: <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />,
    },
    {
        href: "/admin/orders",
        title: "Order Follow-ups",
        desc: "Review orders that may need follow-up. Emails are automatically sent on order placement.",
        cta: "View orders",
        icon: <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />,
    },
    {
        href: "/admin/analytics",
        title: "Performance Insights",
        desc: "Track revenue, top products, and daily order trends to find what works.",
        cta: "View analytics",
        icon: <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />,
    },
];

export default function MarketingPage() {
    return (
        <div className="space-y-6">
            <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4, ease:EASE }}>
                <h1 className="page-title">Marketing</h1>
                <p className="page-subtitle">Promote your shop with discount codes, group links, and insights</p>
            </motion.div>

            <div className="grid sm:grid-cols-2 gap-4">
                {cards.map((c, i) => (
                    <motion.div key={c.href} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.08, duration:0.35, ease:EASE }}
                        whileHover={{ y:-3 }}
                        className="console-panel rounded-lg p-6 flex flex-col gap-4 hover:shadow-console-hover hover:border-white/[0.14] transition-colors">
                        <div className="flex items-start justify-between">
                            <span className="w-9 h-9 rounded-md bg-signal-cyan/10 text-signal-cyan flex items-center justify-center">
                                <svg className="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 20 20">{c.icon}</svg>
                            </span>
                            <Badge variant="success" dot size="sm">Active</Badge>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-white mb-1">{c.title}</h3>
                            <p className="text-xs text-graphite-300 leading-relaxed">{c.desc}</p>
                        </div>
                        <Link href={c.href}>
                            <motion.span whileHover={{ x:2 }} className="inline-flex items-center gap-1 text-xs font-semibold text-signal-cyan hover:text-signal-cyan-bright transition-colors">
                                {c.cta}
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                            </motion.span>
                        </Link>
                    </motion.div>
                ))}
            </div>

            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.4, duration:0.4 }}
                className="console-panel rounded-lg p-5">
                <div className="flex items-start gap-3">
                    <span className="w-9 h-9 rounded-md bg-signal-cyan/10 text-signal-cyan flex items-center justify-center shrink-0">
                        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15l-3-3a22 22 0 016.336-9.176 1 1 0 011.415 0l1.425 1.425a1 1 0 010 1.415A22 22 0 0112 15z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 9a3 3 0 003-3M9 12a3 3 0 01-3 3" />
                        </svg>
                    </span>
                    <div>
                        <p className="text-sm font-semibold text-white mb-1">Coming soon</p>
                        <p className="text-xs text-graphite-300 leading-relaxed">
                            Email export lists, UTM campaign tracking, abandoned checkout reminders, and bulk SMS notifications for group shop deadlines.
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
