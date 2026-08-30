"use client";
import { useEffect, useState } from "react";
import { api } from "@/app/lib/api";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

type Customer = { id:string; name:string; email:string; orders:number; totalCents:number; createdAt:string };

const fmt = (cents: number) =>
    new Intl.NumberFormat("en-US", { style:"currency", currency:"USD" }).format(cents / 100);

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading]     = useState(true);
    const [search, setSearch]       = useState("");

    useEffect(() => {
        api("/customers").then(d => setCustomers(Array.isArray(d) ? d : [])).catch(console.error).finally(() => setLoading(false));
    }, []);

    const filtered = customers.filter(c =>
        !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase())
    );

    const totalRevenue = customers.reduce((a, c) => a + c.totalCents, 0);
    const totalOrderCount = customers.reduce((a, c) => a + c.orders, 0);
    const avgOrderValue = totalOrderCount > 0 ? totalRevenue / totalOrderCount : 0;

    const stats = [
        {
            label:"Total Customers", value:loading ? "—" : customers.length.toString(),
            icon:<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>
        },
        {
            label:"Total Revenue", value:loading ? "—" : fmt(totalRevenue),
            icon:<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/></svg>
        },
        {
            label:"Avg. Order Value", value:loading ? "—" : fmt(avgOrderValue),
            icon:<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/></svg>
        }
    ];

    return (
        <div className="space-y-6">
            <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4, ease:EASE }}>
                <h1 className="page-title">Customers</h1>
                <p className="page-subtitle">Everyone who has placed an order</p>
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {stats.map((s, i) => (
                    <motion.div key={s.label} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.07, duration:0.35, ease:EASE }}
                        whileHover={{ y:-3 }}
                        className="console-panel rounded-lg p-5 cursor-default hover:shadow-console-hover hover:border-white/[0.14]">
                        <div className="flex items-center justify-between mb-3">
                            <p className="console-label">{s.label}</p>
                            <div className="w-8 h-8 rounded-md flex items-center justify-center text-signal-cyan bg-signal-cyan/10">{s.icon}</div>
                        </div>
                        <p className="text-2xl font-semibold font-mono tabular-nums text-white">{s.value}</p>
                    </motion.div>
                ))}
            </div>

            {/* Search */}
            <div className="max-w-xs">
                <Input
                    leftIcon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>}
                    placeholder="Search customers…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {/* Table */}
            <div className="console-panel rounded-lg overflow-hidden">
                {loading ? (
                    <div className="p-8 space-y-4">
                        {[1,2,3,4].map(i => (
                            <div key={i} className="flex items-center gap-4">
                                <div className="w-9 h-9 skeleton rounded-full"/>
                                <div className="flex-1 space-y-1.5"><div className="h-3 w-36 skeleton rounded"/><div className="h-2.5 w-44 skeleton rounded"/></div>
                                <div className="h-4 w-16 skeleton rounded"/>
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-graphite-600">
                        <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                        <p className="text-sm text-graphite-300 font-medium">{search ? "No customers match" : "No customers yet"}</p>
                        <p className="text-xs text-graphite-300 mt-0.5">Customers are created automatically when orders are placed</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <div className="table-wrap"><table className="data-table">
                            <thead><tr><th>Customer</th><th>Orders</th><th>Total Spent</th><th>Top Customer?</th><th>Since</th></tr></thead>
                            <tbody>
                                {filtered.sort((a,b) => b.totalCents - a.totalCents).map((c, idx) => (
                                    <motion.tr key={c.id} initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} transition={{ delay:idx*0.025, duration:0.2 }}>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-white/[0.05] ring-1 ring-white/10 flex items-center justify-center shrink-0">
                                                    <span className="text-xs font-bold text-signal-cyan font-mono">{c.name[0].toUpperCase()}</span>
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-graphite-100 text-sm">{c.name}</p>
                                                    <p className="text-xs text-graphite-300">{c.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/[0.06] text-sm font-semibold font-mono text-graphite-200">{c.orders}</span>
                                        </td>
                                        <td>
                                            <span className="text-sm font-bold font-mono text-white tabular-nums">{fmt(c.totalCents)}</span>
                                        </td>
                                        <td>
                                            {idx === 0 && customers.length > 1 ? (
                                                <Badge variant="warning" size="sm">
                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.447a1 1 0 00-.364 1.118l1.287 3.957c.3.922-.755 1.688-1.54 1.118l-3.367-2.447a1 1 0 00-1.175 0l-3.367 2.447c-.784.57-1.838-.196-1.539-1.118l1.286-3.957a1 1 0 00-.363-1.118L2.98 9.385c-.784-.57-.38-1.81.588-1.81h4.163a1 1 0 00.95-.69l1.287-3.958z"/></svg>
                                                    Top spender
                                                </Badge>
                                            ) : <span className="text-graphite-500">—</span>}
                                        </td>
                                        <td>
                                            <span className="text-xs font-mono text-graphite-300">
                                                {new Date(c.createdAt).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" })}
                                            </span>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table></div>
                    </div>
                )}
            </div>
        </div>
    );
}
