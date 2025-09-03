"use client";
import { useEffect, useState } from "react";
// Update the import path if necessary, or create the file at ../lib/api.ts and export 'api' from it.
import { api } from "../../lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function Abandoned() {
    const [rows, setRows] = useState<any[]>([]);
    useEffect(() => { api("/checkouts?status=ABANDONED").then(setRows); }, []);
    return (
        <Card>
            <CardHeader><CardTitle>Abandoned checkouts</CardTitle></CardHeader>
            <CardContent>
                <table className="table">
                    <thead><tr><th>When</th><th>Email</th><th>Shop</th><th>Items</th><th>Status</th></tr></thead>
                    <tbody>{rows.map(r => {
                        const items = JSON.parse(r.cartJson || "[]");
                        return (
                            <tr key={r.id}>
                                <td>{new Date(r.updatedAt).toLocaleString()}</td>
                                <td>{r.email || "—"}</td>
                                <td>{r.shop?.name || "—"}</td>
                                <td>{items.length}</td>
                                <td>{r.status}</td>
                            </tr>
                        );
                    })}</tbody>
                </table>
            </CardContent>
        </Card>
    );
}
