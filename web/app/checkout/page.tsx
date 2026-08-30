"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { useCart, CartItem } from "@/lib/cart";
import { computeItemPriceCents } from "@/lib/pricing";
import { getColorCss } from "@/lib/colors";
import { StripePaymentForm } from "@/components/storefront/StripePaymentForm";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

type PaymentMethod = "stripe" | "pickup" | "";
type ShippingMethod = "SHIP" | "PICKUP" | "";
type ShippingQuote = { cents: number; estimated: boolean; service?: string; estimatedDays?: number | null };

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "");

async function publicFetch(path: string, init?: RequestInit) {
    const base = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000/api";
    const res = await fetch(`${base}${path}`, {
        headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
        ...init
    });
    if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try { const j = await res.json(); msg += j?.error ? `: ${j.error}` : ""; } catch {}
        throw new Error(msg);
    }
    return res.json();
}

const fmt = (cents: number) =>
    new Intl.NumberFormat("en-US", { style:"currency", currency:"USD" }).format(cents / 100);

function groupByShop(cart: CartItem[]) {
    const groups = new Map<string, { shopSlug: string; shopName: string; items: CartItem[]; subtotal: number }>();
    for (const item of cart) {
        if (!groups.has(item.shopSlug)) groups.set(item.shopSlug, { shopSlug: item.shopSlug, shopName: item.shopName, items: [], subtotal: 0 });
        const g = groups.get(item.shopSlug)!;
        g.items.push(item);
        g.subtotal += computeItemPriceCents(item, item.size) * item.quantity;
    }
    return [...groups.values()];
}

const ZIP_RE = /^\d{5}(-\d{4})?$/;

