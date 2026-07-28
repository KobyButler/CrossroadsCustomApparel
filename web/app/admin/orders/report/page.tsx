"use client";
import { useEffect, useState } from "react";
import { api, imgUrl } from "@/app/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { motion } from "framer-motion";
import { getColorCss } from "@/lib/colors";

type Shop = { id: string; name: string };
type ReportLine = {
    productId: string; productName: string; sku: string; vendor: string; image: string | null;
    color: string | null; size: string | null; quantity: number; sourceOrderIds: string[];
};
type Report = {
    shop: { id: string; name: string } | null; status: string; generatedAt: string; orderCount: number;
    lines: ReportLine[]; byVendor: Record<string, ReportLine[]>; alreadyOrdered: Record<string, string[]>;
};

const VENDOR_LABELS: Record<string, string> = { SANMAR: "SanMar", SSACTIVEWEAR: "S&S Activewear", OTHER: "Other" };
const STATUS_OPTIONS = [
    { value: "UNFULFILLED", label: "Unfulfilled" },
    { value: "FULFILLED", label: "Fulfilled" },
    { value: "CANCELLED", label: "Cancelled" },
];

export default function OrderReportPage() {
    const { toast } = useToast();
    const [shops, setShops] = useState<Shop[]>([]);
    const [shopId, setShopId] = useState("");
    const [status, setStatus] = useState("UNFULFILLED");
    const [report, setReport] = useState<Report | null>(null);
    const [loading, setLoading] = useState(true);
    const [placingVendor, setPlacingVendor] = useState<string | null>(null);
    const [confirmVendor, setConfirmVendor] = useState<string | null>(null);

    useEffect(() => {
        api("/shops").then(d => setShops(Array.isArray(d) ? d : d?.data ?? [])).catch(() => {});
    }, []);

    useEffect(() => { fetchReport(); }, [shopId, status]);

    async function fetchReport() {
        setLoading(true);
        try {
            const params = new URLSearchParams({ status });
            if (shopId) params.set("shopId", shopId);
            const r = await api(`/order-report?${params}`);
            setReport(r);
        } catch (err: any) { toast(err.message || "Failed to load report", "error"); }
        finally { setLoading(false); }
    }

    async function placeOrder(vendor: string) {
        setPlacingVendor(vendor);
        try {
            const res = await api("/order-report/place-order", {
                method: "POST",
                body: JSON.stringify({ shopId: shopId || undefined, status, vendor })
            });
            toast(`Order placed with ${VENDOR_LABELS[vendor] ?? vendor} — ${res.ordersMarked} order(s) marked.`);
            setConfirmVendor(null);
            fetchReport();
        } catch (err: any) { toast(err.message || "Failed to place order", "error"); }
        finally { setPlacingVendor(null); }
    }

    const vendors = report ? Object.keys(report.byVendor) : [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
                <div>
                    <h1 className="page-title">Order Report</h1>
                    <p className="page-subtitle">See how many of each product you need to order, and place vendor orders directly</p>
                </div>
                <div className="flex gap-2.5">
                    <Button variant="outline" onClick={() => window.print()}>Print</Button>
                </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap no-print">
                <Select value={shopId} onChange={e => setShopId(e.target.value)} className="w-full sm:w-52">
                    <option value="">All shops</option>
                    {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
                <Select value={status} onChange={e => setStatus(e.target.value)} className="w-full sm:w-44">
                    {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
            </div>

            {/* Print header */}
            <div className="hidden print:block">
                <h1 className="text-xl font-bold">Order Report — {report?.shop?.name ?? "All Shops"}</h1>
                <p className="text-sm text-slate-500">
                    {status} orders · {report?.orderCount ?? 0} order(s) · generated {report ? new Date(report.generatedAt).toLocaleString() : ""}
                </p>
            </div>

            {loading ? (
                <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-card p-8 space-y-3">
                    {[1,2,3].map(i => <div key={i} className="animate-pulse h-4 bg-slate-100 rounded" />)}
                </div>
            ) : !report || report.lines.length === 0 ? (
                <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-card flex flex-col items-center justify-center py-16 text-slate-300">
                    <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7a2 2 0 012-2h6.5L21 9v8a2 2 0 01-2 2H11a2 2 0 01-2-2z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h9"/></svg>
                    <p className="text-sm text-slate-400 font-medium">Nothing to order</p>
                    <p className="text-xs text-slate-300 mt-0.5">No {status.toLowerCase()} orders match this selection</p>
                </div>
            ) : (
                <div className="space-y-6">
                    <p className="text-sm text-slate-500 no-print">
                        {report.orderCount} order{report.orderCount !== 1 ? "s" : ""} · generated {new Date(report.generatedAt).toLocaleString()}
                    </p>

                    {vendors.map(vendor => {
                        const lines = report.byVendor[vendor];
                        const totalQty = lines.reduce((a, l) => a + l.quantity, 0);
                        const alreadyOrderedCount = report.alreadyOrdered[vendor]?.length ?? 0;
                        const isRealVendor = vendor === "SANMAR" || vendor === "SSACTIVEWEAR";

                        return (
                            <motion.div key={vendor} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
                                className="bg-white rounded-2xl ring-1 ring-black/5 shadow-card overflow-hidden">
                                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                                    <div>
                                        <h2 className="text-sm font-bold text-slate-900">{VENDOR_LABELS[vendor] ?? vendor}</h2>
                                        <p className="text-xs text-slate-400">{lines.length} line item{lines.length !== 1 ? "s" : ""} · {totalQty} unit{totalQty !== 1 ? "s" : ""} total</p>
                                    </div>
                                    {isRealVendor && (
                                        <div className="flex items-center gap-2 no-print">
                                            {alreadyOrderedCount > 0 && (
                                                <Badge variant="warning" size="sm">{alreadyOrderedCount} order{alreadyOrderedCount !== 1 ? "s" : ""} already ordered</Badge>
                                            )}
                                            <Button size="sm" loading={placingVendor === vendor} onClick={() => setConfirmVendor(vendor)}>
                                                Place Order with {VENDOR_LABELS[vendor]}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                <div className="overflow-x-auto">
                                    <div className="table-wrap"><table className="data-table">
                                        <thead><tr><th>Product</th><th>SKU</th><th>Color</th><th>Size</th><th className="text-right pr-5">Qty Needed</th></tr></thead>
                                        <tbody>
                                            {lines.map((l, idx) => (
                                                <tr key={`${l.productId}-${l.color}-${l.size}`}>
                                                    <td>
                                                        <div className="flex items-center gap-3">
                                                            {l.image ? (
                                                                <img src={imgUrl(l.image)} alt={l.productName} className="w-8 h-8 rounded-lg object-cover ring-1 ring-black/5 no-print" />
                                                            ) : null}
                                                            <span className="font-semibold text-slate-800 text-sm">{l.productName}</span>
                                                        </div>
                                                    </td>
                                                    <td><code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded-md text-slate-600">{l.sku}</code></td>
                                                    <td>
                                                        {l.color ? (
                                                            <span className="flex items-center gap-1.5 text-sm text-slate-600">
                                                                <span className="w-3 h-3 rounded-full border border-black/10 inline-block no-print" style={{ backgroundColor: getColorCss(l.color) }} />
                                                                {l.color}
                                                            </span>
                                                        ) : <span className="text-slate-300">—</span>}
                                                    </td>
                                                    <td><span className="text-sm text-slate-600">{l.size ?? "—"}</span></td>
                                                    <td className="text-right pr-5"><span className="text-sm font-bold text-slate-900 tabular-nums">{l.quantity}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table></div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Confirm place-order modal */}
            <Modal open={!!confirmVendor} onClose={() => setConfirmVendor(null)} title={`Place order with ${confirmVendor ? VENDOR_LABELS[confirmVendor] : ""}`} size="sm">
                <p className="text-sm text-slate-600 mb-1">
                    This submits a real purchase order to {confirmVendor ? VENDOR_LABELS[confirmVendor] : "the vendor"} for the {status.toLowerCase()} quantities shown{report?.shop ? ` for ${report.shop.name}` : " across all shops"}.
                </p>
                <p className="text-xs text-slate-400 mb-4">Make sure BUSINESS_ADDRESS1/CITY/STATE/ZIP are set in the server .env — that&apos;s where the vendor will ship the blanks.</p>
                <ModalFooter>
                    <Button variant="outline" onClick={() => setConfirmVendor(null)}>Cancel</Button>
                    <Button loading={!!placingVendor} onClick={() => confirmVendor && placeOrder(confirmVendor)}>Confirm &amp; Place Order</Button>
                </ModalFooter>
            </Modal>
        </div>
    );
}
