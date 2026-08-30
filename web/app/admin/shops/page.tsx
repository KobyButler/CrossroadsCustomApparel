"use client";
import { useEffect, useState } from "react";
import { api } from "@/app/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07 } }
};
const item = {
    hidden: { opacity: 0, y: 8 },
    show:  { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } }
};

type Shop = {
    id: string; name: string; slug: string;
    active: boolean; shippingEnabled: boolean; expiresAt?: string; notes?: string; createdAt: string;
    _count?: { products: number };
};

const EMPTY = { name:"", expiresAt:"", notes:"", shippingEnabled:true };

export default function ShopsPage() {
    const { toast } = useToast();
    const [shops, setShops]           = useState<Shop[]>([]);
    const [loading, setLoading]       = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [editShop, setEditShop]     = useState<Shop | null>(null);
    const [form, setForm]             = useState({ ...EMPTY });
    const [saving, setSaving]         = useState(false);
    const [search, setSearch]         = useState("");

    useEffect(() => {
        api("/shops")
            .then((s: any) => setShops(Array.isArray(s) ? s : s?.data ?? []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const filtered = shops.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()));
    const activeCount = shops.filter(s => s.active).length;

    async function createShop(e: React.FormEvent) {
        e.preventDefault(); setSaving(true);
        try {
            const shop = await api("/shops", { method:"POST", body:JSON.stringify({
                name:form.name,
                expiresAt:form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
                notes:form.notes || undefined,
                shippingEnabled:form.shippingEnabled
            })});
            setShops(p => [shop, ...p]);
            setShowCreate(false); setForm({ ...EMPTY }); toast("Shop created! Link is ready to share.");
        } catch (err: any) { toast(err.message || "Failed to create shop", "error"); }
        finally { setSaving(false); }
    }

    async function saveEdit(e: React.FormEvent) {
        e.preventDefault(); if (!editShop) return; setSaving(true);
        try {
            const u = await api(`/shops/${editShop.id}`, { method:"PATCH", body:JSON.stringify({
                name:form.name,
                expiresAt:form.expiresAt ? new Date(form.expiresAt).toISOString() : null, notes:form.notes||null,
                shippingEnabled:form.shippingEnabled
            })});
            setShops(p => p.map(s => s.id===editShop.id ? { ...s, ...u } : s));
            setEditShop(null); toast("Shop updated");
        } catch (err: any) { toast(err.message || "Failed to update shop", "error"); }
        finally { setSaving(false); }
    }

    async function toggleActive(shop: Shop) {
        try {
            const u = await api(`/shops/${shop.id}`, { method:"PATCH", body:JSON.stringify({ active:!shop.active }) });
            setShops(p => p.map(s => s.id===shop.id ? { ...s, active:u.active } : s));
            toast(`Shop ${u.active ? "activated" : "deactivated"}`);
        } catch (err: any) { toast(err.message || "Failed", "error"); }
    }

    async function toggleShipping(shop: Shop) {
        try {
            const u = await api(`/shops/${shop.id}`, { method:"PATCH", body:JSON.stringify({ shippingEnabled:!shop.shippingEnabled }) });
            setShops(p => p.map(s => s.id===shop.id ? { ...s, shippingEnabled:u.shippingEnabled } : s));
            toast(`Shipping ${u.shippingEnabled ? "enabled" : "disabled"} for ${shop.name}`);
        } catch (err: any) { toast(err.message || "Failed", "error"); }
    }

    function copyLink(slug: string) {
        navigator.clipboard.writeText(`${window.location.origin}/shop/${slug}`).then(() => toast("Link copied!"));
    }

    function openEdit(shop: Shop) {
        setEditShop(shop);
        setForm({ name:shop.name,
            expiresAt:shop.expiresAt ? new Date(shop.expiresAt).toISOString().split("T")[0] : "",
            notes:shop.notes ?? "", shippingEnabled: shop.shippingEnabled });
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
                <div>
                    <h1 className="page-title">Group Shops</h1>
                    <p className="page-subtitle">Create shareable links for teams, schools, and events</p>
                </div>
                <Button
                    variant="primary"
                    onClick={() => { setForm({ ...EMPTY }); setShowCreate(true); }}
                    icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>}
                >
                    New Shop
                </Button>
            </motion.div>

            {/* Stats */}
            <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {[
                    { label:"Total Shops", value:shops.length, color:"text-white" },
                    { label:"Active", value:activeCount, color:"text-signal-green" },
                    { label:"Inactive", value:shops.length-activeCount, color:"text-graphite-300" }
                ].map((s) => (
                    <motion.div key={s.label} variants={item} whileHover={{ y:-2 }} transition={{ duration:0.2, ease:EASE }}
                        className="stat-card">
                        <p className="console-label">{s.label}</p>
                        <p className={`text-2xl font-semibold font-mono tabular-nums mt-2 ${s.color}`}>{loading ? "—" : s.value}</p>
                    </motion.div>
                ))}
            </motion.div>

            {/* Search */}
            <div className="max-w-xs">
                <Input
                    placeholder="Search shops…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    leftIcon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>}
                />
            </div>

            {/* Table */}
            <div className="console-panel rounded-lg overflow-hidden">
                {loading ? (
                    <div className="p-8 space-y-3">
                        {[1,2,3].map(i => (
                            <div key={i} className="flex items-center gap-4">
                                <div className="skeleton w-8 h-8 rounded-md" />
                                <div className="flex-1 space-y-1.5"><div className="skeleton h-3 w-40"/><div className="skeleton h-2.5 w-28"/></div>
                                <div className="skeleton h-5 w-16 rounded-full"/>
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center py-16 text-graphite-500">
                        <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                        <p className="text-sm text-graphite-300 font-medium">No shops yet</p>
                        <p className="text-xs text-graphite-500 mt-0.5">Create a shop to generate a shareable link</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <div className="table-wrap"><table className="data-table">
                            <thead><tr><th>Shop Name</th><th>Products</th><th>Link</th><th>Status</th><th>Shipping</th><th>Expires</th><th className="text-right pr-5">Actions</th></tr></thead>
                            <tbody>
                                {filtered.map((shop, idx) => {
                                    const expired = shop.expiresAt && new Date(shop.expiresAt) < new Date();
                                    return (
                                        <motion.tr key={shop.id} initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} transition={{ delay:idx*0.03, duration:0.2 }}>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-md bg-signal-cyan/10 flex items-center justify-center shrink-0">
                                                        <svg className="w-4 h-4 text-signal-cyan" fill="currentColor" viewBox="0 0 20 20"><path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3z"/></svg>
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-graphite-100 text-sm">{shop.name}</p>
                                                        {shop.notes && <p className="text-xs text-graphite-300 truncate max-w-full sm:max-w-[180px]">{shop.notes}</p>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td><span className="text-sm text-graphite-300">{shop._count?.products ?? 0} product{shop._count?.products === 1 ? "" : "s"}</span></td>
                                            <td>
                                                <div className="flex items-center gap-1.5">
                                                    <a href={`/shop/${shop.slug}`} target="_blank" rel="noopener noreferrer"
                                                        className="text-xs font-mono text-signal-cyan hover:text-signal-cyan-bright hover:underline">
                                                        /shop/{shop.slug}
                                                    </a>
                                                    <button type="button" title="Copy link" aria-label="Copy link" onClick={() => copyLink(shop.slug)}
                                                        className="p-1 rounded-md text-graphite-500 hover:text-signal-cyan hover:bg-signal-cyan/10 transition-all">
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                                                    </button>
                                                </div>
                                            </td>
                                            <td>
                                                <Badge variant={shop.active && !expired ? "success" : "danger"} size="sm">
                                                    {expired ? "Expired" : shop.active ? "Active" : "Inactive"}
                                                </Badge>
                                            </td>
                                            <td>
                                                <button type="button" onClick={() => toggleShipping(shop)}
                                                    title="Click to toggle"
                                                    className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border transition-colors ${shop.shippingEnabled ? "bg-signal-green/10 text-signal-green border-signal-green/25 hover:bg-signal-green/20" : "bg-white/[0.04] text-graphite-300 border-white/10 hover:bg-white/[0.08]"}`}>
                                                    {shop.shippingEnabled ? (
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.25h5.379c.621 0 1.145.504 1.076 1.122a17.902 17.902 0 01-1.052 4.128M14.25 7.5V18.75m0-11.25H8.25m0 0V18.75m0-11.25H4.5A2.25 2.25 0 002.25 9v9.75"/></svg>
                                                    ) : (
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/></svg>
                                                    )}
                                                    {shop.shippingEnabled ? "Ship + Pickup" : "Pickup only"}
                                                </button>
                                            </td>
                                            <td>
                                                {shop.expiresAt ? (
                                                    <span className={`text-xs font-mono ${expired ? "text-signal-red font-medium" : "text-graphite-300"}`}>
                                                        {new Date(shop.expiresAt).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric", timeZone:"UTC" })}
                                                    </span>
                                                ) : <span className="text-xs text-graphite-500">No expiry</span>}
                                            </td>
                                            <td className="text-right pr-5">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button type="button" onClick={() => openEdit(shop)}
                                                        className="px-2.5 py-1 rounded-md text-xs font-medium text-graphite-300 hover:bg-white/[0.06] hover:text-white transition-colors">
                                                        Edit
                                                    </button>
                                                    <button type="button" onClick={() => toggleActive(shop)}
                                                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${shop.active ? "text-signal-red hover:bg-signal-red/10" : "text-signal-green bg-signal-green/10 hover:bg-signal-green/20"}`}>
                                                        {shop.active ? "Deactivate" : "Activate"}
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table></div>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            <Modal open={showCreate || !!editShop} onClose={() => { setShowCreate(false); setEditShop(null); }}
                title={editShop ? "Edit Shop" : "Create Group Shop"}
                description={editShop ? undefined : "A unique shareable link will be generated automatically. Add products to this shop from the Products page."}
                size="md">
                <form onSubmit={editShop ? saveEdit : createShop} className="space-y-4">
                    <Input label="Shop Name" required placeholder="e.g. Central High Football 2024"
                        value={form.name} onChange={e => setForm(p => ({ ...p, name:e.target.value }))} />
                    <Input label="Expiry Date (optional)" type="date" value={form.expiresAt} onChange={e => setForm(p => ({ ...p, expiresAt:e.target.value }))} />
                    <div>
                        <label className="field-label">Notes (optional)</label>
                        <textarea rows={2} placeholder="Internal notes about this shop…" value={form.notes}
                            onChange={e => setForm(p => ({ ...p, notes:e.target.value }))}
                            className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-graphite-500 outline-none focus:border-signal-cyan/60 focus:ring-2 focus:ring-signal-cyan/30 resize-none transition-all" />
                    </div>
                    <div className="bg-white/[0.04] border border-white/10 rounded-lg p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold text-white">Offer shipping</p>
                            <p className="text-xs text-graphite-300 mt-0.5">When off, customers can only choose pickup for this shop</p>
                        </div>
                        <button type="button" role="switch" aria-checked={form.shippingEnabled}
                            onClick={() => setForm(p => ({ ...p, shippingEnabled: !p.shippingEnabled }))}
                            className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${form.shippingEnabled ? "bg-signal-cyan" : "bg-graphite-600"}`}>
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.shippingEnabled ? "translate-x-5" : ""}`} />
                        </button>
                    </div>
                    <ModalFooter>
                        <Button type="button" variant="outline" onClick={() => { setShowCreate(false); setEditShop(null); }}>Cancel</Button>
                        <Button type="submit" loading={saving}>{editShop ? "Save Changes" : "Create Shop"}</Button>
                    </ModalFooter>
                </form>
            </Modal>
        </div>
    );
}
