"use client";
import { useEffect, useState } from "react";
import { api } from "@/app/lib/api";
import Link from "next/link";
import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06 } }
};
const item = {
    hidden: { opacity: 0, x: -10 },
    show:  { opacity: 1, x: 0, transition: { duration: 0.4, ease: EASE } }
};

function fmt(cents: number) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents ?? 0) / 100);
}

/* ─── Status → signal lamp ────────────────────────────────────────────────
   Reserved strictly for real order state, never decoration — see DESIGN.md's
   "locked palette" rule. Order.status is one of UNFULFILLED | FULFILLED |
   CANCELLED | DRAFT (server/prisma/schema.prisma). */
const STATUS_LAMP: Record<string, { label: string; dot: string; text: string }> = {
    UNFULFILLED: { label: "Unfulfilled", dot: "bg-signal-amber", text: "text-signal-amber" },
    FULFILLED:   { label: "Fulfilled",   dot: "bg-signal-green", text: "text-signal-green" },
    CANCELLED:   { label: "Cancelled",   dot: "bg-signal-red",   text: "text-signal-red"   },
    DRAFT:       { label: "Draft",       dot: "bg-graphite-500", text: "text-graphite-300" },
};

function SignalLamp({ status }: { status: string }) {
    const meta = STATUS_LAMP[status?.toUpperCase()] ?? STATUS_LAMP.DRAFT;
    return (
        <span className={cnBase("inline-flex items-center gap-1.5 text-xs font-medium", meta.text)}>
            <span className={cnBase("w-1.5 h-1.5 rounded-full shrink-0", meta.dot)} />
            {meta.label}
        </span>
    );
}

// tiny local join helper — avoids importing the shared `cn` just for this file
function cnBase(...classes: (string | false | undefined)[]) {
    return classes.filter(Boolean).join(" ");
}

type StatTone = "cyan" | "green" | "amber" | "graphite";
const TONE: Record<StatTone, string> = {
    cyan:     "text-signal-cyan bg-signal-cyan/10",
    green:    "text-signal-green bg-signal-green/10",
    amber:    "text-signal-amber bg-signal-amber/10",
    graphite: "text-graphite-400 bg-white/[0.04]",
};

