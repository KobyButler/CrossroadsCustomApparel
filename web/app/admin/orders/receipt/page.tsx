"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, printAs } from "@/app/lib/api";
import { Button } from "@/components/ui/button";

type ItemVariation = { id: string; name: string; textValue: string | null; choiceLabel: string | null };
type OrderItemRow = {
    id: string; product?: { name: string; sku: string } | null;
    size?: string | null; color?: string | null; quantity: number; priceCents: number;
    variations?: ItemVariation[];
};
type ReceiptOrder = {
    id: string; customerName: string; customerEmail: string;
    paymentStatus?: string; paymentMethod?: string | null;
    totalCents: number; createdAt: string;
    shippingMethod?: string; shippingCents?: number; taxCents?: number;
    discountCode?: { code: string } | null;
    items: OrderItemRow[]; shop?: { name: string } | null;
};
type PaymentDetail = { brand: string | null; last4: string | null } | null;

const fmt = (cents: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

const BRAND_LABEL: Record<string, string> = {
    visa: "Visa", mastercard: "Mastercard", amex: "American Express", discover: "Discover",
    diners: "Diners Club", jcb: "JCB", unionpay: "UnionPay",
};

function paymentLine(order: ReceiptOrder, payment: PaymentDetail): string {
    if (payment?.last4) {
        const brand = payment.brand ? (BRAND_LABEL[payment.brand] ?? payment.brand) : "Card";
        return `Paid by ${brand} ending in ${payment.last4}`;
    }
    if (order.paymentMethod === "stripe") return "Paid by card";
    if (order.paymentStatus === "PAID") return `Paid — ${order.paymentMethod === "check" ? "check" : "cash"}`;
    if (order.paymentStatus === "OFFLINE_PENDING") return `Due at pickup — ${order.paymentMethod === "check" ? "check" : "cash"}`;
    return "Unpaid";
}

function ReceiptPage({ order, payment }: { order: ReceiptOrder; payment: PaymentDetail }) {
    const isShip = order.shippingMethod === "SHIP";
    const shippingCents = isShip ? (order.shippingCents ?? 0) : 0;
    const taxCents = order.taxCents ?? 0;
    const subtotal = order.totalCents - shippingCents - taxCents;

    return (
        <div className="px-10 py-10" style={{ maxWidth: "8.5in", margin: "0 auto" }}>
            <div className="text-center border-b-2 border-slate-900 pb-5 mb-6">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Crossroads Custom Apparel</h1>
                <p className="text-sm text-slate-500 mt-1">Receipt{order.shop?.name ? ` — ${order.shop.name}` : ""}</p>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Order</p>
                    <p className="text-sm font-semibold text-slate-900">#{order.id.slice(-8).toUpperCase()}</p>
                    <p className="text-sm text-slate-600">{new Date(order.createdAt).toLocaleString("en-US", {
                        year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
                    })}</p>
                </div>
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Customer</p>
                    <p className="text-sm font-semibold text-slate-900">{order.customerName}</p>
                    <p className="text-sm text-slate-600">{order.customerEmail}</p>
                </div>
            </div>

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
                            <td className="py-2 text-slate-800">
                                {item.product?.name ?? "Item"}
                                {(item.variations ?? []).map(v => (
                                    <div key={v.id} className="text-xs font-semibold text-slate-500">{v.name}: &quot;{v.choiceLabel ?? v.textValue}&quot;</div>
                                ))}
                            </td>
                            <td className="py-2 text-slate-600">{item.color ?? "—"}</td>
                            <td className="py-2 text-slate-600">{item.size ?? "—"}</td>
                            <td className="py-2 text-right text-slate-800">{item.quantity}</td>
                            <td className="py-2 text-right text-slate-800">{fmt(item.priceCents)}</td>
                            <td className="py-2 text-right font-semibold text-slate-900">{fmt(item.priceCents * item.quantity)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="flex justify-end mb-6">
                <div className="w-64">
                    <div className="flex justify-between text-sm text-slate-600 py-1">
                        <span>Subtotal</span><span>{fmt(subtotal)}</span>
                    </div>
                    {order.discountCode?.code && (
                        <div className="flex justify-between text-sm text-slate-600 py-1">
                            <span>Discount code</span><span>{order.discountCode.code}</span>
                        </div>
                    )}
                    {isShip && (
                        <div className="flex justify-between text-sm text-slate-600 py-1">
                            <span>Shipping</span><span>{fmt(shippingCents)}</span>
                        </div>
                    )}
                    {taxCents > 0 && (
                        <div className="flex justify-between text-sm text-slate-600 py-1">
                            <span>Tax</span><span>{fmt(taxCents)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-base font-bold text-slate-900 border-t-2 border-slate-900 pt-2 mt-1">
                        <span>Total</span><span>{fmt(order.totalCents)}</span>
                    </div>
                </div>
            </div>

            <div className="border-t border-slate-200 pt-4 text-center">
                <p className="text-sm font-semibold text-slate-700">{paymentLine(order, payment)}</p>
                <p className="text-xs text-slate-400 mt-3">Thank you for your order!</p>
            </div>
        </div>
    );
}

function ReceiptContent() {
    const params = useSearchParams();
    const [order, setOrder] = useState<ReceiptOrder | null>(null);
    const [payment, setPayment] = useState<PaymentDetail>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const id = params.get("id");
        if (!id) { setLoading(false); setError("No order specified — go back to the Orders list and try again."); return; }
        api(`/orders/${id}/receipt`)
            .then(r => { setOrder(r.order); setPayment(r.payment); })
            .catch(err => setError(err.message || "Failed to load order"))
            .finally(() => setLoading(false));
    }, [params]);

    if (loading) return <div className="p-10 text-graphite-300 text-sm">Loading receipt…</div>;
    if (error) return <div className="p-10 text-signal-red text-sm">{error}</div>;
    if (!order) return <div className="p-10 text-graphite-300 text-sm">Order not found.</div>;

    function printReceipt() {
        if (!order) return;
        printAs(`Receipt-${order.id.slice(-8).toUpperCase()}`);
    }

    return (
        // Same convention as /admin/orders/print: the toolbar is on-screen admin
        // chrome (dark console system), everything below the bg-white wrapper is
        // a live preview of the printed page and stays white/black-on-paper here too.
        <div className="print-full-width min-h-screen">
            <div className="no-print sticky top-0 z-10 bg-graphite-900 border-b border-white/[0.08] px-6 py-4 flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-bold text-white">Receipt</h1>
                    <p className="text-sm text-graphite-300">Order #{order.id.slice(-8).toUpperCase()}</p>
                </div>
                <Button onClick={printReceipt}>Print / Save as PDF</Button>
            </div>

            <div className="bg-white">
                <ReceiptPage order={order} payment={payment} />
            </div>
        </div>
    );
}

export default function ReceiptPageRoute() {
    return (
        <Suspense fallback={<div className="p-10 text-graphite-300 text-sm">Loading…</div>}>
            <ReceiptContent />
        </Suspense>
    );
}
