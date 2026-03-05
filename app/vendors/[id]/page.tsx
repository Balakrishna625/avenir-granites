'use client';

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import { formatDisplayDate } from "@/lib/date-utils";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { 
  Plus,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  X,
  ShoppingCart,
  Wallet,
  Edit2,
  Trash2
} from "lucide-react";

const INR = new Intl.NumberFormat("en-IN", { 
  style: "currency", 
  currency: "INR", 
  maximumFractionDigits: 0 
});
const fmt = (n: number) => INR.format(n || 0);

interface Vendor {
  id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  vendor_code?: string;
}

interface Transaction {
  id: string;
  date: string;
  type: 'purchase' | 'payment';
  amount: number;
  notes?: string;
  created_at: string;
}

export default function VendorDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [transactionType, setTransactionType] = useState<'purchase' | 'payment'>('purchase');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditTransactionModal, setShowEditTransactionModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [createPendingExpense, setCreatePendingExpense] = useState(true);
  
  const [newTransaction, setNewTransaction] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    notes: ''
  });

  const [editVendor, setEditVendor] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: ''
  });

  useEffect(() => {
    loadVendorData();
  }, [params.id]);

  async function loadVendorData() {
    try {
      setLoading(true);
      
      const [vendorsRes, transactionsRes] = await Promise.all([
        fetch('/api/vendors'),
        fetch(`/api/vendor-transactions?vendor_id=${params.id}`)
      ]);

      if (!vendorsRes.ok || !transactionsRes.ok) {
        throw new Error('Failed to load vendor data');
      }

      const vendorsData = await vendorsRes.json();
      const transactionsData = await transactionsRes.json();

      const vendorData = vendorsData.find((v: any) => v.id === params.id);
      setVendor(vendorData);
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Failed to load vendor data:', error);
      showToast('error', 'Failed to load vendor data');
    } finally {
      setLoading(false);
    }
  }

  const handleAddTransaction = async () => {
    if (!newTransaction.amount || parseFloat(newTransaction.amount) <= 0) {
      showToast('error', 'Amount must be greater than 0');
      return;
    }

    try {
      const response = await fetch('/api/vendor-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: params.id,
          date: newTransaction.date,
          type: transactionType,
          amount: parseFloat(newTransaction.amount),
          notes: newTransaction.notes,
          createExpense: transactionType === 'purchase' ? createPendingExpense : false
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add transaction');
      }

      showToast('success', `${transactionType === 'purchase' ? 'Purchase' : 'Payment'} added successfully`);
      setShowAddModal(false);
      setNewTransaction({ date: new Date().toISOString().split('T')[0], amount: '', notes: '' });
      setCreatePendingExpense(true);
      await loadVendorData();
    } catch (error: any) {
      console.error('Failed to add transaction:', error);
      showToast('error', error.message || 'Failed to add transaction');
    }
  };

  const openEditModal = () => {
    if (!vendor) return;
    setEditVendor({
      name: vendor.name,
      contact_person: vendor.contact_person || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      address: vendor.address || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateVendor = async () => {
    if (!editVendor.name.trim()) {
      showToast('error', 'Vendor name is required');
      return;
    }

    try {
      const response = await fetch(`/api/vendors/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editVendor)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update vendor');
      }

      showToast('success', 'Vendor updated successfully');
      setShowEditModal(false);
      await loadVendorData();
    } catch (error: any) {
      console.error('Failed to update vendor:', error);
      showToast('error', error.message || 'Failed to update vendor');
    }
  };

  const handleEditTransaction = async () => {
    if (!editingTransaction) return;
    
    if (!editingTransaction.amount || parseFloat(editingTransaction.amount.toString()) <= 0) {
      showToast('error', 'Amount must be greater than 0');
      return;
    }

    try {
      const response = await fetch('/api/vendor-transactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTransaction.id,
          date: editingTransaction.date,
          type: editingTransaction.type,
          amount: parseFloat(editingTransaction.amount.toString()),
          notes: editingTransaction.notes
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update transaction');
      }

      showToast('success', 'Transaction updated successfully');
      setShowEditTransactionModal(false);
      setEditingTransaction(null);
      await loadVendorData();
    } catch (error: any) {
      console.error('Failed to update transaction:', error);
      showToast('error', error.message || 'Failed to update transaction');
    }
  };

  const handleDeleteTransaction = async (transaction: Transaction) => {
    if (!confirm(`Are you sure you want to delete this ${transaction.type}?\n\nAmount: ${fmt(transaction.amount)}\nDate: ${formatDisplayDate(transaction.date)}\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/vendor-transactions?id=${transaction.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete transaction');
      }

      showToast('success', 'Transaction deleted successfully');
      await loadVendorData();
    } catch (error: any) {
      console.error('Failed to delete transaction:', error);
      showToast('error', error.message || 'Failed to delete transaction');
    }
  };

  // Calculate running balance
  const transactionsWithBalance = transactions.map((t, index) => {
    const previousTransactions = transactions.slice(index + 1);
    const balance = previousTransactions.reduce((sum, prev) => {
      return prev.type === 'purchase' ? sum + prev.amount : sum - prev.amount;
    }, 0);
    
    const currentBalance = t.type === 'purchase' ? balance + t.amount : balance - t.amount;
    
    return { ...t, runningBalance: currentBalance };
  }).reverse();

  const totalPurchases = transactions
    .filter(t => t.type === 'purchase')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalPayments = transactions
    .filter(t => t.type === 'payment')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const currentBalance = totalPurchases - totalPayments;

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg text-gray-600">Loading vendor details...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!vendor) {
    return (
      <AppLayout>
        <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-gray-600">Vendor not found</p>
            <Button onClick={() => router.push('/vendors')} className="mt-4">
              Back to Vendors
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen w-full bg-gray-50 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.push('/vendors')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{vendor.name}</h1>
              <p className="text-gray-600 mt-1">{vendor.vendor_code || 'Vendor Details'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={openEditModal}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Edit Vendor
            </Button>
            <Button 
              onClick={() => {
                setTransactionType('purchase');
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700"
            >
              <ShoppingCart className="w-4 h-4" />
              Add Purchase
            </Button>
            <Button 
              onClick={() => {
                setTransactionType('payment');
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <Wallet className="w-4 h-4" />
              Add Payment
            </Button>
          </div>
        </div>

        {/* Vendor Info Card */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-gray-600">Contact Person</p>
                <p className="text-lg font-medium text-gray-900">{vendor.contact_person || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="text-lg font-medium text-gray-900">{vendor.phone || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="text-lg font-medium text-gray-900">{vendor.email || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Address</p>
                <p className="text-lg font-medium text-gray-900">{vendor.address || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Purchases</p>
                  <p className="text-2xl font-bold text-orange-600">{fmt(totalPurchases)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {transactions.filter(t => t.type === 'purchase').length} transactions
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Payments</p>
                  <p className="text-2xl font-bold text-green-600">{fmt(totalPayments)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {transactions.filter(t => t.type === 'payment').length} transactions
                  </p>
                </div>
                <TrendingDown className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Balance Due</p>
                  <p className={`text-2xl font-bold ${
                    currentBalance > 0 ? 'text-red-600' : 
                    currentBalance < 0 ? 'text-green-600' : 
                    'text-gray-600'
                  }`}>
                    {fmt(currentBalance)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {currentBalance > 0 ? 'We owe' : currentBalance < 0 ? 'Overpaid' : 'Settled'}
                  </p>
                </div>
                <DollarSign className={`w-8 h-8 ${
                  currentBalance > 0 ? 'text-red-600' : 
                  currentBalance < 0 ? 'text-green-600' : 
                  'text-gray-600'
                }`} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions Table */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Transaction History</h2>
            
            {transactions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Notes</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Purchase</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Payment</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Balance</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactionsWithBalance.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-900 whitespace-nowrap">
                          {formatDisplayDate(transaction.date)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            transaction.type === 'purchase' 
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {transaction.type === 'purchase' ? (
                              <><ShoppingCart className="w-3 h-3" />Purchase</>
                            ) : (
                              <><Wallet className="w-3 h-3" />Payment</>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-sm">
                          {transaction.notes || '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-orange-600">
                          {transaction.type === 'purchase' ? fmt(transaction.amount) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-green-600">
                          {transaction.type === 'payment' ? fmt(transaction.amount) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-bold ${
                            transaction.runningBalance > 0 ? 'text-red-600' : 
                            transaction.runningBalance < 0 ? 'text-green-600' : 
                            'text-gray-600'
                          }`}>
                            {fmt(transaction.runningBalance)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              onClick={() => {
                                setEditingTransaction(transaction);
                                setShowEditTransactionModal(true);
                              }}
                              variant="outline"
                              size="sm"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              onClick={() => handleDeleteTransaction(transaction)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium">No transactions yet</p>
                <p className="text-gray-400 text-sm mt-2">Add a purchase or payment to get started</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Transaction Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  Add {transactionType === 'purchase' ? 'Purchase' : 'Payment'}
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <Input
                    type="date"
                    value={newTransaction.date}
                    onChange={(e) => setNewTransaction({...newTransaction, date: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (₹) *
                  </label>
                  <Input
                    type="text"
                    value={newTransaction.amount ? parseFloat(newTransaction.amount.replace(/,/g, '')).toLocaleString('en-IN') : ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/,/g, '');
                      if (value === '' || !isNaN(parseFloat(value))) {
                        setNewTransaction({...newTransaction, amount: value});
                      }
                    }}
                    placeholder="Enter amount"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={newTransaction.notes}
                    onChange={(e) => setNewTransaction({...newTransaction, notes: e.target.value})}
                    placeholder={transactionType === 'purchase' ? 'e.g., Purchased 50 granite slabs' : 'e.g., RTGS payment reference'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                </div>

                {transactionType === 'purchase' && (
                  <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg border border-orange-100">
                    <input
                      type="checkbox"
                      id="createExpense"
                      checked={createPendingExpense}
                      onChange={(e) => setCreatePendingExpense(e.target.checked)}
                      className="w-4 h-4 accent-orange-600"
                    />
                    <label htmlFor="createExpense" className="text-sm text-gray-700 cursor-pointer">
                      Create pending expense <span className="text-gray-400">(Raw Materials · Counter · On Credit)</span>
                    </label>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleAddTransaction}
                    variant="default"
                    className={`flex-1 ${
                      transactionType === 'purchase' 
                        ? 'bg-orange-600 hover:bg-orange-700' 
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    Add {transactionType === 'purchase' ? 'Purchase' : 'Payment'}
                  </Button>
                  <Button
                    onClick={() => { setShowAddModal(false); setCreatePendingExpense(true); }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Vendor Modal */}
        {showEditModal && vendor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Edit Vendor Details</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor Name *
                  </label>
                  <Input
                    value={editVendor.name}
                    onChange={(e) => setEditVendor({...editVendor, name: e.target.value})}
                    placeholder="Enter vendor name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person
                  </label>
                  <Input
                    value={editVendor.contact_person}
                    onChange={(e) => setEditVendor({...editVendor, contact_person: e.target.value})}
                    placeholder="Enter contact person name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <Input
                    value={editVendor.phone}
                    onChange={(e) => setEditVendor({...editVendor, phone: e.target.value})}
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={editVendor.email}
                    onChange={(e) => setEditVendor({...editVendor, email: e.target.value})}
                    placeholder="Enter email address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <textarea
                    value={editVendor.address}
                    onChange={(e) => setEditVendor({...editVendor, address: e.target.value})}
                    placeholder="Enter address"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleUpdateVendor}
                    variant="default"
                    className="flex-1"
                  >
                    Save Changes
                  </Button>
                  <Button
                    onClick={() => setShowEditModal(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Transaction Modal */}
        {showEditTransactionModal && editingTransaction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  Edit {editingTransaction.type === 'purchase' ? 'Purchase' : 'Payment'}
                </h3>
                <button
                  onClick={() => {
                    setShowEditTransactionModal(false);
                    setEditingTransaction(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <Input
                    type="date"
                    value={editingTransaction.date}
                    onChange={(e) => setEditingTransaction({...editingTransaction, date: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (₹) *
                  </label>
                  <Input
                    type="text"
                    value={editingTransaction.amount ? editingTransaction.amount.toLocaleString('en-IN') : ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/,/g, '');
                      if (value === '' || !isNaN(parseFloat(value))) {
                        setEditingTransaction({...editingTransaction, amount: parseFloat(value) || 0});
                      }
                    }}
                    placeholder="Enter amount"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={editingTransaction.notes || ''}
                    onChange={(e) => setEditingTransaction({...editingTransaction, notes: e.target.value})}
                    placeholder={editingTransaction.type === 'purchase' ? 'e.g., Purchased 50 granite slabs' : 'e.g., RTGS payment reference'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleEditTransaction}
                    variant="default"
                    className={`flex-1 ${
                      editingTransaction.type === 'purchase' 
                        ? 'bg-orange-600 hover:bg-orange-700' 
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    Update {editingTransaction.type === 'purchase' ? 'Purchase' : 'Payment'}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowEditTransactionModal(false);
                      setEditingTransaction(null);
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
