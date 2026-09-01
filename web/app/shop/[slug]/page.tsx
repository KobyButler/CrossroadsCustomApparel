"use client";
// "The Print Floor" storefront — an individual Group Shop. See DESIGN.md
// and the direction contract in app/page.tsx. The whole page runs on this
// shop's own spot color (lib/spot.ts), set once on the outer canvas and
// inherited by every button, crosshair, and price on the page.
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { imgUrl } from "@/app/lib/api";
import Link from "next/link";
import { getColorCss } from "@/lib/colors";
import { useCart } from "@/lib/cart";
import { computeItemPriceCents } from "@/lib/pricing";
import { PressButton } from "@/components/public/PressButton";
import { SeparationCard } from "@/components/public/SeparationCard";
import { ColorBar } from "@/components/public/ColorBar";
import { SegmentReadout } from "@/components/public/SegmentReadout";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PressFrame } from "@/components/public/PressFrame";
import { getShopSpot, spotVars, SPOTS } from "@/lib/spot";

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

// ─── Types ────────────────────────────────────────────────────────────────────
type Product = {
    id:string; name:string; sku:string; brand?:string;
    priceCents:number; description?:string; imagesJson?:string;
    sizesJson?:string; colorsJson?:string; sizeChartUrl?:string | null;
    upchargeEnabled?:boolean; upchargeCents?:number;
    youthVariant?: Product | null;
    adultVariant?: Product | null;
};
type Shop = { id:string; name:string; notes?:string; expiresAt?:string; shippingEnabled:boolean; products:Product[] };

const stripHtml = (s?: string) => (s ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

function daysUntil(iso?: string): number | null {
    if (!iso) return null;
    const ms = new Date(iso).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / 86_400_000));
}

function getVariantInfo(p: Product): { linked: Product | null; selfLabel: string; linkedLabel: string; adultSource: Product } {
    if (p.youthVariant) return { linked: p.youthVariant, selfLabel: "Adult", linkedLabel: "Youth", adultSource: p };
    if (p.adultVariant) return { linked: p.adultVariant, selfLabel: "Youth", linkedLabel: "Adult", adultSource: p.adultVariant };
    return { linked: null, selfLabel: "", linkedLabel: "", adultSource: p };
}

