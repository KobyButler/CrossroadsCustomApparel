"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
            <Card className="p-5">
                <h2 className="text-sm font-bold text-white mb-4">Card / digital wallet</h2>
                <PaymentElement options={{ layout: "tabs" }} />
            </Card>
            {error && (
                <motion.div initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }}
                    className="bg-signal-red/10 border border-signal-red/25 rounded-md px-4 py-3 text-sm font-medium text-signal-red">
                    {error}
                </motion.div>
            )}
            <div className="flex gap-3">
                <Button type="button" variant="secondary" onClick={onBack} className="flex-1">
                    ← Back
                </Button>
                <Button type="submit" disabled={!stripe} loading={processing} className="flex-[2]">
                    {processing ? "Processing…" : `Pay ${fmt(totalCents)}`}
                </Button>
            </div>
        </form>
    );
}
