"use client";
import { useEffect, useState } from "react";
import { api } from "@/app/lib/api";
import { Button } from "@/components/ui/button";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { IconButton, IconButtonRow } from "@/components/ui/icon-button";
import { EyeIcon, EditIcon, CheckIcon, XCircleIcon } from "@/components/ui/icons";
import { motion, AnimatePresence } from "framer-motion";

type VendorOrder = {
    id: string; vendor: string; status: string;
    externalOrderNumber?: string; createdAt: string; rawResponse?: string;
};
type OrderItemRow = {
    id: string; productId: string; product?: { id: string; name: string; sku: string };
    size?: string | null; color?: string | null; quantity: number; priceCents: number;
};
type Order = {
    id: string; customerName: string; customerEmail: string;
    status: string; totalCents: number; createdAt: string;
    paymentStatus?: string; paymentMethod?: string;
    items: OrderItemRow[]; shop?: { id: string; name: string } | null; shopId?: string | null;
    shippingMethod?: string; shippingCents?: number;
    shipAddress1?: string; shipAddress2?: string; shipCity?: string; shipState?: string; shipZip?: string;
    residential?: boolean;
    specialInstructions?: string | null;
    vendorOrders?: VendorOrder[];
};
type Product = { id: string; name: string; priceCents: number; sku: string };
type Shop = { id: string; name: string };
type HistoryChange = { field: string; label: string; oldValue: string | null; newValue: string | null };
type HistoryEntry = { id: string; userEmail: string | null; createdAt: string; changes: HistoryChange[] };
type EditItem = { id?: string; productId: string; size: string; color: string; quantity: number; priceDollars: string };

const STATUS_OPTIONS = ["UNFULFILLED", "FULFILLED", "CANCELLED", "DRAFT"];
const PAYMENT_STATUS_OPTIONS = ["UNPAID", "PAID", "OFFLINE_PENDING"];
const PAYMENT_METHOD_OPTIONS = [
    { value: "", label: "— None —" },
    { value: "stripe", label: "Card (Stripe)" },
    { value: "cash", label: "Cash" },
    { value: "check", label: "Check" },
    { value: "pickup", label: "Pay at pickup" },
];
const EMPTY_EDIT_FORM = {
    customerName: "", customerEmail: "", shopId: "",
    status: "UNFULFILLED", paymentStatus: "UNPAID", paymentMethod: "",
    shippingMethod: "PICKUP", shippingDollars: "0.00",
    shipAddress1: "", shipAddress2: "", shipCity: "", shipState: "", shipZip: "", residential: true,
    specialInstructions: "",
};

const TABS = [
    { key: "UNFULFILLED", label: "Unfulfilled"  },
    { key: "FULFILLED",   label: "Fulfilled"    },
    { key: "CANCELLED",   label: "Cancelled"    },
    { key: "all",         label: "All"         },
] as const;

