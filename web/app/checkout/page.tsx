"use client";
// "The Print Floor" storefront — Checkout. See DESIGN.md and the direction
// contract in app/page.tsx. A cart can span multiple shops/spot colors, so
// checkout runs on the platform's own ink (crimson, the var() fallback)
// rather than any one shop's — a calmer, flatter register throughout,
// same light-table material as everywhere else in this world.
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
import { PressButton } from "@/components/public/PressButton";
import { PressFrame } from "@/components/public/PressFrame";
import { PublicHeader } from "@/components/public/PublicHeader";

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
    const [submittedTaxCents, setSubmittedTaxCents] = useState(0);
    const [submittedTotalCents, setSubmittedTotalCents] = useState(0);
    const [reference, setReference] = useState("");
    const quoteTimer = useRef<ReturnType<typeof setTimeout>>();

    const groups = useMemo(() => groupByShop(cart), [cart]);
    const shopNames = useMemo(() => [...new Set(cart.map(c => c.shopName))], [cart]);
    const shippingAllowed = useMemo(() => cart.every(c => c.shopShippingEnabled !== false), [cart]);
    const shopsWithoutShipping = useMemo(
        () => [...new Set(cart.filter(c => c.shopShippingEnabled === false).map(c => c.shopName))],
        [cart]
    );

    useEffect(() => {
        if (shippingMethod === "SHIP" && paymentMethod === "pickup") setPaymentMethod("");
    }, [shippingMethod, paymentMethod]);

    useEffect(() => {
        if (!shippingAllowed && shippingMethod === "SHIP") setShippingMethod("");
    }, [shippingAllowed, shippingMethod]);

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

    const inputCls = "w-full rounded-md border border-plate-700 bg-plate-950 px-3 py-2.5 text-sm text-plate-50 placeholder:text-plate-500 outline-none hover:border-plate-600 focus:border-proc-cyan focus:ring-2 focus:ring-proc-cyan/25 transition-all font-press";

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
                setSubmittedTaxCents(res.taxCents ?? 0);
                setSubmittedTotalCents((res.orders ?? []).reduce((a: number, o: any) => a + (o.totalCents ?? 0), 0));
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
                setSubmittedTaxCents(res.taxCents ?? 0);
                setSubmittedTotalCents((res.orders ?? []).reduce((a: number, o: any) => a + (o.totalCents ?? 0), 0));
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
            <div className="press-canvas min-h-screen flex flex-col font-press">
                <PressFrame />
                <PublicHeader />
                <div className="flex-1 flex items-center justify-center p-4">
                <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} transition={{ duration:0.35, ease:EASE }}
                    className="spec-panel rounded-lg p-8 text-center max-w-md">
                    <div className="w-16 h-16 bg-plate-950 border border-plate-700 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-plate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                    </div>
                    <h1 className="text-xl font-extrabold text-plate-50 mb-2">Your cart is empty</h1>
                    <p className="text-sm text-plate-300 mb-5">Browse a group shop to add items to your cart.</p>
                    <Link href="/shops"><PressButton type="button">Browse Shops</PressButton></Link>
                </motion.div>
                </div>
            </div>
        );
    }

    /* ── Done ── */
    if (step === "done") {
        const isOffline = paymentMethod === "pickup";
        const isPickup = submittedShipping.method === "PICKUP";
        const itemsTotal = submittedGroups.reduce((a, g) => a + g.subtotal, 0);
        const finalTotal = submittedTotalCents || (itemsTotal + submittedShipping.cents + submittedTaxCents);
        return (
            <div className="press-canvas min-h-screen flex flex-col items-center justify-center p-4 font-press">
                <PressFrame />
                <motion.div initial={{ opacity:0, scale:0.93, y:16 }} animate={{ opacity:1, scale:1, y:0 }}
                    transition={{ duration:0.4, ease:EASE }}
                    className="spec-panel rounded-lg shadow-plate-hover p-8 sm:p-10 max-w-lg w-full text-center relative overflow-hidden">
                    {/* A torn-edge credential stub — the raise this direction kept
                        from the moon-shadow-bazaar challenger: order confirmation
                        reads like a stamped, all-access production ticket. */}
                    <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: "repeating-linear-gradient(90deg, #414855 0 8px, transparent 8px 16px)" }} />
                    <motion.div initial={{ scale:0 }} animate={{ scale:1 }}
                        transition={{ delay:0.2, type:"spring", stiffness:260, damping:20 }}
                        className={`w-16 h-16 ${isOffline ? "bg-[#E7A22E]/15" : "bg-[#167A4D]/15"} rounded-full flex items-center justify-center mx-auto mb-5`}>
                        {isOffline ? (
                            <svg className="w-8 h-8 text-[#E7A22E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                        ) : (
                            <svg className="w-8 h-8 text-[#8FE0BB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                        )}
                    </motion.div>
                    <h1 className="text-2xl font-extrabold text-plate-50 mb-2">{isOffline ? "Order confirmed!" : "Payment received!"}</h1>
                    <p className="text-sm text-plate-300 mb-5">
                        Thanks, <strong className="text-plate-50">{form.customerName}</strong>!{" "}
                        {isPickup
                            ? `Your order will be ready for pickup from ${shopNames.join(" and ")}. ${isOffline ? `Please bring cash or a check for ${fmt(finalTotal)} when you pick it up.` : "We'll let you know when it's ready."}`
                            : isOffline
                                ? `Please bring cash or a check for ${fmt(finalTotal)} when you pick it up.`
                                : "Your payment was successful and your order is being processed and shipped to you."}
                    </p>

                    <div className="bg-plate-950 border border-plate-700 rounded-md px-4 py-3 mb-5 text-left space-y-2">
                        {submittedGroups.length > 1 && (
                            <>
                                <p className="text-xs font-bold text-plate-400 uppercase tracking-wider">Itemized by shop</p>
                                {submittedGroups.map(g => (
                                    <div key={g.shopSlug} className="flex justify-between text-sm">
                                        <span className="text-plate-50 font-medium">{g.shopName}</span>
                                        <span className="text-plate-50 font-bold font-spec tabular-nums">{fmt(g.subtotal)}</span>
                                    </div>
                                ))}
                                <div className="border-t border-dashed border-plate-700 my-1" />
                            </>
                        )}
                        <div className="flex justify-between text-sm">
                            <span className="text-plate-300">{isPickup ? "Pickup" : "Shipping"}</span>
                            <span className="text-plate-50 font-semibold font-spec tabular-nums">{isPickup ? "Free" : fmt(submittedShipping.cents)}</span>
                        </div>
                        {submittedTaxCents > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-plate-300">Tax</span>
                                <span className="text-plate-50 font-semibold font-spec tabular-nums">{fmt(submittedTaxCents)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm font-bold pt-1 border-t border-dashed border-plate-700">
                            <span className="text-plate-50">Total</span>
                            <span className="text-plate-50 font-spec tabular-nums">{fmt(finalTotal)}</span>
                        </div>
                    </div>

                    <div className="bg-plate-950 border border-plate-700 rounded-md px-4 py-3 text-sm text-plate-300 mb-5">
                        Confirmation: <code className="font-spec font-bold text-[#FF8A73]">#{reference.slice(-8).toUpperCase()}</code>
                    </div>
                    <p className="text-xs text-plate-300 mb-6">A confirmation email will be sent to {form.customerEmail}</p>
                    <div className="border-t border-plate-700 pt-5 space-y-4">
                        <Image src="/logo.png" alt="Crossroads Custom Apparel" width={120} height={48} className="mx-auto object-contain opacity-80" />
                        <Link href="/shops" className="text-sm text-proc-cyan hover:brightness-125 font-bold">← Back to all shops</Link>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="press-canvas min-h-screen flex flex-col font-press">
            <PressFrame />

            {/* ── Nav — persistent across every public page, see PublicHeader.
                Checkout suppresses its own cart pill (itemCount omitted) since
                the pill's whole job is "go to checkout," which is redundant
                here. ── */}
            <PublicHeader />

            {/* ── STEP-AWARE BACK BAR — stacks directly below the persistent
                PublicHeader (top-16 = its 64px height), never overlapping it ── */}
            <div className="sticky top-16 z-20 bg-plate-950/90 backdrop-blur-md border-b border-plate-800">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 h-11 flex items-center">
                    <Link href="/shops" className="text-sm font-bold text-plate-300 hover:text-plate-50 flex items-center gap-1 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                        {step === "payment" ? "Edit order" : "Continue shopping"}
                    </Link>
                </div>
            </div>

            <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
                <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4, ease:EASE }}>
                    <h1 className="font-display uppercase text-2xl sm:text-3xl text-plate-50 tracking-tight">Checkout</h1>
                    <p className="text-sm text-plate-300 mt-1 mb-6">
                        {itemCount} item{itemCount !== 1 ? "s" : ""} {groups.length > 1 ? `across ${groups.length} shops` : `from ${groups[0]?.shopName ?? "your shop"}`}
                    </p>
                </motion.div>

                {step === "review" && (
                    <motion.div initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }} transition={{ duration:0.3, ease:EASE }}
                        className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        <form onSubmit={handleContinue} className="lg:col-span-3 space-y-4">
                            <div className="spec-panel rounded-lg p-5 space-y-4">
                                <h2 className="text-sm font-extrabold text-plate-50">Contact information</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-plate-300 mb-1.5" htmlFor="cust-name">Full name</label>
                                        <input id="cust-name" required className={inputCls} placeholder="Jane Smith"
                                            value={form.customerName} onChange={e => setForm(p => ({ ...p, customerName:e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-plate-300 mb-1.5" htmlFor="cust-email">Email</label>
                                        <input id="cust-email" required type="email" className={inputCls} placeholder="jane@example.com"
                                            value={form.customerEmail} onChange={e => setForm(p => ({ ...p, customerEmail:e.target.value }))} />
                                    </div>
                                </div>
                            </div>

                            <div className="spec-panel rounded-lg p-5">
                                <h2 className="text-sm font-extrabold text-plate-50 mb-3">How do you want to get your order?</h2>
                                <div className="space-y-2">
                                    <label className={`flex items-center gap-3 p-3.5 rounded-md border-2 transition-all duration-150 ${!shippingAllowed ? "opacity-50 cursor-not-allowed border-plate-700" : shippingMethod === "SHIP" ? "border-proc-cyan bg-proc-cyan/10 cursor-pointer" : "border-plate-700 hover:border-plate-600 cursor-pointer"}`}>
                                        <input type="radio" name="shippingMethod" value="SHIP" className="accent-proc-cyan" disabled={!shippingAllowed}
                                            checked={shippingMethod === "SHIP"} onChange={() => setShippingMethod("SHIP")} />
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-plate-50">Ship to you</p>
                                            <p className="text-xs text-plate-300 mt-0.5">
                                                {shippingAllowed ? "We'll calculate shipping based on your address" : `Not available — ${shopsWithoutShipping.join(", ")} ${shopsWithoutShipping.length === 1 ? "offers" : "offer"} pickup only`}
                                            </p>
                                        </div>
                                        <svg className="w-5 h-5 text-plate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                                    </label>
                                    <label className={`flex items-center gap-3 p-3.5 rounded-md border-2 cursor-pointer transition-all duration-150 ${shippingMethod === "PICKUP" ? "border-[#167A4D] bg-[#167A4D]/10" : "border-plate-700 hover:border-plate-600"}`}>
                                        <input type="radio" name="shippingMethod" value="PICKUP" className="accent-[#167A4D]"
                                            checked={shippingMethod === "PICKUP"} onChange={() => setShippingMethod("PICKUP")} />
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-plate-50">Pick up — Free</p>
                                            <p className="text-xs text-plate-300 mt-0.5">Pick up from {shopNames.join(" / ")} once ready — no shipping cost</p>
                                        </div>
                                        <svg className="w-5 h-5 text-plate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                                    </label>
                                </div>
                            </div>

                            {shippingMethod === "SHIP" && (
                                <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }}>
                                    <div className="spec-panel rounded-lg p-5 space-y-4">
                                        <h2 className="text-sm font-extrabold text-plate-50">Shipping address</h2>
                                        <div>
                                            <label className="block text-xs font-bold text-plate-300 mb-1.5" htmlFor="addr1">Street address</label>
                                            <input id="addr1" required className={inputCls} placeholder="123 Main St"
                                                value={form.shipAddress1} onChange={e => setForm(p => ({ ...p, shipAddress1:e.target.value }))} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-plate-300 mb-1.5" htmlFor="addr2">Apartment, suite, etc. (optional)</label>
                                            <input id="addr2" className={inputCls} placeholder="Apt 4B"
                                                value={form.shipAddress2} onChange={e => setForm(p => ({ ...p, shipAddress2:e.target.value }))} />
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            <div className="col-span-2 sm:col-span-1">
                                                <label className="block text-xs font-bold text-plate-300 mb-1.5" htmlFor="city">City</label>
                                                <input id="city" required className={inputCls} placeholder="Springfield"
                                                    value={form.shipCity} onChange={e => setForm(p => ({ ...p, shipCity:e.target.value }))} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-plate-300 mb-1.5" htmlFor="state">State</label>
                                                <input id="state" required maxLength={2} className={inputCls} placeholder="IL"
                                                    value={form.shipState} onChange={e => setForm(p => ({ ...p, shipState:e.target.value.toUpperCase() }))} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-plate-300 mb-1.5" htmlFor="zip">ZIP</label>
                                                <input id="zip" required className={inputCls} placeholder="62701"
                                                    value={form.shipZip} onChange={e => setForm(p => ({ ...p, shipZip:e.target.value }))} />
                                            </div>
                                        </div>
                                        {shippingLoading && (
                                            <p className="text-xs text-plate-300 flex items-center gap-1.5">
                                                <span className="w-3 h-3 border-2 border-plate-600 border-t-transparent rounded-full animate-spin inline-block" />
                                                Calculating shipping…
                                            </p>
                                        )}
                                        {!shippingLoading && shippingQuote && (
                                            <p className="text-xs text-[#8FE0BB] font-bold flex items-center gap-1.5">
                                                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                                                Shipping: {fmt(shippingQuote.cents)}{shippingQuote.service ? ` via ${shippingQuote.service}` : ""}{shippingQuote.estimated ? " (estimate)" : ""}
                                            </p>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {shippingMethod === "PICKUP" && (
                                <div className="bg-[#167A4D]/10 border border-[#167A4D]/25 rounded-md px-4 py-3">
                                    <p className="text-xs text-plate-100">You'll pick up your order from <strong className="text-[#8FE0BB]">{shopNames.join(", ")}</strong> — we'll email you when it's ready.</p>
                                </div>
                            )}

                            {shippingMethod && (
                                <div className="spec-panel rounded-lg p-5">
                                    <h2 className="text-sm font-extrabold text-plate-50 mb-3">Payment method</h2>
                                    <div className="space-y-2">
                                        <label className={`flex items-center gap-3 p-3.5 rounded-md border-2 cursor-pointer transition-all duration-150 ${paymentMethod === "stripe" ? "border-proc-cyan bg-proc-cyan/10" : "border-plate-700 hover:border-plate-600"}`}>
                                            <input type="radio" name="paymentMethod" value="stripe" className="accent-proc-cyan"
                                                checked={paymentMethod === "stripe"} onChange={() => setPaymentMethod("stripe")} />
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-plate-50">Card / Apple Pay / Google Pay</p>
                                                <p className="text-xs text-plate-300 mt-0.5">Pay securely online with card or digital wallet</p>
                                            </div>
                                        </label>
                                        {shippingMethod === "PICKUP" && (
                                            <label className={`flex items-center gap-3 p-3.5 rounded-md border-2 cursor-pointer transition-all duration-150 ${paymentMethod === "pickup" ? "border-[#167A4D] bg-[#167A4D]/10" : "border-plate-700 hover:border-plate-600"}`}>
                                                <input type="radio" name="paymentMethod" value="pickup" className="accent-[#167A4D]"
                                                    checked={paymentMethod === "pickup"} onChange={() => setPaymentMethod("pickup")} />
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-plate-50">Pay at pickup</p>
                                                    <p className="text-xs text-plate-300 mt-0.5">Pay with cash or check when you collect your order</p>
                                                </div>
                                                <svg className="w-5 h-5 text-plate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V6m0 10v2m9-6a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                            </label>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="spec-panel rounded-lg p-5">
                                <h2 className="text-sm font-extrabold text-plate-50 mb-3">Special Instructions / Comments</h2>
                                <textarea aria-label="Special instructions or comments" rows={3}
                                    placeholder="Anything we should know? e.g. delivery notes, group leader name, design requests…"
                                    value={form.specialInstructions}
                                    onChange={e => setForm(p => ({ ...p, specialInstructions:e.target.value }))}
                                    className={`${inputCls} resize-none`} />
                            </div>

                            <div className="spec-panel rounded-lg p-5">
                                <h2 className="text-sm font-extrabold text-plate-50 mb-3">Discount code</h2>
                                <input aria-label="Discount code" className={`${inputCls} uppercase`} placeholder="Enter code"
                                    value={discountCode} onChange={e => setDiscountCode(e.target.value.toUpperCase())} />
                            </div>

                            {error && (
                                <motion.div initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }}
                                    className="bg-[#C93420]/10 border border-[#C93420]/25 rounded-md px-4 py-3 text-sm font-medium text-[#FF8A73]">
                                    {error}
                                </motion.div>
                            )}

                            <PressButton type="submit" disabled={placing || !paymentMethod || !shippingMethod || !shippingReady}
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
                            </PressButton>
                        </form>

                        {/* Order summary — itemized by shop, styled as a spec sheet */}
                        <div className="lg:col-span-2">
                            <div className="spec-panel rounded-lg p-5 sticky top-20 space-y-5">
                                <h2 className="text-sm font-extrabold text-plate-50">
                                    Order summary <span className="font-normal text-plate-300">({itemCount} item{itemCount!==1?"s":""})</span>
                                </h2>
                                {groups.map(g => (
                                    <div key={g.shopSlug}>
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-xs font-extrabold text-proc-cyan uppercase tracking-wider">{g.shopName}</p>
                                            <p className="text-xs font-bold text-plate-300 font-spec tabular-nums">{fmt(g.subtotal)}</p>
                                        </div>
                                        <div className="space-y-3">
                                            {g.items.map((item) => {
                                                const idx = cart.indexOf(item);
                                                return (
                                                    <div key={idx} className="flex items-start gap-3">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold text-plate-50 truncate">{item.name}</p>
                                                            <p className="text-xs text-plate-300 mt-0.5 flex items-center gap-1">
                                                                {item.color && (
                                                                    <span className="w-2.5 h-2.5 rounded-full border border-plate-600 inline-block"
                                                                        style={{ backgroundColor: getColorCss(item.color) }} />
                                                                )}
                                                                {[item.size, item.color].filter(Boolean).join(" · ")}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            <button type="button" onClick={() => updateQty(idx, item.quantity-1)}
                                                                className="w-6 h-6 rounded-md bg-plate-800 hover:bg-plate-700 text-plate-50 flex items-center justify-center text-sm font-bold transition-colors">−</button>
                                                            <span className="text-sm font-bold text-plate-50 w-4 text-center font-spec tabular-nums">{item.quantity}</span>
                                                            <button type="button" onClick={() => updateQty(idx, item.quantity+1)}
                                                                className="w-6 h-6 rounded-md bg-plate-800 hover:bg-plate-700 text-plate-50 flex items-center justify-center text-sm font-bold transition-colors">+</button>
                                                        </div>
                                                        <button type="button" title="Remove" aria-label="Remove item" onClick={() => removeItem(idx)}
                                                            className="text-plate-500 hover:text-[#FF8A73] transition-colors shrink-0">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                                <div className="border-t border-dashed border-plate-700 pt-4 space-y-2">
                                    <div className="flex justify-between text-sm text-plate-300">
                                        <span>Subtotal</span><span className="font-medium text-plate-50 font-spec tabular-nums">{fmt(subtotalCents)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-plate-300">
                                        <span>{shippingMethod === "PICKUP" ? "Pickup" : "Shipping"}</span>
                                        {shippingMethod === "PICKUP" ? (
                                            <span className="text-[#8FE0BB] font-bold">Free</span>
                                        ) : shippingMethod === "SHIP" ? (
                                            shippingLoading ? (
                                                <span className="text-plate-300 text-xs">Calculating…</span>
                                            ) : shippingQuote ? (
                                                <span className="font-medium text-plate-50 font-spec tabular-nums">{fmt(shippingQuote.cents)}</span>
                                            ) : (
                                                <span className="text-plate-300 text-xs">Enter address</span>
                                            )
                                        ) : (
                                            <span className="text-plate-300 text-xs">Select an option</span>
                                        )}
                                    </div>
                                    <div className="flex justify-between text-sm text-plate-300">
                                        <span>Tax</span>
                                        <span className="text-plate-300 text-xs">Calculated at checkout</span>
                                    </div>
                                    <div className="flex justify-between font-extrabold text-plate-50 pt-2 border-t border-dashed border-plate-700 text-base">
                                        <span>Total</span><span className="font-spec tabular-nums">{fmt(grandTotal)}</span>
                                    </div>
                                    <p className="text-[11px] text-plate-400 -mt-1">Plus applicable sales tax, shown before you pay.</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {step === "payment" && stripeClientSecret && (
                    <motion.div initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }} transition={{ duration:0.3 }}
                        className="max-w-lg mx-auto">
                        <h2 className="text-lg font-extrabold text-plate-50 mb-4">Complete your payment</h2>
                        <div className="spec-panel rounded-lg p-5 mb-4 space-y-1.5">
                            <div className="flex justify-between text-sm text-plate-300">
                                <span>{submittedShipping.method === "PICKUP" ? "Pickup" : "Shipping"}</span>
                                <span className="text-plate-50 font-medium font-spec tabular-nums">{submittedShipping.method === "PICKUP" ? "Free" : fmt(submittedShipping.cents)}</span>
                            </div>
                            {submittedTaxCents > 0 && (
                                <div className="flex justify-between text-sm text-plate-300">
                                    <span>Tax</span>
                                    <span className="text-plate-50 font-medium font-spec tabular-nums">{fmt(submittedTaxCents)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-base font-extrabold text-plate-50 pt-2 border-t border-dashed border-plate-700">
                                <span>Total</span><span className="font-spec tabular-nums">{fmt(submittedTotalCents)}</span>
                            </div>
                        </div>
                        <Elements stripe={stripePromise} options={{
                            clientSecret: stripeClientSecret,
                            appearance: {
                                theme: "night",
                                variables: {
                                    colorPrimary: "#00AEEF",
                                    colorBackground: "#0A0D14",
                                    colorText: "#E7E9ED",
                                    colorTextSecondary: "#A3AAB6",
                                    colorDanger: "#FF8A73",
                                    fontFamily: "Public Sans, system-ui, sans-serif",
                                    borderRadius: "8px",
                                },
                                rules: {
                                    ".Input": { border: "1px solid #2B303A", backgroundColor: "#121620" },
                                    ".Input:focus": { border: "1px solid #00AEEF", boxShadow: "0 0 0 2px rgba(0,174,239,0.25)" },
                                    ".Tab": { border: "1px solid #2B303A", backgroundColor: "#121620" },
                                    ".Tab--selected": { border: "1px solid #00AEEF", backgroundColor: "#171B21" },
                                    ".Label": { color: "#A3AAB6" },
                                }
                            }
                        }}>
                            <StripePaymentForm totalCents={submittedTotalCents}
                                onSuccess={() => { clearAll(); setStep("done"); }}
                                onBack={() => setStep("review")} />
                        </Elements>
                    </motion.div>
                )}
            </main>
        </div>
    );
}
