"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function Analytics() {
    const [data, setData] = useState<any>(null);
    useEffect(() => { api("/analytics/overview").then(setData); }, []);
    if (!data) return <div>Loading…</div>;
    return (
        <div className="grid lg:grid-cols-2 gap-4">
            <Card>
                <CardHeader><CardTitle>Last 30 days — Orders</CardTitle></CardHeader>
                <CardContent><Bars rows={data.series} field="orders" /></CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Last 30 days — Gross</CardTitle></CardHeader>
                <CardContent><Bars rows={data.series.map((s: any) => ({ date: s.date, value: s.grossCents / 100 }))} /></CardContent>
            </Card>
            <Card className="lg:col-span-2">
                <CardHeader><CardTitle>Top products</CardTitle></CardHeader>
                <CardContent>
                    <table className="table">
                        <thead><tr><th>SKU</th><th>Name</th><th>Qty</th><th>Sales</th></tr></thead>
                        <tbody>{data.top.map((t: any) => (
                            <tr key={t.sku}><td className="text-gray-300">{t.sku}</td><td>{t.name}</td><td>{t.qty}</td><td>${(t.salesCents / 100).toFixed(2)}</td></tr>
                        ))}</tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
}
function Bars({ rows, field = "value" }: { rows: any[]; field?: string }) {
    const max = Math.max(1, ...rows.map((r: any) => r[field] ?? 0));
    return (
        <div className="flex items-end gap-1 h-40">
            {rows.map((r: any) => (
                <div key={r.date} title={`${r.date}: ${r[field]}`}
                    className="bg-accent rounded-t w-2" style={{ height: `${(100 * (r[field] ?? 0)) / max}%` }} />
            ))}
        </div>
    );
}