export default function CheckoutPage() {
    const { cart, updateQty, removeItem, subtotalCents, itemCount, clearAll } = useCart();
    const [step, setStep] = useState<"review"|"payment"|"done">("review");
    const [form, setForm] = useState({
        customerName:"", customerEmail:"",
        shipAddress1:"", shipAddress2:"", shipCity:"", shipState:"", shipZip:"",
        specialInstructions:""
    });
    const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("");
    const [shippingQuote, setShippingQuote] = useState<ShippingQuote | null>(null);
    const [shippingLoading, setShippingLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("");
    const [discountCode, setDiscountCode] = useState("");
    const [placing, setPlacing] = useState(false);
    const [error, setError] = useState("");
    const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
    const [submittedGroups, setSubmittedGroups] = useState<ReturnType<typeof groupByShop>>([]);
    const [submittedShipping, setSubmittedShipping] = useState<{ method: ShippingMethod; cents: number }>({ method: "", cents: 0 });
    const [reference, setReference] = useState("");
    const quoteTimer = useRef<ReturnType<typeof setTimeout>>();

    const groups = useMemo(() => groupByShop(cart), [cart]);
    const shopNames = useMemo(() => [...new Set(cart.map(c => c.shopName))], [cart]);
    // The whole cart ships together, so if even one shop in it doesn't offer
    // shipping, "Ship to you" isn't available for this checkout at all.
    const shippingAllowed = useMemo(() => cart.every(c => c.shopShippingEnabled !== false), [cart]);
    const shopsWithoutShipping = useMemo(
        () => [...new Set(cart.filter(c => c.shopShippingEnabled === false).map(c => c.shopName))],
        [cart]
    );

    // If a customer switches to Ship, "pay at pickup" no longer makes sense — clear it.
    useEffect(() => {
        if (shippingMethod === "SHIP" && paymentMethod === "pickup") setPaymentMethod("");
    }, [shippingMethod, paymentMethod]);

    // Cart contents can change (e.g. another tab) — if shipping becomes unavailable
    // while "Ship" is selected, fall back so checkout doesn't stay in a dead state.
    useEffect(() => {
        if (!shippingAllowed && shippingMethod === "SHIP") setShippingMethod("");
    }, [shippingAllowed, shippingMethod]);

    // Debounced live shipping quote once a full address is entered.
    useEffect(() => {
        clearTimeout(quoteTimer.current);
        if (shippingMethod !== "SHIP" || !form.shipCity || form.shipState.length !== 2 || !ZIP_RE.test(form.shipZip)) {
            setShippingQuote(null);
            return;
        }
        quoteTimer.current = setTimeout(async () => {
            setShippingLoading(true);
            try {
                const q = await publicFetch("/shipping/rate", {
                    method: "POST",
                    body: JSON.stringify({
                        items: cart.map(c => ({ productId: c.productId, quantity: c.quantity })),
                        shipCity: form.shipCity, shipState: form.shipState, shipZip: form.shipZip
                    })
                });
                setShippingQuote(q);
            } catch {
                setShippingQuote(null);
            } finally {
                setShippingLoading(false);
            }
        }, 500);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shippingMethod, form.shipCity, form.shipState, form.shipZip]);

    const shippingCents = shippingMethod === "SHIP" ? (shippingQuote?.cents ?? 0) : 0;
    const grandTotal = subtotalCents + shippingCents;
    const shippingReady = shippingMethod === "PICKUP" || (shippingMethod === "SHIP" && shippingQuote !== null);

    const inputCls = "w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-graphite-500 outline-none hover:border-white/20 focus:border-signal-cyan/60 focus:ring-2 focus:ring-signal-cyan/30 transition-all";

    async function handleContinue(e: React.FormEvent) {
        e.preventDefault();
        if (!shippingMethod) { setError("Please choose how you'd like to receive your order."); return; }
        if (!paymentMethod) { setError("Please select a payment method."); return; }
        setError("");
        const items = cart.map(c => ({ productId:c.productId, quantity:c.quantity, size:c.size, color:c.color, shopSlug:c.shopSlug }));
        const addressFields = shippingMethod === "SHIP"
            ? { shipAddress1: form.shipAddress1, shipAddress2: form.shipAddress2, shipCity: form.shipCity, shipState: form.shipState, shipZip: form.shipZip }
            : {};

        if (paymentMethod === "stripe") {
            setPlacing(true);
            try {
                const res = await publicFetch("/payments/create-intent", {
                    method: "POST",
                    body: JSON.stringify({ customerName: form.customerName, customerEmail: form.customerEmail, ...addressFields, shippingMethod, items, discountCode: discountCode || undefined, specialInstructions: form.specialInstructions || undefined })
                });
                setStripeClientSecret(res.clientSecret);
                setSubmittedGroups(groups);
                setSubmittedShipping({ method: shippingMethod, cents: res.shippingCents ?? 0 });
                setReference(res.orderGroupId ?? res.orderId);
                setStep("payment");
            } catch (err: any) { setError(err.message || "Could not initialize payment."); }
            finally { setPlacing(false); }
        } else {
            setPlacing(true);
            try {
                const res = await publicFetch("/orders/checkout", {
                    method: "POST",
                    body: JSON.stringify({ customerName: form.customerName, customerEmail: form.customerEmail, ...addressFields, shippingMethod, items, discountCode: discountCode || undefined, paymentMethod, specialInstructions: form.specialInstructions || undefined })
                });
                setSubmittedGroups(groups);
                setSubmittedShipping({ method: shippingMethod, cents: res.shippingCents ?? 0 });
                setReference(res.orderGroupId ?? res.orders?.[0]?.id ?? "");
                clearAll();
                setStep("done");
            } catch (err: any) { setError(err.message || "Failed to place order."); }
            finally { setPlacing(false); }
        }
    }

    /* ── Empty cart ── */
    if (cart.length === 0 && step === "review") {
        return (
            <div className="console-canvas min-h-screen flex items-center justify-center p-4">
                <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} transition={{ duration:0.35, ease:EASE }} className="console-panel rounded-lg p-8 text-center max-w-md">
                    <div className="w-16 h-16 bg-white/[0.05] rounded-lg flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-graphite-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                    </div>
                    <h1 className="text-xl font-bold text-white mb-2">Your cart is empty</h1>
                    <p className="text-sm text-graphite-300 mb-5">Browse a group shop to add items to your cart.</p>
                    <Link href="/shops">
                        <Button type="button">Browse Shops</Button>
                    </Link>
                </motion.div>
            </div>
        );
    }

    /* ── Done ── */
    if (step === "done") {
        const isOffline = paymentMethod === "pickup";
        const isPickup = submittedShipping.method === "PICKUP";
        const itemsTotal = submittedGroups.reduce((a, g) => a + g.subtotal, 0);
        const finalTotal = itemsTotal + submittedShipping.cents;
        return (
            <div className="console-canvas min-h-screen flex flex-col items-center justify-center p-4">
                <motion.div initial={{ opacity:0, scale:0.93, y:16 }} animate={{ opacity:1, scale:1, y:0 }}
                    transition={{ duration:0.4, ease:EASE }}
                    className="console-panel rounded-lg shadow-console-hover p-8 sm:p-10 max-w-lg w-full text-center">
                    <motion.div initial={{ scale:0 }} animate={{ scale:1 }}
                        transition={{ delay:0.2, type:"spring", stiffness:260, damping:20 }}
                        className={`w-16 h-16 ${isOffline ? "bg-signal-amber/15" : "bg-signal-green/15"} rounded-full flex items-center justify-center mx-auto mb-5`}>
                        {isOffline ? (
                            <svg className="w-8 h-8 text-signal-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                        ) : (
                            <svg className="w-8 h-8 text-signal-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                        )}
                    </motion.div>
                    <h1 className="text-2xl font-bold text-white mb-2">{isOffline ? "Order confirmed!" : "Payment received!"}</h1>
                    <p className="text-sm text-graphite-300 mb-5">
                        Thanks, <strong className="text-graphite-100">{form.customerName}</strong>!{" "}
                        {isPickup
                            ? `Your order will be ready for pickup from ${shopNames.join(" and ")}. ${isOffline ? `Please bring cash or a check for ${fmt(finalTotal)} when you pick it up.` : "We'll let you know when it's ready."}`
                            : isOffline
                                ? `Please bring cash or a check for ${fmt(finalTotal)} when you pick it up.`
                                : "Your payment was successful and your order is being processed and shipped to you."}
                    </p>

                    <div className="bg-white/[0.04] border border-white/[0.06] rounded-md px-4 py-3 mb-5 text-left space-y-2">
                        {submittedGroups.length > 1 && (
                            <>
                                <p className="text-xs font-bold text-graphite-300 uppercase tracking-wider">Itemized by shop</p>
                                {submittedGroups.map(g => (
                                    <div key={g.shopSlug} className="flex justify-between text-sm">
                                        <span className="text-graphite-100 font-medium">{g.shopName}</span>
                                        <span className="text-white font-bold font-mono tabular-nums">{fmt(g.subtotal)}</span>
                                    </div>
                                ))}
                                <div className="border-t border-white/[0.08] my-1" />
                            </>
                        )}
                        <div className="flex justify-between text-sm">
                            <span className="text-graphite-300">{isPickup ? "Pickup" : "Shipping"}</span>
                            <span className="text-white font-semibold font-mono tabular-nums">{isPickup ? "Free" : fmt(submittedShipping.cents)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold pt-1 border-t border-white/[0.08]">
                            <span className="text-graphite-100">Total</span>
                            <span className="text-white font-mono tabular-nums">{fmt(finalTotal)}</span>
                        </div>
                    </div>

                    <div className="bg-white/[0.04] border border-white/[0.06] rounded-md px-4 py-3 text-sm text-graphite-300 mb-5">
                        Confirmation: <code className="font-mono font-bold text-signal-cyan-bright">#{reference.slice(-8).toUpperCase()}</code>
                    </div>
                    <p className="text-xs text-graphite-300 mb-6">A confirmation email will be sent to {form.customerEmail}</p>
                    <div className="border-t border-white/[0.08] pt-5 space-y-4">
                        <Image src="/logo.png" alt="Crossroads Custom Apparel" width={120} height={48} className="mx-auto object-contain opacity-60" />
                        <Link href="/shops" className="text-sm text-signal-cyan hover:text-signal-cyan-bright font-semibold">← Back to all shops</Link>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="console-canvas min-h-screen flex flex-col">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-graphite-950/85 backdrop-blur-md border-b border-white/[0.06]">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
                    <Link href="/shops" className="text-sm font-medium text-graphite-300 hover:text-white flex items-center gap-1 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                        {step === "payment" ? "Edit order" : "Continue shopping"}
                    </Link>
                    <Image src="/logo.png" alt="Crossroads Custom Apparel" width={100} height={40} className="object-contain" />
                </div>
            </div>

            <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
                <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4, ease:EASE }}>
                    <h1 className="page-title">Checkout</h1>
                    <p className="page-subtitle mb-6">
                        {itemCount} item{itemCount !== 1 ? "s" : ""} {groups.length > 1 ? `across ${groups.length} shops` : `from ${groups[0]?.shopName ?? "your shop"}`}
                    </p>
                </motion.div>

                {step === "review" && (
                    <motion.div initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }} transition={{ duration:0.3, ease:EASE }}
                        className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        <form onSubmit={handleContinue} className="lg:col-span-3 space-y-4">
                            <Card className="p-5 space-y-4">
                                <h2 className="text-sm font-bold text-white">Contact information</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="field-label" htmlFor="cust-name">Full name</label>
                                        <input id="cust-name" required className={inputCls} placeholder="Jane Smith"
                                            value={form.customerName} onChange={e => setForm(p => ({ ...p, customerName:e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="field-label" htmlFor="cust-email">Email</label>
                                        <input id="cust-email" required type="email" className={inputCls} placeholder="jane@example.com"
                                            value={form.customerEmail} onChange={e => setForm(p => ({ ...p, customerEmail:e.target.value }))} />
                                    </div>
                                </div>
                            </Card>

                            <Card className="p-5">
                                <h2 className="text-sm font-bold text-white mb-3">How do you want to get your order?</h2>
                                <div className="space-y-2">
                                    <label className={`flex items-center gap-3 p-3.5 rounded-md border-2 transition-all duration-150 ${!shippingAllowed ? "opacity-50 cursor-not-allowed border-white/10" : shippingMethod === "SHIP" ? "border-signal-cyan bg-signal-cyan/10 cursor-pointer" : "border-white/10 hover:border-white/20 cursor-pointer"}`}>
                                        <input type="radio" name="shippingMethod" value="SHIP" className="accent-signal-cyan" disabled={!shippingAllowed}
                                            checked={shippingMethod === "SHIP"} onChange={() => setShippingMethod("SHIP")} />
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-white">Ship to you</p>
                                            <p className="text-xs text-graphite-300 mt-0.5">
                                                {shippingAllowed ? "We'll calculate shipping based on your address" : `Not available — ${shopsWithoutShipping.join(", ")} ${shopsWithoutShipping.length === 1 ? "offers" : "offer"} pickup only`}
                                            </p>
                                        </div>
                                        <svg className="w-5 h-5 text-graphite-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                                    </label>
                                    <label className={`flex items-center gap-3 p-3.5 rounded-md border-2 cursor-pointer transition-all duration-150 ${shippingMethod === "PICKUP" ? "border-signal-green bg-signal-green/10" : "border-white/10 hover:border-white/20"}`}>
                                        <input type="radio" name="shippingMethod" value="PICKUP" className="accent-signal-green"
                                            checked={shippingMethod === "PICKUP"} onChange={() => setShippingMethod("PICKUP")} />
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-white">Pick up — Free</p>
                                            <p className="text-xs text-graphite-300 mt-0.5">Pick up from {shopNames.join(" / ")} once ready — no shipping cost</p>
                                        </div>
                                        <svg className="w-5 h-5 text-graphite-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                                    </label>
                                </div>
                            </Card>

                            {shippingMethod === "SHIP" && (
                                <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }}>
                                    <Card className="p-5 space-y-4">
                                        <h2 className="text-sm font-bold text-white">Shipping address</h2>
                                        <div>
                                            <label className="field-label" htmlFor="addr1">Street address</label>
                                            <input id="addr1" required className={inputCls} placeholder="123 Main St"
                                                value={form.shipAddress1} onChange={e => setForm(p => ({ ...p, shipAddress1:e.target.value }))} />
                                        </div>
                                        <div>
                                            <label className="field-label" htmlFor="addr2">Apartment, suite, etc. (optional)</label>
                                            <input id="addr2" className={inputCls} placeholder="Apt 4B"
                                                value={form.shipAddress2} onChange={e => setForm(p => ({ ...p, shipAddress2:e.target.value }))} />
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            <div className="col-span-2 sm:col-span-1">
                                                <label className="field-label" htmlFor="city">City</label>
                                                <input id="city" required className={inputCls} placeholder="Springfield"
                                                    value={form.shipCity} onChange={e => setForm(p => ({ ...p, shipCity:e.target.value }))} />
                                            </div>
                                            <div>
                                                <label className="field-label" htmlFor="state">State</label>
                                                <input id="state" required maxLength={2} className={inputCls} placeholder="IL"
                                                    value={form.shipState} onChange={e => setForm(p => ({ ...p, shipState:e.target.value.toUpperCase() }))} />
                                            </div>
                                            <div>
                                                <label className="field-label" htmlFor="zip">ZIP</label>
                                                <input id="zip" required className={inputCls} placeholder="62701"
                                                    value={form.shipZip} onChange={e => setForm(p => ({ ...p, shipZip:e.target.value }))} />
                                            </div>
                                        </div>
                                        {shippingLoading && (
                                            <p className="text-xs text-graphite-300 flex items-center gap-1.5">
                                                <span className="w-3 h-3 border-2 border-white/20 border-t-transparent rounded-full animate-spin inline-block" />
                                                Calculating shipping…
                                            </p>
                                        )}
                                        {!shippingLoading && shippingQuote && (
                                            <p className="text-xs text-signal-green font-medium flex items-center gap-1.5">
                                                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                                                Shipping: {fmt(shippingQuote.cents)}{shippingQuote.service ? ` via ${shippingQuote.service}` : ""}{shippingQuote.estimated ? " (estimate)" : ""}
                                            </p>
                                        )}
                                    </Card>
                                </motion.div>
                            )}

                            {shippingMethod === "PICKUP" && (
                                <div className="bg-signal-green/10 border border-signal-green/25 rounded-md px-4 py-3">
                                    <p className="text-xs text-graphite-100">You'll pick up your order from <strong className="text-signal-green">{shopNames.join(", ")}</strong> — we'll email you when it's ready.</p>
                                </div>
                            )}

                            {shippingMethod && (
                                <Card className="p-5">
                                    <h2 className="text-sm font-bold text-white mb-3">Payment method</h2>
                                    <div className="space-y-2">
                                        <label className={`flex items-center gap-3 p-3.5 rounded-md border-2 cursor-pointer transition-all duration-150 ${paymentMethod === "stripe" ? "border-signal-cyan bg-signal-cyan/10" : "border-white/10 hover:border-white/20"}`}>
                                            <input type="radio" name="paymentMethod" value="stripe" className="accent-signal-cyan"
                                                checked={paymentMethod === "stripe"} onChange={() => setPaymentMethod("stripe")} />
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-white">Card / Apple Pay / Google Pay</p>
                                                <p className="text-xs text-graphite-300 mt-0.5">Pay securely online with card or digital wallet</p>
                                            </div>
                                        </label>
                                        {shippingMethod === "PICKUP" && (
                                            <label className={`flex items-center gap-3 p-3.5 rounded-md border-2 cursor-pointer transition-all duration-150 ${paymentMethod === "pickup" ? "border-signal-green bg-signal-green/10" : "border-white/10 hover:border-white/20"}`}>
                                                <input type="radio" name="paymentMethod" value="pickup" className="accent-signal-green"
                                                    checked={paymentMethod === "pickup"} onChange={() => setPaymentMethod("pickup")} />
                                                <div className="flex-1">
                                                    <p className="text-sm font-semibold text-white">Pay at pickup</p>
                                                    <p className="text-xs text-graphite-300 mt-0.5">Pay with cash or check when you collect your order</p>
                                                </div>
                                                <svg className="w-5 h-5 text-graphite-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V6m0 10v2m9-6a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                            </label>
                                        )}
                                    </div>
                                </Card>
                            )}

                            <Card className="p-5">
                                <h2 className="text-sm font-bold text-white mb-3">Special Instructions / Comments</h2>
                                <textarea aria-label="Special instructions or comments" rows={3}
                                    placeholder="Anything we should know? e.g. delivery notes, group leader name, design requests…"
                                    value={form.specialInstructions}
                                    onChange={e => setForm(p => ({ ...p, specialInstructions:e.target.value }))}
                                    className={`${inputCls} resize-none`} />
                            </Card>

                            <Card className="p-5">
                                <h2 className="text-sm font-bold text-white mb-3">Discount code</h2>
                                <input aria-label="Discount code" className={`${inputCls} uppercase`} placeholder="Enter code"
                                    value={discountCode} onChange={e => setDiscountCode(e.target.value.toUpperCase())} />
                            </Card>

                            {error && (
                                <motion.div initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }}
                                    className="bg-signal-red/10 border border-signal-red/25 rounded-md px-4 py-3 text-sm font-medium text-signal-red">
                                    {error}
                                </motion.div>
                            )}

                            <Button type="submit" disabled={placing || !paymentMethod || !shippingMethod || !shippingReady}
                                loading={placing} size="lg" className="w-full">
                                {placing ? (
                                    "Working…"
                                ) : !shippingMethod ? (
                                    "Select how you'll get your order"
                                ) : !shippingReady ? (
                                    "Enter your address to calculate shipping"
                                ) : paymentMethod === "stripe" ? (
                                    `Continue to payment · ${fmt(grandTotal)}`
                                ) : paymentMethod ? (
                                    `Place order · ${fmt(grandTotal)}`
                                ) : "Select a payment method"}
                            </Button>
                        </form>

                        {/* Order summary — itemized by shop */}
                        <div className="lg:col-span-2">
                            <Card className="p-5 sticky top-20 space-y-5">
                                <h2 className="text-sm font-bold text-white">
                                    Order summary <span className="font-normal text-graphite-300">({itemCount} item{itemCount!==1?"s":""})</span>
                                </h2>
                                {groups.map(g => (
                                    <div key={g.shopSlug}>
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-xs font-bold text-signal-cyan uppercase tracking-wider">{g.shopName}</p>
                                            <p className="text-xs font-semibold text-graphite-300 font-mono tabular-nums">{fmt(g.subtotal)}</p>
                                        </div>
                                        <div className="space-y-3">
                                            {g.items.map((item) => {
                                                const idx = cart.indexOf(item);
                                                return (
                                                    <div key={idx} className="flex items-start gap-3">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                                                            <p className="text-xs text-graphite-300 mt-0.5 flex items-center gap-1">
                                                                {item.color && (
                                                                    <span className="w-2.5 h-2.5 rounded-full border border-white/15 inline-block"
                                                                        style={{ backgroundColor: getColorCss(item.color) }} />
                                                                )}
                                                                {[item.size, item.color].filter(Boolean).join(" · ")}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            <button type="button" onClick={() => updateQty(idx, item.quantity-1)}
                                                                className="w-6 h-6 rounded-md bg-white/[0.06] hover:bg-white/[0.10] text-graphite-100 flex items-center justify-center text-sm font-bold transition-colors">−</button>
                                                            <span className="text-sm font-semibold text-white w-4 text-center font-mono tabular-nums">{item.quantity}</span>
                                                            <button type="button" onClick={() => updateQty(idx, item.quantity+1)}
                                                                className="w-6 h-6 rounded-md bg-white/[0.06] hover:bg-white/[0.10] text-graphite-100 flex items-center justify-center text-sm font-bold transition-colors">+</button>
                                                        </div>
                                                        <button type="button" title="Remove" aria-label="Remove item" onClick={() => removeItem(idx)}
                                                            className="text-graphite-500 hover:text-signal-red transition-colors shrink-0">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                                <div className="border-t border-white/[0.08] pt-4 space-y-2">
                                    <div className="flex justify-between text-sm text-graphite-300">
                                        <span>Subtotal</span><span className="font-medium text-white font-mono tabular-nums">{fmt(subtotalCents)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-graphite-300">
                                        <span>{shippingMethod === "PICKUP" ? "Pickup" : "Shipping"}</span>
                                        {shippingMethod === "PICKUP" ? (
                                            <span className="text-signal-green font-semibold">Free</span>
                                        ) : shippingMethod === "SHIP" ? (
                                            shippingLoading ? (
                                                <span className="text-graphite-300 text-xs">Calculating…</span>
                                            ) : shippingQuote ? (
                                                <span className="font-medium text-white font-mono tabular-nums">{fmt(shippingQuote.cents)}</span>
                                            ) : (
                                                <span className="text-graphite-300 text-xs">Enter address</span>
                                            )
                                        ) : (
                                            <span className="text-graphite-300 text-xs">Select an option</span>
                                        )}
                                    </div>
                                    <div className="flex justify-between font-bold text-white pt-2 border-t border-white/[0.08] text-base">
                                        <span>Total</span><span className="font-mono tabular-nums">{fmt(grandTotal)}</span>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </motion.div>
                )}

                {step === "payment" && stripeClientSecret && (
                    <motion.div initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }} transition={{ duration:0.3 }}
                        className="max-w-lg mx-auto">
                        <h2 className="text-lg font-bold text-white mb-4">Complete your payment</h2>
                        <Elements stripe={stripePromise} options={{
                            clientSecret: stripeClientSecret,
                            appearance: {
                                theme: "night",
                                variables: {
                                    colorPrimary: "#33e1ff",
                                    colorBackground: "#12151b",
                                    colorText: "#e3e5e9",
                                    colorTextSecondary: "#9aa0ac",
                                    colorDanger: "#ff5c5c",
                                    fontFamily: "IBM Plex Sans, system-ui, sans-serif",
                                    borderRadius: "8px",
                                }
                            }
                        }}>
                            <StripePaymentForm totalCents={grandTotal}
                                onSuccess={() => { clearAll(); setStep("done"); }}
                                onBack={() => setStep("review")} />
                        </Elements>
                    </motion.div>
                )}
            </main>
        </div>
    );
}
