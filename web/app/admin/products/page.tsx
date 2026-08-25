"use client";
import { useEffect, useRef, useState } from "react";
import { api, imgUrl } from "@/app/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { ZoomableImage } from "@/components/ui/zoomable-image";
import { IconButton, IconButtonRow } from "@/components/ui/icon-button";
import { EditIcon, DuplicateIcon, TrashIcon } from "@/components/ui/icons";
import { motion, Reorder } from "framer-motion";
import { getColorCss } from "@/lib/colors";

type Shop = { id: string; name: string; slug: string };
type YouthProductRef = { id: string; name: string; vendorIdentifier?: string | null; sizeChartUrl?: string | null };
type Product = {
    id: string; name: string; sku: string; vendor: string;
    vendorIdentifier?: string; brand?: string; description?: string;
    priceCents: number; shops?: Shop[];
    sizesJson?: string; colorsJson?: string; imagesJson?: string; sizeChartUrl?: string | null;
    upchargeEnabled?: boolean; upchargeCents?: number; weightOz?: number | null;
    youthProductId?: string | null;
    youthProduct?: YouthProductRef | null;
};

const VENDOR_LABELS: Record<string, string> = { SANMAR:"SanMar", SSACTIVEWEAR:"S&S Activewear", OTHER:"Other" };
const VENDOR_COLORS: Record<string, string> = { SANMAR:"info", SSACTIVEWEAR:"success", OTHER:"default" };
const EMPTY = {
    name:"", sku:"", vendor:"OTHER", vendorIdentifier:"", brand:"", description:"", priceDollars:"",
    shopIds:[] as string[], sizes:[] as string[], colors:[] as string[], images:[] as string[],
    sizeChartUrl:"", youthLink: null as YouthProductRef | null, youthSizeChartUrl:"",
    upchargeEnabled:false, upchargeDollars:"3.00", weightOz:""
};

// ── TagInput ──────────────────────────────────────────────────────────────────
function TagInput({ label, tags, onChange, placeholder }: { label:string; tags:string[]; onChange:(t:string[])=>void; placeholder?:string }) {
    const [input, setInput] = useState("");
    function add() {
        const v = input.trim();
        if (v && !tags.includes(v)) onChange([...tags, v]);
        setInput("");
    }
    return (
        <div>
            <label className="field-label">{label}</label>
            <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
                {tags.map(t => (
                    <span key={t} className="inline-flex items-center gap-1 text-xs bg-brand-50 text-brand-700 border border-brand-200 px-2 py-0.5 rounded-full">
                        {t}
                        <button type="button" title={`Remove ${t}`} aria-label={`Remove ${t}`}
                            onClick={() => onChange(tags.filter(x => x !== t))} className="hover:text-red-500 transition-colors">
                            <svg viewBox="0 0 12 12" fill="currentColor" className="w-3 h-3"><path d="M4.586 6L1.293 2.707 2.707 1.293 6 4.586l3.293-3.293 1.414 1.414L7.414 6l3.293 3.293-1.414 1.414L6 7.414l-3.293 3.293-1.414-1.414L4.586 6z"/></svg>
                        </button>
                    </span>
                ))}
                {tags.length === 0 && <span className="text-xs text-slate-300 italic">None added yet</span>}
            </div>
            <div className="flex gap-2">
                <input type="text" value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
                    placeholder={placeholder ?? "Type and press Enter"}
                    className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
                <button type="button" onClick={add}
                    className="px-3 py-1.5 text-sm border border-slate-200 rounded-xl text-slate-600 hover:bg-brand-50 hover:border-brand-300 hover:text-brand-700 transition-all">
                    Add
                </button>
            </div>
        </div>
    );
}

// ── ColorTagInput ─────────────────────────────────────────────────────────────
function ColorTagInput({ label, tags, onChange, placeholder, required }: { label:string; tags:string[]; onChange:(t:string[])=>void; placeholder?:string; required?:boolean }) {
    const [input, setInput] = useState("");
    function add() {
        const v = input.trim();
        if (v && !tags.includes(v)) onChange([...tags, v]);
        setInput("");
    }
    return (
        <div>
            <label className="field-label">
                {label}
                {required && <span className="text-brand-500 ml-0.5">*</span>}
            </label>
            {required && tags.length === 0 && (
                <p className="text-xs text-amber-600 -mt-0.5 mb-1.5">At least one color is required</p>
            )}
            <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
                {tags.map(t => (
                    <span key={t} className="inline-flex items-center gap-1.5 text-xs bg-brand-50 text-brand-700 border border-brand-200 px-2 py-0.5 rounded-full">
                        <span className="w-3 h-3 rounded-full border border-black/15 shrink-0"
                            style={{ backgroundColor: getColorCss(t) }} />
                        {t}
                        <button type="button" title={`Remove ${t}`} aria-label={`Remove ${t}`}
                            onClick={() => onChange(tags.filter(x => x !== t))} className="hover:text-red-500 transition-colors">
                            <svg viewBox="0 0 12 12" fill="currentColor" className="w-3 h-3"><path d="M4.586 6L1.293 2.707 2.707 1.293 6 4.586l3.293-3.293 1.414 1.414L7.414 6l3.293 3.293-1.414 1.414L6 7.414l-3.293 3.293-1.414-1.414L4.586 6z"/></svg>
                        </button>
                    </span>
                ))}
                {tags.length === 0 && <span className="text-xs text-slate-300 italic">None added yet</span>}
            </div>
            <div className="flex gap-2">
                <div className="relative flex-1">
                    {input && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border border-black/15 pointer-events-none"
                            style={{ backgroundColor: getColorCss(input) }} />
                    )}
                    <input type="text" value={input} onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
                        placeholder={placeholder ?? "Black, White, Navy…"}
                        className={`w-full ${input ? "pl-8" : "pl-3"} pr-3 py-1.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all`} />
                </div>
                <button type="button" onClick={add}
                    className="px-3 py-1.5 text-sm border border-slate-200 rounded-xl text-slate-600 hover:bg-brand-50 hover:border-brand-300 hover:text-brand-700 transition-all">
                    Add
                </button>
            </div>
        </div>
    );
}