function ConsoleStat({ label, value, sub, icon, tone, pulse }: {
    label: string; value: string | number; sub?: string;
    icon: React.ReactNode; tone: StatTone; pulse?: boolean;
}) {
    return (
        <motion.div
            variants={item}
            whileHover={{ y: -3 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="console-panel rounded-lg p-5 xl:p-6 cursor-default hover:shadow-console-hover hover:border-white/[0.14]"
        >
            <div className="flex items-start justify-between mb-3.5">
                <p className="console-label">{label}</p>
                <div className={cnBase("w-8 h-8 xl:w-9 xl:h-9 rounded-md flex items-center justify-center relative", TONE[tone])}>
                    {icon}
                    {pulse && <span className="absolute inset-0 rounded-md animate-signal-pulse ring-1 ring-current" />}
                </div>
            </div>
            <p className="text-2xl xl:text-3xl font-semibold text-white leading-none font-mono tabular-nums">{value}</p>
            {sub && <p className="text-xs text-graphite-300 mt-2">{sub}</p>}
        </motion.div>
    );
}

function SkeletonStat() {
    return (
        <div className="console-panel rounded-lg p-5 animate-pulse">
            <div className="flex items-start justify-between mb-3.5">
                <div className="h-2.5 w-20 bg-white/[0.06] rounded" />
                <div className="w-8 h-8 bg-white/[0.05] rounded-md" />
            </div>
            <div className="h-7 w-28 bg-white/[0.08] rounded" />
        </div>
    );
}

const QUICK_ACTIONS = [
    {
        href: "/admin/shops", label: "Create a group shop", sub: "Set up a new storefront",
        icon: <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
    },
    {
        href: "/admin/products", label: "Manage products", sub: "Add or edit items",
        icon: <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    },
    {
        href: "/admin/orders", label: "View open orders", sub: "Fulfill pending orders",
        icon: <path fillRule="evenodd" clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .199.079.39.22.53l3.5 3.5a.75.75 0 101.06-1.06l-3.28-3.28V5z" />
    },
    {
        href: "/admin/analytics", label: "Analytics", sub: "Revenue & trends",
        icon: <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
    },
    {
        href: "/admin/discounts", label: "Create a discount", sub: "Promo codes & sales",
        icon: <path fillRule="evenodd" clipRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" />
    },
];

export default function Dashboard() {
    const [fin, setFin] = useState<any>(null);
    const [unfulfilledOrders, setUnfulfilledOrders] = useState<any[]>([]);
    const [recentOrders, setRecentOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([
            api("/finance/summary"),
            api("/orders?status=UNFULFILLED&limit=100"),
            api("/orders?limit=6")
        ]).then(([finData, unfulfilled, recent]) => {
            setFin(finData);
            const uArr = Array.isArray(unfulfilled) ? unfulfilled : (unfulfilled?.data ?? []);
            const rArr = Array.isArray(recent) ? recent : (recent?.data ?? []);
            setUnfulfilledOrders(uArr);
            setRecentOrders(rArr.slice(0, 6));
        }).catch(err => {
            console.error(err);
            setError("Couldn't reach the server. Check your connection and try again.");
        }).finally(() => setLoading(false));
    }, []);

    return (
        <div className="space-y-8">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="flex flex-col sm:flex-row sm:items-end justify-between gap-3"
            >
                <div>
                    <h1 className="text-2xl font-semibold text-white tracking-tight">Dashboard</h1>
                    <p className="text-sm text-graphite-300 mt-1">Here's what's happening with your print shop today.</p>
                </div>
                <div className="flex gap-2.5 flex-wrap">
                    <Link href="/admin/orders">
                        <motion.button
                            whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}
                            className="px-4 py-2 rounded-md text-sm font-medium text-graphite-200 bg-white/[0.04] ring-1 ring-white/10 hover:bg-white/[0.08] hover:ring-white/20 transition-all duration-200"
                        >
                            All Orders
                        </motion.button>
                    </Link>
                    <Link href="/admin/shops">
                        <motion.button
                            whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}
                            className="console-sheen px-4 py-2 rounded-md text-sm font-semibold text-graphite-950 bg-signal-cyan-gradient shadow-glow-cyan-sm hover:shadow-glow-cyan transition-shadow duration-200"
                        >
                            + Create Shop
                        </motion.button>
                    </Link>
                </div>
            </motion.div>

            {error && (
                <div className="console-panel border-signal-red/25 bg-signal-red/[0.06] rounded-lg px-4 py-3 flex items-center gap-2.5 text-sm text-signal-red">
                    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    {error}
                </div>
            )}

            {/* KPI Row */}
            <motion.div
                variants={container} initial="hidden" animate="show"
                className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
            >
                {loading ? (
                    [1,2,3,4].map(i => <SkeletonStat key={i} />)
                ) : (
                    <>
                        <ConsoleStat
                            label="Total Revenue"
                            value={fmt(fin?.grossCents ?? 0)}
                            sub="All time gross"
                            tone="cyan"
                            icon={<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/></svg>}
                        />
                        <ConsoleStat
                            label="Net Profit"
                            value={fmt(fin?.netCents ?? 0)}
                            sub="After costs"
                            tone="green"
                            icon={<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd"/></svg>}
                        />
                        <ConsoleStat
                            label="Unfulfilled"
                            value={unfulfilledOrders.length}
                            sub="Need action"
                            tone={unfulfilledOrders.length > 0 ? "amber" : "graphite"}
                            pulse={unfulfilledOrders.length > 0}
                            icon={<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd"/></svg>}
                        />
                        <ConsoleStat
                            label="Total Orders"
                            value={fin?.orders ?? 0}
                            sub="All time"
                            tone="cyan"
                            icon={<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/></svg>}
                        />
                    </>
                )}
            </motion.div>

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Orders */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.4, ease: EASE }}
                    className="lg:col-span-2 console-panel rounded-lg overflow-hidden"
                >
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                        <h3 className="text-sm font-semibold text-white">Recent Orders</h3>
                        <Link href="/admin/orders">
                            <span className="text-xs font-semibold text-signal-cyan hover:text-signal-cyan-bright transition-colors">
                                View all →
                            </span>
                        </Link>
                    </div>
                    {loading ? (
                        <div className="p-5 space-y-4">
                            {[1,2,3,4].map(i => (
                                <div key={i} className="animate-pulse flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-white/[0.05] rounded-full" />
                                        <div className="space-y-1.5">
                                            <div className="h-3 w-28 bg-white/[0.07] rounded" />
                                            <div className="h-2.5 w-36 bg-white/[0.05] rounded" />
                                        </div>
                                    </div>
                                    <div className="h-5 w-20 bg-white/[0.05] rounded-full" />
                                </div>
                            ))}
                        </div>
                    ) : recentOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-graphite-600">
                            <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                            <p className="text-sm text-graphite-300 font-medium">No orders yet</p>
                            <p className="text-xs text-graphite-300 mt-0.5">Orders will appear here once customers start buying</p>
                        </div>
                    ) : (
                        <motion.div variants={container} initial="hidden" animate="show" className="divide-y divide-white/[0.05]">
                            {recentOrders.map((order) => (
                                <motion.div
                                    key={order.id}
                                    variants={item}
                                    whileHover={{ x: 3 }}
                                    transition={{ duration: 0.2, ease: EASE }}
                                    className="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.03] transition-colors"
                                >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className="w-8 h-8 rounded-full bg-white/[0.05] ring-1 ring-white/10 flex items-center justify-center shrink-0">
                                            <span className="text-xs font-bold text-signal-cyan font-mono">
                                                {(order.customerName ?? "?")[0].toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-graphite-100 truncate">{order.customerName}</p>
                                            <p className="text-xs text-graphite-300 mt-0.5 truncate">{order.customerEmail}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                                        <span className="text-xs text-graphite-300 hidden sm:block font-mono">
                                            {new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                        </span>
                                        <SignalLamp status={order.status} />
                                        <span className="text-sm font-semibold text-white tabular-nums font-mono w-20 text-right">{fmt(order.totalCents)}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </motion.div>

                {/* Right column */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.22, duration: 0.4, ease: EASE }}
                    className="space-y-4"
                >
                    {/* Alert */}
                    {!loading && unfulfilledOrders.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.97 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3, ease: EASE }}
                            className="console-panel console-panel-glow-amber bg-signal-amber/[0.06] rounded-lg p-4"
                        >
                            <div className="flex gap-3">
                                <div className="w-9 h-9 rounded-md bg-signal-amber/15 flex items-center justify-center shrink-0">
                                    <svg className="w-4.5 h-4.5 text-signal-amber animate-signal-pulse" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-white">Action needed</p>
                                    <p className="text-xs text-graphite-300 mt-0.5">
                                        {unfulfilledOrders.length} unfulfilled order{unfulfilledOrders.length !== 1 ? "s" : ""}
                                    </p>
                                    <Link href="/admin/orders">
                                        <span className="text-xs font-semibold text-signal-amber-bright underline underline-offset-2 mt-1 inline-block hover:text-signal-amber transition-colors">
                                            Review now →
                                        </span>
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Quick Links */}
                    <div className="console-panel rounded-lg overflow-hidden">
                        <div className="px-5 py-4 border-b border-white/[0.06]">
                            <h3 className="text-sm font-semibold text-white">Quick Actions</h3>
                        </div>
                        <div className="p-2">
                            {QUICK_ACTIONS.map((a) => (
                                <Link key={a.href} href={a.href}>
                                    <motion.div
                                        whileHover={{ x: 2 }}
                                        transition={{ duration: 0.15 }}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-white/[0.04] transition-colors group cursor-pointer"
                                    >
                                        <span className="w-8 h-8 rounded-md bg-white/[0.04] flex items-center justify-center shrink-0 text-graphite-400 group-hover:text-signal-cyan transition-colors">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">{a.icon}</svg>
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-graphite-200 group-hover:text-white transition-colors">{a.label}</p>
                                            <p className="text-xs text-graphite-300">{a.sub}</p>
                                        </div>
                                        <svg className="w-3.5 h-3.5 text-graphite-600 group-hover:text-signal-cyan transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </motion.div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
