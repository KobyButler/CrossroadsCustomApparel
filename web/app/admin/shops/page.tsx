"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Shop = {
    id: string;
    name: string;
    slug: string;
    collectionId: string;
    collection?: { name: string };
    active: boolean;
    expiresAt?: string;
    notes?: string;
    createdAt: string;
    paymentStatus: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
    paymentAmount: number;
    lastPaymentDate?: string;
};

type Collection = {
    id: string;
    name: string;
    slug: string;
    description?: string;
};

export default function ShopsPage() {
    const [shops, setShops] = useState<Shop[]>([]);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditShopModal, setShowEditShopModal] = useState<string | null>(null);
    const [form, setForm] = useState({
        name: '',
        collectionId: '',
        expiresAt: '',
        notes: '',
        paymentAmount: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        try {
            setLoading(true);
            const [shopsData, collectionsData] = await Promise.all([
                api("/shops"),
                api("/collections")
            ]);
            setShops(shopsData || []);
            setCollections(collectionsData || []);
        } catch (error) {
            console.error('Error fetching data:', error);
            // Set default data if API fails
            setShops([]);
            setCollections([]);
        } finally {
            setLoading(false);
        }
    }

    async function createShop(e: any) {
        e.preventDefault();
        try {
            const shopData = {
                name: form.name,
                collectionId: form.collectionId,
                expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
                notes: form.notes || undefined,
                paymentAmount: form.paymentAmount ? parseFloat(form.paymentAmount) : 0
            };
            
            // This would typically create a shop via API
            console.log('Creating shop:', shopData);
            
            // Add to local state for immediate UI update
            const newShop: Shop = {
                id: `shop_${Date.now()}`,
                name: form.name,
                slug: form.name.toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).substr(2, 4),
                collectionId: form.collectionId,
                active: true,
                expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
                notes: form.notes,
                createdAt: new Date().toISOString(),
                paymentStatus: 'PENDING',
                paymentAmount: form.paymentAmount ? parseFloat(form.paymentAmount) : 0
            };
            
            setShops(prev => [newShop, ...prev]);
            setShowCreateModal(false);
            setForm({ name: '', collectionId: '', expiresAt: '', notes: '', paymentAmount: '' });
        } catch (error) {
            console.error('Error creating shop:', error);
        }
    }

    async function toggleShopStatus(shopId: string) {
        try {
            setShops(prev => prev.map(shop => 
                shop.id === shopId 
                    ? { ...shop, active: !shop.active }
                    : shop
            ));
        } catch (error) {
            console.error('Error toggling shop status:', error);
        }
    }

    async function processPayment(shopId: string) {
        try {
            // This would integrate with Stripe to process payment
            console.log('Processing payment for shop:', shopId);
            
            setShops(prev => prev.map(shop => 
                shop.id === shopId 
                    ? { 
                        ...shop, 
                        paymentStatus: 'PAID',
                        lastPaymentDate: new Date().toISOString()
                    }
                    : shop
            ));
        } catch (error) {
            console.error('Error processing payment:', error);
        }
    }

    function copyShopLink(slug: string) {
        const link = `${window.location.origin}/shop/${slug}`;
        navigator.clipboard.writeText(link);
        // You could add a toast notification here
        alert('Shop link copied to clipboard!');
    }

    function getPaymentStatusColor(status: string) {
        switch (status) {
            case 'PAID': return 'bg-green-100 text-green-800';
            case 'PENDING': return 'bg-yellow-100 text-yellow-800';
            case 'OVERDUE': return 'bg-red-100 text-red-800';
            case 'CANCELLED': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    function getActiveStatusColor(active: boolean) {
        return active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="text-2xl font-bold">Shops</div>
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="h-64 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Shops</h1>
                    <p className="text-gray-600">Manage group shops and payment processing</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowCreateModal(true)}>
                        Create Shop
                    </Button>
                    <Button onClick={() => window.open('https://dashboard.stripe.com', '_blank')}>
                        Stripe Dashboard
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid md:grid-cols-4 gap-4">
                <Card className="bg-white border border-gray-200 shadow-sm">
                    <CardContent className="p-6">
                        <div className="text-sm text-gray-600 font-medium">Total Shops</div>
                        <div className="text-2xl font-bold text-gray-900">{shops.length}</div>
                    </CardContent>
                </Card>
                <Card className="bg-white border border-gray-200 shadow-sm">
                    <CardContent className="p-6">
                        <div className="text-sm text-gray-600 font-medium">Active Shops</div>
                        <div className="text-2xl font-bold text-gray-900">
                            {shops.filter(s => s.active).length}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white border border-gray-200 shadow-sm">
                    <CardContent className="p-6">
                        <div className="text-sm text-gray-600 font-medium">Pending Payments</div>
                        <div className="text-2xl font-bold text-gray-900">
                            {shops.filter(s => s.paymentStatus === 'PENDING').length}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white border border-gray-200 shadow-sm">
                    <CardContent className="p-6">
                        <div className="text-sm text-gray-600 font-medium">Total Revenue</div>
                        <div className="text-2xl font-bold text-gray-900">
                            ${shops.reduce((sum, shop) => sum + (shop.paymentAmount || 0), 0).toFixed(2)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Shops Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Group Shops</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50">
                                    <th className="text-left p-3 font-medium">Shop Name</th>
                                    <th className="text-left p-3 font-medium">Collection</th>
                                    <th className="text-left p-3 font-medium">Shop Link</th>
                                    <th className="text-left p-3 font-medium">Status</th>
                                    <th className="text-left p-3 font-medium">Payment</th>
                                    <th className="text-left p-3 font-medium">Expires</th>
                                    <th className="text-right p-3 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {shops.map((shop) => (
                                    <tr key={shop.id} className="border-b border-gray-200 hover:bg-gray-50">
                                        <td className="p-3">
                                            <div className="font-medium">{shop.name}</div>
                                            {shop.notes && (
                                                <div className="text-sm text-gray-500 max-w-xs truncate" title={shop.notes}>
                                                    {shop.notes}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-3">
                                                                                         <Badge className="bg-gray-100 text-gray-800">
                                                 {shop.collection?.name || '—'}
                                             </Badge>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                <a 
                                                    href={`/shop/${shop.slug}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:text-blue-800 hover:underline font-mono text-sm"
                                                >
                                                    /shop/{shop.slug}
                                                </a>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => copyShopLink(shop.slug)}
                                                >
                                                    Copy
                                                </Button>
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <Badge className={getActiveStatusColor(shop.active)}>
                                                {shop.active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </td>
                                        <td className="p-3">
                                            <div className="space-y-1">
                                                <Badge className={getPaymentStatusColor(shop.paymentStatus)}>
                                                    {shop.paymentStatus}
                                                </Badge>
                                                <div className="text-sm font-medium">
                                                    ${(shop.paymentAmount || 0).toFixed(2)}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-3 text-sm text-gray-600">
                                            {shop.expiresAt ? (
                                                <div>
                                                    <div>{new Date(shop.expiresAt).toLocaleDateString()}</div>
                                                                                                     <div className="text-xs text-gray-500">
                                                     {new Date(shop.expiresAt) < new Date() ? 'Expired' : 'Active'}
                                                 </div>
                                                </div>
                                            ) : (
                                                                                                 <span className="text-gray-500">No expiry</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-right">
                                            <div className="flex gap-2 justify-end">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => toggleShopStatus(shop.id)}
                                                >
                                                    {shop.active ? 'Deactivate' : 'Activate'}
                                                </Button>
                                                {shop.paymentStatus === 'PENDING' && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => processPayment(shop.id)}
                                                    >
                                                        Process Payment
                                                    </Button>
                                                )}
                                                <Button variant="outline" size="sm" onClick={() => setShowEditShopModal(shop.id)}>
                                                    Edit
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    {shops.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            No shops found. Create your first group shop to get started.
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create Shop Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-96 max-w-full">
                        <h3 className="text-lg font-semibold mb-4">Create Group Shop</h3>
                        
                        <form onSubmit={createShop} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Shop Name</label>
                                <Input
                                    placeholder="Enter shop name"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium mb-2">Collection</label>
                                <Select 
                                    value={form.collectionId} 
                                    onChange={(e) => setForm({ ...form, collectionId: e.target.value })}
                                    required
                                >
                                    <option value="">Select Collection</option>
                                    {collections.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </Select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium mb-2">Payment Amount ($)</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={form.paymentAmount}
                                    onChange={(e) => setForm({ ...form, paymentAmount: e.target.value })}
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium mb-2">Expiry Date (optional)</label>
                                <Input
                                    type="date"
                                    value={form.expiresAt}
                                    onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium mb-2">Notes (optional)</label>
                                <Input
                                    placeholder="Additional notes about this shop"
                                    value={form.notes}
                                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                />
                            </div>
                            
                            <div className="flex gap-2 mt-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-1"
                                >
                                    Create Shop
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
