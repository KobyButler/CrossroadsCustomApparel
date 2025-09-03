"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Order = {
    id: string;
    customerName: string;
    customerEmail: string;
    status: string;
    totalCents: number;
    createdAt: string;
    items: any[];
    shopId?: string;
    shop?: { name: string };
};

type ViewType = 'all' | 'unfulfilled' | 'unpaid' | 'open' | 'archived';

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewType, setViewType] = useState<ViewType>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
    const [showExportModal, setShowExportModal] = useState(false);
    const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);
    const [exportType, setExportType] = useState<'current' | 'all' | 'selected' | 'search' | 'date'>('current');
    const [exportFormat, setExportFormat] = useState<'excel' | 'csv'>('excel');
    const [sortField, setSortField] = useState<keyof Order>('createdAt');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    useEffect(() => {
        fetchOrders();
    }, [viewType]);

    useEffect(() => {
        filterAndSortOrders();
    }, [orders, searchTerm, sortField, sortDirection]);

    async function fetchOrders() {
        try {
            setLoading(true);
            let endpoint = '/orders';
            
            if (viewType === 'unfulfilled') {
                endpoint += '?status=UNFULFILLED';
            } else if (viewType === 'unpaid') {
                endpoint += '?status=UNPAID';
            } else if (viewType === 'open') {
                endpoint += '?status=OPEN';
            } else if (viewType === 'archived') {
                endpoint += '?status=ARCHIVED';
            }
            
            const data = await api(endpoint);
            setOrders(data);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    }

    function filterAndSortOrders() {
        let filtered = orders.filter(order => {
            const matchesSearch = 
                order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.id.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesSearch;
        });

        // Sort orders
        filtered.sort((a, b) => {
            const aVal = a[sortField];
            const bVal = b[sortField];
            
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return sortDirection === 'asc' 
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal);
            }
            
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
            }
            
            return 0;
        });

        setFilteredOrders(filtered);
    }

    function handleSort(field: keyof Order) {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    }

    function toggleOrderSelection(orderId: string) {
        const newSelected = new Set(selectedOrders);
        if (newSelected.has(orderId)) {
            newSelected.delete(orderId);
        } else {
            newSelected.add(orderId);
        }
        setSelectedOrders(newSelected);
    }

    function selectAllOrders() {
        if (selectedOrders.size === filteredOrders.length) {
            setSelectedOrders(new Set());
        } else {
            setSelectedOrders(new Set(filteredOrders.map(o => o.id)));
        }
    }

    async function markFulfilled(orderId: string) {
        try {
            await api(`/orders/${orderId}/fulfill`, { method: "POST" });
            await fetchOrders();
        } catch (error) {
            console.error('Error marking order fulfilled:', error);
        }
    }

    function exportOrders() {
        let ordersToExport = filteredOrders;
        
        if (exportType === 'selected') {
            ordersToExport = orders.filter(o => selectedOrders.has(o.id));
        } else if (exportType === 'search') {
            ordersToExport = filteredOrders;
        }
        
        const csvData = ordersToExport.map(order => ({
            'Order ID': order.id,
            'Customer Name': order.customerName,
            'Customer Email': order.customerEmail,
            'Status': order.status,
            'Total': `$${(order.totalCents / 100).toFixed(2)}`,
            'Date': new Date(order.createdAt).toLocaleDateString(),
            'Items': order.items.length
        }));
        
        const headers = Object.keys(csvData[0]);
        const csvContent = [
            headers.join(','),
            ...csvData.map(row => headers.map(header => `"${(row as any)[header]}"`).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `orders-${exportType}-${new Date().toISOString().split('T')[0]}.${exportFormat === 'excel' ? 'csv' : 'csv'}`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        setShowExportModal(false);
    }

    const viewOptions = [
        { value: 'all', label: 'All orders', count: orders.length },
        { value: 'unfulfilled', label: 'Unfulfilled', count: orders.filter(o => o.status === 'UNFULFILLED').length },
        { value: 'unpaid', label: 'Unpaid', count: orders.filter(o => o.status === 'UNPAID').length },
        { value: 'open', label: 'Open', count: orders.filter(o => o.status === 'OPEN').length },
        { value: 'archived', label: 'Archived', count: orders.filter(o => o.status === 'ARCHIVED').length }
    ];

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="text-2xl font-bold">Orders</div>
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
                    <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
                    <p className="text-gray-600">Manage and track customer orders</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowExportModal(true)}>
                        Export
                    </Button>
                    <Button onClick={() => setShowCreateOrderModal(true)}>Create order</Button>
                </div>
            </div>

            {/* View Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg border border-gray-200">
                {viewOptions.map(option => (
                    <button
                        key={option.value}
                        onClick={() => setViewType(option.value as ViewType)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            viewType === option.value
                                ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                    >
                        {option.label} ({option.count})
                    </button>
                ))}
            </div>

            {/* Search and Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex gap-4 items-center">
                        <div className="flex-1">
                            <Input
                                placeholder="Search orders by customer name, email, or order ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="max-w-md"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Select 
                                value={sortField} 
                                onChange={(e) => setSortField(e.target.value as keyof Order)}
                            >
                                <option value="createdAt">Date</option>
                                <option value="customerName">Customer</option>
                                <option value="totalCents">Total</option>
                                <option value="status">Status</option>
                            </Select>
                            <Button
                                variant="outline"
                                onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                            >
                                {sortDirection === 'asc' ? '↑' : '↓'}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Orders Table */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>
                            {filteredOrders.length} orders
                            {selectedOrders.size > 0 && ` (${selectedOrders.size} selected)`}
                        </CardTitle>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={selectAllOrders}
                            >
                                {selectedOrders.size === filteredOrders.length ? 'Deselect all' : 'Select all'}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50">
                                    <th className="text-left p-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0}
                                            onChange={selectAllOrders}
                                            className="rounded border-gray-300 bg-white"
                                        />
                                    </th>
                                                                             <th 
                                             className="text-left p-3 cursor-pointer hover:bg-gray-100"
                                             onClick={() => handleSort('id')}
                                         >
                                        Order
                                        {sortField === 'id' && (sortDirection === 'asc' ? ' ↑' : ' ↓')}
                                    </th>
                                                                             <th 
                                             className="text-left p-3 cursor-pointer hover:bg-gray-100"
                                             onClick={() => handleSort('customerName')}
                                         >
                                        Customer
                                        {sortField === 'customerName' && (sortDirection === 'asc' ? ' ↑' : ' ↓')}
                                    </th>
                                    <th className="text-left p-3">Shop</th>
                                                                             <th 
                                             className="text-left p-3 cursor-pointer hover:bg-gray-100"
                                             onClick={() => handleSort('totalCents')}
                                         >
                                        Total
                                        {sortField === 'totalCents' && (sortDirection === 'asc' ? ' ↑' : ' ↓')}
                                    </th>
                                                                             <th 
                                             className="text-left p-3 cursor-pointer hover:bg-gray-100"
                                             onClick={() => handleSort('status')}
                                         >
                                        Status
                                        {sortField === 'status' && (sortDirection === 'asc' ? ' ↑' : ' ↓')}
                                    </th>
                                                                             <th 
                                             className="text-left p-3 cursor-pointer hover:bg-gray-100"
                                             onClick={() => handleSort('createdAt')}
                                         >
                                        Date
                                        {sortField === 'createdAt' && (sortDirection === 'asc' ? ' ↑' : ' ↓')}
                                    </th>
                                    <th className="text-right p-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.map((order) => (
                                    <tr key={order.id} className="border-b border-gray-200 hover:bg-gray-50">
                                        <td className="p-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedOrders.has(order.id)}
                                                onChange={() => toggleOrderSelection(order.id)}
                                                className="rounded border-gray-300 bg-white"
                                            />
                                        </td>
                                        <td className="p-3">
                                            <div className="font-mono text-sm text-gray-600">
                                                {order.id.slice(0, 8)}
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <div className="font-medium">{order.customerName}</div>
                                            <div className="text-sm text-gray-500">{order.customerEmail}</div>
                                        </td>
                                        <td className="p-3">
                                            {order.shop?.name || '—'}
                                        </td>
                                        <td className="p-3 font-medium">
                                            ${(order.totalCents / 100).toFixed(2)}
                                        </td>
                                        <td className="p-3">
                                            <Badge className={
                                                order.status === 'UNFULFILLED' ? 'bg-yellow-600 text-yellow-100' :
                                                order.status === 'FULFILLED' ? 'bg-green-600 text-green-100' :
                                                'bg-gray-600 text-gray-100'
                                            }>
                                                {order.status}
                                            </Badge>
                                        </td>
                                        <td className="p-3 text-sm text-gray-500">
                                            {new Date(order.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="p-3 text-right">
                                            <div className="flex gap-2 justify-end">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => markFulfilled(order.id)}
                                                    disabled={order.status === 'FULFILLED'}
                                                >
                                                    {order.status === 'FULFILLED' ? 'Fulfilled' : 'Mark Fulfilled'}
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    {filteredOrders.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            {searchTerm ? 'No orders match your search' : 'No orders found'}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Export Modal */}
                         {showExportModal && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                     <div className="bg-white rounded-lg p-6 w-96 max-w-full">
                        <h3 className="text-lg font-semibold mb-4">Export Orders</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Export</label>
                                <Select 
                                    value={exportType} 
                                    onChange={(e) => setExportType(e.target.value as any)}
                                >
                                    <option value="current">Current page</option>
                                    <option value="all">All orders</option>
                                    <option value="selected" disabled={selectedOrders.size === 0}>
                                        Selected: {selectedOrders.size} orders
                                    </option>
                                    <option value="search" disabled={!searchTerm}>
                                        50+ orders matching your search
                                    </option>
                                    <option value="date">Orders by date</option>
                                </Select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium mb-2">Export as</label>
                                <Select 
                                    value={exportFormat} 
                                    onChange={(e) => setExportFormat(e.target.value as any)}
                                >
                                    <option value="excel">CSV for Excel, Numbers, or other spreadsheet programs</option>
                                    <option value="csv">Plain CSV file</option>
                                </Select>
                            </div>
                        </div>
                        
                        <div className="flex gap-2 mt-6">
                            <Button
                                variant="outline"
                                onClick={() => setShowExportModal(false)}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="outline"
                                className="flex-1"
                            >
                                Export transaction histories
                            </Button>
                            <Button
                                onClick={exportOrders}
                                className="flex-1"
                            >
                                Export orders
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Order Modal */}
            {showCreateOrderModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-96 max-w-full">
                        <h3 className="text-lg font-semibold mb-4">Create New Order</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Customer Name</label>
                                <Input placeholder="Enter customer name" />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium mb-2">Customer Email</label>
                                <Input type="email" placeholder="Enter customer email" />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium mb-2">Shipping Address</label>
                                <Input placeholder="Street address" />
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2">
                                <Input placeholder="City" />
                                <Input placeholder="State" />
                                <Input placeholder="ZIP" />
                            </div>
                        </div>
                        
                        <div className="flex gap-2 mt-6">
                            <Button
                                variant="outline"
                                onClick={() => setShowCreateOrderModal(false)}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button className="flex-1">
                                Create Order
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
