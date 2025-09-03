"use client";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ShopPage({ params }: any) {
    const slug = params.slug;
    const [shop, setShop] = useState<any>(null);
    const [cart, setCart] = useState<any[]>([]);
    const [form, setForm] = useState<any>({ residential: true });

    useEffect(() => { api(`/shops/${slug}`).then(setShop); }, [slug]);
    const products = shop?.collection?.products ?? [];

    const totalCents = useMemo(
        () => cart.reduce((a, c) => a + c.priceCents * c.quantity, 0),
        [cart]
    );

    function add(p: any) {
        setCart(prev => {
            const idx = prev.findIndex(x => x.productId === p.id);
            if (idx >= 0) {
                const copy = [...prev];
                copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + 1 };
                return copy;
            }
            return [...prev, { productId: p.id, name: p.name, priceCents: p.priceCents, quantity: 1 }];
        });
    }

    function updateQty(i: number, q: number) {
        setCart(prev => prev.map((x, idx) => idx === i ? { ...x, quantity: Math.max(1, q) } : x));
    }

    async function saveForLater() {
        await api("/checkouts", {
            method: "POST",
            body: JSON.stringify({ shopSlug: slug, email: form.customerEmail || null, items: cart })
        });
        alert("Saved. If not completed, this will appear under Abandoned checkouts.");
    }

    async function checkout(e: any) {
        e.preventDefault();
        const payload = {
            shopSlug: slug,
            customerName: form.customerName,
            customerEmail: form.customerEmail,
            shipAddress1: form.shipAddress1, shipAddress2: form.shipAddress2,
            shipCity: form.shipCity, shipState: form.shipState, shipZip: form.shipZip,
            residential: form.residential,
            items: cart.map(c => ({ productId: c.productId, quantity: c.quantity }))
        };
        const o = await api("/orders", { method: "POST", body: JSON.stringify(payload) });
        alert("Order placed: " + o.id);
        location.reload();
    }

    if (!shop) return <main className="container py-10">Loading…</main>;

    return (
        <main className="container py-10">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold">{shop.name}</h1>
                <p className="text-sm text-gray-400">Collection: {shop.collection.name}</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                <section className="lg:col-span-2">
                    <div className="grid sm:grid-cols-2 gap-4">
                        {products.map((p: any) => (
                            <Card key={p.id} className="group">
                                <CardHeader>
                                    <CardTitle className="flex items-center justify-between">
                                        <span>{p.name}</span>
                                        <span className="text-sm text-gray-300">${(p.priceCents / 100).toFixed(2)}</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex items-center justify-between">
                                    <div className="text-xs text-gray-400">{p.brand || " "}</div>
                                    <Button onClick={() => add(p)}>Add to Cart</Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>

                <section className="lg:col-span-1">
                    <Card className="sticky top-6">
                        <CardHeader><CardTitle>Your Cart</CardTitle></CardHeader>
                        <CardContent>
                            {cart.length === 0 && <div className="text-sm text-gray-400">No items yet.</div>}
                            <ul className="grid gap-2">
                                {cart.map((c, idx) => (
                                    <li key={idx} className="flex items-center justify-between border-b border-line pb-2">
                                        <div>
                                            <div className="font-medium">{c.name}</div>
                                            <div className="text-xs text-gray-400">${(c.priceCents / 100).toFixed(2)} ea</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" size="sm" onClick={() => updateQty(idx, c.quantity - 1)}>-</Button>
                                            <Input className="w-16 text-center" type="number" min={1} value={c.quantity} onChange={e => updateQty(idx, Number(e.target.value))} />
                                            <Button variant="outline" size="sm" onClick={() => updateQty(idx, c.quantity + 1)}>+</Button>
                                        </div>
                                    </li>
                                ))}
                            </ul>

                            <div className="mt-4 flex items-center justify-between">
                                <div className="text-sm text-gray-400">Subtotal</div>
                                <div className="text-lg font-semibold">${(totalCents / 100).toFixed(2)}</div>
                            </div>

                            <form onSubmit={checkout} className="grid gap-2 mt-6">
                                <div className="grid grid-cols-2 gap-2">
                                    <Input required placeholder="Full Name" onChange={e => setForm({ ...form, customerName: e.target.value })} />
                                    <Input required type="email" placeholder="Email" onChange={e => setForm({ ...form, customerEmail: e.target.value })} />
                                </div>
                                <Input required placeholder="Address 1" onChange={e => setForm({ ...form, shipAddress1: e.target.value })} />
                                <Input placeholder="Address 2" onChange={e => setForm({ ...form, shipAddress2: e.target.value })} />
                                <div className="grid grid-cols-3 gap-2">
                                    <Input required placeholder="City" onChange={e => setForm({ ...form, shipCity: e.target.value })} />
                                    <Input required placeholder="State" onChange={e => setForm({ ...form, shipState: e.target.value })} />
                                    <Input required placeholder="Zip" onChange={e => setForm({ ...form, shipZip: e.target.value })} />
                                </div>
                                <Button type="button" variant="outline" disabled={cart.length === 0} onClick={saveForLater}>Save for later</Button>
                                <Button type="submit" disabled={cart.length === 0}>Place Order</Button>
                            </form>
                        </CardContent>
                    </Card>
                </section>
            </div>
        </main>
    );
}
