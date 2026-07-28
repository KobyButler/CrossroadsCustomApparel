"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const fmt = (cents: number) =>
    new Intl.NumberFormat("en-US", { style:"currency", currency:"USD" }).format(cents / 100);

export function StripePaymentForm({ totalCents, onSuccess, onBack }: {
    totalCents: number; onSuccess: () => void; onBack: () => void;
}) {
    const stripe = useStripe();
    const elements = useElements();
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState("");

    async function handlePay(e: React.FormEvent) {
        e.preventDefault();
        if (!stripe || !elements) return;
        setProcessing(true); setError("");
        const { error: stripeError } = await stripe.confirmPayment({ elements, redirect: "if_required" });
        if (stripeError) { setError(stripeError.message ?? "Payment failed."); setProcessing(false); }
        else onSuccess();
    }

    return (
        <form onSubmit={handlePay} className="space-y-4">
            <div className="bg-white rounded-2xl ring-1 ring-black/5 p-5">
                <h2 className="text-sm font-bold text-slate-900 mb-4">Card / digital wallet</h2>
                <PaymentElement options={{ layout: "tabs" }} />
            </div>
            {error && (
                <motion.div initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }}
                    className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm font-medium text-red-700">
                    {error}
                </motion.div>
            )}
            <div className="flex gap-3">
                <button type="button" onClick={onBack}
                    className="flex-1 py-3 rounded-xl text-sm font-medium text-slate-600 bg-white ring-1 ring-black/8 hover:bg-slate-50 transition-colors">
                    ← Back
                </button>
                <motion.button type="submit" disabled={!stripe || processing} whileHover={{ y:-1 }} whileTap={{ scale:0.98 }}
                    className="btn-shine flex-[2] text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60"
                    style={{ background:"linear-gradient(135deg,#8b5cf6 0%,#7c3aed 100%)", boxShadow:"0 6px 24px rgba(124,58,237,0.4)" }}>
                    {processing ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Processing…</> : <>Pay {fmt(totalCents)}</>}
                </motion.button>
            </div>
        </form>
    );
}
