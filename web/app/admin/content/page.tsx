"use client";
import { useEffect, useState } from "react";
import { api } from "@/app/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

export default function ContentPage() {
    const { toast } = useToast();
    const [pages, setPages]   = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving]   = useState(false);
    const [form, setForm] = useState({ slug: "", title: "", body: "" });

    useEffect(() => {
        api("/content")
            .then((d: any) => setPages(Array.isArray(d) ? d : d?.data ?? []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        if (!form.slug || !form.title) { toast("Slug and title are required", "error"); return; }
        setSaving(true);
        try {
            const p = await api("/content", { method: "POST", body: JSON.stringify(form) });
            setPages(prev => [p, ...prev]);
            setForm({ slug: "", title: "", body: "" });
            toast("Page saved");
        } catch (err: any) {
            toast(err.message || "Failed to save page", "error");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="space-y-6">
            <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4, ease:EASE }}>
                <h1 className="page-title">Content Pages</h1>
                <p className="page-subtitle">Manage static pages for your storefront</p>
            </motion.div>

            {/* Create form */}
            <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4, ease:EASE }}
                className="console-panel rounded-lg p-6">
                <h2 className="text-sm font-semibold text-white mb-4">New Page</h2>
                <form onSubmit={handleSave} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input
                            label="Slug"
                            placeholder="e.g. about-us"
                            value={form.slug}
                            onChange={e => setForm(p => ({ ...p, slug: e.target.value }))}
                        />
                        <Input
                            label="Title"
                            placeholder="e.g. About Us"
                            value={form.title}
                            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="field-label">Body</label>
                        <textarea
                            rows={5}
                            placeholder="Page content (HTML or plain text)…"
                            value={form.body}
                            onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
                            className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-graphite-500
                                       outline-none hover:border-white/20 focus:border-signal-cyan/60 focus:ring-2 focus:ring-signal-cyan/30 resize-y transition-all"
                        />
                    </div>
                    <div className="flex justify-end">
                        <Button type="submit" loading={saving}>Save Page</Button>
                    </div>
                </form>
            </motion.div>

            {/* Pages table */}
            <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1, duration:0.4, ease:EASE }}
                className="console-panel rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.06]">
                    <h2 className="text-sm font-semibold text-white">Saved Pages</h2>
                </div>
                {loading ? (
                    <div className="p-8 space-y-3">
                        {[1,2,3].map(i => (
                            <div key={i} className="flex items-center gap-4">
                                <div className="skeleton h-3 w-24"/>
                                <div className="skeleton flex-1 h-3"/>
                            </div>
                        ))}
                    </div>
                ) : pages.length === 0 ? (
                    <div className="flex flex-col items-center py-16 text-graphite-600">
                        <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-sm text-graphite-300 font-medium">No pages yet</p>
                        <p className="text-xs text-graphite-300 mt-0.5">Create your first page above</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <div className="table-wrap"><table className="data-table">
                            <thead>
                                <tr>
                                    <th>Slug</th>
                                    <th>Title</th>
                                    <th>Preview URL</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pages.map((p, idx) => (
                                    <motion.tr key={p.id} initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} transition={{ delay:idx*0.03, duration:0.2 }}>
                                        <td>
                                            <code className="text-xs font-mono bg-white/[0.06] text-graphite-200 px-1.5 py-0.5 rounded">
                                                {p.slug}
                                            </code>
                                        </td>
                                        <td>
                                            <span className="text-sm font-semibold text-graphite-100">{p.title}</span>
                                        </td>
                                        <td>
                                            <a
                                                href={`/pages/${p.slug}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-signal-cyan hover:text-signal-cyan-bright hover:underline transition-colors"
                                            >
                                                /pages/{p.slug}
                                            </a>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table></div>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
