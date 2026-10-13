"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { computeItemPriceCents } from "@/lib/pricing";

// A shopper's answer for one ProductVariation, captured at add-to-cart time —
// see server/prisma/schema.prisma's ProductVariation/OrderItemVariation for
// the authoritative shape this mirrors.
export type SelectedVariation = {
    variationId: string;
    name: string;
    type: "TEXT" | "CHOICE";
    textValue?: string;
    choiceId?: string;
    choiceLabel?: string;
    priceCents: number; // the addon charge for this selection, for display only — checkout re-resolves and re-prices server-side
};

export type CartItem = {
    productId: string;
    shopSlug: string;
    shopName: string;
    shopShippingEnabled?: boolean; // whether the shop this item was added from offers shipping
    shopOfflinePaymentEnabled?: boolean; // whether the shop this item was added from offers "pay at pickup"
    name: string;
    priceCents: number;      // base unit price (before any size upcharge)
    upchargeEnabled?: boolean;
    upchargeCents?: number;
    quantity: number;
    size?: string;
    color?: string;
    // Set only when this item is a youth variant added by toggling from a
    // specific adult product's page — pins down which adult's price override
    // applies when the youth product is shared by several adults.
    youthContextAdultId?: string;
    selectedVariations?: SelectedVariation[];
};

type CartContextValue = {
    cart: CartItem[];
    addItem: (item: Omit<CartItem, "quantity">, qty?: number) => void;
    updateQty: (index: number, qty: number) => void;
    removeItem: (index: number) => void;
    clearShop: (shopSlug: string) => void;
    clearAll: () => void;
    itemCount: number;
    subtotalCents: number;
    shopSlugs: string[];
};

const STORAGE_KEY = "crossroads_cart_v1";
const CartContext = createContext<CartContextValue | null>(null);

function variationsPriceCents(item: CartItem): number {
    return (item.selectedVariations ?? []).reduce((a, v) => a + v.priceCents, 0);
}

function lineTotal(item: CartItem) {
    return computeItemPriceCents(
        { priceCents: item.priceCents, upchargeEnabled: item.upchargeEnabled, upchargeCents: item.upchargeCents },
        item.size, variationsPriceCents(item)
    ) * item.quantity;
}

// Stable string for grouping identical cart lines — two selections with the
// same variationId but a different typed value/choice (or a different
// youth-adult context) are deliberately treated as separate lines.
function variationsKey(variations?: SelectedVariation[]): string {
    return (variations ?? [])
        .map(v => `${v.variationId}:${v.textValue ?? ""}:${v.choiceId ?? ""}`)
        .sort()
        .join(",");
}

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [hydrated, setHydrated] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) setCart(JSON.parse(raw));
        } catch { /* ignore corrupt cart */ }
        setHydrated(true);
    }, []);

    // Persist on every change (skip the initial pre-hydration write so we don't clobber storage with [])
    useEffect(() => {
        if (!hydrated) return;
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch { /* storage unavailable */ }
    }, [cart, hydrated]);

    const addItem = useCallback((item: Omit<CartItem, "quantity">, qty = 1) => {
        const keyOf = (x: Omit<CartItem, "quantity">) =>
            `${x.shopSlug}|${x.productId}|${x.size ?? ""}|${x.color ?? ""}|${x.youthContextAdultId ?? ""}|${variationsKey(x.selectedVariations)}`;
        const key = keyOf(item);
        setCart(prev => {
            const idx = prev.findIndex(x => keyOf(x) === key);
            if (idx >= 0) return prev.map((x, i) => i === idx ? { ...x, quantity: x.quantity + qty } : x);
            return [...prev, { ...item, quantity: qty }];
        });
    }, []);

    const updateQty = useCallback((index: number, qty: number) => {
        setCart(prev => qty < 1 ? prev.filter((_, i) => i !== index) : prev.map((x, i) => i === index ? { ...x, quantity: qty } : x));
    }, []);

    const removeItem = useCallback((index: number) => {
        setCart(prev => prev.filter((_, i) => i !== index));
    }, []);

    const clearShop = useCallback((shopSlug: string) => {
        setCart(prev => prev.filter(x => x.shopSlug !== shopSlug));
    }, []);

    const clearAll = useCallback(() => setCart([]), []);

    const itemCount = useMemo(() => cart.reduce((a, c) => a + c.quantity, 0), [cart]);
    const subtotalCents = useMemo(() => cart.reduce((a, c) => a + lineTotal(c), 0), [cart]);
    const shopSlugs = useMemo(() => [...new Set(cart.map(c => c.shopSlug))], [cart]);

    return (
        <CartContext.Provider value={{ cart, addItem, updateQty, removeItem, clearShop, clearAll, itemCount, subtotalCents, shopSlugs }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart(): CartContextValue {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error("useCart must be used within a CartProvider");
    return ctx;
}

export { lineTotal as cartLineTotalCents };
