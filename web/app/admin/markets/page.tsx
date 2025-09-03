"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function Markets() {
    const [shops, setShops] = useState<any[]>([]);
    useEffect(() => { api("/shops").then(setShops); }, []);
    return (
        <Card>
            <CardHeader><CardTitle>Markets (Group Shops)</CardTitle></CardHeader>
            <CardContent>
                <table className="table">
                    <thead><tr><th>Name</th><th>Collection</th><th>Link</th><th>Active</th></tr></thead>
                    <tbody>{shops.map(s => (
                        <tr key={s.id}>
                            <td>{s.name}</td>
                            <td>{s.collection?.name}</td>
                            <td><a href={`/shop/${s.slug}`} target="_blank" className="no-underline text-gray-300 hover:underline">/shop/{s.slug}</a></td>
                            <td>{s.active ? "Yes" : "No"}</td>
                        </tr>
                    ))}</tbody>
                </table>
            </CardContent>
        </Card>
    );
}
