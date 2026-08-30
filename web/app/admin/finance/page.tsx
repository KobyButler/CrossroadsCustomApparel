"use client";
import { useEffect, useState } from "react";
import { api } from "@/app/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

type Transaction = {
    id:string; type:string; amountCents:number; note?:string;
    orderId?:string; order?: { customerName:string; id:string };
    createdAt:string;
};
type Summary = { grossCents:number; netCents:number; orders:number };

const TYPE_VARIANT: Record<string, string> = { INCOME:"success", EXPENSE:"danger", REFUND:"info", FEE:"warning" };

const fmt = (cents: number) =>
    new Intl.NumberFormat("en-US", { style:"currency", currency:"USD" }).format(cents / 100);

type Tone = "cyan" | "green" | "red";
const TONE: Record<Tone, string> = {
    cyan:  "text-signal-cyan bg-signal-cyan/10",
    green: "text-signal-green bg-signal-green/10",
    red:   "text-signal-red bg-signal-red/10",
};

function KpiTile({ label, value, tone, icon, loading, delay }: {
    label: string; value: string; tone: Tone; icon: React.ReactNode; loading: boolean; delay: number;
}) {
    return (
        <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay, duration:0.35, ease:EASE }}
            whileHover={{ y:-3 }}
            className="console-panel rounded-lg p-5 cursor-default hover:shadow-console-hover hover:border-white/[0.14]">
            <div className="flex items-center justify-between mb-3">
                <p className="console-label">{label}</p>
                <div className={`w-8 h-8 rounded-md flex items-center justify-center ${TONE[tone]}`}>{icon}</div>
            </div>
            <p className={`text-2xl font-semibold tabular-nums font-mono ${loading ? "text-graphite-600" : "text-white"}`}>
                {loading ? "———" : value}
            </p>
        </motion.div>
    );
}

