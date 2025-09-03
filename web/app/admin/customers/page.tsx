"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function CustomersPage() {
    const [rows, setRows] = useState<any[]>([]);
    useEffect(() => { api("/customers").then(setRows); }, []);
    return (
        <Card>
            <CardHeader><CardTitle>Customers</CardTitle></CardHeader>
            <CardContent>
                <table className="table">
                    <thead><tr><th>Name</th><th>Email</th><th>Orders</th><th>Total</th><th>Since</th></tr></thead>
                    <tbody>{rows.map(c => (
                        <tr key={c.id}>
                            <td>{c.name}</td>
                            <td>{c.email}</td>
                            <td>{c.orders}</td>
                            <td>${(c.totalCents / 100).toFixed(2)}</td>
                            <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                        </tr>
                    ))}</tbody>
                </table>
            </CardContent>
        </Card>
    );
}
