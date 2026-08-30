"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { imgUrl } from "@/app/lib/api";
import Link from "next/link";
import Image from "next/image";
import { getColorCss } from "@/lib/colors";
import { useCart } from "@/lib/cart";
import { computeItemPriceCents } from "@/lib/pricing";

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

// ─── Types ────────────────────────────────────────────────────────────────────
type Product = {
    id:string; name:string; sku:string; brand?:string;
    priceCents:number; description?:string; imagesJson?:string;
    sizesJson?:string; colorsJson?:string; sizeChartUrl?:string | null;
    upchargeEnabled?:boolean; upchargeCents?:number;
    // Present when this product is linked to an adult/youth counterpart (see
    // Product.youthProductId) — at most one of the two is ever set. SanMar
    // sells these as fully separate styles, so it's still a separate Product
    // under the hood; this just lets the storefront offer both sizes ranges
    // from one page via a toggle instead of two disconnected listings.
    youthVariant?: Product | null;
    adultVariant?: Product | null;
};
type Shop = { id:string; name:string; notes?:string; expiresAt?:string; shippingEnabled:boolean; products:Product[] };

const stripHtml = (s?: string) => (s ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

// Resolves a product's adult/youth pairing (if any) into a direction-agnostic
// shape: what the "other" listing is, what to label each side of the toggle,
// and which of the two is the adult listing (whichever side that is, its
// photos are used for both — the garment design is the same either way, so
// switching to Youth shouldn't swap in different product photography).
function getVariantInfo(p: Product): { linked: Product | null; selfLabel: string; linkedLabel: string; adultSource: Product } {
    if (p.youthVariant) return { linked: p.youthVariant, selfLabel: "Adult", linkedLabel: "Youth", adultSource: p };
    if (p.adultVariant) return { linked: p.adultVariant, selfLabel: "Youth", linkedLabel: "Adult", adultSource: p.adultVariant };
    return { linked: null, selfLabel: "", linkedLabel: "", adultSource: p };
}

// Compact two-segment pill used to switch a product card/drawer between its
// adult and youth listing.
function VariantToggle({ selfLabel, linkedLabel, choice, onChange }: {
    selfLabel: string; linkedLabel: string; choice: "self" | "linked"; onChange: (c: "self" | "linked") => void;
}) {
    return (
        <div className="inline-flex rounded-md bg-white/[0.04] border border-white/10 p-0.5 text-xs font-semibold" role="group" aria-label="Adult or youth sizing">
            {(["self", "linked"] as const).map(c => (
                <button key={c} type="button" onClick={() => onChange(c)}
                    className={`px-2.5 py-1 rounded-md transition-colors ${choice === c ? "bg-signal-cyan/15 text-signal-cyan-bright shadow-sm" : "text-graphite-300 hover:text-graphite-100"}`}>
                    {c === "self" ? selfLabel : linkedLabel}
                </button>
            ))}
        </div>
    );
}

async function publicFetch(path: string) {
    const base = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000/api";
    const res = await fetch(`${base}${path}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

const fmt = (cents: number) =>
    new Intl.NumberFormat("en-US", { style:"currency", currency:"USD" }).format(cents / 100);

// ─── Product Detail Drawer ────────────────────────────────────────────────────
function ProductDetailDrawer({
    product, initialVariant = "self", onClose, onAddToCart, cartQuantityFor
}: {
    product: Product;
    initialVariant?: "self" | "linked";
    onClose: () => void;
    onAddToCart: (product: Product, size?: string, color?: string, qty?: number) => void;
    cartQuantityFor: (productId: string) => number;
}) {
    const { linked, selfLabel, linkedLabel, adultSource } = getVariantInfo(product);
    const [variantChoice, setVariantChoice] = useState<"self" | "linked">(linked ? initialVariant : "self");
    const active = variantChoice === "linked" && linked ? linked : product;

    // Photos always come from the adult listing — same garment, same photo,
    // regardless of which sizing the shopper is currently viewing.
    const imgs: string[] = adultSource.imagesJson ? JSON.parse(adultSource.imagesJson) : [];
    const sizes: string[] = active.sizesJson ? JSON.parse(active.sizesJson) : [];
    const colors: string[] = active.colorsJson ? JSON.parse(active.colorsJson) : [];

    const [imgIdx, setImgIdx] = useState(0);
    const [selSize, setSelSize] = useState(sizes.length === 1 ? sizes[0] : "");
    const [selColor, setSelColor] = useState(colors.length === 1 ? colors[0] : "");
    const [qty, setQty] = useState(1);
    const [added, setAdded] = useState(false);

    const unitPrice = computeItemPriceCents(active, selSize || undefined);

    // Sizes/colors differ between the adult and youth listing, so a selection
    // made on one side rarely still makes sense on the other — reset when the
    // toggle flips instead of carrying over a stale pick. Photos are shared
    // between both (see adultSource above), so the gallery position is left
    // alone — no reason to jump back to the first photo on toggle.
    useEffect(() => {
        setSelSize(sizes.length === 1 ? sizes[0] : "");
        setSelColor(colors.length === 1 ? colors[0] : "");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [variantChoice]);

    function handleAdd() {
        if (sizes.length > 0 && !selSize) { alert("Please select a size."); return; }
        if (colors.length > 0 && !selColor) { alert("Please select a color."); return; }
        onAddToCart(active, selSize || undefined, selColor || undefined, qty);
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
    }

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [onClose]);

    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = ""; };
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex">
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                className="absolute inset-0 bg-graphite-950/70 backdrop-blur-sm" onClick={onClose} />

            <motion.div
                initial={{ x:"100%" }} animate={{ x:0 }} exit={{ x:"100%" }}
                transition={{ type:"spring", stiffness:300, damping:35 }}
                className="relative ml-auto w-full max-w-lg bg-graphite-900 border-l border-white/10 h-full flex flex-col overflow-hidden shadow-console-hover">

                <button type="button" onClick={onClose} aria-label="Close product details"
                    className="absolute top-4 right-4 z-10 w-9 h-9 rounded-md bg-graphite-900/90 backdrop-blur-sm border border-white/10 flex items-center justify-center text-graphite-300 hover:text-white hover:bg-graphite-800 transition-colors shadow-console">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>

                <div className="flex-1 overflow-y-auto">
                    <div className="relative bg-graphite-100" style={{ aspectRatio:"4/3" }}>
                        {imgs.length > 0 ? (
                            <>
                                <AnimatePresence mode="wait">
                                    <motion.img key={imgIdx}
                                        initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                                        transition={{ duration:0.2 }}
                                        src={imgUrl(imgs[imgIdx])} alt={active.name}
                                        className="w-full h-full object-contain" />
                                </AnimatePresence>

                                {imgs.length > 1 && (
                                    <>
                                        <button type="button" aria-label="Previous image" onClick={() => setImgIdx(i => (i - 1 + imgs.length) % imgs.length)}
                                            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-graphite-900/85 backdrop-blur-sm rounded-md border border-white/10 flex items-center justify-center text-graphite-200 hover:bg-graphite-800 hover:text-white transition-colors shadow-console">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                                        </button>
                                        <button type="button" aria-label="Next image" onClick={() => setImgIdx(i => (i + 1) % imgs.length)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-graphite-900/85 backdrop-blur-sm rounded-md border border-white/10 flex items-center justify-center text-graphite-200 hover:bg-graphite-800 hover:text-white transition-colors shadow-console">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                                        </button>
                                    </>
                                )}

                                {imgs.length > 1 && (
                                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                                        {imgs.map((_, i) => (
                                            <button key={i} type="button" aria-label={`View image ${i + 1}`} onClick={() => setImgIdx(i)}
                                                className={`rounded-full transition-all ${i === imgIdx ? "w-5 h-1.5 bg-signal-cyan" : "w-1.5 h-1.5 bg-graphite-400 hover:bg-graphite-500"}`} />
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <svg className="w-20 h-20 text-graphite-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                            </div>
                        )}

                        {cartQuantityFor(active.id) > 0 && (
                            <div className="absolute top-3 left-3 bg-signal-cyan text-graphite-950 text-xs font-bold px-2.5 py-1 rounded-full shadow-glow-cyan-sm">
                                {cartQuantityFor(active.id)} in cart
                            </div>
                        )}
                    </div>

                    {imgs.length > 1 && (
                        <div className="flex gap-2 px-5 py-3 overflow-x-auto bg-graphite-900 border-b border-white/[0.06]">
                            {imgs.map((url, i) => (
                                <button key={i} type="button" onClick={() => setImgIdx(i)}
                                    className={`shrink-0 w-14 h-14 rounded-md overflow-hidden border-2 transition-all ${i === imgIdx ? "border-signal-cyan ring-2 ring-signal-cyan/20" : "border-white/10 hover:border-white/20"}`}>
                                    <img src={imgUrl(url)} alt={`View ${i+1}`} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="p-5 space-y-5">
                        <div>
                            {active.brand && (
                                <p className="text-xs font-bold text-signal-cyan uppercase tracking-wider mb-1">{active.brand}</p>
                            )}
                            <h2 className="text-xl font-bold text-white leading-tight">{active.name}</h2>
                            {linked && (
                                <div className="mt-2.5">
                                    <VariantToggle selfLabel={selfLabel} linkedLabel={linkedLabel} choice={variantChoice} onChange={setVariantChoice} />
                                </div>
                            )}
                            <p className="text-2xl font-bold text-signal-cyan-bright mt-2.5 font-mono tabular-nums">
                                {fmt(unitPrice)}
                            </p>
                        </div>

                        {active.description && (
                            <div>
                                <h3 className="text-xs font-bold text-graphite-300 uppercase tracking-wider mb-1.5">Description</h3>
                                <p className="text-sm text-graphite-300 leading-relaxed">{stripHtml(active.description)}</p>
                            </div>
                        )}

                        {colors.length > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-xs font-bold text-graphite-300 uppercase tracking-wider">Color</h3>
                                    {selColor && (
                                        <span className="text-sm font-semibold text-graphite-100 flex items-center gap-1.5">
                                            <span className="w-4 h-4 rounded-full border border-white/15 inline-block"
                                                style={{ backgroundColor: getColorCss(selColor) }} />
                                            {selColor}
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {colors.map(c => {
                                        const css = getColorCss(c);
                                        const isWhite = css === "#ffffff";
                                        const isSelected = selColor === c;
                                        return (
                                            <button key={c} type="button" title={c}
                                                onClick={() => setSelColor(prev => prev === c ? "" : c)}
                                                className={`relative w-8 h-8 rounded-full border-2 transition-all ${isSelected ? "border-signal-cyan scale-110 shadow-glow-cyan-sm" : isWhite ? "border-white/20 hover:border-white/30" : "border-transparent hover:scale-105"}`}
                                                style={{ backgroundColor: css }}>
                                                {isSelected && (
                                                    <svg className={`absolute inset-0 m-auto w-4 h-4 ${isWhite || css === "#ffffff" || css.startsWith("#f") || css.startsWith("#e") || css.startsWith("#d") ? "text-graphite-800" : "text-white"}`}
                                                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                                                    </svg>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {sizes.length > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-xs font-bold text-graphite-300 uppercase tracking-wider">Size</h3>
                                    {active.sizeChartUrl && (
                                        <a href={imgUrl(active.sizeChartUrl)} target="_blank" rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-xs font-semibold text-signal-cyan hover:text-signal-cyan-bright transition-colors">
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h4"/></svg>
                                            Size chart
                                        </a>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {sizes.map(s => (
                                        <button key={s} type="button"
                                            onClick={() => setSelSize(prev => prev === s ? "" : s)}
                                            className={`px-3.5 py-2 rounded-md border text-sm font-semibold transition-all duration-150 ${selSize===s ? "bg-signal-cyan text-graphite-950 border-signal-cyan shadow-glow-cyan-sm" : "border-white/10 text-graphite-300 hover:border-signal-cyan/40 hover:text-signal-cyan"}`}>
                                            {s}
                                        </button>
                                    ))}
                                </div>
                                {active.upchargeEnabled && (
                                    <p className="text-xs text-graphite-300 mt-2">+{fmt(active.upchargeCents ?? 0)} for 2XL and up</p>
                                )}
                            </div>
                        )}

                        <div>
                            <h3 className="text-xs font-bold text-graphite-300 uppercase tracking-wider mb-2">Quantity</h3>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center border border-white/10 rounded-md overflow-hidden">
                                    <button type="button" onClick={() => setQty(q => Math.max(1, q - 1))}
                                        className="w-10 h-10 flex items-center justify-center text-graphite-200 hover:bg-white/[0.06] transition-colors font-bold text-lg">
                                        −
                                    </button>
                                    <span className="w-10 text-center text-sm font-bold text-white font-mono tabular-nums">{qty}</span>
                                    <button type="button" onClick={() => setQty(q => q + 1)}
                                        className="w-10 h-10 flex items-center justify-center text-graphite-200 hover:bg-white/[0.06] transition-colors font-bold text-lg">
                                        +
                                    </button>
                                </div>
                                <span className="text-sm text-graphite-300 font-medium font-mono tabular-nums">{fmt(unitPrice * qty)} total</span>
                            </div>
                        </div>

                        <div className="bg-white/[0.04] border border-white/[0.06] rounded-md p-4 space-y-2 text-xs text-graphite-300">
                            {active.sku && <div className="flex justify-between"><span>SKU</span><span className="font-mono text-graphite-100">{active.sku}</span></div>}
                        </div>
                    </div>
                </div>

                <div className="border-t border-white/[0.08] p-4 bg-graphite-900 shrink-0">
                    <motion.button type="button" whileTap={{ scale:0.97 }} whileHover={{ y:-1 }} onClick={handleAdd}
                        className={`console-sheen w-full font-semibold py-3.5 rounded-md transition-shadow duration-200 flex items-center justify-center gap-2 ${added ? "bg-signal-green text-graphite-950 shadow-glow-green" : "bg-signal-cyan-gradient text-graphite-950 shadow-glow-cyan-sm hover:shadow-glow-cyan"}`}>
                        {added ? (
                            <><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>Added to cart!</>
                        ) : (
                            <><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>Add to Cart · {fmt(unitPrice * qty)}</>
                        )}
                    </motion.button>
                </div>
            </motion.div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ShopPage({ params }: { params: { slug: string } }) {
    const { slug } = params;
    const { cart, addItem, itemCount, subtotalCents, shopSlugs } = useCart();
    const [shop, setShop]             = useState<Shop | null>(null);
    const [selections, setSelections] = useState<Record<string, { size:string; color:string }>>({});
    const [notFound, setNotFound]     = useState(false);
    const [detailProduct, setDetailProduct] = useState<Product | null>(null);
    // Which side (self/linked) each card's Adult/Youth toggle is currently showing.
    const [variantChoice, setVariantChoice] = useState<Record<string, "self" | "linked">>({});
    // Seeds the detail drawer's own toggle so it opens on whatever the card was showing.
    const [detailInitialVariant, setDetailInitialVariant] = useState<"self" | "linked">("self");

    useEffect(() => {
        publicFetch(`/shops/${slug}`).then(setShop).catch(() => setNotFound(true));
    }, [slug]);

    const products: Product[] = shop?.products ?? [];
    const thisShopCount = cart.filter(c => c.shopSlug === slug).reduce((a,c) => a + c.quantity, 0);
    const otherShopsCount = itemCount - thisShopCount;

    function getSelection(pid: string) { return selections[pid] ?? { size:"", color:"" }; }
    function setSelection(pid: string, key:"size"|"color", val:string) {
        setSelections(p => ({ ...p, [pid]:{ ...getSelection(pid), [key]:val } }));
    }
    function addToCart(product: Product, size?: string, color?: string, qty = 1) {
        if (!shop) return;
        addItem({
            productId: product.id, shopSlug: slug, shopName: shop.name, shopShippingEnabled: shop.shippingEnabled, name: product.name,
            priceCents: product.priceCents, upchargeEnabled: product.upchargeEnabled, upchargeCents: product.upchargeCents,
            size, color,
        }, qty);
    }
    function addToCartFromCard(product: Product) {
        const sizes: string[] = product.sizesJson ? JSON.parse(product.sizesJson) : [];
        const colors: string[] = product.colorsJson ? JSON.parse(product.colorsJson) : [];
        const sel = getSelection(product.id);
        if (sizes.length > 0 && !sel.size) { alert("Please select a size."); return; }
        if (colors.length > 0 && !sel.color) { alert("Please select a color."); return; }
        addToCart(product, sel.size || undefined, sel.color || undefined, 1);
    }
    function cartQuantityFor(productId: string) {
        return cart.filter(c => c.shopSlug === slug && c.productId === productId).reduce((a, c) => a + c.quantity, 0);
    }

    /* ── Loading ── */
    if (!shop && !notFound) return (
        <div className="console-canvas min-h-screen flex items-center justify-center">
            <div className="text-center">
                <div className="w-8 h-8 border-2 border-signal-cyan border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-graphite-300">Loading shop…</p>
            </div>
        </div>
    );

    /* ── Not found ── */
    if (notFound) return (
        <div className="console-canvas min-h-screen flex items-center justify-center p-4">
            <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} transition={{ duration:0.35, ease:EASE }}
                className="console-panel rounded-lg p-8 text-center max-w-md">
                <div className="w-16 h-16 bg-white/[0.05] rounded-lg flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-graphite-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                </div>
                <h1 className="text-xl font-bold text-white mb-2">Shop not found</h1>
                <p className="text-sm text-graphite-300">This shop link may have expired or is no longer active.</p>
                <Link href="/shops" className="text-sm text-signal-cyan hover:text-signal-cyan-bright font-semibold mt-4 inline-block">← Browse all shops</Link>
                <p className="text-xs text-graphite-300 mt-4">Questions? Contact <a href="mailto:hello@crossroadscustomapparel.com" className="text-signal-cyan hover:underline">hello@crossroadscustomapparel.com</a></p>
            </motion.div>
        </div>
    );

    return (
        <div className="console-canvas min-h-screen flex flex-col relative overflow-hidden">

            {/* ── HEADER ── */}
            <div className="relative z-10">
                <div className="border-b border-white/[0.06]">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Link href="/shops" title="All shops" className="flex items-center gap-2 group">
                                <span className="w-7 h-7 rounded-md bg-white/[0.06] border border-white/10 flex items-center justify-center text-graphite-300 group-hover:text-white group-hover:bg-white/[0.10] transition-colors shrink-0">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                                </span>
                                <Image src="/logo.png" alt="Crossroads Custom Apparel" width={100} height={40} className="object-contain" priority />
                            </Link>
                        </div>
                        <div className="flex items-center gap-3">
                            <a href="mailto:hello@crossroadscustomapparel.com"
                                className="text-xs text-graphite-300 hover:text-signal-cyan transition-colors hidden sm:block">
                                hello@crossroadscustomapparel.com
                            </a>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
                    <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4, ease:EASE }}>
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-white leading-tight mb-3 tracking-tight">
                            {shop!.name}
                        </h1>
                        {shop!.notes && (
                            <p className="text-base text-graphite-300 max-w-xl leading-relaxed mb-4">{shop!.notes}</p>
                        )}
                        <div className="flex flex-wrap gap-3 mt-5">
                            <div className="flex items-center gap-2 bg-white/[0.04] border border-white/10 rounded-md px-3.5 py-2">
                                <svg className="w-4 h-4 text-signal-cyan shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                                <span className="text-sm text-graphite-100 font-medium">{products.length} item{products.length !== 1 ? "s" : ""} available</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/[0.04] border border-white/10 rounded-md px-3.5 py-2">
                                <svg className="w-4 h-4 text-signal-green shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                                <span className="text-sm text-graphite-100 font-medium">Secure checkout</span>
                            </div>
                            {shop!.expiresAt && (
                                <div className="flex items-center gap-2 bg-signal-amber/10 border border-signal-amber/25 rounded-md px-3.5 py-2">
                                    <svg className="w-4 h-4 text-signal-amber shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                    <span className="text-sm text-signal-amber font-medium">
                                        Closes {new Date(shop!.expiresAt).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric", timeZone:"UTC" })}
                                    </span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* ── STICKY NAV BAR ── */}
            <div className="sticky top-0 z-20 bg-graphite-950/85 backdrop-blur-md border-b border-white/[0.06]">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 h-13 py-2.5 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-graphite-100">
                        {itemCount === 0 ? "Select your items below" : `${itemCount} item${itemCount !== 1 ? "s" : ""} in your cart${otherShopsCount > 0 ? ` (${otherShopsCount} from other shops)` : ""}`}
                    </p>
                    <AnimatePresence>
                        {itemCount > 0 && (
                            <Link href="/checkout">
                                <motion.span initial={{ opacity:0, x:10 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:10 }}
                                    className="console-sheen flex items-center gap-2 text-graphite-950 text-sm font-semibold px-5 py-2 rounded-md bg-signal-cyan-gradient shadow-glow-cyan-sm hover:shadow-glow-cyan transition-shadow cursor-pointer">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                                    Checkout · {fmt(subtotalCents)}
                                    <motion.span key={itemCount} initial={{ scale:1.4 }} animate={{ scale:1 }}
                                        className="bg-graphite-950/20 text-graphite-950 text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                                        {itemCount}
                                    </motion.span>
                                </motion.span>
                            </Link>
                        )}
                    </AnimatePresence>
                </div>
                {shopSlugs.length > 1 && (
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-2 -mt-1">
                        <p className="text-xs text-signal-cyan font-medium flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                            Shopping across {shopSlugs.length} group shops — you can check out everything together.
                        </p>
                    </div>
                )}
            </div>

            <main className="relative z-10 flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
                <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.3 }}>
                    {products.length === 0 ? (
                        <div className="text-center py-24">
                            <div className="w-16 h-16 console-panel rounded-lg flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-graphite-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                            </div>
                            <p className="text-graphite-200 font-medium">No products in this shop yet.</p>
                            <p className="text-sm text-graphite-300 mt-1">Check back soon!</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                                {products.map((p, idx) => {
                                    const { linked, selfLabel, linkedLabel, adultSource } = getVariantInfo(p);
                                    const choice = variantChoice[p.id] ?? "self";
                                    const active = choice === "linked" && linked ? linked : p;

                                    const sizes: string[] = active.sizesJson ? JSON.parse(active.sizesJson) : [];
                                    const colors: string[] = active.colorsJson ? JSON.parse(active.colorsJson) : [];
                                    const sel = getSelection(active.id);
                                    const totalInCart = cartQuantityFor(active.id);
                                    // Photos always come from the adult listing — see getVariantInfo.
                                    const imgs: string[] = adultSource.imagesJson ? JSON.parse(adultSource.imagesJson) : [];
                                    const displayPrice = computeItemPriceCents(active, sel.size || undefined);
                                    const openDetail = () => { setDetailProduct(p); setDetailInitialVariant(choice); };
                                    return (
                                        <motion.div key={p.id}
                                            initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
                                            whileHover={{ y:-2 }}
                                            transition={{ delay:idx*0.05, duration:0.35, ease:[0.32,0.72,0,1] }}
                                            className="console-panel rounded-lg hover:shadow-console-hover hover:border-white/[0.14] transition-all duration-300 overflow-hidden flex flex-col group">

                                            <div className="relative aspect-[4/3] overflow-hidden bg-graphite-100 cursor-pointer"
                                                onClick={openDetail}>
                                                {imgs.length > 0 ? (
                                                    <img src={imgUrl(imgs[0])} alt={active.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <svg className="w-14 h-14 text-graphite-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                                    </div>
                                                )}
                                                {totalInCart > 0 && (
                                                    <div className="absolute top-2.5 right-2.5 bg-signal-cyan text-graphite-950 text-xs font-bold px-2.5 py-1 rounded-full shadow-glow-cyan-sm">
                                                        {totalInCart} in cart
                                                    </div>
                                                )}
                                                {active.brand && (
                                                    <div className="absolute bottom-2.5 left-2.5 bg-graphite-950/60 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                                        {active.brand}
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-graphite-950/85 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-console">
                                                        View Details
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="p-4 flex flex-col flex-1 gap-3">
                                                <div className="flex-1">
                                                    <button type="button" className="text-left w-full" onClick={openDetail}>
                                                        <h3 className="font-semibold text-white text-sm leading-snug hover:text-signal-cyan-bright transition-colors">{active.name}</h3>
                                                    </button>
                                                    {active.description && (
                                                        <p className="text-xs text-graphite-300 mt-1 line-clamp-2 leading-relaxed">{stripHtml(active.description)}</p>
                                                    )}
                                                    <div className="flex items-center justify-between gap-2 mt-2">
                                                        <p className="text-lg font-bold text-signal-cyan-bright font-mono tabular-nums">
                                                            {fmt(displayPrice)}
                                                        </p>
                                                        {linked && (
                                                            <VariantToggle selfLabel={selfLabel} linkedLabel={linkedLabel} choice={choice}
                                                                onChange={c => setVariantChoice(prev => ({ ...prev, [p.id]: c }))} />
                                                        )}
                                                    </div>
                                                </div>

                                                {(sizes.length > 0 || colors.length > 0) && (
                                                    <div className="space-y-2.5 border-t border-white/[0.06] pt-3">
                                                        {sizes.length > 0 && (
                                                            <div>
                                                                <label className="text-[10px] font-bold text-graphite-300 uppercase tracking-wider mb-1.5 block">Size</label>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {sizes.map(s => (
                                                                        <button key={s} type="button"
                                                                            onClick={() => setSelection(active.id,"size", sel.size===s ? "" : s)}
                                                                            className={`text-xs px-2.5 py-1 rounded-md border font-semibold transition-all duration-150 ${sel.size===s ? "bg-signal-cyan text-graphite-950 border-signal-cyan shadow-sm" : "border-white/10 text-graphite-300 hover:border-signal-cyan/40 hover:text-signal-cyan"}`}>
                                                                            {s}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {colors.length > 0 && (
                                                            <div>
                                                                <label className="text-[10px] font-bold text-graphite-300 uppercase tracking-wider mb-1.5 block">
                                                                    Color{sel.color ? `: ${sel.color}` : ""}
                                                                </label>
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {colors.map(c => {
                                                                        const css = getColorCss(c);
                                                                        const isSelected = sel.color === c;
                                                                        return (
                                                                            <button key={c} type="button" title={c}
                                                                                onClick={() => setSelection(active.id,"color", sel.color===c ? "" : c)}
                                                                                className={`w-6 h-6 rounded-full border-2 transition-all ${isSelected ? "border-signal-cyan scale-110 shadow-glow-cyan-sm ring-2 ring-signal-cyan/20" : "border-white/10 hover:scale-105 hover:border-white/20"}`}
                                                                                style={{ backgroundColor: css }}>
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="flex gap-2">
                                                    <motion.button type="button" whileTap={{ scale:0.96 }} whileHover={{ y:-1 }} onClick={() => addToCartFromCard(active)}
                                                        className="console-sheen flex-1 text-graphite-950 text-sm font-semibold py-2.5 rounded-md bg-signal-cyan-gradient shadow-glow-cyan-sm hover:shadow-glow-cyan transition-shadow">
                                                        Add to cart
                                                    </motion.button>
                                                    <button type="button" onClick={openDetail}
                                                        className="px-3 py-2.5 rounded-md border border-white/10 text-graphite-300 hover:bg-white/[0.06] hover:border-white/20 transition-colors"
                                                        title="View details">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>

                            {/* Trust / info bar */}
                            <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {[
                                    {
                                        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/><path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/></svg>,
                                        title: "Custom Decorated", desc: "Every item screen printed or embroidered by our team"
                                    },
                                    {
                                        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>,
                                        title: "Ships to Your Group", desc: "Orders are shipped together to your group's delivery address"
                                    },
                                    {
                                        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>,
                                        title: "Questions?", desc: "hello@crossroadscustomapparel.com"
                                    },
                                ].map(item => (
                                    <div key={item.title} className="console-panel rounded-lg p-5 flex gap-4 items-start">
                                        <span className="w-10 h-10 rounded-md bg-signal-cyan/10 text-signal-cyan flex items-center justify-center shrink-0">{item.icon}</span>
                                        <div>
                                            <p className="text-sm font-semibold text-white">{item.title}</p>
                                            <p className="text-xs text-graphite-300 mt-0.5 leading-relaxed">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </motion.div>
            </main>

            {/* ── MOBILE STICKY CART ── */}
            <AnimatePresence>
                {itemCount > 0 && (
                    <motion.div
                        initial={{ opacity:0, y:80 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:80 }}
                        transition={{ duration:0.3, ease:[0.32,0.72,0,1] }}
                        className="fixed bottom-0 left-0 right-0 z-30 p-4 sm:hidden"
                        style={{ background:"linear-gradient(to top, rgba(10,12,16,1) 60%, rgba(10,12,16,0))" }}>
                        <Link href="/checkout"
                            className="console-sheen w-full flex items-center justify-between text-graphite-950 font-semibold px-5 py-4 rounded-lg bg-signal-cyan-gradient shadow-glow-cyan">
                            <span className="bg-graphite-950/20 text-graphite-950 text-xs font-bold px-2.5 py-1 rounded-full">{itemCount}</span>
                            <span>View Cart &amp; Checkout</span>
                            <span className="font-bold font-mono tabular-nums">{fmt(subtotalCents)}</span>
                        </Link>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── FOOTER ── */}
            <footer className="relative z-10 mt-12 border-t border-white/[0.06]">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <Link href="/shops" className="flex items-center gap-3">
                        <Image src="/logo.png" alt="Crossroads Custom Apparel" width={100} height={40} className="object-contain" />
                    </Link>
                    <div className="text-center sm:text-right">
                        <p className="text-xs text-graphite-300">Screen printing &amp; embroidery · <a href="mailto:hello@crossroadscustomapparel.com" className="hover:text-signal-cyan transition-colors">hello@crossroadscustomapparel.com</a></p>
                        <p className="text-xs text-graphite-500 mt-0.5">© {new Date().getFullYear()} Crossroads Custom Apparel. All rights reserved.</p>
                    </div>
                </div>
            </footer>

            {/* ── PRODUCT DETAIL DRAWER ── */}
            <AnimatePresence>
                {detailProduct && (
                    <ProductDetailDrawer
                        product={detailProduct}
                        initialVariant={detailInitialVariant}
                        onClose={() => setDetailProduct(null)}
                        cartQuantityFor={cartQuantityFor}
                        onAddToCart={(product, size, color, qty) => {
                            addToCart(product, size, color, qty);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
