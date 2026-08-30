"use client";
import { useEffect, useState } from "react";
import { api } from "@/app/lib/api";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { IconButton, IconButtonRow } from "@/components/ui/icon-button";
import { CreditCardIcon, PrinterIcon, RefreshIcon, TruckIcon } from "@/components/ui/icons";
import { motion, AnimatePresence } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

type LabelRow = {
    id: string; orderId: string; customerName: string; customerEmail: string;
    shipAddress1: string; shipCity: string; shipState: string; shipZip: string;
    shippingLabelUrl: string | null;
    shippingTrackingNumber: string | null;
    shippingCarrier: string | null;
    shippingService: string | null;
};

type ConfirmBuy = { ids: string[]; regenerate: boolean } | null;

const statusColor: Record<string, string> = { pending: "warning", labeled: "success" };
const statusLabel: Record<string, string> = { pending: "Pending", labeled: "Labeled" };

export default function ShippingLabelsPage() {
    const { toast } = useToast();
    const [rows, setRows] = useState<LabelRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [buyingIds, setBuyingIds] = useState<Set<string>>(new Set());
    const [confirmBuy, setConfirmBuy] = useState<ConfirmBuy>(null);
    const [buying, setBuying] = useState(false);

    function load() {
        setLoading(true);
        api("/orders?status=UNFULFILLED&limit=500")
            .then((d: any) => {
                const orders = Array.isArray(d) ? d : d?.data ?? [];
                // Pickup orders don't ship — nothing to label here
                const shipping = orders.filter((o: any) => o.shippingMethod === "SHIP");
                setRows(shipping.map((o: any) => ({
                    id: o.id, orderId: o.id, customerName: o.customerName, customerEmail: o.customerEmail,
                    shipAddress1: o.shipAddress1, shipCity: o.shipCity, shipState: o.shipState, shipZip: o.shipZip,
                    shippingLabelUrl: o.shippingLabelUrl ?? null,
                    shippingTrackingNumber: o.shippingTrackingNumber ?? null,
                    shippingCarrier: o.shippingCarrier ?? null,
                    shippingService: o.shippingService ?? null,
                })));
            }).catch(console.error).finally(() => setLoading(false));
    }

    useEffect(load, []);

    function statusOf(r: LabelRow) { return r.shippingLabelUrl ? "labeled" : "pending"; }

    const filtered = rows.filter(r => {
        const q = search.toLowerCase();
        return (!q || r.customerName.toLowerCase().includes(q) || r.customerEmail.toLowerCase().includes(q))
            && (!statusFilter || statusOf(r) === statusFilter);
    });

    function toggleSelect(id: string) { setSelectedIds(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
    function selectAll() { setSelectedIds(p => p.size === filtered.length ? new Set() : new Set(filtered.map(r => r.id))); }

    // Purchasing a label is a real, chargeable Shippo transaction — always
    // confirmed first, one at a time here, so a stray double-click can't buy two.
    async function confirmedBuy() {
        if (!confirmBuy || buying) return;
        const { ids, regenerate } = confirmBuy;
        setBuying(true);
        setBuyingIds(prev => new Set([...prev, ...ids]));
        let bought = 0;
        const errors: string[] = [];
        for (const id of ids) {
            try {
                const updated = await api(`/orders/${id}/shipping-label${regenerate ? "?regenerate=true" : ""}`, { method: "POST" });
                setRows(p => p.map(r => r.id === id ? {
                    ...r,
                    shippingLabelUrl: updated.shippingLabelUrl,
                    shippingTrackingNumber: updated.shippingTrackingNumber,
                    shippingCarrier: updated.shippingCarrier,
                    shippingService: updated.shippingService,
                } : r));
                bought++;
            } catch (err: any) {
                const row = rows.find(r => r.id === id);
                errors.push(`${row?.customerName ?? id}: ${err.message?.replace(/^HTTP \d+:\s*/, "") ?? "failed"}`);
            }
        }
        setBuyingIds(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n; });
        setBuying(false);
        setConfirmBuy(null);
        if (bought) toast(`${bought} label${bought !== 1 ? "s" : ""} purchased`);
        if (errors.length) toast(errors.slice(0, 3).join(" · "));
    }

    function printLabels(ids: string[]) {
        const urls = rows.filter(r => ids.includes(r.id) && r.shippingLabelUrl).map(r => r.shippingLabelUrl!);
        if (urls.length === 0) { toast("No labels bought yet for the selected order(s)"); return; }
        urls.forEach(u => window.open(u, "_blank"));
        toast(`Opened ${urls.length} label${urls.length !== 1 ? "s" : ""} — print from each tab (allow pop-ups if blocked)`);
    }

    async function markShipped(ids: string[]) {
        let count = 0;
        for (const id of ids) {
            try { await api(`/orders/${id}/fulfill`, { method: "POST" }); count++; } catch { /* keep going */ }
        }
        setRows(p => p.filter(r => !ids.includes(r.id)));
        setSelectedIds(new Set());
        toast(`${count} order${count !== 1 ? "s" : ""} marked shipped`);
    }

    function exportCSV() {
        const url = `${process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000/api"}/orders/shipping/export?status=UNFULFILLED`;
        window.open(url, "_blank"); toast("Downloading shipping CSV");
    }

    const selectedPending = Array.from(selectedIds).filter(id => !rows.find(r => r.id === id)?.shippingLabelUrl);
    const selectedLabeled = Array.from(selectedIds).filter(id => rows.find(r => r.id === id)?.shippingLabelUrl);

    return (
        <div className="space-y-6">
            <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
                <div>
                    <h1 className="page-title">Shipping Labels</h1>
                    <p className="page-subtitle">Unfulfilled orders ready for shipment</p>
                </div>
                <div className="flex gap-2.5 flex-wrap">
                    <Button variant="secondary" onClick={exportCSV}
                        icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}>
                        Export CSV
                    </Button>
                    <AnimatePresence>
                        {selectedIds.size > 0 && (
                            <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }} className="flex gap-2">
                                {selectedPending.length > 0 && (
                                    <Button variant="secondary" onClick={() => setConfirmBuy({ ids: selectedPending, regenerate: false })}
                                        icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3M3.75 4.5h16.5a1.5 1.5 0 011.5 1.5v12a1.5 1.5 0 01-1.5 1.5H3.75a1.5 1.5 0 01-1.5-1.5V6a1.5 1.5 0 011.5-1.5z" /></svg>}>
                                        Buy Labels ({selectedPending.length})
                                    </Button>
                                )}
                                {selectedLabeled.length > 0 && (
                                    <Button variant="secondary" onClick={() => printLabels(selectedLabeled)}
                                        icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" /></svg>}>
                                        Print ({selectedLabeled.length})
                                    </Button>
                                )}
                                <Button variant="success" onClick={() => markShipped(Array.from(selectedIds))}>
                                    Mark Shipped
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            <div className="flex flex-wrap items-center gap-3">
                <div className="relative max-w-xs flex-1">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input className="w-full pl-9 pr-3 py-2.5 text-sm border border-white/10 rounded-md outline-none focus:border-signal-cyan/60 focus:ring-2 focus:ring-signal-cyan/30 bg-white/[0.03] text-white placeholder:text-graphite-500 transition-all"
                        placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full sm:w-36">
                    <option value="">All statuses</option>
                    <option value="pending">Pending</option>
                    <option value="labeled">Labeled</option>
                </Select>
            </div>

            <div className="console-panel rounded-lg overflow-hidden">
                {loading ? (
                    <div className="p-8 space-y-3">
                        {[1, 2, 3, 4].map(i => (<div key={i} className="animate-pulse flex items-center gap-4"><div className="w-4 h-4 bg-white/[0.06] rounded" /><div className="flex-1 h-3 bg-white/[0.04] rounded" /><div className="h-3 w-40 bg-white/[0.06] rounded" /><div className="h-5 w-16 bg-white/[0.06] rounded-full" /></div>))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center py-16 text-graphite-500">
                        <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                        <p className="text-sm text-graphite-300 font-medium">No orders to ship</p>
                        <p className="text-xs text-graphite-500 mt-0.5">Unfulfilled orders will appear here</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <div className="table-wrap"><table className="data-table">
                            <thead>
                                <tr>
                                    <th className="pl-5 w-10">
                                        <input type="checkbox" title="Select all" aria-label="Select all"
                                            checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={selectAll}
                                            className="rounded border-white/20 accent-signal-cyan" />
                                    </th>
                                    <th>Order</th><th>Customer</th><th>Ship To</th><th>Status</th><th>Tracking</th><th className="text-right pr-5">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((r, idx) => {
                                    const status = statusOf(r);
                                    const isBuying = buyingIds.has(r.id);
                                    return (
                                        <motion.tr key={r.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.025, duration: 0.2 }}>
                                            <td className="pl-5">
                                                <input type="checkbox" title={`Select ${r.customerName}`} aria-label={`Select ${r.customerName}`}
                                                    checked={selectedIds.has(r.id)} onChange={() => toggleSelect(r.id)}
                                                    className="rounded border-white/20 accent-signal-cyan" />
                                            </td>
                                            <td><code className="text-xs font-mono font-medium text-signal-cyan">#{r.orderId.slice(-8).toUpperCase()}</code></td>
                                            <td>
                                                <p className="text-sm font-semibold text-white">{r.customerName}</p>
                                                <p className="text-xs text-graphite-300">{r.customerEmail}</p>
                                            </td>
                                            <td>
                                                <p className="text-sm text-graphite-200">{r.shipAddress1 || "—"}</p>
                                                {r.shipCity && <p className="text-xs text-graphite-300">{r.shipCity}, {r.shipState} {r.shipZip}</p>}
                                            </td>
                                            <td><Badge variant={statusColor[status] as any} size="sm">{statusLabel[status]}</Badge></td>
                                            <td>
                                                {r.shippingTrackingNumber ? (
                                                    <>
                                                        <p className="text-xs font-medium text-graphite-200">{r.shippingCarrier} {r.shippingService}</p>
                                                        <p className="text-xs text-graphite-300 font-mono">{r.shippingTrackingNumber}</p>
                                                    </>
                                                ) : <span className="text-xs text-graphite-500">—</span>}
                                            </td>
                                            <td className="text-right pr-5">
                                                <IconButtonRow>
                                                    {status === "pending" ? (
                                                        <IconButton title="Buy shipping label" tone="brand" loading={isBuying}
                                                            onClick={() => setConfirmBuy({ ids: [r.id], regenerate: false })}>
                                                            <CreditCardIcon />
                                                        </IconButton>
                                                    ) : (
                                                        <>
                                                            <IconButton title="Print label" onClick={() => printLabels([r.id])}>
                                                                <PrinterIcon />
                                                            </IconButton>
                                                            <IconButton title="Wrong address or damaged label? Buy a fresh one — this does not refund the original." loading={isBuying}
                                                                onClick={() => setConfirmBuy({ ids: [r.id], regenerate: true })}>
                                                                <RefreshIcon />
                                                            </IconButton>
                                                        </>
                                                    )}
                                                    <IconButton title="Mark shipped" tone="emerald" onClick={() => markShipped([r.id])}>
                                                        <TruckIcon />
                                                    </IconButton>
                                                </IconButtonRow>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table></div>
                    </div>
                )}
            </div>

            <Modal open={!!confirmBuy} onClose={() => !buying && setConfirmBuy(null)} title={confirmBuy?.regenerate ? "Buy a Replacement Label" : "Buy Shipping Label"} size="sm">
                <p className="text-sm text-graphite-300 mb-1">
                    {confirmBuy && confirmBuy.ids.length === 1
                        ? <>This purchases a real, chargeable label from Shippo for <span className="font-semibold text-white">{rows.find(r => r.id === confirmBuy.ids[0])?.customerName}</span>.</>
                        : <>This purchases <span className="font-semibold text-white">{confirmBuy?.ids.length}</span> real, chargeable labels from Shippo.</>}
                </p>
                <p className="text-xs text-graphite-300 mb-4">
                    {confirmBuy?.regenerate
                        ? "The previous label/tracking number for this order will be replaced and is not refunded."
                        : "Your Shippo account will be charged at the carrier's rate. This can't be undone from here."}
                </p>
                <ModalFooter>
                    <Button type="button" variant="outline" onClick={() => setConfirmBuy(null)} disabled={buying}>Cancel</Button>
                    <Button type="button" variant="primary" loading={buying} onClick={confirmedBuy}>
                        {confirmBuy?.regenerate ? "Buy Replacement" : "Buy Label"}
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
}
