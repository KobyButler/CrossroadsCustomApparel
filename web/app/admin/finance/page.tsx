"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Transaction = {
    id: string;
    type: 'INCOME' | 'EXPENSE' | 'REFUND' | 'FEE';
    amountCents: number;
    description: string;
    orderId?: string;
    order?: {
        id: string;
        customerName: string;
        totalCents: number;
    };
    stripePaymentIntentId?: string;
    status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
    createdAt: string;
    processedAt?: string;
};

type FinancialSummary = {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    pendingPayments: number;
    thisMonth: {
        revenue: number;
        expenses: number;
        profit: number;
    };
    lastMonth: {
        revenue: number;
        expenses: number;
        profit: number;
    };
};

export default function FinancePage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
    const [summary, setSummary] = useState<FinancialSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [dateFilter, setDateFilter] = useState<string>('all');
    const [showAddTransaction, setShowAddTransaction] = useState(false);
    const [showTransactionDetails, setShowTransactionDetails] = useState<string | null>(null);
    const [transactionForm, setTransactionForm] = useState({
        type: 'INCOME',
        amount: '',
        description: '',
        orderId: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        filterTransactions();
    }, [transactions, searchTerm, typeFilter, statusFilter, dateFilter]);

    async function fetchData() {
        try {
            setLoading(true);
            // Fetch transactions and summary data
            const [transactionsData, summaryData] = await Promise.all([
                api("/finance/transactions"),
                api("/finance/summary")
            ]);
            setTransactions(transactionsData || []);
            setSummary(summaryData || {
                totalRevenue: 0,
                totalExpenses: 0,
                netProfit: 0,
                pendingPayments: 0,
                thisMonth: { revenue: 0, expenses: 0, profit: 0 },
                lastMonth: { revenue: 0, expenses: 0, profit: 0 }
            });
        } catch (error) {
            console.error('Error fetching finance data:', error);
            // Set default data if API fails
            setTransactions([]);
            setSummary({
                totalRevenue: 0,
                totalExpenses: 0,
                netProfit: 0,
                pendingPayments: 0,
                thisMonth: { revenue: 0, expenses: 0, profit: 0 },
                lastMonth: { revenue: 0, expenses: 0, profit: 0 }
            });
        } finally {
            setLoading(false);
        }
    }

    function filterTransactions() {
        let filtered = transactions.filter(transaction => {
            const matchesSearch = 
                transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                transaction.order?.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                transaction.id.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesType = !typeFilter || transaction.type === typeFilter;
            const matchesStatus = !statusFilter || transaction.status === statusFilter;
            
            let matchesDate = true;
            if (dateFilter === 'today') {
                const today = new Date().toDateString();
                matchesDate = new Date(transaction.createdAt).toDateString() === today;
            } else if (dateFilter === 'this-week') {
                const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                matchesDate = new Date(transaction.createdAt) >= weekAgo;
            } else if (dateFilter === 'this-month') {
                const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                matchesDate = new Date(transaction.createdAt) >= monthAgo;
            }
            
            return matchesSearch && matchesType && matchesStatus && matchesDate;
        });
        
        setFilteredTransactions(filtered);
    }

    async function createTransaction(e: any) {
        e.preventDefault();
        try {
            const transactionData = {
                type: transactionForm.type,
                amountCents: Math.round(parseFloat(transactionForm.amount) * 100),
                description: transactionForm.description,
                orderId: transactionForm.orderId || undefined
            };
            
            // This would typically create a transaction via API
            console.log('Creating transaction:', transactionData);
            
            // Add to local state for immediate UI update
            const newTransaction: Transaction = {
                id: `txn_${Date.now()}`,
                type: transactionData.type as 'INCOME' | 'EXPENSE' | 'REFUND' | 'FEE',
                amountCents: transactionData.amountCents,
                description: transactionData.description,
                orderId: transactionData.orderId,
                status: 'COMPLETED',
                createdAt: new Date().toISOString(),
                processedAt: new Date().toISOString()
            };
            
            setTransactions(prev => [newTransaction, ...prev]);
            setShowAddTransaction(false);
            setTransactionForm({ type: 'INCOME', amount: '', description: '', orderId: '' });
            
            // Refresh summary data
            await fetchData();
        } catch (error) {
            console.error('Error creating transaction:', error);
        }
    }

    async function processPayment(orderId: string) {
        try {
            // This would integrate with Stripe to process payment
            console.log('Processing payment for order:', orderId);
            
            // Simulate payment processing
            const paymentTransaction: Transaction = {
                id: `pay_${Date.now()}`,
                type: 'INCOME',
                amountCents: 2500, // Example amount
                description: 'Payment processed via Stripe',
                orderId,
                status: 'COMPLETED',
                createdAt: new Date().toISOString(),
                processedAt: new Date().toISOString(),
                stripePaymentIntentId: `pi_${Math.random().toString(36).substr(2, 9)}`
            };
            
            setTransactions(prev => [paymentTransaction, ...prev]);
            await fetchData();
        } catch (error) {
            console.error('Error processing payment:', error);
        }
    }

    function formatCurrency(cents: number) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(cents / 100);
    }

    const typeOptions = [
        { value: '', label: 'All Types' },
        { value: 'INCOME', label: 'Income' },
        { value: 'EXPENSE', label: 'Expense' },
        { value: 'REFUND', label: 'Refund' },
        { value: 'FEE', label: 'Fee' }
    ];

    const statusOptions = [
        { value: '', label: 'All Statuses' },
        { value: 'PENDING', label: 'Pending' },
        { value: 'COMPLETED', label: 'Completed' },
        { value: 'FAILED', label: 'Failed' },
        { value: 'CANCELLED', label: 'Cancelled' }
    ];

    const dateOptions = [
        { value: 'all', label: 'All Time' },
        { value: 'today', label: 'Today' },
        { value: 'this-week', label: 'This Week' },
        { value: 'this-month', label: 'This Month' }
    ];

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="text-2xl font-bold">Finance</div>
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
                    <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
                    <p className="text-gray-600">Track income, expenses, and manage payments</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowAddTransaction(true)}>
                        Add Transaction
                    </Button>
                    <Button onClick={() => window.open('https://dashboard.stripe.com', '_blank')}>
                        Stripe Dashboard
                    </Button>
                </div>
            </div>

            {/* Financial Summary Cards */}
            <div className="grid md:grid-cols-4 gap-4">
                <Card className="bg-white border border-gray-200 shadow-sm">
                    <CardContent className="p-6">
                        <div className="text-sm text-gray-600 font-medium">Total Revenue</div>
                        <div className="text-2xl font-bold text-gray-900">
                            {formatCurrency(summary?.totalRevenue || 0)}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white border border-gray-200 shadow-sm">
                    <CardContent className="p-6">
                        <div className="text-sm text-gray-600 font-medium">Total Expenses</div>
                        <div className="text-2xl font-bold text-gray-900">
                            {formatCurrency(summary?.totalExpenses || 0)}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white border border-gray-200 shadow-sm">
                    <CardContent className="p-6">
                        <div className="text-sm text-gray-600 font-medium">Net Profit</div>
                        <div className="text-2xl font-bold text-gray-900">
                            {formatCurrency(summary?.netProfit || 0)}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white border border-gray-200 shadow-sm">
                    <CardContent className="p-6">
                        <div className="text-sm text-gray-600 font-medium">Pending Payments</div>
                        <div className="text-2xl font-bold text-gray-900">
                            {formatCurrency(summary?.pendingPayments || 0)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Monthly Comparison */}
            <div className="grid md:grid-cols-2 gap-4">
                <Card className="bg-white border border-gray-200 shadow-sm">
                    <CardHeader>
                        <CardTitle>This Month</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Revenue:</span>
                                <span className="font-medium text-gray-900">
                                    {formatCurrency(summary?.thisMonth.revenue || 0)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Expenses:</span>
                                <span className="font-medium text-gray-900">
                                    {formatCurrency(summary?.thisMonth.expenses || 0)}
                                </span>
                            </div>
                            <div className="flex justify-between border-t border-gray-200 pt-2">
                                <span className="font-semibold text-gray-700">Profit:</span>
                                <span className="font-bold text-gray-900">
                                    {formatCurrency(summary?.thisMonth.profit || 0)}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white border border-gray-200 shadow-sm">
                    <CardHeader>
                        <CardTitle>Last Month</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Revenue:</span>
                                <span className="font-medium text-gray-900">
                                    {formatCurrency(summary?.lastMonth.revenue || 0)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Expenses:</span>
                                <span className="font-medium text-gray-900">
                                    {formatCurrency(summary?.thisMonth.expenses || 0)}
                                </span>
                            </div>
                            <div className="flex justify-between border-t border-gray-200 pt-2">
                                <span className="font-semibold text-gray-700">Profit:</span>
                                <span className="font-bold text-gray-900">
                                    {formatCurrency(summary?.thisMonth.profit || 0)}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search and Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex gap-4 items-center flex-wrap">
                        <div className="flex-1 min-w-64">
                            <Input
                                placeholder="Search transactions by description, customer, or ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Select 
                            value={typeFilter} 
                            onChange={(e) => setTypeFilter(e.target.value)}
                        >
                            {typeOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </Select>
                        <Select 
                            value={statusFilter} 
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            {statusOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </Select>
                        <Select 
                            value={dateFilter} 
                            onChange={(e) => setDateFilter(e.target.value)}
                        >
                            {dateOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Transactions Table */}
            <Card>
                <CardHeader>
                    <CardTitle>
                        {filteredTransactions.length} transactions
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50">
                                    <th className="text-left p-3 font-medium">Type</th>
                                    <th className="text-left p-3 font-medium">Amount</th>
                                    <th className="text-left p-3 font-medium">Description</th>
                                    <th className="text-left p-3 font-medium">Order</th>
                                    <th className="text-left p-3 font-medium">Status</th>
                                    <th className="text-left p-3 font-medium">Date</th>
                                    <th className="text-right p-3 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.map((transaction) => (
                                    <tr key={transaction.id} className="border-b border-gray-200 hover:bg-gray-50">
                                        <td className="p-3">
                                            <Badge className={
                                                transaction.type === 'INCOME' ? 'bg-green-100 text-green-800' :
                                                transaction.type === 'EXPENSE' ? 'bg-red-100 text-red-800' :
                                                transaction.type === 'REFUND' ? 'bg-blue-100 text-blue-800' :
                                                'bg-gray-100 text-gray-800'
                                            }>
                                                {transaction.type}
                                            </Badge>
                                        </td>
                                        <td className="p-3 font-medium">
                                            <span className={
                                                transaction.type === 'INCOME' ? 'text-green-600' :
                                                transaction.type === 'EXPENSE' ? 'text-red-600' :
                                                'text-gray-600'
                                            }>
                                                {formatCurrency(transaction.amountCents)}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            <div className="max-w-xs truncate" title={transaction.description}>
                                                {transaction.description}
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            {transaction.order ? (
                                                <div className="text-sm">
                                                    <div className="font-medium">{transaction.order.customerName}</div>
                                                    <div className="text-gray-500">#{transaction.order.id.slice(0, 8)}</div>
                                                </div>
                                                                                         ) : (
                                                 <span className="text-gray-500">—</span>
                                             )}
                                        </td>
                                        <td className="p-3">
                                            <Badge className={
                                                transaction.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                                transaction.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                                transaction.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                                                'bg-gray-100 text-gray-800'
                                            }>
                                                {transaction.status}
                                            </Badge>
                                        </td>
                                        <td className="p-3 text-sm text-gray-600">
                                            {new Date(transaction.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="p-3 text-right">
                                            <div className="flex gap-2 justify-end">
                                                {transaction.orderId && transaction.status === 'PENDING' && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => processPayment(transaction.orderId!)}
                                                    >
                                                        Process Payment
                                                    </Button>
                                                )}
                                                <Button variant="outline" size="sm" onClick={() => setShowTransactionDetails(transaction.id)}>
                                                    View Details
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    {filteredTransactions.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            {searchTerm || typeFilter || statusFilter || dateFilter !== 'all'
                                ? 'No transactions match your filters' 
                                : 'No transactions found'
                            }
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add Transaction Modal */}
            {showAddTransaction && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-96 max-w-full">
                        <h3 className="text-lg font-semibold mb-4">Add Transaction</h3>
                        
                        <form onSubmit={createTransaction} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Type</label>
                                <Select 
                                    value={transactionForm.type} 
                                    onChange={(e) => setTransactionForm({ ...transactionForm, type: e.target.value as any })}
                                >
                                    <option value="INCOME">Income</option>
                                    <option value="EXPENSE">Expense</option>
                                    <option value="REFUND">Refund</option>
                                    <option value="FEE">Fee</option>
                                </Select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium mb-2">Amount ($)</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={transactionForm.amount}
                                    onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium mb-2">Description</label>
                                <Input
                                    placeholder="Transaction description"
                                    value={transactionForm.description}
                                    onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium mb-2">Order ID (optional)</label>
                                <Input
                                    placeholder="Order ID if related to an order"
                                    value={transactionForm.orderId}
                                    onChange={(e) => setTransactionForm({ ...transactionForm, orderId: e.target.value })}
                                />
                            </div>
                            
                            <div className="flex gap-2 mt-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowAddTransaction(false)}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-1"
                                >
                                    Add Transaction
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
