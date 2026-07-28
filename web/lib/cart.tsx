"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { computeItemPriceCents } from "@/lib/pricing";

export type CartItem = {
    productId: string;
    shopSlug: string;
    shopName: string;
    name: string;
    priceCents: number;      // base unit price (before any size upcharge)
    upchargeEnabled?: boolean;
    upchargeCents?: number;
    quantity: number;
    size?: string;
    color?: string;
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

function lineTotal(item: CartItem) {
    return computeItemPriceCents(
        { priceCents: item.priceCents, upchargeEnabled: item.upchargeEnabled, upchargeCents: item.upchargeCents },
        item.size
    ) * item.quantity;
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
        const key = `${item.shopSlug}|${item.productId}|${item.size ?? ""}|${item.color ?? ""}`;
        setCart(prev => {
            const idx = prev.findIndex(x => `${x.shopSlug}|${x.productId}|${x.size ?? ""}|${x.color ?? ""}` === key);
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