// ── Auto-growing, manually-resizable description textarea ─────────────────────
function DescriptionField({ value, onChange }: { value:string; onChange:(v:string)=>void }) {
    const ref = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${Math.max(el.scrollHeight, 84)}px`;
    }, [value]);

    return (
        <div>
            <label className="field-label">Description</label>
            <textarea ref={ref} value={value} onChange={e => onChange(e.target.value)}
                placeholder="Product description…"
                style={{ resize: "vertical", minHeight: "84px" }}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
            <p className="text-xs text-slate-300 mt-1">Drag the bottom-right corner to resize — it also grows automatically as you type.</p>
        </div>
    );
}

// ── ShopMultiSelect ────────────────────────────────────────────────────────────
function ShopMultiSelect({ shops, selected, onChange }: { shops:Shop[]; selected:string[]; onChange:(ids:string[])=>void }) {
    function toggle(id: string) {
        onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
    }
    return (
        <div>
            <label className="field-label">Assign to Shop(s)</label>
            {shops.length === 0 ? (
                <p className="text-xs text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl px-3 py-2.5">
                    No group shops yet — you can create one under Group Shops, or assign this product to a shop later.
                </p>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {shops.map(s => {
                        const checked = selected.includes(s.id);
                        return (
                            <button key={s.id} type="button" onClick={() => toggle(s.id)}
                                className={`text-xs font-medium px-3 py-1.5 rounded-xl border transition-all ${checked ? "bg-brand-600 text-white border-brand-600" : "border-slate-200 text-slate-600 hover:border-brand-300 hover:bg-brand-50"}`}>
                                {s.name}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ── ImageManager ───────────────────────────────────────────────────────────────
// Handles adding (single or multiple at once), removing, and drag-to-reorder of a
// product's images. Works before a product exists too (create flow) since uploads
// go through a generic, product-agnostic endpoint — the resulting URLs are staged
// in local form state and persisted whenever the product is saved.
function ImageManager({ images, onChange }: { images:string[]; onChange:(images:string[])=>void }) {
    const { toast } = useToast();
    const [uploading, setUploading] = useState(false);
    const base = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000/api";

    async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        setUploading(true);
        try {
            const formData = new FormData();
            Array.from(files).forEach(f => formData.append("images", f));
            const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
            const res = await fetch(`${base}/products/images/upload`, {
                method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: formData
            });
            if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
            const { urls } = await res.json() as { urls: string[] };
            onChange([...images, ...urls]);
            toast(urls.length > 1 ? `${urls.length} images uploaded` : "Image uploaded");
        } catch (err: any) { toast(err.message || "Upload failed", "error"); }
        finally { setUploading(false); e.target.value = ""; }
    }

    function handleRemove(url: string) {
        onChange(images.filter(u => u !== url));
    }

    return (
        <div>
            <label className="field-label">Product Images</label>
            {images.length === 0 ? (
                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                </div>
            ) : (
                <Reorder.Group as="div" axis="x" values={images} onReorder={onChange}
                    className="flex gap-2 mb-1 overflow-x-auto pb-2">
                    {images.map((url, i) => (
                        <Reorder.Item key={url} value={url} as="div"
                            className="relative group shrink-0 cursor-grab active:cursor-grabbing">
                            <img src={imgUrl(url)} alt={`Product ${i+1}`} draggable={false}
                                className="w-16 h-16 object-cover rounded-xl border border-slate-200 ring-2 ring-transparent group-hover:ring-brand-300 transition-all pointer-events-none" />
                            {i === 0 && (
                                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] font-bold bg-brand-600 text-white px-1.5 py-0.5 rounded-full shadow-sm">Main</span>
                            )}
                            <button type="button" title="Remove image" aria-label="Remove image"
                                onClick={() => handleRemove(url)}
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:border-red-300 transition-all">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </Reorder.Item>
                    ))}
                </Reorder.Group>
            )}
            {images.length > 1 && <p className="text-xs text-slate-300 mb-2">Drag to reorder — the first photo is used as the main image.</p>}
            <label className={`inline-flex items-center gap-2 text-sm cursor-pointer px-3 py-2 border border-dashed rounded-xl transition-all ${uploading ? "opacity-50 pointer-events-none border-slate-200 text-slate-400" : "border-brand-300 text-brand-600 hover:bg-brand-50"}`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                {uploading ? "Uploading…" : "Upload image(s)"}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="sr-only" onChange={handleFiles} />
            </label>
        </div>
    );
}

// ── SizeChartUploader ────────────────────────────────────────────────────────
function SizeChartUploader({ url, onChange, label = "Size Chart (PDF)" }: { url:string; onChange:(url:string)=>void; label?:string }) {
    const { toast } = useToast();
    const [uploading, setUploading] = useState(false);
    const base = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000/api";

    async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("sizechart", file);
            const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
            const res = await fetch(`${base}/products/sizechart/upload`, {
                method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: formData
            });
            if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
            onChange((await res.json()).url);
            toast("Size chart uploaded");
        } catch (err: any) { toast(err.message || "Upload failed", "error"); }
        finally { setUploading(false); e.target.value = ""; }
    }

    return (
        <div>
            <label className="field-label">{label}</label>
            {url ? (
                <div className="flex items-center gap-2 mb-2">
                    <a href={imgUrl(url)} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 hover:underline">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                        View current size chart
                    </a>
                    <button type="button" onClick={() => onChange("")} className="text-xs text-slate-400 hover:text-red-500 transition-colors">Remove</button>
                </div>
            ) : (
                <p className="text-xs text-slate-300 italic mb-2">No size chart uploaded yet</p>
            )}
            <label className={`inline-flex items-center gap-2 text-sm cursor-pointer px-3 py-2 border border-dashed rounded-xl transition-all ${uploading ? "opacity-50 pointer-events-none border-slate-200 text-slate-400" : "border-brand-300 text-brand-600 hover:bg-brand-50"}`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                {uploading ? "Uploading…" : url ? "Replace PDF" : "Upload PDF"}
                <input type="file" accept="application/pdf" className="sr-only" onChange={handleFile} />
            </label>
            <p className="text-xs text-slate-400 mt-1">Customers can view this from the product page — handy for sizing guides from the vendor.</p>
        </div>
    );
}

// ── YouthLinkPanel ────────────────────────────────────────────────────────────
// SanMar sells youth sizing as a fully separate style/SKU (e.g. PC61 vs
// PC61Y), so under the hood it's still a separate Product here too — but the
// admin never has to build that second product by hand. Searching and picking
// a SanMar style loads its colors/sizes for a quick confirm step (colors are
// locked to whatever Adult already offers — no point stocking a youth color
// Adult doesn't have; sizes are the admin's choice, since youth's size run is
// its own thing), then calls /sanmar/import (same "find or create by vendor
// style" the SanMar tab's bulk import uses) and links the result, unlisted
// from any shop until the admin decides otherwise. The link is edited from
// the adult side only; a product already linked as someone's youth shows
// read-only info instead, so there's one place to manage each pair.
function YouthLinkPanel({ products, editProductId, adultColors, value, onChange, sizeChartUrl, onSizeChartChange }: {
    products: Product[]; editProductId: string | null; adultColors: string[];
    value: YouthProductRef | null; onChange: (v: YouthProductRef | null) => void;
    sizeChartUrl: string; onSizeChartChange: (url: string) => void;
}) {
    const { toast } = useToast();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [loading, setLoading] = useState(false);
    const [resolving, setResolving] = useState(false);
    const [detail, setDetail] = useState<{ style: string; title: string; brand?: string; colors: string[]; sizes: string[] } | null>(null);
    const [selectedSizes, setSelectedSizes] = useState<Set<string>>(new Set());
    const timerRef = useRef<ReturnType<typeof setTimeout>>();

    const linkedFromAdult = editProductId ? products.find(y => y.youthProductId === editProductId) : undefined;

    if (linkedFromAdult) {
        return (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-slate-800">Linked as the youth version of &quot;{linkedFromAdult.name}&quot;</p>
                <p className="text-xs text-slate-400 mt-0.5">Manage or remove this link from that product&apos;s edit form instead.</p>
            </div>
        );
    }

    async function doSearch(q: string) {
        if (!q.trim()) { setResults([]); return; }
        setLoading(true);
        try {
            const data = await api(`/sanmar/catalog?q=${encodeURIComponent(q)}&limit=40`);
            const seen = new Set<string>(); const unique: any[] = [];
            for (const row of data.data ?? []) { if (!seen.has(row.style)) { seen.add(row.style); unique.push(row); } }
            setResults(unique.slice(0, 12));
        } catch { setResults([]); }
        finally { setLoading(false); }
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const q = e.target.value;
        setQuery(q);
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => doSearch(q), 400);
    }

    async function pickResult(result: any) {
        setLoading(true);
        try {
            const d = await api(`/sanmar/catalog/${encodeURIComponent(result.style)}`);
            setDetail({ style: result.style, title: d.title ?? result.style, brand: d.brand, colors: d.colors ?? [], sizes: d.sizes ?? [] });
            setSelectedSizes(new Set(d.sizes ?? []));
        } catch (err: any) { toast(err.message || "Failed to load style details", "error"); }
        finally { setLoading(false); }
    }

    const colorIntersection = detail ? detail.colors.filter(c => adultColors.includes(c)) : [];

    async function confirmLink() {
        if (!detail) return;
        setResolving(true);
        try {
            const res = await api("/sanmar/import", { method: "POST", body: JSON.stringify({
                style: detail.style, colors: colorIntersection, sizes: [...selectedSizes]
            }) });
            let p = res.product;

            if (res.action === "created") {
                // {SanMar style}{product name}, spaces stripped so it reads as one clean token.
                const youthSku = `${p.vendorIdentifier ?? detail.style}${p.name.replace(/\s+/g, "")}`;
                try {
                    p = await api(`/products/${p.id}`, { method: "PUT", body: JSON.stringify({
                        name: p.name, sku: youthSku, vendor: p.vendor, vendorIdentifier: p.vendorIdentifier,
                        brand: p.brand, description: p.description, priceCents: p.priceCents,
                        images: p.imagesJson ? JSON.parse(p.imagesJson) : [],
                        sizes: p.sizesJson ? JSON.parse(p.sizesJson) : [],
                        colors: p.colorsJson ? JSON.parse(p.colorsJson) : [],
                        sizeChartUrl: p.sizeChartUrl, upchargeEnabled: p.upchargeEnabled,
                        upchargeCents: p.upchargeCents, weightOz: p.weightOz,
                        shopIds: (p.shops ?? []).map((s: any) => s.id),
                    }) });
                } catch (err: any) {
                    toast(`Linked, but couldn't set its SKU (${err.message || "unknown error"}) — it kept the default one.`, "error");
                }
            }

            onChange({ id: p.id, name: p.name, vendorIdentifier: p.vendorIdentifier });
            onSizeChartChange(p.sizeChartUrl ?? "");
            setSearching(false); setQuery(""); setResults([]); setDetail(null);
            toast(`Linked to SanMar ${detail.style}`);
        } catch (err: any) { toast(err.message || "Failed to link youth style", "error"); }
        finally { setResolving(false); }
    }

    function cancel() {
        setSearching(false); setQuery(""); setResults([]); setDetail(null);
    }

    if (value && !searching) {
        return (
            <div>
                <label className="field-label">Youth version (optional)</label>
                <div className="flex items-center justify-between gap-3 bg-brand-50 border border-brand-200 rounded-xl px-3.5 py-2.5">
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{value.name}</p>
                        {value.vendorIdentifier && <p className="text-xs text-slate-500">SanMar style {value.vendorIdentifier}</p>}
                    </div>
                    <div className="flex gap-3 shrink-0">
                        <button type="button" onClick={() => setSearching(true)} className="text-xs font-semibold text-brand-600 hover:text-brand-700">Change</button>
                        <button type="button" onClick={() => { onChange(null); onSizeChartChange(""); }} className="text-xs font-semibold text-red-500 hover:text-red-700">Remove</button>
                    </div>
                </div>
                <div className="mt-3">
                    <SizeChartUploader url={sizeChartUrl} onChange={onSizeChartChange} label="Youth Size Chart (PDF)" />
                </div>
            </div>
        );
    }

    // ── Confirm step: colors (locked to Adult's) + size picker ──
    if (detail) {
        return (
            <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                        <p className="text-sm font-bold text-slate-900">{detail.title}</p>
                        <p className="text-xs text-slate-400">{detail.brand} · Style {detail.style}</p>
                    </div>
                    <button type="button" onClick={() => setDetail(null)} className="text-xs text-slate-500 hover:text-slate-700 underline shrink-0">← Back to search</button>
                </div>

                <div className="mb-3">
                    <label className="field-label mb-1.5">Colors (same as Adult)</label>
                    {colorIntersection.length === 0 ? (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            None of Adult&apos;s colors are offered for this youth style — pick a different style, or add colors to Adult first.
                        </p>
                    ) : (
                        <div className="flex flex-wrap gap-1.5">
                            {colorIntersection.map(c => (
                                <span key={c} className="inline-flex items-center gap-1.5 text-xs bg-brand-50 text-brand-700 border border-brand-200 px-2 py-0.5 rounded-full">
                                    <span className="w-3 h-3 rounded-full border border-black/15 shrink-0" style={{ backgroundColor: getColorCss(c) }} />
                                    {c}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {detail.sizes.length > 0 && (
                    <div className="mb-3">
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="field-label mb-0">Sizes to offer</label>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setSelectedSizes(new Set(detail.sizes))} className="text-xs font-semibold text-brand-600 hover:text-brand-700">Select all</button>
                                <button type="button" onClick={() => setSelectedSizes(new Set())} className="text-xs font-semibold text-slate-400 hover:text-slate-600">Clear</button>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {detail.sizes.map(s => {
                                const checked = selectedSizes.has(s);
                                return (
                                    <label key={s} className={`px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${checked ? "bg-brand-600 text-white border-brand-600" : "border-slate-200 text-slate-500 hover:border-brand-300 hover:text-brand-600"}`}>
                                        <input type="checkbox" checked={checked} className="sr-only"
                                            onChange={() => setSelectedSizes(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; })} />
                                        {s}
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                )}

                <button type="button" onClick={confirmLink} disabled={resolving || colorIntersection.length === 0 || selectedSizes.size === 0}
                    className="w-full py-2.5 text-sm font-bold rounded-xl text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                    style={{ background: "linear-gradient(135deg,#8b5cf6 0%,#7c3aed 100%)" }}>
                    {resolving ? "Linking…" : "Confirm & Link"}
                </button>
            </div>
        );
    }

    return (
        <div>
            <label className="field-label">Youth version (optional)</label>
            <div className="relative">
                <input value={query} onChange={handleChange}
                    placeholder="Search SanMar for the youth style (e.g. PC61Y)…"
                    className="w-full pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-white transition-all" />
                {loading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
            </div>
            {results.length > 0 && (
                <div className="mt-1.5 border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-slate-100 bg-white shadow-sm">
                    {results.map((r, i) => (
                        <button key={i} type="button" onClick={() => pickResult(r)}
                            className="w-full text-left px-3.5 py-2 hover:bg-brand-50 transition-colors flex items-center gap-3">
                            {r.productImage ? (
                                <img src={r.productImage} alt="" className="w-7 h-7 rounded-lg object-cover border border-slate-200 shrink-0" />
                            ) : null}
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-800 truncate">{r.title ?? r.style}</p>
                                <p className="text-xs text-slate-400 truncate">{r.brand ?? ""} {r.brand ? "·" : ""} Style {r.style}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
            {value && (
                <button type="button" onClick={cancel} className="text-xs text-slate-400 hover:text-slate-600 mt-1.5">← Cancel</button>
            )}
            <p className="text-xs text-slate-400 mt-1.5">If this style also comes in youth sizes, search for it and pick it — it&apos;s imported automatically and linked here, offering the same colors as Adult. Shoppers get an Adult/Youth toggle on this product&apos;s page.</p>
        </div>
    );
}

// ── Vendor Search Panel ───────────────────────────────────────────────────────
type VendorItem = {
    style: string; title: string; brand?: string;
    colors: string[]; sizes: string[]; priceCents: number; description?: string;
    images: string[]; vendorIdentifier?: string; upchargeDetected?: boolean; weightOz?: number | null;
};

type VendorDetail = VendorItem & { colorImages?: Record<string,string> };

function VendorSearchPanel({ source, onSelect }: { source: "SANMAR"|"SS"; onSelect:(item:VendorItem)=>void }) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [notice, setNotice] = useState("");
    const [loading, setLoading] = useState(false);
    const [selecting, setSelecting] = useState(false);
    const [error, setError] = useState("");
    const [detail, setDetail] = useState<VendorDetail | null>(null);
    const [selectedColors, setSelectedColors] = useState<Set<string>>(new Set());
    const timerRef = useRef<ReturnType<typeof setTimeout>>();
    const requestSeq = useRef(0);

    async function doSearch(q: string) {
        const seq = ++requestSeq.current;
        if (!q.trim()) { setResults([]); setNotice(""); setError(""); return; }
        setLoading(true); setError(""); setNotice("");
        try {
            if (source === "SANMAR") {
                const data = await api(`/sanmar/catalog?q=${encodeURIComponent(q)}&limit=40`);
                if (seq !== requestSeq.current) return; // a newer search superseded this one
                const seen = new Set<string>();
                const unique: any[] = [];
                for (const row of data.data ?? []) {
                    if (!seen.has(row.style)) { seen.add(row.style); unique.push(row); }
                }
                setResults(unique.slice(0, 15));
                if (unique.length === 0) setNotice("No results. Make sure the SanMar catalog is synced (SanMar tab → Sync Catalog).");
            } else {
                const data = await api(`/ss/search?q=${encodeURIComponent(q)}`);
                if (seq !== requestSeq.current) return;
                const products = data.products ?? [];
                setResults(products.slice(0, 15));
                if (data.notice) setNotice(data.notice);
                else if (products.length === 0) setNotice("No results found.");
            }
        } catch (e: any) {
            if (seq !== requestSeq.current) return;
            const msg: string = e.message ?? "Search failed";
            if (msg.includes("504") || msg.includes("timed out")) {
                setError("Search timed out — the vendor API is slow or unreachable. Try again in a moment.");
            } else if (msg.includes("502") || msg.includes("Bad Gateway") || msg.includes("ERR_FAILED") || msg.toLowerCase().includes("failed to fetch")) {
                setError("Server is starting up — wait a few seconds and try again.");
            } else {
                setError(msg);
            }
        } finally {
            if (seq === requestSeq.current) setLoading(false);
        }
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const q = e.target.value;
        setQuery(q);
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => doSearch(q), 400);
    }

    async function handlePick(result: any) {
        setSelecting(true); setError("");
        try {
            if (source === "SANMAR") {
                const d = await api(`/sanmar/catalog/${result.style}`);
                const det: VendorDetail = {
                    style: d.style, title: d.title ?? result.style, brand: d.brand ?? undefined,
                    colors: d.colors ?? [], sizes: d.sizes ?? [], priceCents: d.priceCents ?? 0,
                    description: d.description ?? undefined, images: d.images ?? [],
                    colorImages: d.colorImages ?? {}, vendorIdentifier: d.style,
                    upchargeDetected: Boolean(d.upchargeDetected), weightOz: d.weightOz ?? null,
                };
                setDetail(det);
                setSelectedColors(new Set());
            } else {
                const d = await api(`/ss/styles/${result.styleId}`);
                const det: VendorDetail = {
                    style: d.style ?? result.style, title: d.title ?? result.style, brand: d.brand ?? undefined,
                    colors: d.colors ?? [], sizes: d.sizes ?? [], priceCents: d.priceCents ?? 0,
                    description: d.description ?? undefined, images: d.images ?? [],
                    colorImages: d.colorImages ?? {}, vendorIdentifier: String(d.styleId ?? result.styleId),
                    upchargeDetected: Boolean(d.upchargeDetected), weightOz: d.weightOz ?? null,
                };
                setDetail(det);
                setSelectedColors(new Set());
            }
        } catch (e: any) { setError(e.message || "Failed to load details"); }
        finally { setSelecting(false); }
    }

    function confirmColors() {
        if (!detail) return;
        const chosenColors = detail.colors.length > 0 ? [...selectedColors] : [];
        const images = chosenColors.length > 0
            ? [...new Set(chosenColors.map(c => detail.colorImages?.[c]).filter(Boolean) as string[])]
            : detail.images.slice(0, 1);
        onSelect({
            style: detail.style, title: detail.title, brand: detail.brand,
            colors: chosenColors, sizes: detail.sizes, priceCents: detail.priceCents,
            description: detail.description, images: images.length ? images : detail.images,
            vendorIdentifier: detail.vendorIdentifier, upchargeDetected: detail.upchargeDetected,
            weightOz: detail.weightOz,
        });
        setDetail(null);
        setSelectedColors(new Set());
    }

    const label = source === "SANMAR" ? "SanMar" : "S&S Activewear";

    // ── Color confirmation step ──
    if (detail) {
        return (
            <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-sm font-bold text-slate-900">{detail.title}</p>
                        <p className="text-xs text-slate-400">{detail.brand} · Style {detail.style}{detail.weightOz != null ? ` · ~${detail.weightOz} oz` : ""}</p>
                    </div>
                    <button type="button" onClick={() => { setDetail(null); setSelectedColors(new Set()); }}
                        className="text-xs text-slate-500 hover:text-slate-700 underline shrink-0">
                        ← Back to search
                    </button>
                </div>

                {detail.upchargeDetected && (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                        <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        <p className="text-xs text-amber-800">This vendor charges more for larger sizes — the &quot;Upcharge for bigger sizes&quot; toggle below has been turned on automatically.</p>
                    </div>
                )}

                {detail.colors.length === 0 ? (
                    <p className="text-xs text-slate-400">This style has no color options — click Confirm to add it.</p>
                ) : (
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="field-label mb-0">Which colors do you want to offer?</label>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setSelectedColors(new Set(detail.colors))}
                                    className="text-xs font-semibold text-brand-600 hover:text-brand-700">Select all</button>
                                <button type="button" onClick={() => setSelectedColors(new Set())}
                                    className="text-xs font-semibold text-slate-400 hover:text-slate-600">Clear</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto border border-slate-200 rounded-xl p-2.5">
                            {detail.colors.map(c => {
                                const checked = selectedColors.has(c);
                                const thumb = detail.colorImages?.[c];
                                return (
                                    <label key={c} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${checked ? "bg-brand-50 ring-1 ring-brand-200" : "hover:bg-slate-50"}`}>
                                        <input type="checkbox" checked={checked} className="accent-brand-600 w-3.5 h-3.5 shrink-0"
                                            onChange={() => setSelectedColors(prev => {
                                                const next = new Set(prev);
                                                next.has(c) ? next.delete(c) : next.add(c);
                                                return next;
                                            })} />
                                        {thumb ? (
                                            <img src={thumb} alt={c} className="w-6 h-6 rounded object-cover border border-slate-200 shrink-0" />
                                        ) : (
                                            <span className="w-3.5 h-3.5 rounded-full border border-black/15 shrink-0" style={{ backgroundColor: getColorCss(c) }} />
                                        )}
                                        <span className="text-xs text-slate-700 truncate">{c}</span>
                                    </label>
                                );
                            })}
                        </div>
                        <p className="text-xs text-slate-400 mt-1.5">{selectedColors.size} of {detail.colors.length} selected · all {detail.sizes.length} sizes will be added for the colors you pick</p>
                    </div>
                )}

                <button type="button" onClick={confirmColors}
                    disabled={detail.colors.length > 0 && selectedColors.size === 0}
                    className="w-full py-2.5 text-sm font-bold rounded-xl text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                    style={{ background:"linear-gradient(135deg,#8b5cf6 0%,#7c3aed 100%)" }}>
                    Confirm &amp; Add to Product
                </button>
            </div>
        );
    }

    // ── Search step ──
    return (
        <div className="space-y-2">
            <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                <input value={query} onChange={handleChange}
                    placeholder={source === "SS" ? `Search S&S by style # or keyword (e.g. G200, hoodie…)` : `Search ${label} by style # or name…`}
                    className="w-full pl-9 pr-8 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-white transition-all" />
                {(loading || selecting) && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
            </div>
            {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                    <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                    <p className="text-xs text-red-700">{error}</p>
                </div>
            )}
            {notice && !error && results.length === 0 && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                    <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <p className="text-xs text-amber-800">{notice}</p>
                </div>
            )}
            {results.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto divide-y divide-slate-100 bg-white shadow-sm">
                    {results.map((r, i) => (
                        <button key={i} type="button" onClick={() => handlePick(r)}
                            className="w-full text-left px-4 py-2.5 hover:bg-brand-50 transition-colors flex items-center gap-3">
                            {r.image ? (
                                <img src={r.image} alt="" className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0" />
                            ) : null}
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-800 truncate">{r.title ?? r.name ?? r.style}</p>
                                <p className="text-xs text-slate-400 truncate">{r.brand ?? ""} {r.brand ? "·" : ""} Style {r.style}</p>
                            </div>
                            <span className="text-xs text-brand-600 font-semibold shrink-0">Select →</span>
                        </button>
                    ))}
                </div>
            )}
            {query && !loading && !selecting && results.length === 0 && !error && !notice && (
                <p className="text-xs text-slate-400 text-center py-2">No results for &ldquo;{query}&rdquo;</p>
            )}
            {source === "SANMAR" && !query && (
                <p className="text-xs text-slate-400 px-1">Searches your synced SanMar catalog. Run a catalog sync in the SanMar tab if results are missing.</p>
            )}
            {source === "SS" && !query && (
                <p className="text-xs text-slate-400 px-1">Search S&amp;S by style number or keyword (e.g. G200, hoodie, Gildan). Requires SS_USER and SS_API_KEY in server env.</p>
            )}
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ProductsPage() {
    const { toast } = useToast();
    const [products, setProducts]         = useState<Product[]>([]);
    const [shops, setShops]               = useState<Shop[]>([]);
    const [loading, setLoading]           = useState(true);
    const [search, setSearch]             = useState("");
    const [filterShop, setFilterShop]     = useState("");
    const [filterVendor, setFilterVendor] = useState("");
    const [showAdd, setShowAdd]           = useState(false);
    const [editProduct, setEditProduct]   = useState<Product | null>(null);
    const [form, setForm]                 = useState({ ...EMPTY });
    const [saving, setSaving]             = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
    const [deleting, setDeleting]         = useState(false);
    const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

    // Vendor import state
    const [importSource, setImportSource] = useState<"MANUAL"|"SANMAR"|"SS">("MANUAL");
    const [importedFrom, setImportedFrom] = useState<string>("");

    useEffect(() => {
        Promise.all([api("/products"), api("/shops")])
            .then(([p, s]) => {
                setProducts(Array.isArray(p) ? p : p?.data ?? []);
                setShops(Array.isArray(s) ? s : s?.data ?? []);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const filtered = products.filter(p => {
        const q = search.toLowerCase();
        return (!q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || (p.brand ?? "").toLowerCase().includes(q))
            && (!filterShop || (p.shops ?? []).some(s => s.id === filterShop))
            && (!filterVendor || p.vendor === filterVendor);
    });

    function openEdit(p: Product) {
        setEditProduct(p);
        setImportSource("MANUAL");
        setImportedFrom("");
        setForm({
            name:p.name, sku:p.sku, vendor:p.vendor, vendorIdentifier:p.vendorIdentifier??"", brand:p.brand??"", description:p.description??"",
            priceDollars:(p.priceCents/100).toFixed(2), shopIds:(p.shops ?? []).map(s => s.id),
            sizes:p.sizesJson?JSON.parse(p.sizesJson):[], colors:p.colorsJson?JSON.parse(p.colorsJson):[],
            images:p.imagesJson?JSON.parse(p.imagesJson):[],
            sizeChartUrl: p.sizeChartUrl ?? "",
            youthLink: p.youthProduct ? { id: p.youthProduct.id, name: p.youthProduct.name, vendorIdentifier: p.youthProduct.vendorIdentifier } : null,
            youthSizeChartUrl: p.youthProduct?.sizeChartUrl ?? "",
            upchargeEnabled: Boolean(p.upchargeEnabled), upchargeDollars: ((p.upchargeCents ?? 300)/100).toFixed(2),
            weightOz: p.weightOz != null ? String(p.weightOz) : "",
        });
    }

    function openAdd() {
        setForm({ ...EMPTY });
        setEditProduct(null);
        setImportSource("MANUAL");
        setImportedFrom("");
        setShowAdd(true);
    }

    function handleVendorSelect(item: VendorItem) {
        const vendor = importSource === "SANMAR" ? "SANMAR" : "SSACTIVEWEAR";
        setForm(p => ({
            ...p,
            name:             item.title,
            sku:              item.style,
            vendor,
            vendorIdentifier: item.vendorIdentifier ?? item.style,
            brand:            item.brand ?? p.brand,
            description:      item.description ?? p.description,
            priceDollars:     item.priceCents > 0 ? (item.priceCents / 100).toFixed(2) : p.priceDollars,
            sizes:            item.sizes.length > 0 ? item.sizes : p.sizes,
            colors:           item.colors.length > 0 ? item.colors : p.colors,
            images:           item.images.length > 0 ? item.images : p.images,
            upchargeEnabled:  item.upchargeDetected ? true : p.upchargeEnabled,
            weightOz:         item.weightOz != null ? String(item.weightOz) : p.weightOz,
        }));
        setImportedFrom(item.title);
    }

    async function saveProduct(e: React.FormEvent) {
        e.preventDefault();
        if (form.colors.length === 0) {
            toast("Add at least one color before saving", "error");
            return;
        }
        setSaving(true);
        try {
            const payload = {
                name:form.name, sku:form.sku, vendor:form.vendor, vendorIdentifier:form.vendorIdentifier||undefined,
                brand:form.brand||undefined, description:form.description||undefined,
                priceCents:Math.round(parseFloat(form.priceDollars)*100), sizes:form.sizes, colors:form.colors,
                images:form.images, shopIds:form.shopIds,
                sizeChartUrl: form.sizeChartUrl || null,
                youthProductId: form.youthLink?.id || null,
                youthSizeChartUrl: form.youthLink ? (form.youthSizeChartUrl || "") : undefined,
                upchargeEnabled:form.upchargeEnabled,
                upchargeCents:Math.round(parseFloat(form.upchargeDollars || "0")*100) || 300,
                weightOz: form.weightOz.trim() ? Math.round(parseFloat(form.weightOz)) : null,
            };
            if (editProduct) {
                const u = await api(`/products/${editProduct.id}`, { method:"PUT", body:JSON.stringify(payload) });
                setProducts(p => p.map(x => x.id===editProduct.id ? u : x));
                toast("Product updated"); setEditProduct(null);
            } else {
                const c = await api("/products", { method:"POST", body:JSON.stringify(payload) });
                setProducts(p => [c,...p]); toast("Product created"); setShowAdd(false);
            }
            setForm({ ...EMPTY });
        } catch (err: any) { toast(err.message || "Failed to save product", "error"); }
        finally { setSaving(false); }
    }

    async function deleteProduct() {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await api(`/products/${deleteTarget.id}`, { method: "DELETE" });
            setProducts(p => p.filter(x => x.id !== deleteTarget.id));
            toast("Product deleted");
            setDeleteTarget(null);
        } catch (err: any) { toast(err.message || "Failed to delete product", "error"); }
        finally { setDeleting(false); }
    }

    async function duplicateProduct(p: Product) {
        setDuplicatingId(p.id);
        try {
            const copy = await api(`/products/${p.id}/duplicate`, { method: "POST" });
            setProducts(prev => [copy, ...prev]);
            toast(`Duplicated as ${copy.sku}`);
        } catch (err: any) { toast(err.message || "Failed to duplicate product", "error"); }
        finally { setDuplicatingId(null); }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="page-title">Products</h1>
                    <p className="page-subtitle">Manage your product catalog</p>
                </div>
                <motion.button whileHover={{ y:-1 }} whileTap={{ scale:0.97 }}
                    onClick={openAdd}
                    className="btn-shine flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-200"
                    style={{ background:"linear-gradient(135deg,#8b5cf6 0%,#7c3aed 100%)", boxShadow:"0 4px 16px rgba(124,58,237,0.35)" }}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                    Add Product
                </motion.button>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 max-w-xs">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    <input className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-white shadow-sm transition-all"
                        placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Select value={filterShop} onChange={e => setFilterShop(e.target.value)} className="w-full sm:w-44">
                    <option value="">All shops</option>
                    {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
                <Select value={filterVendor} onChange={e => setFilterVendor(e.target.value)} className="w-full sm:w-40">
                    <option value="">All vendors</option>
                    <option value="SANMAR">SanMar</option>
                    <option value="SSACTIVEWEAR">S&S Activewear</option>
                    <option value="OTHER">Other</option>
                </Select>
                {(search || filterShop || filterVendor) && (
                    <button type="button" onClick={() => { setSearch(""); setFilterShop(""); setFilterVendor(""); }}
                        className="text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors">
                        Clear filters
                    </button>
                )}
            </div>

            <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-card overflow-hidden">
                {loading ? (
                    <div className="p-8 space-y-3">
                        {[1,2,3,4].map(i => (
                            <div key={i} className="animate-pulse flex items-center gap-4">
                                <div className="w-8 h-8 bg-slate-100 rounded-lg" />
                                <div className="flex-1 space-y-1.5">
                                    <div className="h-3 w-36 bg-slate-200 rounded" />
                                    <div className="h-2.5 w-20 bg-slate-100 rounded" />
                                </div>
                                <div className="h-5 w-16 bg-slate-100 rounded-full" />
                                <div className="h-4 w-12 bg-slate-100 rounded" />
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                        <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>
                        <p className="text-sm text-slate-400 font-medium">No products found</p>
                        <p className="text-xs text-slate-300 mt-0.5">{search ? "Try a different search" : "Click \"Add Product\" to get started"}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <div className="table-wrap"><table className="data-table">
                            <thead><tr><th>Product</th><th>Crossroads SKU</th><th>Shops</th><th>Vendor</th><th>Variants</th><th>Price</th><th className="text-right pr-5">Actions</th></tr></thead>
                            <tbody>
                                {filtered.map((p, idx) => (
                                    <motion.tr key={p.id} initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} transition={{ delay:idx*0.02, duration:0.2 }}>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                {p.imagesJson && JSON.parse(p.imagesJson)[0] ? (
                                                    <ZoomableImage src={imgUrl(JSON.parse(p.imagesJson)[0])} alt={p.name}
                                                        className="w-8 h-8 rounded-lg object-cover shrink-0 ring-1 ring-black/5" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                                                        <svg className="w-4 h-4 text-brand-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14"/></svg>
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-semibold text-slate-800 text-[13px]">{p.name}</p>
                                                    {p.brand && <p className="text-xs text-slate-400">{p.brand}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td><code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded-md text-slate-600">{p.sku}</code></td>
                                        <td>
                                            {(p.shops ?? []).length === 0 ? (
                                                <span className="text-sm text-slate-300">—</span>
                                            ) : (
                                                <div className="flex flex-wrap gap-1">
                                                    {(p.shops ?? []).slice(0,2).map(s => (
                                                        <Badge key={s.id} variant="purple" size="sm">{s.name}</Badge>
                                                    ))}
                                                    {(p.shops ?? []).length > 2 && (
                                                        <span className="text-xs text-slate-400">+{(p.shops ?? []).length - 2}</span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td><Badge variant={VENDOR_COLORS[p.vendor] as any} size="sm">{VENDOR_LABELS[p.vendor] ?? p.vendor}</Badge></td>
                                        <td>
                                            <div className="flex gap-1 flex-wrap items-center">
                                                {p.sizesJson && JSON.parse(p.sizesJson).length > 0 && (
                                                    <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{JSON.parse(p.sizesJson).length} sizes</span>
                                                )}
                                                {p.colorsJson && JSON.parse(p.colorsJson).length > 0 && (
                                                    <span className="flex items-center gap-0.5">
                                                        {JSON.parse(p.colorsJson).slice(0,4).map((c: string) => (
                                                            <span key={c} title={c} className="w-3 h-3 rounded-full border border-black/10 inline-block"
                                                                style={{ backgroundColor: getColorCss(c) }} />
                                                        ))}
                                                        {JSON.parse(p.colorsJson).length > 4 && (
                                                            <span className="text-xs text-slate-400 ml-0.5">+{JSON.parse(p.colorsJson).length - 4}</span>
                                                        )}
                                                    </span>
                                                )}
                                                {(!p.sizesJson || JSON.parse(p.sizesJson).length === 0) && (!p.colorsJson || JSON.parse(p.colorsJson).length === 0) && (
                                                    <span className="text-xs text-slate-300">—</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <span className="text-sm font-bold text-slate-900 tabular-nums">${(p.priceCents/100).toFixed(2)}</span>
                                            {p.upchargeEnabled && (
                                                <span title={`+$${((p.upchargeCents??0)/100).toFixed(2)} for 2XL and up`} className="ml-1 text-[10px] text-amber-600 font-semibold align-middle">+2XL</span>
                                            )}
                                        </td>
                                        <td className="text-right pr-5">
                                            <IconButtonRow>
                                                <IconButton title="Edit product" onClick={() => openEdit(p)}>
                                                    <EditIcon />
                                                </IconButton>
                                                <IconButton title="Duplicate product" loading={duplicatingId === p.id} onClick={() => duplicateProduct(p)}>
                                                    <DuplicateIcon />
                                                </IconButton>
                                                <IconButton title="Delete product" tone="red" onClick={() => setDeleteTarget(p)}>
                                                    <TrashIcon />
                                                </IconButton>
                                            </IconButtonRow>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table></div>
                    </div>
                )}
            </div>

            {/* ── Add/Edit Product Modal ── */}
            <Modal open={showAdd || !!editProduct}
                onClose={() => { setShowAdd(false); setEditProduct(null); setForm({ ...EMPTY }); }}
                title={editProduct ? "Edit Product" : "Add Product"} size="xl">
                <form onSubmit={saveProduct} className="space-y-5">

                    {/* Source selector (only on create) */}
                    {!editProduct && (
                        <div>
                            <label className="field-label mb-2 block">Product Source</label>
                            <div className="flex rounded-xl border border-slate-200 overflow-hidden">
                                {(["MANUAL","SANMAR","SS"] as const).map(src => {
                                    const labels = { MANUAL:"Manual Entry", SANMAR:"SanMar", SS:"S&S Activewear" };
                                    return (
                                        <button key={src} type="button"
                                            onClick={() => { setImportSource(src); setImportedFrom(""); }}
                                            className={`flex-1 py-2 text-sm font-medium transition-all ${importSource===src ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
                                            {labels[src]}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Vendor search panel */}
                    {!editProduct && importSource !== "MANUAL" && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                            {importedFrom ? (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                            <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                                        </div>
                                        <span className="text-sm font-semibold text-slate-800">Imported: {importedFrom}</span>
                                    </div>
                                    <button type="button" onClick={() => setImportedFrom("")}
                                        className="text-xs text-slate-500 hover:text-slate-700 underline">
                                        Search again
                                    </button>
                                </div>
                            ) : (
                                <VendorSearchPanel source={importSource} onSelect={handleVendorSelect} />
                            )}
                        </div>
                    )}

                    {/* Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input label="Product Name" required value={form.name} onChange={e => setForm(p => ({ ...p, name:e.target.value }))} />
                        <Input label="Crossroads SKU" required value={form.sku} onChange={e => setForm(p => ({ ...p, sku:e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="field-label">Vendor</label>
                            <Select value={form.vendor} onChange={e => setForm(p => ({ ...p, vendor:e.target.value }))}>
                                <option value="SANMAR">SanMar</option>
                                <option value="SSACTIVEWEAR">S&S Activewear</option>
                                <option value="OTHER">Other</option>
                            </Select>
                        </div>
                        <Input label="Vendor SKU" placeholder="e.g. PC61"
                            value={form.vendorIdentifier} onChange={e => setForm(p => ({ ...p, vendorIdentifier:e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input label="Brand" placeholder="e.g. Port & Company" value={form.brand} onChange={e => setForm(p => ({ ...p, brand:e.target.value }))} />
                        <Input label="Price ($)" type="number" step="0.01" min="0" required value={form.priceDollars} onChange={e => setForm(p => ({ ...p, priceDollars:e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <Input label="Weight (oz)" type="number" step="1" min="0" placeholder="e.g. 6"
                                value={form.weightOz} onChange={e => setForm(p => ({ ...p, weightOz:e.target.value }))} />
                            <p className="text-xs text-slate-400 mt-1">Used to estimate shipping cost at checkout. Leave blank to use a default estimate.</p>
                        </div>
                    </div>

                    <DescriptionField value={form.description} onChange={v => setForm(p => ({ ...p, description:v }))} />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <TagInput label="Available Sizes" tags={form.sizes} onChange={sizes => setForm(p => ({ ...p, sizes }))} placeholder="S, M, L, XL…" />
                        <ColorTagInput label="Available Colors" required tags={form.colors} onChange={colors => setForm(p => ({ ...p, colors }))} />
                    </div>

                    <ShopMultiSelect shops={shops} selected={form.shopIds} onChange={shopIds => setForm(p => ({ ...p, shopIds }))} />

                    {/* Upcharge toggle */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-slate-800">Upcharge for bigger sizes</p>
                                <p className="text-xs text-slate-400 mt-0.5">Adds extra cost automatically for 2XL and larger sizes at checkout</p>
                            </div>
                            <button type="button" role="switch" aria-checked={form.upchargeEnabled}
                                onClick={() => setForm(p => ({ ...p, upchargeEnabled: !p.upchargeEnabled }))}
                                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${form.upchargeEnabled ? "bg-brand-600" : "bg-slate-300"}`}>
                                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.upchargeEnabled ? "translate-x-5" : ""}`} />
                            </button>
                        </div>
                        {form.upchargeEnabled && (
                            <div className="mt-3 flex items-center gap-2">
                                <span className="text-sm text-slate-500">Extra charge:</span>
                                <div className="relative w-28">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                                    <input type="number" step="0.01" min="0" value={form.upchargeDollars}
                                        onChange={e => setForm(p => ({ ...p, upchargeDollars:e.target.value }))}
                                        className="w-full pl-6 pr-2 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
                                </div>
                                <span className="text-xs text-slate-400">for 2XL and up</span>
                            </div>
                        )}
                    </div>

                    <ImageManager images={form.images} onChange={images => setForm(p => ({ ...p, images }))} />

                    <SizeChartUploader url={form.sizeChartUrl} onChange={sizeChartUrl => setForm(p => ({ ...p, sizeChartUrl }))}
                        label={form.youthLink ? "Adult Size Chart (PDF)" : "Size Chart (PDF)"} />

                    <YouthLinkPanel products={products} editProductId={editProduct?.id ?? null} adultColors={form.colors}
                        value={form.youthLink} onChange={youthLink => setForm(p => ({ ...p, youthLink }))}
                        sizeChartUrl={form.youthSizeChartUrl} onSizeChartChange={youthSizeChartUrl => setForm(p => ({ ...p, youthSizeChartUrl }))} />

                    <ModalFooter>
                        <Button type="button" variant="outline" onClick={() => { setShowAdd(false); setEditProduct(null); }}>Cancel</Button>
                        <Button type="submit" loading={saving} disabled={form.colors.length === 0}
                            title={form.colors.length === 0 ? "Add at least one color first" : undefined}>
                            {editProduct ? "Save Changes" : "Create Product"}
                        </Button>
                    </ModalFooter>
                </form>
            </Modal>

            {/* ── Delete Confirmation Modal ── */}
            <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Product" size="sm">
                <p className="text-sm text-slate-600 mb-1">
                    Are you sure you want to delete <span className="font-semibold text-slate-900">{deleteTarget?.name}</span>?
                </p>
                <p className="text-xs text-slate-400 mb-4">This cannot be undone.</p>
                <ModalFooter>
                    <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                    <Button type="button" variant="danger" loading={deleting} onClick={deleteProduct}>Delete</Button>
                </ModalFooter>
            </Modal>
        </div>
    );
}
