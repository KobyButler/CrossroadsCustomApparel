"use client";
import { useEffect, useState } from "react";
import { api, imgUrl, printAs } from "@/app/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { ZoomableImage } from "@/components/ui/zoomable-image";
import { motion } from "framer-motion";
import { getColorCss } from "@/lib/colors";

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

type Shop = { id: string; name: string };
type ReportLine = {
    vendor: string; vendorStyle: string; image: string | null;
    productNames: string[]; skus: string[];
    color: string | null; size: string | null; quantity: number; sourceOrderIds: string[];
};
type Report = {
    shop: { id: string; name: string } | null; status: string; generatedAt: string; orderCount: number;
    lines: ReportLine[]; byVendor: Record<string, ReportLine[]>; alreadyOrdered: Record<string, string[]>;
};
type ShipTo = {
    name: string; email: string; address1: string; address2: string | null;
    city: string; state: string; zip: string; residential: boolean; configured: boolean;
};
type Receipt = {
    success: boolean; dryRun?: boolean; dryRunNote?: string | null; vendorMessage?: string | null;
    poNumber: string; externalOrderNumber: string | null; vendor: string; placedAt: string;
    shipTo: { name: string; address1: string; address2: string | null; city: string; state: string; zip: string };
    totalUnits: number; ordersMarked: number;
    lines: { vendorStyle: string; color: string | null; size: string | null; quantity: number; productNames: string[] }[];
};
type HistoryLine = { vendorStyle: string; color: string | null; size: string | null; quantity: number; productNames: string[]; category?: string | null };
type ShopReportLine = {
    productId: string; productName: string; sku: string; image: string | null;
    color: string | null; size: string | null; quantity: number; sourceOrderIds: string[];
};
type ShopReportGroup = { shop: { id: string; name: string } | null; orderCount: number; lines: ShopReportLine[] };
type ShopReport = { status: string; generatedAt: string; orderCount: number; shops: ShopReportGroup[] };

// SanMar's category feed joins garment type + fit/demographic modifiers with
// semicolons in no consistent order (e.g. "T-Shirts;Youth" or "Youth;T-Shirts")
// — just make it readable rather than guessing which segment is "the real" type.
function formatCategory(category: string | null | undefined): string {
    if (!category) return "—";
    return category.split(";").map(s => s.trim()).filter(Boolean).join(" / ");
}

