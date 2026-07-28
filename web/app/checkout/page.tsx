"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { useCart, CartItem } from "@/lib/cart";
import { computeItemPriceCents } from "@/lib/pricing";
import { getColorCss } from "@/lib/colors";
import { StripePaymentForm } from "@/components/storefront/StripePaymentForm";

type PaymentMethod = "stripe" | "pickup" | "";

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

export default function CheckoutPage() {
    const { cart, updateQty, removeItem, subtotalCents, itemCount, clearAll } = useCart();
    const [step, setStep] = useState<"review"|"payment"|"done">("review");
    const [form, setForm] = useState({
        customerName:"", customerEmail:"",
        shipAddress1:"", shipAddress2:"", shipCity:"", shipState:"", shipZip:""
    });
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("");
    const [discountCode, setDiscountCode] = useState("");
    const [placing, setPlacing] = useState(false);
    const [error, setError] = useState("");
    const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
    const [submittedGroups, setSubmittedGroups] = useState<ReturnType<typeof groupByShop>>([]);
    const [reference, setReference] = useState("");

    const groups = useMemo(() => groupByShop(cart), [cart]);

    const inputCls = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all";

    async function handleContinue(e: React.FormEvent) {
        e.preventDefault();
        if (!paymentMethod) { setError("Please select a payment method."); return; }
        setError("");
        const items = cart.map(c => ({ productId:c.productId, quantity:c.quantity, size:c.size, color:c.color, shopSlug:c.shopSlug }));

        if (paymentMethod === "stripe") {
            setPlacing(true);
            try {
                const res = await publicFetch("/payments/create-intent", {
                    method: "POST",
                    body: JSON.stringify({ ...form, items, discountCode: discountCode || undefined })
                });
                setStripeClientSecret(res.clientSecret);
                setSubmittedGroups(groups);
                setReference(res.orderGroupId ?? res.orderId);
                setStep("payment");
            } catch (err: any) { setError(err.message || "Could not initialize payment."); }
            finally { setPlacing(false); }
        } else {
            setPlacing(true);
            try {
                const res = await publicFetch("/orders/checkout", {
                    method: "POST",
                    body: JSON.stringify({ ...form, items, discountCode: discountCode || undefined, paymentMethod })
                });
                setSubmittedGroups(groups);
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
            <div className="min-h-screen bg-[#f8f7ff] flex items-center justify-center p-4">
                <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} className="text-center max-w-md">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-card flex items-center justify-center mx-auto mb-4 ring-1 ring-black/5">
                        <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 mb-2">Your cart is empty</h1>
                    <p className="text-sm text-slate-500 mb-5">Browse a group shop to add items to your cart.</p>
                    <Link href="/shops" className="btn-shine inline-flex items-center gap-2 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all"
                        style={{ background:"linear-gradient(135deg,#8b5cf6 0%,#7c3aed 100%)" }}>
                        Browse Shops
                    </Link>
                </motion.div>
            </div>
        );
    }

    /* ── Done ── */
    if (step === "done") {
        const isOffline = paymentMethod === "pickup";
        const grandTotal = submittedGroups.reduce((a, g) => a + g.subtotal, 0);
        return (
            <div className="min-h-screen bg-[#f8f7ff] flex flex-col items-center justify-center p-4">
                <motion.div initial={{ opacity:0, scale:0.93, y:16 }} animate={{ opacity:1, scale:1, y:0 }}
                    transition={{ duration:0.4, ease:[0.32,0.72,0,1] }}
                    className="bg-white rounded-3xl shadow-xl ring-1 ring-black/5 p-8 sm:p-10 max-w-lg w-full text-center">
                    <motion.div initial={{ scale:0 }} animate={{ scale:1 }}
                        transition={{ delay:0.2, type:"spring", stiffness:260, damping:20 }}
                        className={`w-16 h-16 ${isOffline ? "bg-amber-100" : "bg-emerald-100"} rounded-full flex items-center justify-center mx-auto mb-5`}>
                        {isOffline ? (
                            <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                        ) : (
                            <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                        )}
                    </motion.div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">{isOffline ? "Order confirmed!" : "Payment received!"}</h1>
                    <p className="text-sm text-slate-500 mb-5">
                        Thanks, <strong className="text-slate-700">{form.customerName}</strong>!{" "}
                        {isOffline ? `Please bring cash or a check for ${fmt(grandTotal)} when you pick it up.` : "Your payment was successful and your order is being processed."}
                    </p>

                    {submittedGroups.length > 1 && (
                        <div className="bg-slate-50 rounded-xl px-4 py-3 mb-5 text-left space-y-3">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Itemized by shop</p>
                            {submittedGroups.map(g => (
                                <div key={g.shopSlug} className="flex justify-between text-sm">
                                    <span className="text-slate-700 font-medium">{g.shopName}</span>
                                    <span className="text-slate-900 font-bold">{fmt(g.subtotal)}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-600 mb-5">
                        Confirmation: <code className="font-mono font-bold text-slate-800">#{reference.slice(-8).toUpperCase()}</code>
                    </div>
                    <p className="text-xs text-slate-400 mb-6">A confirmation email will be sent to {form.customerEmail}</p>
                    <div className="border-t border-slate-100 pt-5 space-y-4">
                        <Image src="/logo.png" alt="Crossroads Custom Apparel" width={120} height={48} className="mx-auto object-contain opacity-60" />
                        <Link href="/shops" className="text-sm text-violet-600 hover:text-violet-800 font-semibold">← Back to all shops</Link>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col" style={{ background: "#f4f3fb" }}>
            {/* Header */}
            <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-slate-200 shadow-sm">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
                    <Link href="/shops" className="text-sm font-medium text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                        {step === "payment" ? "Edit order" : "Continue shopping"}
                    </Link>
                    <Image src="/logo.png" alt="Crossroads Custom Apparel" width={100} height={40} className="object-contain" />
                </div>
            </div>

            <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
                <h1 className="text-2xl font-bold text-slate-900 mb-1">Checkout</h1>
                <p className="text-sm text-slate-500 mb-6">
                    {itemCount} item{itemCount !== 1 ? "s" : ""} {groups.length > 1 ? `across ${groups.length} shops` : `from ${groups[0]?.shopName ?? "your shop"}`}
                </p>

                {step === "review" && (
                    <motion.div initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }} transition={{ duration:0.3, ease:[0.32,0.72,0,1] }}
                        className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        <form onSubmit={handleContinue} className="lg:col-span-3 space-y-4">
                            <div className="bg-white rounded-2xl ring-1 ring-black/5 p-5 space-y-4">
                                <h2 className="text-sm font-bold text-slate-900">Contact information</h2>
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
                            </div>

                            <div className="bg-white rounded-2xl ring-1 ring-black/5 p-5 space-y-4">
                                <h2 className="text-sm font-bold text-slate-900">Shipping address</h2>
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
                            </div>

                            <div className="bg-white rounded-2xl ring-1 ring-black/5 p-5">
                                <h2 className="text-sm font-bold text-slate-900 mb-3">Payment method</h2>
                                <div className="space-y-2">
                                    <label className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all duration-150 ${paymentMethod === "stripe" ? "border-violet-500 bg-violet-50" : "border-slate-200 hover:border-slate-300"}`}>
                                        <input type="radio" name="paymentMethod" value="stripe" className="accent-violet-600"
                                            checked={paymentMethod === "stripe"} onChange={() => setPaymentMethod("stripe")} />
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-slate-900">Card / Apple Pay / Google Pay</p>
                                            <p className="text-xs text-slate-400 mt-0.5">Pay securely online with card or digital wallet</p>
                                        </div>
                                    </label>
                                    <label className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all duration-150 ${paymentMethod === "pickup" ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-slate-300"}`}>
                                        <input type="radio" name="paymentMethod" value="pickup" className="accent-emerald-600"
                                            checked={paymentMethod === "pickup"} onChange={() => setPaymentMethod("pickup")} />
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-slate-900">Pay at pickup</p>
                                            <p className="text-xs text-slate-400 mt-0.5">Pay with cash or check when you collect your order</p>
                                        </div>
                                        <span className="text-lg">💵</span>
                                    </label>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl ring-1 ring-black/5 p-5">
                                <h2 className="text-sm font-bold text-slate-900 mb-3">Discount code</h2>
                                <input aria-label="Discount code" className={`${inputCls} uppercase`} placeholder="Enter code"
                                    value={discountCode} onChange={e => setDiscountCode(e.target.value.toUpperCase())} />
                            </div>

                            {error && (
                                <motion.div initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }}
                                    className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm font-medium text-red-700">
                                    {error}
                                </motion.div>
                            )}

                            <motion.button type="submit" disabled={placing || !paymentMethod} whileHover={{ y:-1 }} whileTap={{ scale:0.98 }}
                                className="btn-shine w-full text-white font-semibold py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60"
                                style={{ background:"linear-gradient(135deg,#8b5cf6 0%,#7c3aed 100%)", boxShadow:"0 6px 24px rgba(124,58,237,0.4)" }}>
                                {placing ? (
                                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Working…</>
                                ) : paymentMethod === "stripe" ? (
                                    <>Continue to payment · {fmt(subtotalCents)}</>
                                ) : paymentMethod ? (
                                    <>Place order · {fmt(subtotalCents)}</>
                                ) : <>Select a payment method</>}
                            </motion.button>
                        </form>

                        {/* Order summary — itemized by shop */}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-2xl ring-1 ring-black/5 p-5 sticky top-20 space-y-5">
                                <h2 className="text-sm font-bold text-slate-900">
                                    Order summary <span className="font-normal text-slate-400">({itemCount} item{itemCount!==1?"s":""})</span>
                                </h2>
                                {groups.map(g => (
                                    <div key={g.shopSlug}>
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-xs font-bold text-brand-600 uppercase tracking-wider">{g.shopName}</p>
                                            <p className="text-xs font-semibold text-slate-500">{fmt(g.subtotal)}</p>
                                        </div>
                                        <div className="space-y-3">
                                            {g.items.map((item) => {
                                                const idx = cart.indexOf(item);
                                                return (
                                                    <div key={idx} className="flex items-start gap-3">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-semibold text-slate-900 truncate">{item.name}</p>
                                                            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                                                {item.color && (
                                                                    <span className="w-2.5 h-2.5 rounded-full border border-black/10 inline-block"
                                                                        style={{ backgroundColor: getColorCss(item.color) }} />
                                                                )}
                                                                {[item.size, item.color].filter(Boolean).join(" · ")}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            <button type="button" onClick={() => updateQty(idx, item.quantity-1)}
                                                                className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-sm font-bold transition-colors">−</button>
                                                            <span className="text-sm font-semibold text-slate-900 w-4 text-center">{item.quantity}</span>
                                                            <button type="button" onClick={() => updateQty(idx, item.quantity+1)}
                                                                className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-sm font-bold transition-colors">+</button>
                                                        </div>
                                                        <button type="button" title="Remove" aria-label="Remove item" onClick={() => removeItem(idx)}
                                                            className="text-slate-300 hover:text-red-500 transition-colors shrink-0">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                                <div className="border-t border-slate-100 pt-4 space-y-2">
                                    <div className="flex justify-between text-sm text-slate-500">
                                        <span>Subtotal</span><span className="font-medium text-slate-900">{fmt(subtotalCents)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-slate-500">
                                        <span>Shipping</span><span className="text-slate-400 text-xs">Calculated at next step</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-100 text-base">
                                        <span>Total</span><span>{fmt(subtotalCents)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {step === "payment" && stripeClientSecret && (
                    <motion.div initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }} transition={{ duration:0.3 }}
                        className="max-w-lg mx-auto">
                        <h2 className="text-lg font-bold text-slate-900 mb-4">Complete your payment</h2>
                        <Elements stripe={stripePromise} options={{ clientSecret: stripeClientSecret, appearance: { theme:"stripe", variables: { colorPrimary:"#7c3aed" } } }}>
                            <StripePaymentForm totalCents={subtotalCents}
                                onSuccess={() => { clearAll(); setStep("done"); }}
                                onBack={() => setStep("review")} />
                        </Elements>
                    </motion.div>
                )}
            </main>
        </div>
    );
}