function VariantToggle({ selfLabel, linkedLabel, choice, onChange }: {
    selfLabel: string; linkedLabel: string; choice: "self" | "linked"; onChange: (c: "self" | "linked") => void;
}) {
    return (
        <div className="inline-flex rounded-md bg-plate-800 border border-plate-700 p-0.5 text-xs font-bold" role="group" aria-label="Adult or youth sizing">
            {(["self", "linked"] as const).map(c => (
                <button key={c} type="button" onClick={() => onChange(c)}
                    className={`px-2.5 py-1 rounded-md transition-colors ${choice === c ? "bg-proc-cyan/15 text-proc-cyan" : "text-plate-300 hover:text-plate-100"}`}>
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

const TONE_ICON_CLS = {
    cyan: "bg-proc-cyan/10 text-proc-cyan",
    magenta: "bg-proc-magenta/10 text-proc-magenta",
    spot: "bg-[var(--spot-dim)] text-[var(--spot-bright)]",
} as const;

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

    const imgs: string[] = adultSource.imagesJson ? JSON.parse(adultSource.imagesJson) : [];
    const sizes: string[] = active.sizesJson ? JSON.parse(active.sizesJson) : [];
    const colors: string[] = active.colorsJson ? JSON.parse(active.colorsJson) : [];

    const [imgIdx, setImgIdx] = useState(0);
    const [selSize, setSelSize] = useState(sizes.length === 1 ? sizes[0] : "");
    const [selColor, setSelColor] = useState(colors.length === 1 ? colors[0] : "");
    const [qty, setQty] = useState(1);
    const [added, setAdded] = useState(false);

    const unitPrice = computeItemPriceCents(active, selSize || undefined);

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
        <div className="fixed inset-0 z-50 flex font-press">
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                className="absolute inset-0 bg-plate-950/70 backdrop-blur-sm" onClick={onClose} />

            <motion.div
                initial={{ x:"100%" }} animate={{ x:0 }} exit={{ x:"100%" }}
                transition={{ type:"spring", stiffness:300, damping:35 }}
                className="relative ml-auto w-full max-w-lg bg-plate-900 border-l border-plate-700 h-full flex flex-col overflow-hidden shadow-plate-hover">

                <button type="button" onClick={onClose} aria-label="Close product details"
                    className="absolute top-4 right-4 z-10 w-9 h-9 rounded-md bg-plate-900/95 backdrop-blur-sm border border-plate-700 flex items-center justify-center text-plate-300 hover:text-plate-100 hover:bg-plate-800 transition-colors shadow-plate">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>

                <div className="flex-1 overflow-y-auto press-scroll">
                    <div className={`relative ${imgs.length === 0 ? "plate-void" : "bg-plate-800"}`} style={{ aspectRatio:"4/3" }}>
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
                                            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-plate-900/90 backdrop-blur-sm rounded-md border border-plate-700 flex items-center justify-center text-plate-300 hover:bg-plate-800 hover:text-plate-100 transition-colors shadow-plate">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                                        </button>
                                        <button type="button" aria-label="Next image" onClick={() => setImgIdx(i => (i + 1) % imgs.length)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-plate-900/90 backdrop-blur-sm rounded-md border border-plate-700 flex items-center justify-center text-plate-300 hover:bg-plate-800 hover:text-plate-100 transition-colors shadow-plate">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                                        </button>
                                    </>
                                )}

                                {imgs.length > 1 && (
                                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                                        {imgs.map((_, i) => (
                                            <button key={i} type="button" aria-label={`View image ${i + 1}`} onClick={() => setImgIdx(i)}
                                                className={`rounded-full transition-all ${i === imgIdx ? "w-5 h-1.5" : "w-1.5 h-1.5 bg-plate-600 hover:bg-plate-500"}`}
                                                style={i === imgIdx ? { background: "var(--spot)" } : undefined} />
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                                <svg className="w-16 h-16 text-plate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                <span className="text-[10px] font-spec uppercase tracking-wider text-plate-500">Photo pending</span>
                            </div>
                        )}

                        {cartQuantityFor(active.id) > 0 && (
                            <div className="absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full shadow-plate" style={{ background: "var(--spot)", color: "var(--spot-on)" }}>
                                {cartQuantityFor(active.id)} in cart
                            </div>
                        )}
                    </div>

                    {imgs.length > 1 && (
                        <div className="flex gap-2 px-5 py-3 overflow-x-auto press-scroll bg-plate-900/60 border-b border-plate-700">
                            {imgs.map((url, i) => (
                                <button key={i} type="button" onClick={() => setImgIdx(i)}
                                    className="shrink-0 w-14 h-14 rounded-md overflow-hidden border-2 transition-all"
                                    style={i === imgIdx ? { borderColor: "var(--spot)", boxShadow: "0 0 0 2px var(--spot-dim)" } : { borderColor: "#2B303A" }}>
                                    <img src={imgUrl(url)} alt={`View ${i+1}`} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="p-5 space-y-5">
                        <div>
                            {active.brand && (
                                <p className="text-xs font-bold text-proc-cyan uppercase tracking-wider mb-1">{active.brand}</p>
                            )}
                            <h2 className="text-xl font-extrabold text-plate-50 leading-tight">{active.name}</h2>
                            {linked && (
                                <div className="mt-2.5">
                                    <VariantToggle selfLabel={selfLabel} linkedLabel={linkedLabel} choice={variantChoice} onChange={setVariantChoice} />
                                </div>
                            )}
                            <p className="text-2xl font-extrabold mt-2.5 font-spec tabular-nums" style={{ color: "var(--spot-bright)" }}>
                                {fmt(unitPrice)}
                            </p>
                        </div>

                        {active.description && (
                            <div>
                                <h3 className="text-xs font-bold text-plate-300 uppercase tracking-wider mb-1.5">Description</h3>
                                <p className="text-sm text-plate-300 leading-relaxed">{stripHtml(active.description)}</p>
                            </div>
                        )}

                        {colors.length > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-xs font-bold text-plate-300 uppercase tracking-wider">Color</h3>
                                    {selColor && (
                                        <span className="text-sm font-bold text-plate-50 flex items-center gap-1.5">
                                            <span className="w-4 h-4 rounded-full border border-plate-600 inline-block"
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
                                                className={`relative w-8 h-8 rounded-full border-2 spot-swatch ${isSelected ? "spot-swatch-selected" : isWhite ? "border-plate-600" : "border-transparent"}`}
                                                style={{ backgroundColor: css, borderColor: isSelected ? "var(--spot)" : undefined }}>
                                                {isSelected && (
                                                    <svg className={`absolute inset-0 m-auto w-4 h-4 ${isWhite || css.startsWith("#f") || css.startsWith("#e") || css.startsWith("#d") ? "text-plate-950" : "text-white"}`}
                                                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
                                    <h3 className="text-xs font-bold text-plate-300 uppercase tracking-wider">Size</h3>
                                    {active.sizeChartUrl && (
                                        <a href={imgUrl(active.sizeChartUrl)} target="_blank" rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-xs font-bold text-proc-cyan hover:brightness-125 transition-all">
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h4"/></svg>
                                            Size chart
                                        </a>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {sizes.map(s => (
                                        <button key={s} type="button"
                                            onClick={() => setSelSize(prev => prev === s ? "" : s)}
                                            className={`px-3.5 py-2 rounded-md border text-sm font-bold spot-chip ${selSize === s ? "spot-chip-selected" : ""}`}>
                                            {s}
                                        </button>
                                    ))}
                                </div>
                                {active.upchargeEnabled && (
                                    <p className="text-xs text-plate-300 mt-2">+{fmt(active.upchargeCents ?? 0)} for 2XL and up</p>
                                )}
                            </div>
                        )}

                        <div>
                            <h3 className="text-xs font-bold text-plate-300 uppercase tracking-wider mb-2">Quantity</h3>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center border border-plate-700 rounded-md overflow-hidden">
                                    <button type="button" onClick={() => setQty(q => Math.max(1, q - 1))}
                                        className="w-10 h-10 flex items-center justify-center text-plate-300 hover:bg-plate-800 transition-colors font-bold text-lg">
                                        −
                                    </button>
                                    <span className="w-10 text-center text-sm font-bold text-plate-50 font-spec tabular-nums">{qty}</span>
                                    <button type="button" onClick={() => setQty(q => q + 1)}
                                        className="w-10 h-10 flex items-center justify-center text-plate-300 hover:bg-plate-800 transition-colors font-bold text-lg">
                                        +
                                    </button>
                                </div>
                                <span className="text-sm text-plate-300 font-medium font-spec tabular-nums">{fmt(unitPrice * qty)} total</span>
                            </div>
                        </div>

                        {active.sku && (
                            <div className="bg-plate-800/60 border border-plate-700 rounded-md p-4 space-y-2 text-xs text-plate-300">
                                <div className="flex justify-between"><span>SKU</span><span className="font-spec text-plate-50">{active.sku}</span></div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="border-t border-plate-700 p-4 bg-plate-900/60 shrink-0">
                    <motion.button type="button" whileTap={{ scale:0.97 }} whileHover={{ y:-1 }} onClick={handleAdd}
                        className="console-sheen w-full font-press font-bold py-3.5 rounded-md transition-shadow duration-200 flex items-center justify-center gap-2"
                        style={added ? { background: "#167A4D", color: "#F7F8FA" } : { background: "linear-gradient(180deg, var(--spot-top), var(--spot))", color: "var(--spot-on)" }}>
                        {added ? (
                            <><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>Added to cart!</>
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
    const [variantChoice, setVariantChoice] = useState<Record<string, "self" | "linked">>({});
    const [detailInitialVariant, setDetailInitialVariant] = useState<"self" | "linked">("self");

    useEffect(() => {
        publicFetch(`/shops/${slug}`).then(setShop).catch(() => setNotFound(true));
    }, [slug]);

    const spot = getShopSpot(shop?.id ?? slug);
    const products: Product[] = shop?.products ?? [];
    const thisShopCount = cart.filter(c => c.shopSlug === slug).reduce((a,c) => a + c.quantity, 0);
    const otherShopsCount = itemCount - thisShopCount;
    const days = daysUntil(shop?.expiresAt);

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
        <div className="press-canvas min-h-screen flex items-center justify-center font-press">
            <div className="text-center">
                <div className="w-8 h-8 border-2 border-proc-cyan border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-plate-300">Loading shop…</p>
            </div>
        </div>
    );

    /* ── Not found ── */
    if (notFound) return (
        <div className="press-canvas min-h-screen flex items-center justify-center p-4 font-press">
            <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} transition={{ duration:0.35, ease:EASE }}>
                <SeparationCard interactive={false} className="p-8 text-center max-w-md">
                    <div className="w-16 h-16 bg-plate-800 border border-plate-700 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-plate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                    </div>
                    <h1 className="text-xl font-extrabold text-plate-50 mb-2">Shop not found</h1>
                    <p className="text-sm text-plate-300">This shop link may have expired or is no longer active.</p>
                    <Link href="/shops" className="text-sm text-proc-cyan hover:brightness-125 font-bold mt-4 inline-block">← Browse all shops</Link>
                    <p className="text-xs text-plate-300 mt-4">Questions? Contact <a href="mailto:hello@crossroadscustomapparel.com" className="text-proc-cyan hover:underline">hello@crossroadscustomapparel.com</a></p>
                </SeparationCard>
            </motion.div>
        </div>
    );

    return (
        <div className="press-canvas min-h-screen flex flex-col relative font-press" style={spotVars(spot)}>
            <PressFrame />

            {/* PublicHeader is a direct child of this min-h-screen root — not
                nested inside the (short) hero block below — so its sticky
                positioning stays anchored for the full scroll length of the
                page instead of releasing once the hero's own container
                scrolls out of view. See DESIGN.md. */}
            <PublicHeader backHref="/shops" backLabel="All shops" />

            {/* ── HERO ── */}
            <div className="relative z-10">
                <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
                    <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4, ease:EASE }}>
                        <h1 className="font-display uppercase text-3xl sm:text-4xl lg:text-5xl text-plate-50 leading-tight mb-3 tracking-tight flex items-center gap-3">
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: "var(--spot)" }} aria-hidden="true" />
                            {shop!.name}
                        </h1>
                        {shop!.notes && (
                            <p className="text-base text-plate-300 max-w-xl leading-relaxed mb-4">{shop!.notes}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2.5 mt-5">
                            <ColorBar spotKey={spot}>{SPOTS[spot].label} spot job</ColorBar>
                            <ColorBar tone="cyan">{products.length} item{products.length !== 1 ? "s" : ""}</ColorBar>
                            <ColorBar tone="magenta">Secure checkout</ColorBar>
                            {days !== null && (
                                <div className="flex items-center gap-1.5 pl-1">
                                    <SegmentReadout value={String(days).padStart(2, "0")} color={SPOTS[spot].bright} className="text-lg" label={`Closes in ${days} days`} />
                                    <span className="text-[10px] font-spec uppercase tracking-wider text-plate-400">day{days === 1 ? "" : "s"} to close</span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* ── STICKY CART-STATUS BAR — stacks directly below the persistent
                PublicHeader (top-16 = its 64px height), never overlapping it ── */}
            <div className="sticky top-16 z-20 bg-plate-950/90 backdrop-blur-md border-b border-plate-800">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 h-13 py-2.5 flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-plate-50">
                        {itemCount === 0 ? "Select your items below" : `${itemCount} item${itemCount !== 1 ? "s" : ""} in your cart${otherShopsCount > 0 ? ` (${otherShopsCount} from other shops)` : ""}`}
                    </p>
                    <AnimatePresence>
                        {itemCount > 0 && (
                            <Link href="/checkout">
                                <motion.span initial={{ opacity:0, x:10 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:10 }}
                                    className="console-sheen flex items-center gap-2 press-btn press-btn-primary h-9 px-4 cursor-pointer">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                                    <span className="text-sm">Checkout · {fmt(subtotalCents)}</span>
                                    <motion.span key={itemCount} initial={{ scale:1.4 }} animate={{ scale:1 }}
                                        className="text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold"
                                        style={{ background: "rgba(0,0,0,0.2)", color: "var(--spot-on)" }}>
                                        {itemCount}
                                    </motion.span>
                                </motion.span>
                            </Link>
                        )}
                    </AnimatePresence>
                </div>
                {shopSlugs.length > 1 && (
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-2 -mt-1">
                        <p className="text-xs text-proc-cyan font-bold flex items-center gap-1.5">
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
                            <div className="w-16 h-16 bg-plate-800 border border-plate-700 rounded-lg flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-plate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                            </div>
                            <p className="text-plate-50 font-bold">No products in this shop yet.</p>
                            <p className="text-sm text-plate-300 mt-1">Check back soon!</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pt-2">
                                {products.map((p, idx) => {
                                    const { linked, selfLabel, linkedLabel, adultSource } = getVariantInfo(p);
                                    const choice = variantChoice[p.id] ?? "self";
                                    const active = choice === "linked" && linked ? linked : p;

                                    const sizes: string[] = active.sizesJson ? JSON.parse(active.sizesJson) : [];
                                    const colors: string[] = active.colorsJson ? JSON.parse(active.colorsJson) : [];
                                    const sel = getSelection(active.id);
                                    const totalInCart = cartQuantityFor(active.id);
                                    const imgs: string[] = adultSource.imagesJson ? JSON.parse(adultSource.imagesJson) : [];
                                    const displayPrice = computeItemPriceCents(active, sel.size || undefined);
                                    const openDetail = () => { setDetailProduct(p); setDetailInitialVariant(choice); };
                                    return (
                                        <motion.div key={p.id}
                                            initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
                                            transition={{ delay:idx*0.04, duration:0.35, ease:[0.32,0.72,0,1] }}
                                            className="separation-card separation-card-interactive overflow-hidden flex flex-col group">

                                            <div className={`relative aspect-[4/3] overflow-hidden cursor-pointer rounded-t-[9px] ${imgs.length === 0 ? "plate-void" : ""}`}
                                                onClick={openDetail}>
                                                {imgs.length > 0 ? (
                                                    <img src={imgUrl(imgs[0])} alt={active.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                                                        <svg className="w-12 h-12 text-plate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                                        <span className="text-[10px] font-spec uppercase tracking-wider text-plate-500">Photo pending</span>
                                                    </div>
                                                )}
                                                {totalInCart > 0 && (
                                                    <div className="absolute top-2.5 right-2.5 text-xs font-bold px-2.5 py-1 rounded-full shadow-plate" style={{ background: "var(--spot)", color: "var(--spot-on)" }}>
                                                        {totalInCart} in cart
                                                    </div>
                                                )}
                                                {active.brand && (
                                                    <div className="absolute bottom-2.5 left-2.5 bg-plate-950/70 backdrop-blur-sm text-plate-50 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                        {active.brand}
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-plate-950/85 backdrop-blur-sm text-plate-50 text-xs font-bold px-3 py-1.5 rounded-full shadow-plate">
                                                        View Details
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="p-4 flex flex-col flex-1 gap-3">
                                                <div className="flex-1">
                                                    <button type="button" className="text-left w-full" onClick={openDetail}>
                                                        <h3 className="font-bold text-plate-50 text-sm leading-snug transition-colors hover:opacity-80">{active.name}</h3>
                                                    </button>
                                                    {active.description && (
                                                        <p className="text-xs text-plate-300 mt-1 line-clamp-2 leading-relaxed">{stripHtml(active.description)}</p>
                                                    )}
                                                    <div className="flex items-center justify-between gap-2 mt-2">
                                                        <p className="text-lg font-extrabold font-spec tabular-nums" style={{ color: "var(--spot-bright)" }}>
                                                            {fmt(displayPrice)}
                                                        </p>
                                                        {linked && (
                                                            <VariantToggle selfLabel={selfLabel} linkedLabel={linkedLabel} choice={choice}
                                                                onChange={c => setVariantChoice(prev => ({ ...prev, [p.id]: c }))} />
                                                        )}
                                                    </div>
                                                </div>

                                                {(sizes.length > 0 || colors.length > 0) && (
                                                    <div className="space-y-2.5 border-t border-dashed border-plate-700 pt-3">
                                                        {sizes.length > 0 && (
                                                            <div>
                                                                <label className="text-[10px] font-bold text-plate-400 uppercase tracking-wider mb-1.5 block">Size</label>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {sizes.map(s => (
                                                                        <button key={s} type="button"
                                                                            onClick={() => setSelection(active.id,"size", sel.size===s ? "" : s)}
                                                                            className={`text-xs px-2.5 py-1 rounded-md border font-bold spot-chip ${sel.size === s ? "spot-chip-selected" : ""}`}>
                                                                            {s}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {colors.length > 0 && (
                                                            <div>
                                                                <label className="text-[10px] font-bold text-plate-400 uppercase tracking-wider mb-1.5 block">
                                                                    Color{sel.color ? `: ${sel.color}` : ""}
                                                                </label>
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {colors.map(c => {
                                                                        const css = getColorCss(c);
                                                                        const isSelected = sel.color === c;
                                                                        return (
                                                                            <button key={c} type="button" title={c}
                                                                                onClick={() => setSelection(active.id,"color", sel.color===c ? "" : c)}
                                                                                className={`w-6 h-6 rounded-full border-2 spot-swatch ${isSelected ? "spot-swatch-selected" : ""}`}
                                                                                style={{ backgroundColor: css, borderColor: isSelected ? "var(--spot)" : "#2B303A" }}>
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
                                                        className="console-sheen flex-1 press-btn press-btn-primary text-sm py-2.5">
                                                        Add to cart
                                                    </motion.button>
                                                    <button type="button" onClick={openDetail}
                                                        className="px-3 py-2.5 rounded-md border border-plate-700 text-plate-300 hover:bg-plate-800 hover:border-plate-600 transition-colors"
                                                        title="View details">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>

                            {/* Trust info — one spec panel, three lines, not three
                                identical icon cards (see craft-floor). */}
                            <div className="mt-12 spec-panel rounded-xl max-w-3xl mx-auto overflow-hidden">
                                {[
                                    { tone:"cyan" as const,
                                        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/><path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/></svg>,
                                        title: "Custom Decorated", desc: "Every item screen printed or embroidered by our team" },
                                    { tone:"magenta" as const,
                                        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>,
                                        title: "Ships to Your Group", desc: "Orders are shipped together to your group's delivery address" },
                                    { tone:"spot" as const,
                                        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>,
                                        title: "Questions?", desc: "hello@crossroadscustomapparel.com" },
                                ].map((row, i) => (
                                    <div key={row.title}
                                        className={`flex items-start gap-4 p-5 sm:p-6 ${i > 0 ? "border-t border-dashed border-plate-700" : ""}`}>
                                        <span className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${TONE_ICON_CLS[row.tone]}`}>{row.icon}</span>
                                        <div>
                                            <p className="text-sm font-extrabold text-plate-50">{row.title}</p>
                                            <p className="text-xs text-plate-300 mt-0.5 leading-relaxed">{row.desc}</p>
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
                        style={{ background:"linear-gradient(to top, rgba(10,13,20,1) 60%, rgba(10,13,20,0))" }}>
                        <Link href="/checkout"
                            className="console-sheen w-full flex items-center justify-between press-btn press-btn-primary px-5 py-4 rounded-lg">
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: "rgba(0,0,0,0.2)" }}>{itemCount}</span>
                            <span>View Cart &amp; Checkout</span>
                            <span className="font-bold font-spec tabular-nums">{fmt(subtotalCents)}</span>
                        </Link>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="relative z-10 mt-12">
                <PublicFooter />
            </div>

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