function csvCell(value: string | number | null | undefined): string {
    const s = String(value ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
type HistoryEntry = {
    id: string; poNumber: string; vendor: string; status: string; createdAt: string;
    shopName: string | null; totalUnits: number | null; lines: HistoryLine[] | null;
    rawResponse: string | null; contributingOrderCount: number;
};

const VENDOR_LABELS: Record<string, string> = { SANMAR: "SanMar", SSACTIVEWEAR: "S&S Activewear", OTHER: "Other" };
const STATUS_OPTIONS = [
    { value: "UNFULFILLED", label: "Unfulfilled" },
    { value: "FULFILLED", label: "Fulfilled" },
    { value: "CANCELLED", label: "Cancelled" },
];

function lineKey(l: { vendorStyle: string; color: string | null; size: string | null }) {
    return `${l.vendorStyle}|${l.color ?? ""}|${l.size ?? ""}`;
}

export default function OrderReportPage() {
    const { toast } = useToast();
    const [shops, setShops] = useState<Shop[]>([]);
    const [shopId, setShopId] = useState("");
    const [status, setStatus] = useState("UNFULFILLED");
    const [report, setReport] = useState<Report | null>(null);
    const [shipTo, setShipTo] = useState<ShipTo | null>(null);
    const [loading, setLoading] = useState(true);
    const [placing, setPlacing] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [confirmVendor, setConfirmVendor] = useState<string | null>(null);
    const [receipt, setReceipt] = useState<Receipt | null>(null);

    const [view, setView] = useState<"place" | "shop" | "history">("place");
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
    const [shopReport, setShopReport] = useState<ShopReport | null>(null);
    const [loadingShopReport, setLoadingShopReport] = useState(false);

    useEffect(() => {
        api("/shops").then(d => setShops(Array.isArray(d) ? d : d?.data ?? [])).catch(() => {});
        api("/order-report/ship-to").then(setShipTo).catch(() => {});
    }, []);

    useEffect(() => { fetchReport(); }, [shopId, status]);

    useEffect(() => { if (view === "history") fetchHistory(); }, [view]);

    useEffect(() => { if (view === "shop") fetchShopReport(); }, [view, shopId, status]);

    async function fetchHistory() {
        setLoadingHistory(true);
        try {
            const r = await api("/order-report/history?vendor=SANMAR");
            setHistory(r.history ?? []);
        } catch (err: any) { toast(err.message || "Failed to load order history", "error"); }
        finally { setLoadingHistory(false); }
    }

    async function fetchShopReport() {
        setLoadingShopReport(true);
        try {
            const params = new URLSearchParams({ status });
            if (shopId) params.set("shopId", shopId);
            const r = await api(`/order-report/shop-report?${params}`);
            setShopReport(r);
        } catch (err: any) { toast(err.message || "Failed to load shop report", "error"); }
        finally { setLoadingShopReport(false); }
    }

    function exportHistoryEntryCSV(h: HistoryEntry) {
        const header = ["PO Number", "Shop", "Date", "Status", "Vendor Style", "Product", "Category", "Color", "Size", "Quantity"];
        const rows = (h.lines && h.lines.length > 0 ? h.lines : [null]).map(l => [
            h.poNumber, h.shopName ?? "Multiple / all shops", new Date(h.createdAt).toLocaleString(), h.status,
            l?.vendorStyle ?? "", l?.productNames?.join("; ") ?? "", formatCategory(l?.category) === "—" ? "" : formatCategory(l?.category),
            l?.color ?? "", l?.size ?? "", l?.quantity ?? ""
        ]);
        const csv = [header, ...rows].map(row => row.map(csvCell).join(",")).join("\n");
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        a.download = `sanmar-order-${h.poNumber.replace(/[^A-Za-z0-9-]+/g, "_")}.csv`;
        a.click();
        toast("Order exported");
    }

    async function fetchReport() {
        setLoading(true);
        try {
            const params = new URLSearchParams({ status });
            if (shopId) params.set("shopId", shopId);
            const r = await api(`/order-report?${params}`);
            setReport(r);
            setSelected(new Set());
        } catch (err: any) { toast(err.message || "Failed to load report", "error"); }
        finally { setLoading(false); }
    }

    function toggleLine(key: string) {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    }

    function toggleVendorAll(lines: ReportLine[]) {
        const keys = lines.map(lineKey);
        const allSelected = keys.every(k => selected.has(k));
        setSelected(prev => {
            const next = new Set(prev);
            if (allSelected) keys.forEach(k => next.delete(k));
            else keys.forEach(k => next.add(k));
            return next;
        });
    }

    // Which lines will actually be submitted if "Place Order" is clicked for this vendor:
    // the ones checked (if any), otherwise everything currently shown for that vendor.
    function linesToSubmit(vendor: string): ReportLine[] {
        if (!report) return [];
        const all = report.byVendor[vendor] ?? [];
        const chosen = all.filter(l => selected.has(lineKey(l)));
        return chosen.length > 0 ? chosen : all;
    }

    async function placeOrder(vendor: string) {
        const lines = linesToSubmit(vendor);
        setPlacing(true);
        try {
            const res: Receipt = await api("/order-report/place-order", {
                method: "POST",
                body: JSON.stringify({
                    shopId: shopId || undefined, status, vendor,
                    lines: lines.map(l => ({ vendorStyle: l.vendorStyle, color: l.color, size: l.size }))
                })
            });
            setConfirmVendor(null);
            setReceipt(res);
            fetchReport();
        } catch (err: any) { toast(err.message || "Failed to place order", "error"); }
        finally { setPlacing(false); }
    }

    function printReceipt() {
        if (!receipt) return;
        printAs(receipt.poNumber);
    }

    function printReport() {
        const shopName = report?.shop?.name ?? "All Shops";
        const dateStr = new Date().toISOString().split("T")[0];
        const label = view === "shop" ? "Shop Report" : "Order Report";
        printAs(`${label} - ${shopName} - ${dateStr}`);
    }

    function exportShopReportCSV() {
        if (!shopReport) return;
        const header = ["Shop", "Product", "SKU", "Color", "Size", "Quantity"];
        const rows = shopReport.shops.flatMap(g =>
            g.lines.map(l => [g.shop?.name ?? "No shop", l.productName, l.sku, l.color ?? "", l.size ?? "", l.quantity])
        );
        const csv = [header, ...rows].map(row => row.map(csvCell).join(",")).join("\n");
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        a.download = `shop-report-${status.toLowerCase()}-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        toast("Shop report exported");
    }

    const vendors = report ? Object.keys(report.byVendor) : [];
    const confirmLines = confirmVendor ? linesToSubmit(confirmVendor) : [];
    const confirmSelectedCount = confirmVendor ? (report?.byVendor[confirmVendor] ?? []).filter(l => selected.has(lineKey(l))).length : 0;
    const confirmTotalUnits = confirmLines.reduce((a, l) => a + l.quantity, 0);

    return (
        <div className="space-y-6">
            <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print"
            >
                <div>
                    <h1 className="page-title">Order Report</h1>
                    <p className="page-subtitle">See how many of each product you need to order, and place vendor orders directly</p>
                </div>
                <div className="flex gap-2.5">
                    {view === "shop" && (
                        <Button variant="outline" onClick={exportShopReportCSV} disabled={!shopReport || shopReport.shops.length === 0}>Export CSV</Button>
                    )}
                    <Button variant="outline" onClick={printReport}>Print</Button>
                </div>
            </motion.div>

            <div className="flex items-center gap-1 border-b border-white/[0.06] no-print">
                {(["place", "shop", "history"] as const).map(v => (
                    <button key={v} type="button" onClick={() => setView(v)}
                        className={`relative px-4 py-2.5 text-sm font-medium transition-colors -mb-px ${view === v ? "text-signal-cyan border-b-2 border-signal-cyan" : "text-graphite-300 hover:text-graphite-100 border-b-2 border-transparent"}`}>
                        {v === "place" ? "Place Orders" : v === "shop" ? "Shop Report" : "SanMar Order History"}
                    </button>
                ))}
            </div>

            {view === "place" && (
            <>
            <div className="flex items-center gap-3 flex-wrap no-print">
                <Select value={shopId} onChange={e => setShopId(e.target.value)} className="w-full sm:w-52">
                    <option value="">All shops</option>
                    {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
                <Select value={status} onChange={e => setStatus(e.target.value)} className="w-full sm:w-44">
                    {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
            </div>

            {shipTo && !shipTo.configured && (
                <div className="flex items-start gap-2 bg-signal-amber/[0.08] border border-signal-amber/25 rounded-lg px-4 py-3 no-print">
                    <svg className="w-4 h-4 text-signal-amber mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                    <p className="text-xs text-graphite-100">Ship-to address isn&apos;t set yet — placing a real vendor order is disabled until <code className="font-mono text-graphite-300">BUSINESS_ADDRESS1/CITY/STATE/ZIP</code> are set in the server environment.</p>
                </div>
            )}

            {/* Print header */}
            <div className="hidden print:block">
                <h1 className="text-xl font-bold">Order Report — {report?.shop?.name ?? "All Shops"}</h1>
                <p className="text-sm text-slate-500">
                    {status} orders · {report?.orderCount ?? 0} order(s) · generated {report ? new Date(report.generatedAt).toLocaleString() : ""}
                </p>
            </div>

            {loading ? (
                <div className="console-panel rounded-lg p-8 space-y-3 print:hidden">
                    {[1,2,3].map(i => <div key={i} className="skeleton h-4" />)}
                </div>
            ) : !report || report.lines.length === 0 ? (
                <div className="console-panel rounded-lg flex flex-col items-center justify-center py-16 text-graphite-500 print:hidden">
                    <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7a2 2 0 012-2h6.5L21 9v8a2 2 0 01-2 2H11a2 2 0 01-2-2z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h9"/></svg>
                    <p className="text-sm text-graphite-300 font-medium">Nothing to order</p>
                    <p className="text-xs text-graphite-500 mt-0.5">No {status.toLowerCase()} orders match this selection</p>
                </div>
            ) : (
                <div className="space-y-6">
                    <p className="text-sm text-graphite-300 no-print">
                        {report.orderCount} order{report.orderCount !== 1 ? "s" : ""} · generated {new Date(report.generatedAt).toLocaleString()}
                    </p>

                    {vendors.map((vendor, vIdx) => {
                        const lines = report.byVendor[vendor];
                        const totalQty = lines.reduce((a, l) => a + l.quantity, 0);
                        const alreadyOrderedCount = report.alreadyOrdered[vendor]?.length ?? 0;
                        const isRealVendor = vendor === "SANMAR" || vendor === "SSACTIVEWEAR";
                        // Placing a new vendor PO only makes sense against pending (Unfulfilled)
                        // orders — never against orders already shipped or cancelled.
                        const canPlaceOrders = isRealVendor && status === "UNFULFILLED";
                        const vendorSelectedCount = lines.filter(l => selected.has(lineKey(l))).length;
                        const allChecked = lines.length > 0 && vendorSelectedCount === lines.length;

                        return (
                            <motion.div key={vendor} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
                                transition={{ duration: 0.35, ease: EASE, delay: vIdx * 0.05 }}
                                className="console-panel rounded-lg overflow-hidden print:bg-white print:border print:border-slate-200 print:shadow-none print:rounded-none">
                                <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] print:border-slate-100">
                                    <div>
                                        <h2 className="text-sm font-bold text-white print:text-slate-900">{VENDOR_LABELS[vendor] ?? vendor}</h2>
                                        <p className="text-xs text-graphite-300 print:text-slate-400">{lines.length} line item{lines.length !== 1 ? "s" : ""} · {totalQty} unit{totalQty !== 1 ? "s" : ""} total</p>
                                    </div>
                                    {canPlaceOrders ? (
                                        <div className="flex items-center gap-2 no-print">
                                            {alreadyOrderedCount > 0 && (
                                                <Badge variant="warning" size="sm">{alreadyOrderedCount} order{alreadyOrderedCount !== 1 ? "s" : ""} already ordered</Badge>
                                            )}
                                            <Button size="sm" disabled={shipTo ? !shipTo.configured : false} onClick={() => setConfirmVendor(vendor)}>
                                                {vendorSelectedCount > 0
                                                    ? `Place Order — ${vendorSelectedCount} Selected`
                                                    : `Place Order — All ${lines.length} Items`}
                                            </Button>
                                        </div>
                                    ) : isRealVendor ? (
                                        <p className="text-xs text-graphite-300 no-print">Ordering is only available for Unfulfilled orders</p>
                                    ) : null}
                                </div>
                                <div className="overflow-x-auto">
                                    <div className="table-wrap"><table className="data-table">
                                        <thead><tr>
                                            {canPlaceOrders && (
                                                <th className="w-10 pl-5 no-print">
                                                    <input type="checkbox" title="Select all" aria-label={`Select all ${VENDOR_LABELS[vendor]} lines`}
                                                        checked={allChecked} onChange={() => toggleVendorAll(lines)}
                                                        className="rounded border-white/20 accent-signal-cyan" />
                                                </th>
                                            )}
                                            <th>Vendor Style</th><th>Your Product(s)</th><th>Color</th><th>Size</th><th className="text-right pr-5">Qty Needed</th>
                                        </tr></thead>
                                        <tbody>
                                            {lines.map((l) => {
                                                const key = lineKey(l);
                                                const checked = selected.has(key);
                                                return (
                                                    <tr key={key} className={checked ? "bg-signal-cyan/[0.06]" : undefined}>
                                                        {canPlaceOrders && (
                                                            <td className="pl-5 no-print">
                                                                <input type="checkbox" checked={checked} onChange={() => toggleLine(key)}
                                                                    title={`Select ${l.vendorStyle}`} aria-label={`Select ${l.vendorStyle} ${l.color ?? ""} ${l.size ?? ""}`}
                                                                    className="rounded border-white/20 accent-signal-cyan" />
                                                            </td>
                                                        )}
                                                        <td>
                                                            <div className="flex items-center gap-3">
                                                                {l.image ? (
                                                                    <ZoomableImage src={imgUrl(l.image)} alt={l.vendorStyle}
                                                                        wrapperClassName="no-print"
                                                                        className="w-8 h-8 rounded-md object-cover ring-1 ring-white/10" />
                                                                ) : null}
                                                                <code className="text-sm font-mono font-bold text-white print:text-slate-800">{l.vendorStyle}</code>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className="flex flex-col gap-0.5">
                                                                {l.productNames.map((name, i) => (
                                                                    <span key={name} className="text-xs text-graphite-300 print:text-slate-600">
                                                                        {name} <code className="text-graphite-400 print:text-slate-400">({l.skus[i]})</code>
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            {l.color ? (
                                                                <span className="flex items-center gap-1.5 text-sm text-graphite-300 print:text-slate-600">
                                                                    <span className="w-3 h-3 rounded-full border border-white/10 inline-block no-print" style={{ backgroundColor: getColorCss(l.color) }} />
                                                                    {l.color}
                                                                </span>
                                                            ) : <span className="text-graphite-500 print:text-slate-300">—</span>}
                                                        </td>
                                                        <td><span className="text-sm text-graphite-300 print:text-slate-600">{l.size ?? "—"}</span></td>
                                                        <td className="text-right pr-5"><span className="text-sm font-bold font-mono text-white tabular-nums print:text-slate-900">{l.quantity}</span></td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table></div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
            </>
            )}

            {view === "shop" && (
            <>
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
                <h1 className="text-xl font-bold">Shop Report — {shopReport?.shops.length === 1 ? (shopReport.shops[0].shop?.name ?? "All Shops") : "All Shops"}</h1>
                <p className="text-sm text-slate-500">
                    {status} orders · {shopReport?.orderCount ?? 0} order(s) · generated {shopReport ? new Date(shopReport.generatedAt).toLocaleString() : ""}
                </p>
            </div>

            {loadingShopReport ? (
                <div className="console-panel rounded-lg p-8 space-y-3 print:hidden">
                    {[1,2,3].map(i => <div key={i} className="skeleton h-4" />)}
                </div>
            ) : !shopReport || shopReport.shops.length === 0 ? (
                <div className="console-panel rounded-lg flex flex-col items-center justify-center py-16 text-graphite-500 print:hidden">
                    <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7a2 2 0 012-2h6.5L21 9v8a2 2 0 01-2 2H11a2 2 0 01-2-2z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h9"/></svg>
                    <p className="text-sm text-graphite-300 font-medium">Nothing to report</p>
                    <p className="text-xs text-graphite-500 mt-0.5">No {status.toLowerCase()} orders match this selection</p>
                </div>
            ) : (
                <div className="space-y-6">
                    <p className="text-sm text-graphite-300 no-print">
                        {shopReport.orderCount} order{shopReport.orderCount !== 1 ? "s" : ""} · generated {new Date(shopReport.generatedAt).toLocaleString()}
                    </p>

                    {shopReport.shops.map((g, gIdx) => {
                        const totalQty = g.lines.reduce((a, l) => a + l.quantity, 0);
                        return (
                            <motion.div key={g.shop?.id ?? "__none__"} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
                                transition={{ duration: 0.35, ease: EASE, delay: gIdx * 0.05 }}
                                className="console-panel rounded-lg overflow-hidden print:bg-white print:border print:border-slate-200 print:shadow-none print:rounded-none">
                                <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] print:border-slate-100">
                                    <div>
                                        <h2 className="text-sm font-bold text-white print:text-slate-900">{g.shop?.name ?? "No shop"}</h2>
                                        <p className="text-xs text-graphite-300 print:text-slate-400">{g.orderCount} order{g.orderCount !== 1 ? "s" : ""} · {g.lines.length} line item{g.lines.length !== 1 ? "s" : ""} · {totalQty} unit{totalQty !== 1 ? "s" : ""} total</p>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <div className="table-wrap"><table className="data-table">
                                        <thead><tr>
                                            <th>Product</th><th>SKU</th><th>Color</th><th>Size</th><th className="text-right pr-5">Qty Ordered</th>
                                        </tr></thead>
                                        <tbody>
                                            {g.lines.map(l => (
                                                <tr key={`${l.productId}|${l.color ?? ""}|${l.size ?? ""}`}>
                                                    <td>
                                                        <div className="flex items-center gap-3">
                                                            {l.image ? (
                                                                <ZoomableImage src={imgUrl(l.image)} alt={l.productName}
                                                                    wrapperClassName="no-print"
                                                                    className="w-8 h-8 rounded-md object-cover ring-1 ring-white/10" />
                                                            ) : null}
                                                            <span className="text-sm font-medium text-white print:text-slate-800">{l.productName}</span>
                                                        </div>
                                                    </td>
                                                    <td><code className="text-xs font-mono text-graphite-300 print:text-slate-500">{l.sku}</code></td>
                                                    <td>
                                                        {l.color ? (
                                                            <span className="flex items-center gap-1.5 text-sm text-graphite-300 print:text-slate-600">
                                                                <span className="w-3 h-3 rounded-full border border-white/10 inline-block no-print" style={{ backgroundColor: getColorCss(l.color) }} />
                                                                {l.color}
                                                            </span>
                                                        ) : <span className="text-graphite-500 print:text-slate-300">—</span>}
                                                    </td>
                                                    <td><span className="text-sm text-graphite-300 print:text-slate-600">{l.size ?? "—"}</span></td>
                                                    <td className="text-right pr-5"><span className="text-sm font-bold font-mono text-white tabular-nums print:text-slate-900">{l.quantity}</span></td>
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
            </>
            )}

            {view === "history" && (
                <div className="console-panel rounded-lg overflow-hidden print:bg-white print:border print:border-slate-200 print:shadow-none print:rounded-none">
                    {loadingHistory ? (
                        <div className="p-8 space-y-3 print:hidden">
                            {[1,2,3].map(i => <div key={i} className="skeleton h-4" />)}
                        </div>
                    ) : history.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-graphite-500 print:hidden">
                            <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7a2 2 0 012-2h6.5L21 9v8a2 2 0 01-2 2H11a2 2 0 01-2-2z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h9"/></svg>
                            <p className="text-sm text-graphite-300 font-medium">No SanMar orders placed yet</p>
                            <p className="text-xs text-graphite-500 mt-0.5">Purchase orders you submit will show up here</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/[0.05] print:divide-slate-100">
                            {history.map((h, hIdx) => {
                                const isExpanded = expandedHistory === h.id;
                                const isError = h.status.toLowerCase() === "error";
                                const isNotSent = h.status.toLowerCase() === "notsent";
                                const badgeVariant = isNotSent ? "warning" : isError ? "danger" : "success";
                                const badgeLabel = isNotSent ? "Not sent (test mode)" : isError ? "Error" : "Submitted";
                                let errorMessage = "";
                                if (isError && h.rawResponse) {
                                    try { errorMessage = JSON.parse(h.rawResponse)?.message ?? h.rawResponse; }
                                    catch { errorMessage = h.rawResponse; }
                                }
                                return (
                                    <motion.div key={h.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: hIdx * 0.03, duration: 0.2 }}>
                                        <div className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-white/[0.03] transition-colors print:hover:bg-transparent"
                                            onClick={() => setExpandedHistory(isExpanded ? null : h.id)}>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <code className="text-sm font-mono font-bold text-white print:text-slate-800">{h.poNumber}</code>
                                                    <Badge variant={badgeVariant} size="sm">{badgeLabel}</Badge>
                                                </div>
                                                <p className="text-xs text-graphite-300 mt-0.5 print:text-slate-400">
                                                    {h.shopName ?? "Multiple / all shops"} · {new Date(h.createdAt).toLocaleString()}
                                                    {h.totalUnits != null && ` · ${h.totalUnits} unit${h.totalUnits !== 1 ? "s" : ""}`}
                                                    {h.contributingOrderCount > 1 && ` · ${h.contributingOrderCount} customer orders`}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <button type="button" title="Export this order to CSV" aria-label="Export this order to CSV"
                                                    onClick={e => { e.stopPropagation(); exportHistoryEntryCSV(h); }}
                                                    className="text-xs font-semibold text-signal-cyan hover:text-signal-cyan-bright transition-colors print:text-slate-700">
                                                    Export CSV
                                                </button>
                                                <svg className={`w-4 h-4 text-graphite-500 shrink-0 transition-transform print:hidden ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                                            </div>
                                        </div>
                                        {isExpanded && (
                                            <div className="px-5 pb-4 -mt-1 space-y-3">
                                                {isError && errorMessage && (
                                                    <p className="text-xs text-signal-red bg-signal-red/10 border border-signal-red/25 rounded-md px-3 py-2 font-mono whitespace-pre-wrap break-words print:text-red-700 print:bg-red-50 print:border-red-100">
                                                        {errorMessage}
                                                    </p>
                                                )}
                                                {h.lines && h.lines.length > 0 ? (
                                                    <div className="border border-white/10 rounded-lg overflow-hidden print:border-slate-200 print:rounded-none">
                                                        <table className="w-full text-sm">
                                                            <thead className="bg-white/[0.04] print:bg-slate-50"><tr>
                                                                <th className="text-left px-3 py-2 font-semibold text-graphite-300 text-xs print:text-slate-500">Style</th>
                                                                <th className="text-left px-3 py-2 font-semibold text-graphite-300 text-xs print:text-slate-500">Product</th>
                                                                <th className="text-left px-3 py-2 font-semibold text-graphite-300 text-xs print:text-slate-500">Type</th>
                                                                <th className="text-left px-3 py-2 font-semibold text-graphite-300 text-xs print:text-slate-500">Color</th>
                                                                <th className="text-left px-3 py-2 font-semibold text-graphite-300 text-xs print:text-slate-500">Size</th>
                                                                <th className="text-right px-3 py-2 font-semibold text-graphite-300 text-xs print:text-slate-500">Qty</th>
                                                            </tr></thead>
                                                            <tbody className="divide-y divide-white/[0.05] print:divide-slate-100">
                                                                {h.lines.map((l, i) => (
                                                                    <tr key={i}>
                                                                        <td className="px-3 py-2 font-mono text-xs font-bold text-white print:text-slate-800">{l.vendorStyle}</td>
                                                                        <td className="px-3 py-2 text-graphite-300 text-xs print:text-slate-600">{l.productNames.join(", ")}</td>
                                                                        <td className="px-3 py-2 text-graphite-300 text-xs print:text-slate-600">{formatCategory(l.category)}</td>
                                                                        <td className="px-3 py-2 text-graphite-300 print:text-slate-600">{l.color ?? "—"}</td>
                                                                        <td className="px-3 py-2 text-graphite-300 print:text-slate-600">{l.size ?? "—"}</td>
                                                                        <td className="px-3 py-2 text-right font-bold text-white print:text-slate-900">{l.quantity}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-graphite-300 italic print:text-slate-400">Itemized details weren&apos;t recorded for this order (placed before order history tracking was added).</p>
                                                )}
                                                {h.rawResponse && (
                                                    <details>
                                                        <summary className="text-[11px] text-graphite-300 cursor-pointer hover:text-white print:text-slate-400">Raw vendor response</summary>
                                                        <p className="text-[11px] text-graphite-300 bg-white/[0.04] border border-white/10 rounded-md px-3 py-2 font-mono whitespace-pre-wrap break-words mt-1 max-h-48 overflow-y-auto print:text-slate-500 print:bg-slate-50 print:border-slate-100">
                                                            {h.rawResponse}
                                                        </p>
                                                    </details>
                                                )}
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ── Confirm modal: exact itemized review before anything is submitted ── */}
            <Modal open={!!confirmVendor} onClose={() => setConfirmVendor(null)}
                title={`Review order — ${confirmVendor ? VENDOR_LABELS[confirmVendor] : ""}`} size="lg">
                {confirmVendor && (
                    <div className="space-y-4">
                        <p className="text-sm text-graphite-300 print:text-slate-600">
                            You&apos;re about to submit a real purchase order to <strong className="text-white print:text-slate-900">{VENDOR_LABELS[confirmVendor]}</strong> for
                            {confirmSelectedCount > 0 ? ` the ${confirmSelectedCount} item${confirmSelectedCount !== 1 ? "s" : ""} you selected` : ` everything currently shown (${confirmLines.length} item${confirmLines.length !== 1 ? "s" : ""})`}.
                            This cannot be undone from here — review carefully.
                        </p>

                        <div className="border border-white/10 rounded-lg overflow-hidden max-h-64 overflow-y-auto print:max-h-none print:overflow-visible print:border-slate-200 print:rounded-none">
                            <table className="w-full text-sm">
                                <thead className="bg-white/[0.04] sticky top-0 print:bg-slate-50"><tr>
                                    <th className="text-left px-3 py-2 font-semibold text-graphite-300 text-xs print:text-slate-500">Style</th>
                                    <th className="text-left px-3 py-2 font-semibold text-graphite-300 text-xs print:text-slate-500">Color</th>
                                    <th className="text-left px-3 py-2 font-semibold text-graphite-300 text-xs print:text-slate-500">Size</th>
                                    <th className="text-right px-3 py-2 font-semibold text-graphite-300 text-xs print:text-slate-500">Qty</th>
                                </tr></thead>
                                <tbody className="divide-y divide-white/[0.05] print:divide-slate-100">
                                    {confirmLines.map(l => (
                                        <tr key={lineKey(l)}>
                                            <td className="px-3 py-2 font-mono text-xs font-bold text-white print:text-slate-800">{l.vendorStyle}</td>
                                            <td className="px-3 py-2 text-graphite-300 print:text-slate-600">{l.color ?? "—"}</td>
                                            <td className="px-3 py-2 text-graphite-300 print:text-slate-600">{l.size ?? "—"}</td>
                                            <td className="px-3 py-2 text-right font-bold text-white print:text-slate-900">{l.quantity}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot><tr className="border-t border-white/10 print:border-slate-200">
                                    <td colSpan={3} className="px-3 py-2 text-xs font-semibold text-graphite-300 print:text-slate-500">Total units</td>
                                    <td className="px-3 py-2 text-right font-black text-white print:text-slate-900">{confirmTotalUnits}</td>
                                </tr></tfoot>
                            </table>
                        </div>

                        {shipTo && (
                            <div className="bg-white/[0.04] rounded-lg p-4 print:bg-slate-50">
                                <p className="text-xs font-bold text-graphite-300 uppercase tracking-wider mb-1.5 print:text-slate-400">Ships to</p>
                                <p className="text-sm font-semibold text-white print:text-slate-800">{shipTo.name}</p>
                                <p className="text-sm text-graphite-300 print:text-slate-600">{shipTo.address1}{shipTo.address2 ? `, ${shipTo.address2}` : ""}</p>
                                <p className="text-sm text-graphite-300 print:text-slate-600">{shipTo.city}, {shipTo.state} {shipTo.zip}</p>
                            </div>
                        )}

                        <ModalFooter>
                            <Button type="button" variant="outline" onClick={() => setConfirmVendor(null)}>Cancel</Button>
                            <Button loading={placing} onClick={() => placeOrder(confirmVendor)}>Submit Purchase Order</Button>
                        </ModalFooter>
                    </div>
                )}
            </Modal>

            {/* ── Receipt: stays open until dismissed, shows full confirmation details ── */}
            <Modal open={!!receipt} onClose={() => setReceipt(null)} title="Purchase order submitted" size="lg">
                {receipt && (
                    <div className="space-y-4">
                        {receipt.dryRun ? (
                            <div className="flex items-start gap-3 bg-signal-amber/10 border border-signal-amber/30 rounded-lg px-4 py-3 print:bg-amber-50 print:border-amber-300">
                                <div className="w-8 h-8 rounded-full bg-signal-amber/15 flex items-center justify-center shrink-0 print:bg-amber-100">
                                    <svg className="w-4 h-4 text-signal-amber print:text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white print:text-amber-900">NOT sent to {VENDOR_LABELS[receipt.vendor] ?? receipt.vendor} — test mode</p>
                                    <p className="text-xs text-graphite-200 mt-0.5 print:text-amber-800">
                                        The {VENDOR_LABELS[receipt.vendor] ?? receipt.vendor} integration is switched off on the server ({receipt.dryRunNote || "vendor ordering disabled"}), so no real purchase order was placed. Nothing was charged and {VENDOR_LABELS[receipt.vendor] ?? receipt.vendor} has no record of this. Enable the integration server-side, then place this order again.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 bg-signal-green/10 border border-signal-green/25 rounded-lg px-4 py-3 print:bg-emerald-50 print:border-emerald-200">
                                <div className="w-8 h-8 rounded-full bg-signal-green/15 flex items-center justify-center shrink-0 print:bg-emerald-100">
                                    <svg className="w-4 h-4 text-signal-green print:text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white print:text-emerald-900">Submitted to {VENDOR_LABELS[receipt.vendor] ?? receipt.vendor}</p>
                                    <p className="text-xs text-graphite-300 print:text-emerald-700">{new Date(receipt.placedAt).toLocaleString()}</p>
                                </div>
                            </div>
                        )}

                        <div className="bg-white/[0.04] rounded-lg p-3 print:bg-slate-50">
                            <p className="text-[10px] font-bold text-graphite-300 uppercase tracking-wider print:text-slate-400">Your PO Reference</p>
                            <code className="text-sm font-bold text-white print:text-slate-800">{receipt.poNumber}</code>
                            {!receipt.dryRun && (
                                <p className="text-xs text-graphite-300 mt-1 print:text-slate-400">Search for this exact reference in {VENDOR_LABELS[receipt.vendor] ?? receipt.vendor}&apos;s own purchase-history / order-status portal to confirm it was received.</p>
                            )}
                        </div>

                        {receipt.vendorMessage && !receipt.dryRun && (
                            <div className="bg-white/[0.04] rounded-lg p-3 print:bg-slate-50">
                                <p className="text-[10px] font-bold text-graphite-300 uppercase tracking-wider mb-1 print:text-slate-400">{VENDOR_LABELS[receipt.vendor] ?? receipt.vendor}&apos;s response</p>
                                <p className="text-sm text-graphite-200 print:text-slate-700">{receipt.vendorMessage}</p>
                            </div>
                        )}

                        <div className="border border-white/10 rounded-lg overflow-hidden max-h-56 overflow-y-auto print:max-h-none print:overflow-visible print:border-slate-200 print:rounded-none">
                            <table className="w-full text-sm">
                                <thead className="bg-white/[0.04] sticky top-0 print:bg-slate-50"><tr>
                                    <th className="text-left px-3 py-2 font-semibold text-graphite-300 text-xs print:text-slate-500">Style</th>
                                    <th className="text-left px-3 py-2 font-semibold text-graphite-300 text-xs print:text-slate-500">Color</th>
                                    <th className="text-left px-3 py-2 font-semibold text-graphite-300 text-xs print:text-slate-500">Size</th>
                                    <th className="text-right px-3 py-2 font-semibold text-graphite-300 text-xs print:text-slate-500">Qty</th>
                                </tr></thead>
                                <tbody className="divide-y divide-white/[0.05] print:divide-slate-100">
                                    {receipt.lines.map(l => (
                                        <tr key={lineKey(l)}>
                                            <td className="px-3 py-2 font-mono text-xs font-bold text-white print:text-slate-800">{l.vendorStyle}</td>
                                            <td className="px-3 py-2 text-graphite-300 print:text-slate-600">{l.color ?? "—"}</td>
                                            <td className="px-3 py-2 text-graphite-300 print:text-slate-600">{l.size ?? "—"}</td>
                                            <td className="px-3 py-2 text-right font-bold text-white print:text-slate-900">{l.quantity}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot><tr className="border-t border-white/10 print:border-slate-200">
                                    <td colSpan={3} className="px-3 py-2 text-xs font-semibold text-graphite-300 print:text-slate-500">Total units · orders marked</td>
                                    <td className="px-3 py-2 text-right font-black text-white print:text-slate-900">{receipt.totalUnits} · {receipt.ordersMarked}</td>
                                </tr></tfoot>
                            </table>
                        </div>

                        <div className="bg-white/[0.04] rounded-lg p-4 print:bg-slate-50">
                            <p className="text-xs font-bold text-graphite-300 uppercase tracking-wider mb-1.5 print:text-slate-400">Shipped to</p>
                            <p className="text-sm font-semibold text-white print:text-slate-800">{receipt.shipTo.name}</p>
                            <p className="text-sm text-graphite-300 print:text-slate-600">{receipt.shipTo.address1}{receipt.shipTo.address2 ? `, ${receipt.shipTo.address2}` : ""}</p>
                            <p className="text-sm text-graphite-300 print:text-slate-600">{receipt.shipTo.city}, {receipt.shipTo.state} {receipt.shipTo.zip}</p>
                        </div>

                        <p className="text-xs text-graphite-300 print:text-slate-400">
                            {receipt.dryRun
                                ? `The ${receipt.ordersMarked} contributing order${receipt.ordersMarked !== 1 ? "s" : ""} were marked with a vendor order record for tracking, but since nothing was actually sent, don't rely on this — place the order again once vendor ordering is enabled.`
                                : `The ${receipt.ordersMarked} contributing order${receipt.ordersMarked !== 1 ? "s" : ""} now show this vendor order under their details. Track shipment status from ${VENDOR_LABELS[receipt.vendor] ?? receipt.vendor} directly using the reference above.`}
                        </p>

                        <ModalFooter>
                            <Button variant="outline" onClick={printReceipt}>Print Receipt</Button>
                            <Button onClick={() => setReceipt(null)}>Done</Button>
                        </ModalFooter>
                    </div>
                )}
            </Modal>
        </div>
    );
}
