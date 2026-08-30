"use client";
import { useEffect, useState } from "react";
import { api } from "@/app/lib/api";
import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

type Series = { date: string; orders: number; grossCents: number };
type TopProduct = { sku: string; name: string; qty: number; salesCents: number };

const fmt = (cents: number) =>
    new Intl.NumberFormat("en-US", { style:"currency", currency:"USD" }).format(cents / 100);

function BarChart({ data, getValue, getLabel, color }: {
    data: any[]; getValue:(d:any)=>number; getLabel:(d:any)=>string; color:string;
}) {
    const max = Math.max(1, ...data.map(getValue));
    return (
        <div className="flex items-end gap-0.5 h-28">
            {data.map((d, i) => {
                const pct = (getValue(d) / max) * 100;
                return (
                    <motion.div key={i} className="flex-1 flex flex-col items-center group relative"
                        title={`${getLabel(d)}: ${getValue(d)}`}
                        initial={{ scaleY:0, originY:"bottom" }} animate={{ scaleY:1 }} transition={{ delay:i*0.015, duration:0.4, ease:[0.32,0.72,0,1] }}
                    >
                        <div className={`w-full rounded-sm transition-all ${pct > 0 ? color : "bg-white/[0.06]"}`}
                            /* height is dynamic — inline style required */
                            style={{ height:`${Math.max(pct, 3)}%` }} />
                    </motion.div>
                );
            })}
        </div>
    );
}

export default function AnalyticsPage() {
    const [data, setData]     = useState<{ series:Series[]; top:TopProduct[] } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api("/analytics/overview").then(setData).catch(console.error).finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="space-y-6">
                <div><div className="skeleton h-6 w-32 mb-2"/><div className="skeleton h-4 w-48"/></div>
                <div className="grid grid-cols-2 gap-4">
                    {[1,2].map(i => <div key={i} className="skeleton h-24 rounded-lg"/>)}
                </div>
                <div className="grid lg:grid-cols-2 gap-4">
                    {[1,2].map(i => <div key={i} className="skeleton h-48 rounded-lg"/>)}
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div>
                <h1 className="page-title mb-2">Analytics</h1>
                <p className="text-sm text-graphite-300">Could not load analytics data.</p>
            </div>
        );
    }

    const totalOrders  = data.series.reduce((a,s) => a + s.orders, 0);
    const totalRevenue = data.series.reduce((a,s) => a + s.grossCents, 0);

    return (
        <div className="space-y-6">
            <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4, ease:EASE }}>
                <h1 className="page-title">Analytics</h1>
                <p className="page-subtitle">Last 30 days performance</p>
            </motion.div>

            {/* KPIs */}
            <div className="grid grid-cols-2 gap-4">
                {[
                    {
                        label:"Orders (30d)", value:totalOrders.toString(), tone:"cyan" as const,
                        icon: <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>,
                        icon2: <path fillRule="evenodd" clipRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"/>,
                    },
                    {
                        label:"Revenue (30d)", value:fmt(totalRevenue), tone:"green" as const,
                        icon: <path fillRule="evenodd" clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"/>,
                    },
                ].map((k, i) => (
                    <motion.div key={k.label} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.08, duration:0.3, ease:EASE }}
                        whileHover={{ y:-3 }}
                        className="console-panel rounded-lg p-5 cursor-default hover:shadow-console-hover hover:border-white/[0.14]">
                        <div className="flex items-center justify-between mb-3">
                            <p className="console-label">{k.label}</p>
                            <div className={`w-8 h-8 rounded-md flex items-center justify-center ${k.tone === "cyan" ? "text-signal-cyan bg-signal-cyan/10" : "text-signal-green bg-signal-green/10"}`}>
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">{k.icon}{k.icon2}</svg>
                            </div>
                        </div>
                        <p className="text-3xl font-semibold tabular-nums font-mono text-white">{k.value}</p>
                    </motion.div>
                ))}
            </div>

            {/* Charts */}
            <div className="grid lg:grid-cols-2 gap-4">
                <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.15, duration:0.4, ease:EASE }}
                    className="console-panel rounded-lg p-5">
                    <h3 className="text-sm font-semibold text-white mb-1">Orders per day</h3>
                    <p className="text-xs text-graphite-300 mb-4">Count of orders placed each day</p>
                    <BarChart data={data.series} getValue={s => s.orders} getLabel={s => s.date} color="bg-signal-cyan" />
                    <div className="flex justify-between mt-2 text-[10px] text-graphite-300 font-mono">
                        <span>{data.series[0]?.date}</span>
                        <span>{data.series[data.series.length-1]?.date}</span>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.22, duration:0.4, ease:EASE }}
                    className="console-panel rounded-lg p-5">
                    <h3 className="text-sm font-semibold text-white mb-1">Revenue per day</h3>
                    <p className="text-xs text-graphite-300 mb-4">Gross revenue generated each day (excl. tax)</p>
                    <BarChart data={data.series} getValue={s => s.grossCents} getLabel={s => `${s.date}: ${fmt(s.grossCents)}`} color="bg-signal-green" />
                    <div className="flex justify-between mt-2 text-[10px] text-graphite-300 font-mono">
                        <span>{data.series[0]?.date}</span>
                        <span>{data.series[data.series.length-1]?.date}</span>
                    </div>
                </motion.div>
            </div>

            {/* Top Products */}
            <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3, duration:0.4, ease:EASE }}
                className="console-panel rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.06]">
                    <h3 className="text-sm font-semibold text-white">Top Products</h3>
                </div>
                {data.top.length === 0 ? (
                    <div className="py-12 text-center text-sm text-graphite-300">No product sales yet</div>
                ) : (
                    <div className="table-wrap"><table className="data-table">
                        <thead><tr><th>#</th><th>Product</th><th>SKU</th><th>Units Sold</th><th>Sales</th></tr></thead>
                        <tbody>
                            {data.top.map((p, i) => (
                                <tr key={p.sku}>
                                    <td>
                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold font-mono bg-white/[0.06] text-graphite-300">
                                            {i+1}
                                        </span>
                                    </td>
                                    <td className="font-semibold text-graphite-100">{p.name}</td>
                                    <td><code className="text-xs font-mono bg-white/[0.06] px-1.5 py-0.5 rounded text-graphite-300">{p.sku}</code></td>
                                    <td>
                                        <span className="inline-flex items-center justify-center w-8 h-6 rounded-full bg-signal-cyan/10 text-signal-cyan text-xs font-bold font-mono">{p.qty}</span>
                                    </td>
                                    <td className="font-semibold text-white tabular-nums font-mono">{fmt(p.salesCents)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table></div>
                )}
            </motion.div>
        </div>
    );
}
