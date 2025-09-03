"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function CollectionsPage() {
    const [data, setData] = useState<any[]>([]);
    const [name, setName] = useState(""); const [description, setDescription] = useState("");
    useEffect(() => { api("/collections").then(setData); }, []);
    return (
        <>
            <Card>
                <CardHeader><CardTitle>Create Collection</CardTitle></CardHeader>
                <CardContent>
                    <form onSubmit={async e => { e.preventDefault(); const c = await api("/collections", { method: "POST", body: JSON.stringify({ name, description }) }); setData([c, ...data]); setName(""); setDescription(""); }} className="grid md:grid-cols-3 gap-3">
                        <Input placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
                        <Input placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
                        <Button type="submit">Create</Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Collections</CardTitle></CardHeader>
                <CardContent>
                    <table className="table">
                        <thead><tr><th>Name</th><th>Slug</th><th>Products</th></tr></thead>
                        <tbody>{data.map(c => (
                            <tr key={c.id}>
                                <td>{c.name}</td>
                                <td className="text-gray-300">{c.slug}</td>
                                <td>{c.products.length}</td>
                            </tr>
                        ))}</tbody>
                    </table>
                </CardContent>
            </Card>
        </>
    );
}
