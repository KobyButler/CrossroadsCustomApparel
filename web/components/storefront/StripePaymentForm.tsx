"use client";
// Used only by the public checkout — safe to carry "The Print Floor" styling
// (see DESIGN.md); unrelated to the admin console's Button/Card.
import { useState } from "react";
import { motion } from "framer-motion";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { PressButton } from "@/components/public/PressButton";

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
            <div className="spec-panel rounded-lg p-5">
                <h2 className="text-sm font-extrabold text-plate-50 mb-4">Card / digital wallet</h2>
                <PaymentElement options={{ layout: "tabs" }} />
            </div>
            {error && (
                <motion.div initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }}
                    className="bg-[#C93420]/10 border border-[#C93420]/25 rounded-md px-4 py-3 text-sm font-medium text-[#FF8A73]">
                    {error}
                </motion.div>
            )}
            <div className="flex gap-3">
                <PressButton type="button" variant="secondary" onClick={onBack} className="flex-1">
                    ← Back
                </PressButton>
                <PressButton type="submit" disabled={!stripe} loading={processing} className="flex-[2]">
                    {processing ? "Processing…" : `Pay ${fmt(totalCents)}`}
                </PressButton>
            </div>
        </form>
    );
}
