"use client";
import { useEffect, useState } from "react";
import { api } from "@/app/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AdminHome() {
    const [fin, setFin] = useState<any>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [recentOrders, setRecentOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [finData, ordersData, recentData] = await Promise.all([
                    api("/finance/summary"),
                    api("/orders?status=UNFULFILLED"),
                    api("/orders?limit=5")
                ]);
                setFin(finData);
                setOrders(ordersData);
                setRecentOrders(recentData);
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="text-2xl font-bold">Dashboard</div>
                <div className="grid md:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <Card key={i}>
                            <CardContent className="p-6">
                                <div className="animate-pulse">
                                    <div className="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
                                    <div className="h-8 bg-gray-600 rounded"></div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Dashboard</h1>
                    <p className="text-gray-400">Welcome to MomShop Admin</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/admin/orders">
                        <Button>View All Orders</Button>
                    </Link>
                    <Link href="/admin/products">
                        <Button variant="outline">Manage Products</Button>
                    </Link>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="text-sm text-gray-400">Total Revenue</div>
                        <div className="text-2xl font-semibold">
                            {fin ? `$${(fin.grossCents / 100).toFixed(2)}` : "—"}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="text-sm text-gray-400">Net Profit</div>
                        <div className="text-2xl font-semibold">
                            {fin ? `$${(fin.netCents / 100).toFixed(2)}` : "—"}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="text-sm text-gray-400">Unfulfilled Orders</div>
                        <div className="text-2xl font-semibold">{orders.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="text-sm text-gray-400">Total Orders</div>
                        <div className="text-2xl font-semibold">
                            {fin ? fin.totalOrders || 0 : "—"}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Orders */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Orders</CardTitle>
                </CardHeader>
                <CardContent>
                    {recentOrders.length > 0 ? (
                        <div className="space-y-3">
                            {recentOrders.map((order) => (
                                <div key={order.id} className="flex justify-between items-center p-3 border border-gray-700 rounded-lg">
                                    <div>
                                        <div className="font-medium">{order.customerName}</div>
                                        <div className="text-sm text-gray-400">{order.customerEmail}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-medium">${(order.totalCents / 100).toFixed(2)}</div>
                                        <div className={`text-sm px-2 py-1 rounded-full inline-block ${
                                            order.status === 'UNFULFILLED' ? 'bg-yellow-900 text-yellow-200' :
                                            order.status === 'FULFILLED' ? 'bg-green-900 text-green-200' :
                                            'bg-gray-700 text-gray-300'
                                        }`}>
                                            {order.status}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-400">
                            No orders yet
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Link href="/admin/orders" className="block">
                            <Button className="w-full justify-start">Create New Order</Button>
                        </Link>
                        <Link href="/admin/products" className="block">
                            <Button variant="outline" className="w-full justify-start">Add New Product</Button>
                        </Link>
                        <Link href="/admin/customers" className="block">
                            <Button variant="outline" className="w-full justify-start">Add Customer</Button>
                        </Link>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>System Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span>Database</span>
                                <span className="text-green-400">● Online</span>
                            </div>
                            <div className="flex justify-between">
                                <span>API Services</span>
                                <span className="text-green-400">● Online</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Vendor Integration</span>
                                <span className="text-green-400">● Ready</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
