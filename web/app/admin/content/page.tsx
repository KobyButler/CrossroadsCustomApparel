"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ContentPage() {
    const [pages, setPages] = useState<any[]>([]);
    const [form, setForm] = useState<any>({});
    useEffect(() => { api("/content").then(setPages); }, []);
    return (
        <>
            <Card>
                <CardHeader><CardTitle>Save Page</CardTitle></CardHeader>
                <CardContent>
                    <form onSubmit={async e => { e.preventDefault(); const p = await api("/content", { method: "POST", body: JSON.stringify(form) }); setPages([p, ...pages]); }} className="grid gap-3">
                        <Input placeholder="slug" onChange={e => setForm({ ...form, slug: e.target.value })} />
                        <Input placeholder="title" onChange={e => setForm({ ...form, title: e.target.value })} />
                        <textarea className="input min-h-[120px]" placeholder="body" onChange={e => setForm({ ...form, body: e.target.value })} />
                        <Button type="submit">Save</Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Pages</CardTitle></CardHeader>
                <CardContent>
                    <table className="table">
                        <thead><tr><th>Slug</th><th>Title</th></tr></thead>
                        <tbody>{pages.map(p => (
                            <tr key={p.id}><td>{p.slug}</td><td>{p.title}</td></tr>
                        ))}</tbody>
                    </table>
                </CardContent>
            </Card>
        </>
    );
}