const fmt = (cents: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

export default function OrdersPage() {
    const { toast } = useToast();
    const [orders, setOrders]             = useState<Order[]>([]);
    const [products, setProducts]         = useState<Product[]>([]);
    const [shops, setShops]               = useState<Shop[]>([]);
    const [loading, setLoading]           = useState(true);
    const [tab, setTab]                   = useState<string>("UNFULFILLED");
    const [filterShop, setFilterShop]     = useState("");
    const [search, setSearch]             = useState("");
    const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set());
    const [detailOrder, setDetailOrder]   = useState<Order | null>(null);
    const [expandedVendorOrder, setExpandedVendorOrder] = useState<string | null>(null);
    const [showCreate, setShowCreate]     = useState(false);
    const [showExport, setShowExport]     = useState(false);
    const [creating, setCreating]         = useState(false);
    const [page, setPage]                 = useState(1);
    const [totalPages, setTotalPages]     = useState(1);
    const [totalOrders, setTotalOrders]   = useState(0);
    const PAGE_SIZE = 50;

    const [createForm, setCreateForm] = useState({
        customerName: "", customerEmail: "",
        shipAddress1: "", shipAddress2: "",
        shipCity: "", shipState: "", shipZip: "",
        specialInstructions: ""
    });
    const [cartItems, setCartItems] = useState<{ productId: string; quantity: number }[]>([]);

    const [editOrder, setEditOrder]   = useState<Order | null>(null);
    const [editForm, setEditForm]     = useState({ ...EMPTY_EDIT_FORM });
    const [editItems, setEditItems]   = useState<EditItem[]>([]);
    const [savingEdit, setSavingEdit] = useState(false);

    const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
    const [loadingHistory, setLoadingHistory]  = useState(false);
    const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
    const [cancelling, setCancelling]     = useState(false);

    useEffect(() => { setPage(1); }, [tab, filterShop]);
    useEffect(() => { fetchOrders(); }, [tab, page, filterShop]);
    useEffect(() => { api("/products").then(d => setProducts(Array.isArray(d) ? d : d?.data ?? [])).catch(() => {}); }, []);
    useEffect(() => { api("/shops").then(d => setShops(Array.isArray(d) ? d : d?.data ?? [])).catch(() => {}); }, []);

    useEffect(() => {
        if (!detailOrder) { setHistoryEntries([]); return; }
        setLoadingHistory(true);
        api(`/orders/${detailOrder.id}/history`)
            .then(d => setHistoryEntries(Array.isArray(d) ? d : []))
            .catch(() => setHistoryEntries([]))
            .finally(() => setLoadingHistory(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [detailOrder?.id]);

    async function fetchOrders() {
        setLoading(true);
        try {
            const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(page) });
            if (tab !== "all") params.set("status", tab);
            if (filterShop) params.set("shopId", filterShop);
            const result = await api(`/orders?${params}`);
            setOrders(result.data ?? []);
            setTotalPages(result.pages ?? 1);
            setTotalOrders(result.total ?? 0);
        } catch { setOrders([]); }
        finally { setLoading(false); }
    }

    const filtered = orders.filter(o => {
        const q = search.toLowerCase();
        return !q || o.customerName.toLowerCase().includes(q) ||
            o.customerEmail.toLowerCase().includes(q) || o.id.toLowerCase().includes(q);
    });

    function toggleSelect(id: string) {
        setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    }
    function toggleAll() {
        setSelectedIds(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(o => o.id)));
    }

    async function cancelOrder() {
        if (!cancelTarget) return;
        setCancelling(true);
        try {
            await api(`/orders/${cancelTarget.id}/cancel`, { method: "POST" });
            toast("Order cancelled"); setCancelTarget(null); fetchOrders();
        } catch (err: any) { toast(err.message || "Failed to cancel order", "error"); }
        finally { setCancelling(false); }
    }
    async function markFulfilled(id: string) {
        try { await api(`/orders/${id}/fulfill`, { method: "POST" }); toast("Order marked as fulfilled"); fetchOrders(); }
        catch { toast("Failed to update order", "error"); }
    }
    async function bulkFulfill() {
        let count = 0;
        for (const id of selectedIds) { try { await api(`/orders/${id}/fulfill`, { method: "POST" }); count++; } catch {} }
        toast(`${count} order(s) marked as fulfilled`);
        setSelectedIds(new Set()); fetchOrders();
    }

    function exportCSV() {
        const csvCell = (s: string) => `"${s.replace(/"/g, '""')}"`;
        const csv = [
            ["Order ID","Customer","Email","Status","Total","Date","Items","Comments"].join(","),
            ...filtered.map(o => [o.id,csvCell(o.customerName),o.customerEmail,o.status,`$${(o.totalCents/100).toFixed(2)}`,new Date(o.createdAt).toLocaleDateString(),o.items?.length??0,csvCell(o.specialInstructions ?? "")].join(","))
        ].join("\n");
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        a.download = `orders-${new Date().toISOString().split("T")[0]}.csv`;
        a.click(); setShowExport(false); toast("Orders exported");
    }

    // Prints the orders currently selected via checkboxes, or every currently
    // filtered/visible order if nothing's selected — same scoping as Export.
    function printOrders() {
        const ids = selectedIds.size > 0 ? [...selectedIds] : filtered.map(o => o.id);
        if (ids.length === 0) { toast("No orders to print", "error"); return; }
        window.open(`/admin/orders/print?ids=${ids.join(",")}`, "_blank");
    }

    async function createOrder(e: React.FormEvent) {
        e.preventDefault();
        if (cartItems.length === 0) { toast("Add at least one item", "error"); return; }
        setCreating(true);
        try {
            await api("/orders", { method: "POST", body: JSON.stringify({ ...createForm, items: cartItems }) });
            toast("Order created successfully");
            setShowCreate(false);
            setCreateForm({ customerName:"",customerEmail:"",shipAddress1:"",shipAddress2:"",shipCity:"",shipState:"",shipZip:"",specialInstructions:"" });
            setCartItems([]); fetchOrders();
        } catch (err: any) { toast(err.message || "Failed to create order", "error"); }
        finally { setCreating(false); }
    }

    function openEditOrder(order: Order) {
        setEditOrder(order);
        setEditForm({
            customerName: order.customerName, customerEmail: order.customerEmail,
            shopId: order.shopId ?? order.shop?.id ?? "",
            status: order.status, paymentStatus: order.paymentStatus ?? "UNPAID", paymentMethod: order.paymentMethod ?? "",
            shippingMethod: order.shippingMethod ?? "PICKUP", shippingDollars: (((order.shippingCents ?? 0)) / 100).toFixed(2),
            shipAddress1: order.shipAddress1 ?? "", shipAddress2: order.shipAddress2 ?? "",
            shipCity: order.shipCity ?? "", shipState: order.shipState ?? "", shipZip: order.shipZip ?? "",
            residential: order.residential ?? true,
            specialInstructions: order.specialInstructions ?? "",
        });
        setEditItems((order.items ?? []).map(i => ({
            id: i.id, productId: i.productId, size: i.size ?? "", color: i.color ?? "",
            quantity: i.quantity, priceDollars: (i.priceCents / 100).toFixed(2)
        })));
    }

    function addEditItem() {
        setEditItems(prev => [...prev, { productId: "", size: "", color: "", quantity: 1, priceDollars: "0.00" }]);
    }
    function updateEditItem(idx: number, patch: Partial<EditItem>) {
        setEditItems(prev => prev.map((it, i) => {
            if (i !== idx) return it;
            const next = { ...it, ...patch };
            if (patch.productId !== undefined) {
                const p = products.find(x => x.id === patch.productId);
                if (p) next.priceDollars = (p.priceCents / 100).toFixed(2);
            }
            return next;
        }));
    }
    function removeEditItem(idx: number) {
        setEditItems(prev => prev.filter((_, i) => i !== idx));
    }

    const editSubtotalCents = editItems.reduce((a, i) => a + Math.round((parseFloat(i.priceDollars) || 0) * 100) * (Number(i.quantity) || 0), 0);
    const editShippingCents = Math.round((parseFloat(editForm.shippingDollars) || 0) * 100);
    const editTotalCents = editSubtotalCents + editShippingCents;

    async function saveOrderEdit(e: React.FormEvent) {
        e.preventDefault();
        if (editItems.length === 0) { toast("Add at least one item", "error"); return; }
        if (editItems.some(i => !i.productId)) { toast("Select a product for every item", "error"); return; }
        if (!editOrder) return;
        setSavingEdit(true);
        try {
            const payload = {
                customerName: editForm.customerName, customerEmail: editForm.customerEmail,
                shopId: editForm.shopId || null,
                status: editForm.status, paymentStatus: editForm.paymentStatus, paymentMethod: editForm.paymentMethod || null,
                shippingMethod: editForm.shippingMethod,
                shippingCents: editShippingCents,
                shipAddress1: editForm.shipAddress1 || null, shipAddress2: editForm.shipAddress2 || null,
                shipCity: editForm.shipCity || null, shipState: editForm.shipState || null, shipZip: editForm.shipZip || null,
                residential: editForm.residential,
                specialInstructions: editForm.specialInstructions || null,
                items: editItems.map(i => ({
                    id: i.id, productId: i.productId, size: i.size || null, color: i.color || null,
                    quantity: Math.max(1, Math.round(Number(i.quantity) || 1)),
                    priceCents: Math.round((parseFloat(i.priceDollars) || 0) * 100)
                }))
            };
            const updated = await api(`/orders/${editOrder.id}`, { method: "PUT", body: JSON.stringify(payload) });
            setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
            toast("Order updated");
            setEditOrder(null);
        } catch (err: any) { toast(err.message || "Failed to update order", "error"); }
        finally { setSavingEdit(false); }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="page-title">Orders</h1>
                    <p className="page-subtitle">Manage and fulfill customer orders · {totalOrders} total</p>
                </div>
                <div className="flex gap-2.5 flex-wrap">
                    <motion.button whileHover={{ y:-1 }} whileTap={{ scale:0.97 }}
                        onClick={() => setShowExport(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-700 bg-white ring-1 ring-black/8 shadow-sm hover:shadow-md transition-all duration-200"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                        Export
                    </motion.button>
                    <motion.button whileHover={{ y:-1 }} whileTap={{ scale:0.97 }}
                        onClick={printOrders}
                        title={selectedIds.size > 0 ? `Print ${selectedIds.size} selected order(s) to PDF` : "Print all currently shown orders to PDF"}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-700 bg-white ring-1 ring-black/8 shadow-sm hover:shadow-md transition-all duration-200"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m0 0v3a1 1 0 001 1h8a1 1 0 001-1v-3m0 0H7m10-11V4a1 1 0 00-1-1H8a1 1 0 00-1 1v3"/></svg>
                        Print PDF{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
                    </motion.button>
                    <motion.button whileHover={{ y:-1 }} whileTap={{ scale:0.97 }}
                        onClick={() => setShowCreate(true)}
                        className="btn-shine flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-200"
                        style={{ background:"linear-gradient(135deg,#8b5cf6 0%,#7c3aed 100%)", boxShadow:"0 4px 16px rgba(124,58,237,0.35)" }}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                        New Order
                    </motion.button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-slate-200">
                {TABS.map(t => (
                    <button key={t.key} type="button" onClick={() => setTab(t.key)}
                        className={`relative px-4 py-2.5 text-sm font-medium transition-colors -mb-px ${
                            tab === t.key ? "text-brand-700" : "text-slate-500 hover:text-slate-700"
                        }`}
                    >
                        {tab === t.key && (
                            <motion.div layoutId="orders-tab-indicator"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 rounded-full"
                                transition={{ duration: 0.2 }}
                            />
                        )}
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    <input
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-white shadow-sm transition-all duration-200"
                        placeholder="Search orders…"
                        value={search} onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <Select value={filterShop} onChange={e => setFilterShop(e.target.value)} className="w-full sm:w-44">
                    <option value="">All shops</option>
                    {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
                <AnimatePresence>
                    {selectedIds.size > 0 && (
                        <motion.div initial={{ opacity:0, scale:0.92 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.92 }}
                            className="flex items-center gap-2 ml-auto bg-brand-50 border border-brand-200 rounded-xl px-3 py-1.5"
                        >
                            <span className="text-sm text-brand-700 font-medium">{selectedIds.size} selected</span>
                            <button type="button" onClick={bulkFulfill}
                                className="text-xs font-semibold text-brand-700 hover:text-brand-900 underline underline-offset-2 transition-colors">
                                Mark fulfilled
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-card overflow-hidden">
                {loading ? (
                    <div className="p-8 space-y-3">
                        {[1,2,3,4,5].map(i => (
                            <div key={i} className="animate-pulse flex items-center gap-4">
                                <div className="w-4 h-4 bg-slate-100 rounded" />
                                <div className="w-8 h-8 bg-slate-100 rounded-full" />
                                <div className="flex-1 space-y-1.5">
                                    <div className="h-3 w-36 bg-slate-200 rounded" />
                                    <div className="h-2.5 w-44 bg-slate-100 rounded" />
                                </div>
                                <div className="h-5 w-20 bg-slate-100 rounded-full" />
                                <div className="h-4 w-16 bg-slate-100 rounded" />
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                        <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                        <p className="text-sm text-slate-400 font-medium">No orders found</p>
                        <p className="text-xs text-slate-300 mt-0.5">{search ? "Try a different search" : "Orders will appear here"}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <div className="table-wrap"><table className="data-table">
                            <thead>
                                <tr>
                                    <th className="w-10 pl-5">
                                        <input type="checkbox" title="Select all" aria-label="Select all"
                                            checked={selectedIds.size === filtered.length && filtered.length > 0}
                                            onChange={toggleAll} className="rounded border-slate-300 accent-brand-600" />
                                    </th>
                                    <th>Order</th><th>Customer</th><th>Shop</th>
                                    <th>Items</th><th>Total</th><th>Status</th><th>Payment</th>
                                    <th>Date</th><th className="text-right pr-5">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((order, idx) => (
                                    <motion.tr key={order.id}
                                        initial={{ opacity:0, y:4 }}
                                        animate={{ opacity:1, y:0 }}
                                        transition={{ delay: idx * 0.02, duration: 0.2 }}
                                    >
                                        <td className="pl-5">
                                            <input type="checkbox"
                                                title={`Select order ${order.id.slice(-8).toUpperCase()}`}
                                                aria-label={`Select order ${order.id.slice(-8).toUpperCase()}`}
                                                checked={selectedIds.has(order.id)} onChange={() => toggleSelect(order.id)}
                                                className="rounded border-slate-300 accent-brand-600" />
                                        </td>
                                        <td>
                                            <span className="font-mono text-xs font-medium text-brand-600 hover:text-brand-700 cursor-pointer inline-flex items-center gap-1.5"
                                                onClick={() => setDetailOrder(order)}>
                                                #{order.id.slice(-8).toUpperCase()}
                                                {order.specialInstructions && (
                                                    <svg className="w-3.5 h-3.5 text-violet-400" fill="currentColor" viewBox="0 0 20 20"><title>Has special instructions</title><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd"/></svg>
                                                )}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                                                    <span className="text-[10px] font-bold text-brand-600">
                                                        {(order.customerName ?? "?")[0].toUpperCase()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-800 text-sm leading-none">{order.customerName}</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">{order.customerEmail}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="text-sm text-slate-500">{order.shop?.name || "—"}</span>
                                        </td>
                                        <td>
                                            <span className="text-sm text-slate-600 font-medium">{order.items?.length ?? 0}</span>
                                        </td>
                                        <td>
                                            <span className="text-sm font-bold text-slate-900 tabular-nums">{fmt(order.totalCents)}</span>
                                        </td>
                                        <td>
                                            <Badge variant={statusVariant(order.status)} size="sm">
                                                {order.status.charAt(0) + order.status.slice(1).toLowerCase()}
                                            </Badge>
                                        </td>
                                        <td>
                                            {order.paymentStatus === "PAID" ? (
                                                <Badge variant="success" size="sm">Paid</Badge>
                                            ) : order.paymentStatus === "OFFLINE_PENDING" ? (
                                                <Badge variant="warning" size="sm" dot>
                                                    Due at pickup
                                                </Badge>
                                            ) : (
                                                <Badge variant="neutral" size="sm">Unpaid</Badge>
                                            )}
                                        </td>
                                        <td>
                                            <span className="text-xs text-slate-400">
                                                {new Date(order.createdAt).toLocaleDateString("en-US", { month:"short", day:"numeric" })}
                                            </span>
                                        </td>
                                        <td className="text-right pr-5">
                                            <IconButtonRow>
                                                <IconButton title="View order" onClick={() => setDetailOrder(order)}>
                                                    <EyeIcon />
                                                </IconButton>
                                                <IconButton title="Edit order" onClick={() => openEditOrder(order)}>
                                                    <EditIcon />
                                                </IconButton>
                                                {order.status === "UNFULFILLED" && (
                                                    <>
                                                        <IconButton title="Mark fulfilled" tone="emerald" onClick={() => markFulfilled(order.id)}>
                                                            <CheckIcon />
                                                        </IconButton>
                                                        <IconButton title="Cancel order" tone="red" onClick={() => setCancelTarget(order)}>
                                                            <XCircleIcon />
                                                        </IconButton>
                                                    </>
                                                )}
                                            </IconButtonRow>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table></div>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>{totalOrders} total orders</span>
                    <div className="flex items-center gap-1">
                        <button type="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                            ← Prev
                        </button>
                        <span className="px-3 py-1.5 text-xs text-slate-400">Page {page} of {totalPages}</span>
                        <button type="button" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                            Next →
                        </button>
                    </div>
                </div>
            )}

            {/* Order Detail Modal */}
            <Modal open={!!detailOrder} onClose={() => setDetailOrder(null)}
                title={`Order #${detailOrder?.id.slice(-8).toUpperCase()}`}
                description={detailOrder ? `Placed ${new Date(detailOrder.createdAt).toLocaleString()}` : ""} size="lg">
                {detailOrder && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-slate-50 rounded-xl p-4">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Customer</p>
                                <p className="text-sm font-semibold text-slate-900">{detailOrder.customerName}</p>
                                <p className="text-sm text-slate-500 mt-0.5">{detailOrder.customerEmail}</p>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-4">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                    {detailOrder.shippingMethod === "SHIP" ? "Ship To" : "Fulfillment"}
                                </p>
                                {detailOrder.shippingMethod === "SHIP" ? (
                                    <>
                                        <p className="text-sm text-slate-700">{detailOrder.shipAddress1 || "—"}{detailOrder.shipAddress2 ? `, ${detailOrder.shipAddress2}` : ""}</p>
                                        {detailOrder.shipCity && <p className="text-sm text-slate-500">{detailOrder.shipCity}, {detailOrder.shipState} {detailOrder.shipZip}</p>}
                                        <p className="text-xs text-slate-400 mt-1.5">Shipping: {fmt(detailOrder.shippingCents ?? 0)}</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-sm font-semibold text-emerald-700">🤝 Customer pickup</p>
                                        <p className="text-xs text-slate-400 mt-1">No shipping — collected from {detailOrder.shop?.name ?? "the group shop"}</p>
                                    </>
                                )}
                            </div>
                        </div>
                        {detailOrder.specialInstructions && (
                            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                                <p className="text-xs font-bold text-violet-500 uppercase tracking-wider mb-1.5">Special Instructions</p>
                                <p className="text-sm text-violet-900 whitespace-pre-wrap">{detailOrder.specialInstructions}</p>
                            </div>
                        )}
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                Items ({detailOrder.items?.length})
                            </p>
                            <div className="rounded-xl overflow-hidden border border-slate-100">
                                {detailOrder.items?.map((item: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors text-sm">
                                        <span className="text-slate-800 font-medium">{item.product?.name ?? "Item"} {item.size && <span className="text-slate-400 font-normal">({item.size})</span>}</span>
                                        <span className="text-slate-400 mx-4">×{item.quantity}</span>
                                        <span className="font-bold text-slate-900 tabular-nums">{fmt(item.priceCents * item.quantity)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {detailOrder.vendorOrders && detailOrder.vendorOrders.length > 0 && (
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Vendor Orders</p>
                                <div className="rounded-xl overflow-hidden border border-slate-100 divide-y divide-slate-50">
                                    {detailOrder.vendorOrders.map(vo => {
                                        const isError = vo.status.toLowerCase() === "error";
                                        const isSubmitted = vo.status.toLowerCase() === "submitted";
                                        const isNotSent = vo.status.toLowerCase() === "notsent";
                                        const isExpanded = expandedVendorOrder === vo.id;

                                        // dryRun can show up on an old "Submitted" record too — those were
                                        // created before this got its own NotSent status, so still check
                                        // the raw response rather than trusting the status label alone.
                                        let parsedRaw: any = null;
                                        try { parsedRaw = vo.rawResponse ? JSON.parse(vo.rawResponse) : null; } catch { /* not JSON */ }
                                        const wasDryRun = isNotSent || Boolean(parsedRaw?.dryRun);

                                        let detailText = "";
                                        if (isError) detailText = parsedRaw?.message ?? vo.rawResponse ?? "No error details recorded.";
                                        else if (wasDryRun) detailText = parsedRaw?.note ?? "Vendor integration was disabled — nothing was actually sent.";
                                        else detailText = parsedRaw?.message ?? "";

                                        const expandable = Boolean(vo.rawResponse);
                                        return (
                                            <div key={vo.id}>
                                                <div className={`flex items-center justify-between px-4 py-3 text-sm ${expandable ? "cursor-pointer hover:bg-slate-50" : ""}`}
                                                    onClick={() => expandable && setExpandedVendorOrder(isExpanded ? null : vo.id)}>
                                                    <div>
                                                        <span className="font-medium text-slate-800">{vo.vendor}</span>
                                                        {vo.externalOrderNumber && <span className="ml-2 text-xs text-slate-400 font-mono">#{vo.externalOrderNumber}</span>}
                                                        {wasDryRun && <span className="ml-2 text-[10px] font-bold text-amber-600 uppercase">Not actually sent</span>}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant={wasDryRun ? "warning" : isSubmitted ? "success" : isError ? "danger" : "default"}>
                                                            {wasDryRun && isSubmitted ? "Submitted (test mode)" : vo.status}
                                                        </Badge>
                                                        {expandable && (
                                                            <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                                                        )}
                                                    </div>
                                                </div>
                                                {expandable && isExpanded && (
                                                    <div className="px-4 pb-3 -mt-1 space-y-1.5">
                                                        {detailText && (
                                                            <p className={`text-xs rounded-lg px-3 py-2 font-mono whitespace-pre-wrap break-words ${isError ? "text-red-700 bg-red-50 border border-red-100" : wasDryRun ? "text-amber-800 bg-amber-50 border border-amber-100" : "text-slate-600 bg-slate-50 border border-slate-100"}`}>
                                                                {detailText}
                                                            </p>
                                                        )}
                                                        <details>
                                                            <summary className="text-[11px] text-slate-400 cursor-pointer hover:text-slate-600">Raw vendor response</summary>
                                                            <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 font-mono whitespace-pre-wrap break-words mt-1 max-h-48 overflow-y-auto print:max-h-none print:overflow-visible">
                                                                {vo.rawResponse}
                                                            </p>
                                                        </details>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">History</p>
                            {loadingHistory ? (
                                <p className="text-xs text-slate-300 italic">Loading…</p>
                            ) : historyEntries.length === 0 ? (
                                <p className="text-xs text-slate-300 italic">No edits recorded yet.</p>
                            ) : (
                                <div className="rounded-xl border border-slate-100 divide-y divide-slate-50 max-h-56 overflow-y-auto">
                                    {historyEntries.map(entry => (
                                        <div key={entry.id} className="px-4 py-2.5 text-xs">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-semibold text-slate-600">{entry.userEmail ?? "System"}</span>
                                                <span className="text-slate-400">{new Date(entry.createdAt).toLocaleString()}</span>
                                            </div>
                                            <ul className="space-y-0.5">
                                                {entry.changes.map((c, i) => (
                                                    <li key={i} className="text-slate-600">
                                                        <span className="font-medium">{c.label}:</span>{" "}
                                                        {c.oldValue === null ? (
                                                            <span className="text-emerald-600">{c.newValue}</span>
                                                        ) : c.newValue === null ? (
                                                            <span className="text-red-500 line-through">{c.oldValue}</span>
                                                        ) : (
                                                            <>
                                                                <span className="text-slate-400">{c.oldValue}</span>
                                                                <span className="mx-1 text-slate-300">→</span>
                                                                <span className="text-slate-800 font-medium">{c.newValue}</span>
                                                            </>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex justify-between items-center pt-1">
                            <div className="flex items-center gap-2">
                                <Badge variant={statusVariant(detailOrder.status)}>{detailOrder.status}</Badge>
                                {detailOrder.shop && <span className="text-xs text-slate-400">via {detailOrder.shop.name}</span>}
                            </div>
                            <p className="text-lg font-bold text-slate-900">{fmt(detailOrder.totalCents)}</p>
                        </div>
                        <ModalFooter>
                            <Button variant="outline" onClick={() => setDetailOrder(null)}>Close</Button>
                            <Button variant="outline" onClick={() => { const o = detailOrder; setDetailOrder(null); openEditOrder(o); }}>Edit Order</Button>
                            {detailOrder.status === "UNFULFILLED" && (
                                <>
                                    <Button variant="danger" onClick={() => { const o = detailOrder; setDetailOrder(null); setCancelTarget(o); }}>Cancel Order</Button>
                                    <Button onClick={() => { markFulfilled(detailOrder.id); setDetailOrder(null); }}>Mark Fulfilled</Button>
                                </>
                            )}
                        </ModalFooter>
                    </div>
                )}
            </Modal>

            {/* Edit Order Modal */}
            <Modal open={!!editOrder} onClose={() => setEditOrder(null)}
                title={`Edit Order #${editOrder?.id.slice(-8).toUpperCase()}`}
                description="Adjust any part of this order — changes are recorded in its history." size="xl">
                {editOrder && (
                    <form onSubmit={saveOrderEdit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Input label="Customer Name" required value={editForm.customerName}
                                onChange={e => setEditForm(p => ({ ...p, customerName: e.target.value }))} />
                            <Input label="Customer Email" type="email" required value={editForm.customerEmail}
                                onChange={e => setEditForm(p => ({ ...p, customerEmail: e.target.value }))} />
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                                <label className="field-label">Status</label>
                                <Select value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}>
                                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
                                </Select>
                            </div>
                            <div>
                                <label className="field-label">Payment Status</label>
                                <Select value={editForm.paymentStatus} onChange={e => setEditForm(p => ({ ...p, paymentStatus: e.target.value }))}>
                                    {PAYMENT_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                </Select>
                            </div>
                            <div>
                                <label className="field-label">Payment Method</label>
                                <Select value={editForm.paymentMethod} onChange={e => setEditForm(p => ({ ...p, paymentMethod: e.target.value }))}>
                                    {PAYMENT_METHOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </Select>
                            </div>
                            <div>
                                <label className="field-label">Shop</label>
                                <Select value={editForm.shopId} onChange={e => setEditForm(p => ({ ...p, shopId: e.target.value }))}>
                                    <option value="">— No shop —</option>
                                    {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </Select>
                            </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="field-label">Fulfillment</label>
                                    <Select value={editForm.shippingMethod} onChange={e => setEditForm(p => ({ ...p, shippingMethod: e.target.value }))}>
                                        <option value="PICKUP">Pickup</option>
                                        <option value="SHIP">Ship</option>
                                    </Select>
                                </div>
                                <Input label="Shipping Cost ($)" type="number" step="0.01" min="0" value={editForm.shippingDollars}
                                    onChange={e => setEditForm(p => ({ ...p, shippingDollars: e.target.value }))} />
                            </div>
                            {editForm.shippingMethod === "SHIP" && (
                                <>
                                    <Input label="Address" value={editForm.shipAddress1}
                                        onChange={e => setEditForm(p => ({ ...p, shipAddress1: e.target.value }))} />
                                    <Input placeholder="Apt, suite, etc. (optional)" value={editForm.shipAddress2}
                                        onChange={e => setEditForm(p => ({ ...p, shipAddress2: e.target.value }))} />
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        <Input label="City" value={editForm.shipCity}
                                            onChange={e => setEditForm(p => ({ ...p, shipCity: e.target.value }))} />
                                        <Input label="State" value={editForm.shipState}
                                            onChange={e => setEditForm(p => ({ ...p, shipState: e.target.value }))} />
                                        <Input label="ZIP" value={editForm.shipZip}
                                            onChange={e => setEditForm(p => ({ ...p, shipZip: e.target.value }))} />
                                    </div>
                                    <label className="flex items-center gap-2 text-sm text-slate-600">
                                        <input type="checkbox" className="accent-brand-600" checked={editForm.residential}
                                            onChange={e => setEditForm(p => ({ ...p, residential: e.target.checked }))} />
                                        Residential address
                                    </label>
                                </>
                            )}
                        </div>

                        <div>
                            <label className="field-label">Special Instructions</label>
                            <textarea rows={2} placeholder="Notes, comments, or requests for this order…"
                                value={editForm.specialInstructions}
                                onChange={e => setEditForm(p => ({ ...p, specialInstructions: e.target.value }))}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 resize-none transition-all" />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="field-label mb-0">Items</label>
                                <button type="button" onClick={addEditItem}
                                    className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors">
                                    + Add item
                                </button>
                            </div>
                            {editItems.length === 0 ? (
                                <p className="text-sm text-slate-400 italic py-3 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">No items — click "Add item"</p>
                            ) : (
                                <div className="space-y-2">
                                    {editItems.map((item, i) => (
                                        <div key={i} className="flex flex-wrap gap-2 items-center bg-slate-50 rounded-xl p-2">
                                            <Select className="flex-1 min-w-[10rem]" value={item.productId}
                                                onChange={e => updateEditItem(i, { productId: e.target.value })}>
                                                <option value="">Select product</option>
                                                {products.map(p => <option key={p.id} value={p.id}>{p.name} — ${(p.priceCents / 100).toFixed(2)}</option>)}
                                            </Select>
                                            <input type="text" placeholder="Size" value={item.size} title="Size" aria-label="Size"
                                                onChange={e => updateEditItem(i, { size: e.target.value })}
                                                className="w-20 rounded-xl border border-slate-200 px-2 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
                                            <input type="text" placeholder="Color" value={item.color} title="Color" aria-label="Color"
                                                onChange={e => updateEditItem(i, { color: e.target.value })}
                                                className="w-24 rounded-xl border border-slate-200 px-2 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
                                            <input type="number" min={1} value={item.quantity} title="Quantity" aria-label="Quantity"
                                                onChange={e => updateEditItem(i, { quantity: +e.target.value })}
                                                className="w-16 rounded-xl border border-slate-200 px-2 py-2 text-sm text-center outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
                                            <div className="relative w-24">
                                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                                                <input type="number" step="0.01" min="0" value={item.priceDollars} title="Unit price" aria-label="Unit price"
                                                    onChange={e => updateEditItem(i, { priceDollars: e.target.value })}
                                                    className="w-full pl-5 pr-2 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
                                            </div>
                                            <button type="button" title="Remove" aria-label="Remove item"
                                                onClick={() => removeEditItem(i)}
                                                className="p-1.5 text-slate-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                            <div className="text-xs text-slate-400">
                                Subtotal {fmt(editSubtotalCents)} + Shipping {fmt(editShippingCents)}
                            </div>
                            <p className="text-lg font-bold text-slate-900">{fmt(editTotalCents)}</p>
                        </div>

                        <ModalFooter>
                            <Button type="button" variant="outline" onClick={() => setEditOrder(null)}>Cancel</Button>
                            <Button type="submit" loading={savingEdit}>Save Changes</Button>
                        </ModalFooter>
                    </form>
                )}
            </Modal>

            {/* Create Order Modal */}
            <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Order" size="lg">
                <form onSubmit={createOrder} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input label="Customer Name" required value={createForm.customerName}
                            onChange={e => setCreateForm(p => ({ ...p, customerName: e.target.value }))} />
                        <Input label="Customer Email" type="email" required value={createForm.customerEmail}
                            onChange={e => setCreateForm(p => ({ ...p, customerEmail: e.target.value }))} />
                    </div>
                    <Input label="Address" required value={createForm.shipAddress1}
                        onChange={e => setCreateForm(p => ({ ...p, shipAddress1: e.target.value }))} />
                    <Input placeholder="Apt, suite, etc. (optional)" value={createForm.shipAddress2}
                        onChange={e => setCreateForm(p => ({ ...p, shipAddress2: e.target.value }))} />
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <Input label="City" required value={createForm.shipCity}
                            onChange={e => setCreateForm(p => ({ ...p, shipCity: e.target.value }))} />
                        <Input label="State" required value={createForm.shipState}
                            onChange={e => setCreateForm(p => ({ ...p, shipState: e.target.value }))} />
                        <Input label="ZIP" required value={createForm.shipZip}
                            onChange={e => setCreateForm(p => ({ ...p, shipZip: e.target.value }))} />
                    </div>
                    <div>
                        <label className="field-label">Special Instructions (optional)</label>
                        <textarea rows={2} placeholder="Notes, comments, or requests for this order…"
                            value={createForm.specialInstructions}
                            onChange={e => setCreateForm(p => ({ ...p, specialInstructions: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 resize-none transition-all" />
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="field-label mb-0">Items</label>
                            <button type="button" onClick={() => setCartItems(p => [...p, { productId:"", quantity:1 }])}
                                className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors">
                                + Add item
                            </button>
                        </div>
                        {cartItems.length === 0 ? (
                            <p className="text-sm text-slate-400 italic py-3 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">No items yet — click "Add item"</p>
                        ) : (
                            <div className="space-y-2">
                                {cartItems.map((item, i) => (
                                    <div key={i} className="flex gap-2 items-center">
                                        <Select className="flex-1" value={item.productId}
                                            onChange={e => setCartItems(p => p.map((it,idx) => idx===i ? {...it, productId:e.target.value} : it))}>
                                            <option value="">Select product</option>
                                            {products.map(p => <option key={p.id} value={p.id}>{p.name} — ${(p.priceCents/100).toFixed(2)}</option>)}
                                        </Select>
                                        <input type="number" min={1} value={item.quantity} title="Quantity" aria-label="Quantity" placeholder="1"
                                            onChange={e => setCartItems(p => p.map((it,idx) => idx===i ? {...it, quantity:+e.target.value} : it))}
                                            className="w-20 rounded-xl border border-slate-200 px-2 py-2 text-sm text-center outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
                                        <button type="button" title="Remove" aria-label="Remove item"
                                            onClick={() => setCartItems(p => p.filter((_,idx) => idx!==i))}
                                            className="p-1.5 text-slate-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <ModalFooter>
                        <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                        <Button type="submit" loading={creating}>Create Order</Button>
                    </ModalFooter>
                </form>
            </Modal>

            {/* Export Modal */}
            <Modal open={showExport} onClose={() => setShowExport(false)} title="Export Orders" size="sm">
                <p className="text-sm text-slate-600 mb-4">
                    Export <strong className="text-slate-900">{filtered.length}</strong> order{filtered.length !== 1 ? "s" : ""} based on current filters.
                </p>
                <ModalFooter>
                    <Button variant="outline" onClick={() => setShowExport(false)}>Cancel</Button>
                    <Button onClick={exportCSV}>Download CSV</Button>
                </ModalFooter>
            </Modal>

            {/* Cancel Order Confirmation */}
            <Modal open={!!cancelTarget} onClose={() => !cancelling && setCancelTarget(null)} title="Cancel Order" size="sm">
                <p className="text-sm text-slate-600 mb-1">
                    Cancel the order from <span className="font-semibold text-slate-900">{cancelTarget?.customerName}</span>?
                </p>
                <p className="text-xs text-slate-400 mb-4">This can&apos;t be undone from here — the customer isn&apos;t automatically notified or refunded.</p>
                <ModalFooter>
                    <Button type="button" variant="outline" onClick={() => setCancelTarget(null)} disabled={cancelling}>Keep Order</Button>
                    <Button type="button" variant="danger" loading={cancelling} onClick={cancelOrder}>Cancel Order</Button>
                </ModalFooter>
            </Modal>
        </div>
    );
}
