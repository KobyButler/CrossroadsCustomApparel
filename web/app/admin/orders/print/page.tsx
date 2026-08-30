"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, printAs } from "@/app/lib/api";
import { Button } from "@/components/ui/button";

type OrderItemRow = {
    id: string; product?: { name: string; sku: string } | null;
    size?: string | null; color?: string | null; quantity: number; priceCents: number;
};
type PrintOrder = {
    id: string; customerName: string; customerEmail: string;
    status: string; paymentStatus?: string; paymentMethod?: string;
    totalCents: number; createdAt: string;
    shippingMethod?: string; shippingCents?: number;
    shipAddress1?: string; shipAddress2?: string; shipCity?: string; shipState?: string; shipZip?: string;
    residential?: boolean;
    specialInstructions?: string | null;
    items: OrderItemRow[]; shop?: { name: string } | null;
};

const fmt = (cents: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

const PAYMENT_LABEL: Record<string, string> = {
    PAID: "Paid", OFFLINE_PENDING: "Due at pickup", UNPAID: "Unpaid",
};

function OrderPage({ order, isFirst }: { order: PrintOrder; isFirst: boolean }) {
    const isShip = order.shippingMethod === "SHIP";
    const subtotal = order.totalCents - (isShip ? (order.shippingCents ?? 0) : 0);

    return (
        <div className={`px-10 py-10 ${isFirst ? "" : "print-page-break"}`} style={{ maxWidth: "8.5in", margin: "0 auto" }}>
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 mb-6">
                <div>
                    <h2 className="text-2xl font-black text-slate-900">Order #{order.id.slice(-8).toUpperCase()}</h2>
                    <p className="text-sm text-slate-500 mt-1">Placed {new Date(order.createdAt).toLocaleString()}</p>
                    {order.shop?.name && <p className="text-sm text-slate-500">Shop: {order.shop.name}</p>}
                </div>
                <div className="text-right shrink-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Status</p>
                    <p className="text-base font-bold text-slate-900">{order.status.charAt(0) + order.status.slice(1).toLowerCase()}</p>
                    <p className="text-xs text-slate-500 mt-1">
                        {PAYMENT_LABEL[order.paymentStatus ?? "UNPAID"] ?? order.paymentStatus}
                        {order.paymentMethod ? ` · ${order.paymentMethod}` : ""}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Customer</p>
                    <p className="text-sm font-semibold text-slate-900">{order.customerName}</p>
                    <p className="text-sm text-slate-600">{order.customerEmail}</p>
                </div>
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                        {isShip ? "Ship To" : "Fulfillment"}
                    </p>
                    {isShip ? (
                        <>
                            <p className="text-sm text-slate-700">{order.shipAddress1 || "—"}{order.shipAddress2 ? `, ${order.shipAddress2}` : ""}</p>
                            {order.shipCity && <p className="text-sm text-slate-700">{order.shipCity}, {order.shipState} {order.shipZip}</p>}
                            <p className="text-xs text-slate-500 mt-1">
                                Shipping: {fmt(order.shippingCents ?? 0)}{order.residential === false ? " · Commercial address" : ""}
                            </p>
                        </>
                    ) : (
                        <p className="text-sm text-slate-700">Customer pickup{order.shop?.name ? ` from ${order.shop.name}` : ""} — no shipping</p>
                    )}
                </div>
            </div>

            {order.specialInstructions && (
                <div className="mb-6 border-2 border-amber-300 bg-amber-50 rounded-lg px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">Special Instructions / Comments</p>
                    <p className="text-sm text-amber-900 whitespace-pre-wrap">{order.specialInstructions}</p>
                </div>
            )}

            <table className="w-full text-sm mb-6 border-collapse">
                <thead>
                    <tr className="border-b-2 border-slate-300">
                        <th className="text-left py-2 font-bold text-slate-600">Item</th>
                        <th className="text-left py-2 font-bold text-slate-600">Color</th>
                        <th className="text-left py-2 font-bold text-slate-600">Size</th>
                        <th className="text-right py-2 font-bold text-slate-600">Qty</th>
                        <th className="text-right py-2 font-bold text-slate-600">Price</th>
                        <th className="text-right py-2 font-bold text-slate-600">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {order.items.map((item, i) => (
                        <tr key={item.id ?? i} className="border-b border-slate-100">
                            <td className="py-2 text-slate-800">{item.product?.name ?? "Item"}</td>
                            <td className="py-2 text-slate-600">{item.color ?? "—"}</td>
                            <td className="py-2 text-slate-600">{item.size ?? "—"}</td>
                            <td className="py-2 text-right text-slate-800">{item.quantity}</td>
                            <td className="py-2 text-right text-slate-800">{fmt(item.priceCents)}</td>
                            <td className="py-2 text-right font-semibold text-slate-900">{fmt(item.priceCents * item.quantity)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="flex justify-end">
                <div className="w-64">
                    <div className="flex justify-between text-sm text-slate-600 py-1">
                        <span>Subtotal</span><span>{fmt(subtotal)}</span>
                    </div>
                    {isShip && (
                        <div className="flex justify-between text-sm text-slate-600 py-1">
                            <span>Shipping</span><span>{fmt(order.shippingCents ?? 0)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-base font-bold text-slate-900 border-t-2 border-slate-900 pt-2 mt-1">
                        <span>Total</span><span>{fmt(order.totalCents)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function PrintOrdersContent() {
    const params = useSearchParams();
    const [orders, setOrders] = useState<PrintOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const ids = params.get("ids");
        if (!ids) { setLoading(false); setError("No orders specified — go back to the Orders list and try again."); return; }
        const idList = ids.split(",").map(s => s.trim()).filter(Boolean);
        api(`/orders?ids=${encodeURIComponent(ids)}&limit=${idList.length}`)
            .then(r => {
                const data: PrintOrder[] = r.data ?? [];
                // Preserve the order the admin had them in on the list page, not whatever order the DB returns.
                const byId = new Map(data.map(o => [o.id, o]));
                setOrders(idList.map(id => byId.get(id)).filter((o): o is PrintOrder => Boolean(o)));
            })
            .catch(err => setError(err.message || "Failed to load orders"))
            .finally(() => setLoading(false));
    }, [params]);

    if (loading) return <div className="p-10 text-graphite-300 text-sm">Loading orders…</div>;
    if (error) return <div className="p-10 text-signal-red text-sm">{error}</div>;
    if (orders.length === 0) return <div className="p-10 text-graphite-300 text-sm">No orders found.</div>;

    function printOrders() {
        const dateStr = new Date().toISOString().split("T")[0];
        const name = orders.length === 1
            ? `Order-${orders[0].id.slice(-8).toUpperCase()}`
            : `Orders-${orders.length}-${dateStr}`;
        printAs(name);
    }

    return (
        // The toolbar above is on-screen admin chrome and runs the dark console
        // system; everything from the bg-white wrapper down is a live preview of
        // the printed page itself, so it stays white/black-on-paper on screen too
        // — not "chrome" to convert. See OrderPage below: untouched by this pass.
        <div className="print-full-width min-h-screen">
            <div className="no-print sticky top-0 z-10 bg-graphite-900 border-b border-white/[0.08] px-6 py-4 flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-bold text-white">Print Orders</h1>
                    <p className="text-sm text-graphite-300">{orders.length} order{orders.length !== 1 ? "s" : ""} — one page each</p>
                </div>
                <Button onClick={printOrders}>Print / Save as PDF</Button>
            </div>

            <div className="bg-white">
                {orders.map((order, idx) => (
                    <OrderPage key={order.id} order={order} isFirst={idx === 0} />
                ))}
            </div>
        </div>
    );
}

export default function PrintOrdersPage() {
    return (
        <Suspense fallback={<div className="p-10 text-graphite-300 text-sm">Loading…</div>}>
            <PrintOrdersContent />
        </Suspense>
    );
}
