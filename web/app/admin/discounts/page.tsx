"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function DiscountsPage() {
    const [codes, setCodes] = useState<any[]>([]);
    const [form, setForm] = useState<any>({ type: "PERCENT", value: 10 });
    useEffect(() => { api("/discounts").then(setCodes); }, []);
    return (
        <>
            <Card>
                <CardHeader><CardTitle>Create Discount</CardTitle></CardHeader>
                <CardContent>
                    <form onSubmit={async e => { e.preventDefault(); const d = await api("/discounts", { method: "POST", body: JSON.stringify(form) }); setCodes([d, ...codes]); e.currentTarget.reset(); }} className="grid md:grid-cols-4 gap-3">
                        <Input placeholder="CODE" onChange={e => setForm({ ...form, code: e.target.value })} />
                        <Select onChange={e => setForm({ ...form, type: e.target.value })} defaultValue="PERCENT"><option>PERCENT</option><option>AMOUNT</option></Select>
                        <Input placeholder="Value (percent or cents)" type="number" onChange={e => setForm({ ...form, value: Number(e.target.value) })} />
                        <Button type="submit">Create</Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Codes</CardTitle></CardHeader>
                <CardContent>
                    <table className="table">
                        <thead><tr><th>Code</th><th>Type</th><th>Value</th></tr></thead>
                        <tbody>{codes.map(c => (
                            <tr key={c.id}><td>{c.code}</td><td>{c.type}</td><td>{c.value}</td></tr>
                        ))}</tbody>
                    </table>
                </CardContent>
            </Card>
        </>
    );
}
