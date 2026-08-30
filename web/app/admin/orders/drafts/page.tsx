"use client";
import { useEffect, useState } from "react";
import { api } from "@/app/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

const fmt = (cents: number) =>
    new Intl.NumberFormat("en-US", { style:"currency", currency:"USD" }).format(cents / 100);

export default function DraftsPage() {
    const { toast }   = useToast();
    const [drafts, setDrafts]       = useState<any[]>([]);
    const [products, setProducts]   = useState<any[]>([]);
    const [shops, setShops]         = useState<any[]>([]);
    const [loading, setLoading]     = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [saving, setSaving]       = useState(false);
    const [filterShop, setFilterShop] = useState("");
    const [form, setForm] = useState({ customerName:"", customerEmail:"", shipAddress1:"", shipCity:"", shipState:"", shipZip:"" });
    const [lines, setLines] = useState<{ productId:string; name:string; quantity:number }[]>([]);

    useEffect(() => {
        Promise.all([api("/orders?status=DRAFT"), api("/products"), api("/shops")])
            .then(([d, p, s]) => {
                setDrafts(Array.isArray(d) ? d : d?.data ?? []);
                setProducts(Array.isArray(p) ? p : p?.data ?? []);
                setShops(Array.isArray(s) ? s : s?.data ?? []);
            }).catch(console.error).finally(() => setLoading(false));
    }, []);

    function addLine(productId: string) {
        const p = products.find(x => x.id === productId);
        if (!p) return;
        setLines(prev => [...prev, { productId, name:p.name, quantity:1 }]);
    }

    async function createDraft(e: React.FormEvent) {
        e.preventDefault();
        if (lines.length === 0) { toast("Add at least one item", "error"); return; }
        setSaving(true);
        try {
            const order = await api("/orders", { method:"POST", body:JSON.stringify({
                customerName:form.customerName||"Draft Customer",
                customerEmail:form.customerEmail||"draft@noreply.com",
                shipAddress1:form.shipAddress1||"TBD",
                shipCity:form.shipCity||"TBD", shipState:form.shipState||"XX", shipZip:form.shipZip||"00000",
                items:lines.map(l => ({ productId:l.productId, quantity:l.quantity }))
            })});
            setDrafts(p => [order,...p]); setShowCreate(false);
            setForm({ customerName:"",customerEmail:"",shipAddress1:"",shipCity:"",shipState:"",shipZip:"" });
            setLines([]); toast("Draft order created");
        } catch (err: any) { toast(err.message||"Failed to create draft", "error"); }
        finally { setSaving(false); }
    }

    const filteredProducts = products.filter(p => !filterShop || (p.shops ?? []).some((s: any) => s.id === filterShop));

    return (
        <div className="space-y-6">
            <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
                <div>
                    <h1 className="page-title">Draft Orders</h1>
                    <p className="page-subtitle">Orders being built before confirmation</p>
                </div>
                <Button
                    onClick={() => setShowCreate(true)}
                    icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>}
                >
                    New Draft
                </Button>
            </motion.div>

            <div className="console-panel rounded-lg overflow-hidden">
                {loading ? (
                    <div className="p-8 space-y-3">
                        {[1,2,3].map(i => (<div key={i} className="animate-pulse flex items-center gap-4"><div className="h-4 w-24 bg-white/[0.06] rounded"/><div className="flex-1 h-3 bg-white/[0.04] rounded"/><div className="h-4 w-16 bg-white/[0.06] rounded"/></div>))}
                    </div>
                ) : drafts.length === 0 ? (
                    <div className="flex flex-col items-center py-16 text-graphite-500">
                        <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        <p className="text-sm text-graphite-300 font-medium">No draft orders</p>
                    </div>
                ) : (
                    <div className="table-wrap"><table className="data-table">
                        <thead><tr><th>Order ID</th><th>Customer</th><th>Items</th><th>Total</th><th>Created</th></tr></thead>
                        <tbody>
                            {drafts.map((o, idx) => (
                                <motion.tr key={o.id} initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} transition={{ delay:idx*0.03, duration:0.2 }}>
                                    <td><code className="text-xs font-mono font-medium text-signal-cyan">#{o.id.slice(-8).toUpperCase()}</code></td>
                                    <td><p className="text-sm font-semibold text-white">{o.customerName}</p><p className="text-xs text-graphite-300">{o.customerEmail}</p></td>
                                    <td><span className="text-sm text-graphite-300">{o.items?.length ?? 0}</span></td>
                                    <td><span className="text-sm font-bold font-mono text-white tabular-nums">{fmt(o.totalCents)}</span></td>
                                    <td><span className="text-xs text-graphite-300 font-mono">{new Date(o.createdAt).toLocaleDateString("en-US", { month:"short", day:"numeric" })}</span></td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table></div>
                )}
            </div>

            <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Draft Order" size="lg">
                <form onSubmit={createDraft} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input label="Customer Name" placeholder="Optional" value={form.customerName} onChange={e => setForm(p => ({ ...p, customerName:e.target.value }))} />
                        <Input label="Customer Email" type="email" placeholder="Optional" value={form.customerEmail} onChange={e => setForm(p => ({ ...p, customerEmail:e.target.value }))} />
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="field-label mb-0">Items</label>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Select value={filterShop} onChange={e => setFilterShop(e.target.value)} className="w-full sm:w-40">
                                    <option value="">All shops</option>
                                    {shops.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </Select>
                                <Select value="" onChange={e => { if (e.target.value) addLine(e.target.value); }} className="w-full sm:w-52">
                                    <option value="">+ Add product</option>
                                    {filteredProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </Select>
                            </div>
                        </div>
                        {lines.length === 0 ? (
                            <p className="text-sm text-graphite-300 italic py-3 text-center bg-white/[0.03] rounded-lg border border-dashed border-white/10">No items yet — pick from the dropdown above</p>
                        ) : (
                            <div className="space-y-2 bg-white/[0.03] rounded-lg p-3 border border-white/10">
                                {lines.map((l, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <span className="text-sm text-graphite-200 flex-1">{l.name}</span>
                                        <input type="number" min={1} value={l.quantity}
                                            title={`Quantity for ${l.name}`} aria-label={`Quantity for ${l.name}`}
                                            onChange={e => setLines(p => p.map((x,j) => j===i ? { ...x, quantity:+e.target.value } : x))}
                                            className="w-16 text-center rounded-md border border-white/10 bg-white/[0.03] text-white px-2 py-1.5 text-sm outline-none focus:border-signal-cyan/60 focus:ring-2 focus:ring-signal-cyan/30" />
                                        <button type="button" title="Remove" aria-label="Remove item"
                                            onClick={() => setLines(p => p.filter((_,j) => j!==i))}
                                            className="p-1 text-graphite-500 hover:text-signal-red hover:bg-signal-red/10 rounded-md transition-all">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <ModalFooter>
                        <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                        <Button type="submit" loading={saving}>Create Draft</Button>
                    </ModalFooter>
                </form>
            </Modal>
        </div>
    );
}
