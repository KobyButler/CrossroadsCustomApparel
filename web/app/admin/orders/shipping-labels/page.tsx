"use client";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type ShippingLabel = {
    id: string;
    orderId: string;
    order: {
        id: string;
        customerName: string;
        customerEmail: string;
        shipAddress1: string;
        shipCity: string;
        shipState: string;
        shipZip: string;
        totalCents: number;
    };
    trackingNumber?: string;
    carrier: string;
    status: "pending" | "created" | "printed" | "shipped" | "delivered";
    createdAt: string;
    shippedAt?: string;
};

export default function ShippingLabelsPage() {
    const [labels, setLabels] = useState<ShippingLabel[]>([]);
    const [filteredLabels, setFilteredLabels] = useState<ShippingLabel[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [carrierFilter, setCarrierFilter] = useState<string>("");
    const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set());
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState({
        orderId: "",
        carrier: "USPS",
        service: "Priority Mail",
    });

    useEffect(() => {
        fetchLabels();
    }, []);

    useEffect(() => {
        filterLabels();
    }, [labels, searchTerm, statusFilter, carrierFilter]);

    async function fetchLabels() {
        try {
            setLoading(true);
            // what/why: simulate labels from orders until a real labels endpoint exists
            const orders = await api("/orders?status=UNFULFILLED");
            const mockLabels: ShippingLabel[] = orders.map((order: any) => ({
                id: `label_${order.id}`,
                orderId: order.id,
                order: {
                    id: order.id,
                    customerName: order.customerName,
                    customerEmail: order.customerEmail,
                    shipAddress1: order.shipAddress1,
                    shipCity: order.shipCity,
                    shipState: order.shipState,
                    shipZip: order.shipZip,
                    totalCents: order.totalCents,
                },
                trackingNumber:
                    Math.random() > 0.5
                        ? `TRK${Math.random().toString(36).substr(2, 9).toUpperCase()}`
                        : undefined,
                carrier: ["USPS", "FedEx", "UPS"][Math.floor(Math.random() * 3)],
                status: ["pending", "created", "printed", "shipped", "delivered"][
                    Math.floor(Math.random() * 5)
                ] as ShippingLabel["status"],
                createdAt: order.createdAt,
                shippedAt:
                    Math.random() > 0.7
                        ? new Date(
                            Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
                        ).toISOString()
                        : undefined,
            }));
            setLabels(mockLabels);
        } catch (error) {
            console.error("Error fetching labels:", error);
        } finally {
            setLoading(false);
        }
    }

    function filterLabels() {
        const q = searchTerm.toLowerCase();
        const filtered = labels.filter((label) => {
            const matchesSearch =
                label.order.customerName.toLowerCase().includes(q) ||
                label.order.customerEmail.toLowerCase().includes(q) ||
                label.trackingNumber?.toLowerCase().includes(q) ||
                "";
            const matchesStatus = !statusFilter || label.status === statusFilter;
            const matchesCarrier = !carrierFilter || label.carrier === carrierFilter;
            return matchesSearch && matchesStatus && matchesCarrier;
        });
        setFilteredLabels(filtered);
    }

    function toggleLabelSelection(labelId: string) {
        const next = new Set(selectedLabels);
        next.has(labelId) ? next.delete(labelId) : next.add(labelId);
        setSelectedLabels(next);
    }

    function selectAllLabels() {
        if (selectedLabels.size === filteredLabels.length) {
            setSelectedLabels(new Set());
        } else {
            setSelectedLabels(new Set(filteredLabels.map((l) => l.id)));
        }
    }

    async function createShippingLabel(e: any) {
        e.preventDefault();
        try {
            console.log("Creating shipping label:", createForm);
            setShowCreateModal(false);
            setCreateForm({ orderId: "", carrier: "USPS", service: "Priority Mail" });
            await fetchLabels();
        } catch (error) {
            console.error("Error creating shipping label:", error);
        }
    }

    async function printLabels() {
        const ids = Array.from(selectedLabels);
        if (ids.length === 0) return;
        console.log("Printing labels:", ids);
        alert(`Printing ${ids.length} shipping labels`);
    }

    async function markAsShipped(labelId: string) {
        try {
            setLabels((prev) =>
                prev.map((label) =>
                    label.id === labelId
                        ? { ...label, status: "shipped", shippedAt: new Date().toISOString() }
                        : label
                )
            );
        } catch (error) {
            console.error("Error marking label as shipped:", error);
        }
    }

    const statusOptions = [
        { value: "", label: "All Statuses" },
        { value: "pending", label: "Pending" },
        { value: "created", label: "Created" },
        { value: "printed", label: "Printed" },
        { value: "shipped", label: "Shipped" },
        { value: "delivered", label: "Delivered" },
    ];

    const carrierOptions = [
        { value: "", label: "All Carriers" },
        { value: "USPS", label: "USPS" },
        { value: "FedEx", label: "FedEx" },
        { value: "UPS", label: "UPS" },
    ];

    const serviceOptions = [
        "Priority Mail",
        "First Class Mail",
        "Media Mail",
        "Ground",
        "Express",
        "Overnight",
    ];

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="text-2xl font-bold">Shipping Labels</div>
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
                    <div className="h-64 bg-gray-200 rounded" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Shipping Labels</h1>
                    <p className="text-gray-600">Create and manage shipping labels for orders</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowCreateModal(true)}>
                        Create Label
                    </Button>
                    <Button onClick={printLabels} disabled={selectedLabels.size === 0}>
                        Print Selected ({selectedLabels.size})
                    </Button>
                </div>
            </div>

            {/* Search and Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex gap-4 items-center">
                        <div className="flex-1">
                            <Input
                                placeholder="Search by customer name, email, or tracking number..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="max-w-md"
                            />
                        </div>
                        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            {statusOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </Select>
                        <Select value={carrierFilter} onChange={(e) => setCarrierFilter(e.target.value)}>
                            {carrierOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Labels Table */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>
                            {filteredLabels.length} shipping labels
                            {selectedLabels.size > 0 && ` (${selectedLabels.size} selected)`}
                        </CardTitle>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={selectAllLabels}>
                                {selectedLabels.size === filteredLabels.length ? "Deselect all" : "Select all"}
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
                                            checked={
                                                selectedLabels.size === filteredLabels.length &&
                                                filteredLabels.length > 0
                                            }
                                            onChange={selectAllLabels}
                                            className="rounded border-gray-300 bg-white"
                                        />
                                    </th>
                                    <th className="text-left p-3">Order</th>
                                    <th className="text-left p-3">Customer</th>
                                    <th className="text-left p-3">Shipping Address</th>
                                    <th className="text-left p-3">Carrier</th>
                                    <th className="text-left p-3">Tracking</th>
                                    <th className="text-left p-3">Status</th>
                                    <th className="text-left p-3">Created</th>
                                    <th className="text-right p-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLabels.map((label) => (
                                    <tr
                                        key={label.id}
                                        className="border-b border-gray-200 hover:bg-gray-50"
                                    >
                                        <td className="p-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedLabels.has(label.id)}
                                                onChange={() => toggleLabelSelection(label.id)}
                                                className="rounded border-gray-300 bg-white"
                                            />
                                        </td>
                                        <td className="p-3">
                                            <div className="font-mono text-sm text-gray-700">
                                                {label.order.id.slice(0, 8)}
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <div className="font-medium">{label.order.customerName}</div>
                                            <div className="text-sm text-gray-500">
                                                {label.order.customerEmail}
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <div className="text-sm">
                                                {label.order.shipAddress1}
                                                <br />
                                                {label.order.shipCity}, {label.order.shipState} {label.order.shipZip}
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <Badge className="bg-blue-100 text-blue-800">{label.carrier}</Badge>
                                        </td>
                                        <td className="p-3">
                                            {label.trackingNumber ? (
                                                <div className="font-mono text-sm text-blue-700">
                                                    {label.trackingNumber}
                                                </div>
                                            ) : (
                                                <span className="text-gray-500">—</span>
                                            )}
                                        </td>
                                        <td className="p-3">
                                            <Badge
                                                className={
                                                    label.status === "pending"
                                                        ? "bg-yellow-100 text-yellow-800"
                                                        : label.status === "created"
                                                            ? "bg-blue-100 text-blue-800"
                                                            : label.status === "printed"
                                                                ? "bg-purple-100 text-purple-800"
                                                                : label.status === "shipped"
                                                                    ? "bg-green-100 text-green-800"
                                                                    : "bg-emerald-100 text-emerald-800" /* delivered */
                                                }
                                            >
                                                {label.status.charAt(0).toUpperCase() + label.status.slice(1)}
                                            </Badge>
                                        </td>
                                        <td className="p-3 text-sm text-gray-600">
                                            {new Date(label.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="p-3 text-right">
                                            <div className="flex gap-2 justify-end">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => markAsShipped(label.id)}
                                                    disabled={label.status === "shipped" || label.status === "delivered"}
                                                >
                                                    {label.status === "shipped" ? "Shipped" : "Mark Shipped"}
                                                </Button>
                                                <Button variant="outline" size="sm">Print</Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filteredLabels.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            {searchTerm || statusFilter || carrierFilter
                                ? "No labels match your filters"
                                : "No shipping labels found"}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create Label Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-96 max-w-full border border-gray-200 shadow-sm">
                        <h3 className="text-lg font-semibold mb-4">Create Shipping Label</h3>

                        <form onSubmit={createShippingLabel} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Order ID</label>
                                <Input
                                    placeholder="Enter order ID"
                                    value={createForm.orderId}
                                    onChange={(e) =>
                                        setCreateForm({ ...createForm, orderId: e.target.value })
                                    }
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Carrier</label>
                                <Select
                                    value={createForm.carrier}
                                    onChange={(e) =>
                                        setCreateForm({ ...createForm, carrier: e.target.value })
                                    }
                                >
                                    <option value="USPS">USPS</option>
                                    <option value="FedEx">FedEx</option>
                                    <option value="UPS">UPS</option>
                                </Select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Service</label>
                                <Select
                                    value={createForm.service}
                                    onChange={(e) =>
                                        setCreateForm({ ...createForm, service: e.target.value })
                                    }
                                >
                                    {serviceOptions.map((service) => (
                                        <option key={service} value={service}>
                                            {service}
                                        </option>
                                    ))}
                                </Select>
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
                                <Button type="submit" className="flex-1">
                                    Create Label
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