export default function FinancePage() {
    const { toast } = useToast();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [summary, setSummary]           = useState<Summary | null>(null);
    const [loading, setLoading]           = useState(true);
    const [search, setSearch]             = useState("");
    const [typeFilter, setTypeFilter]     = useState("");
    const [showAdd, setShowAdd]           = useState(false);
    const [saving, setSaving]             = useState(false);
    const [form, setForm]                 = useState({ type:"INCOME", amount:"", note:"" });

    useEffect(() => { fetchData(); }, []);

    async function fetchData() {
        setLoading(true);
        try {
            const [txData, sumData] = await Promise.all([api("/finance/transactions").catch(() => []), api("/finance/summary")]);
            setTransactions(Array.isArray(txData) ? txData : []);
            setSummary(sumData);
        } catch { /* ignore */ }
        finally { setLoading(false); }
    }

    const filtered = transactions.filter(t => {
        const q = search.toLowerCase();
        return (!q || (t.note ?? "").toLowerCase().includes(q) || t.id.toLowerCase().includes(q)) && (!typeFilter || t.type === typeFilter);
    });

    async function addTransaction(e: React.FormEvent) {
        e.preventDefault(); setSaving(true);
        try {
            const tx = await api("/finance/transactions", { method:"POST", body:JSON.stringify({
                type:form.type,
                amountCents:Math.round(parseFloat(form.amount)*100) * (form.type==="EXPENSE"||form.type==="FEE" ? -1 : 1),
                note:form.note||undefined
            })});
            setTransactions(p => [tx, ...p]);
            setShowAdd(false); setForm({ type:"INCOME", amount:"", note:"" });
            toast("Transaction recorded"); fetchData();
        } catch (err: any) { toast(err.message||"Failed", "error"); }
        finally { setSaving(false); }
    }

    const income   = transactions.filter(t => t.amountCents > 0).reduce((a,t) => a + t.amountCents, 0);
    const expenses = transactions.filter(t => t.amountCents < 0).reduce((a,t) => a + Math.abs(t.amountCents), 0);

    const kpis: Array<{ label:string; value:string; tone:Tone; icon:React.ReactNode }> = [
        {
            label:"Gross Revenue", value:fmt(summary?.grossCents ?? 0), tone:"cyan",
            icon:<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/></svg>
        },
        {
            label:"Net Profit", value:fmt(summary?.netCents ?? 0), tone:"green",
            icon:<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd"/></svg>
        },
        {
            label:"Recorded Income", value:fmt(income), tone:"green",
            icon:<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l4 4a1 1 0 01-1.414 1.414L11 6.414V16a1 1 0 11-2 0V6.414L6.707 8.707a1 1 0 01-1.414-1.414l4-4A1 1 0 0110 3z" clipRule="evenodd"/></svg>
        },
        {
            label:"Expenses", value:fmt(expenses), tone:"red",
            icon:<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 17a1 1 0 01-.707-.293l-4-4a1 1 0 111.414-1.414L9 13.586V4a1 1 0 112 0v9.586l2.293-2.293a1 1 0 111.414 1.414l-4 4A1 1 0 0110 17z" clipRule="evenodd"/></svg>
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4, ease:EASE }}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="page-title">Finance</h1>
                    <p className="page-subtitle">Track revenue, expenses, and transactions</p>
                </div>
                <Button variant="primary" onClick={() => setShowAdd(true)}
                    icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>}>
                    Add Transaction
                </Button>
            </motion.div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map((k, i) => (
                    <KpiTile key={k.label} label={k.label} value={k.value} tone={k.tone} icon={k.icon} loading={loading} delay={i*0.07} />
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="max-w-xs flex-1">
                    <Input
                        leftIcon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>}
                        placeholder="Search transactions…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="w-full sm:w-36">
                    <option value="">All types</option>
                    <option value="INCOME">Income</option>
                    <option value="EXPENSE">Expense</option>
                    <option value="REFUND">Refund</option>
                    <option value="FEE">Fee</option>
                </Select>
            </div>

            {/* Table */}
            <div className="console-panel rounded-lg overflow-hidden">
                {loading ? (
                    <div className="p-8 space-y-3">
                        {[1,2,3,4].map(i => (
                            <div key={i} className="flex items-center gap-4">
                                <div className="h-5 w-16 skeleton rounded-full"/>
                                <div className="h-4 w-20 skeleton rounded"/>
                                <div className="flex-1 h-3 skeleton rounded"/>
                                <div className="h-3 w-20 skeleton rounded"/>
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-graphite-600">
                        <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        <p className="text-sm text-graphite-300 font-medium">No transactions found</p>
                        <p className="text-xs text-graphite-300 mt-0.5">{search||typeFilter ? "Try clearing filters" : "Add transactions to track income and expenses"}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <div className="table-wrap"><table className="data-table">
                            <thead><tr><th>Type</th><th>Amount</th><th>Note</th><th>Order</th><th>Date</th></tr></thead>
                            <tbody>
                                {filtered.map((tx, idx) => (
                                    <motion.tr key={tx.id} initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} transition={{ delay:idx*0.02, duration:0.2 }}>
                                        <td><Badge variant={TYPE_VARIANT[tx.type] as any} size="sm">{tx.type.charAt(0)+tx.type.slice(1).toLowerCase()}</Badge></td>
                                        <td>
                                            <span className={`text-sm font-bold font-mono tabular-nums ${tx.amountCents >= 0 ? "text-signal-green" : "text-signal-red"}`}>
                                                {tx.amountCents >= 0 ? "+" : ""}{fmt(tx.amountCents)}
                                            </span>
                                        </td>
                                        <td><span className="text-sm text-graphite-200">{tx.note ?? <span className="text-graphite-500">—</span>}</span></td>
                                        <td>
                                            {tx.order ? (
                                                <div>
                                                    <p className="text-sm text-graphite-200">{tx.order.customerName}</p>
                                                    <p className="text-xs font-mono text-graphite-300">#{tx.order.id.slice(-8).toUpperCase()}</p>
                                                </div>
                                            ) : <span className="text-graphite-500">—</span>}
                                        </td>
                                        <td><span className="text-xs font-mono text-graphite-300">{new Date(tx.createdAt).toLocaleDateString("en-US", { month:"short", day:"numeric" })}</span></td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table></div>
                    </div>
                )}
            </div>

            {/* Add Modal */}
            <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Transaction" size="sm">
                <form onSubmit={addTransaction} className="space-y-4">
                    <div>
                        <label className="field-label">Type</label>
                        <Select value={form.type} onChange={e => setForm(p => ({ ...p, type:e.target.value }))}>
                            <option value="INCOME">Income</option>
                            <option value="EXPENSE">Expense</option>
                            <option value="REFUND">Refund</option>
                            <option value="FEE">Fee</option>
                        </Select>
                    </div>
                    <Input label="Amount ($)" type="number" step="0.01" min="0" required placeholder="0.00"
                        value={form.amount} onChange={e => setForm(p => ({ ...p, amount:e.target.value }))} />
                    <Input label="Note" placeholder="e.g. Supply run at Hobby Lobby"
                        value={form.note} onChange={e => setForm(p => ({ ...p, note:e.target.value }))} />
                    <p className="flex items-center gap-2 text-xs text-graphite-300 bg-white/[0.04] rounded-md px-3 py-2">
                        {form.type==="EXPENSE"||form.type==="FEE" ? (
                            <>
                                <svg className="w-3.5 h-3.5 text-signal-red shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 17a1 1 0 01-.707-.293l-4-4a1 1 0 111.414-1.414L9 13.586V4a1 1 0 112 0v9.586l2.293-2.293a1 1 0 111.414 1.414l-4 4A1 1 0 0110 17z" clipRule="evenodd"/></svg>
                                Recorded as a deduction from net profit.
                            </>
                        ) : (
                            <>
                                <svg className="w-3.5 h-3.5 text-signal-green shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l4 4a1 1 0 01-1.414 1.414L11 6.414V16a1 1 0 11-2 0V6.414L6.707 8.707a1 1 0 01-1.414-1.414l4-4A1 1 0 0110 3z" clipRule="evenodd"/></svg>
                                Recorded as an addition to net profit.
                            </>
                        )}
                    </p>
                    <ModalFooter>
                        <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                        <Button type="submit" loading={saving}>Save Transaction</Button>
                    </ModalFooter>
                </form>
            </Modal>
        </div>
    );
}
