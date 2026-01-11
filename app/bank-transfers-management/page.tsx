'use client';

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import { formatDisplayDate } from "@/lib/date-utils";
import { useToast } from "@/components/ui/toast";
import { 
  ArrowRightLeft,
  Plus,
  Trash2,
  Calendar
} from "lucide-react";

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const fmt = (n: number) => INR.format(n || 0);

interface BankAccount {
  id: string;
  name: string;
}

interface BankTransfer {
  id: string;
  date: string;
  from_account_id: string;
  amount: number;
  to_description: string;
  notes?: string;
  created_at: string;
  bank_accounts?: {
    name: string;
  };
}

export default function BankTransfersPage() {
  const { showToast } = useToast();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [transfers, setTransfers] = useState<BankTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [defaultAccountId, setDefaultAccountId] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    from_account_id: '',
    amount: '',
    to_description: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      
      const [accountsRes, transfersRes] = await Promise.all([
        fetch('/api/bank-accounts'),
        fetch('/api/bank-transfers')
      ]);

      const [accountsData, transfersData] = await Promise.all([
        accountsRes.json(),
        transfersRes.json()
      ]);

      setBankAccounts(accountsData);
      setTransfers(transfersData);
      
      // Find and save RAMY AC as default
      const ramyAccount = accountsData.find((acc: BankAccount) => 
        acc.name.toLowerCase().includes('ramy')
      );
      if (ramyAccount) {
        setDefaultAccountId(ramyAccount.id);
        // Set default account on initial load
        const lastTransferDate = transfersData.length > 0 
          ? transfersData[0].date 
          : new Date().toISOString().split('T')[0];
        
        setFormData({
          date: lastTransferDate,
          from_account_id: ramyAccount.id,
          amount: '',
          to_description: '',
          notes: ''
        });
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      showToast('error', 'Failed to load bank transfers data');
    } finally {
      setLoading(false);
    }
  }

  function resetFormWithDefaults() {
    // Get last transfer date or use today
    const lastTransferDate = transfers.length > 0 
      ? transfers[0].date 
      : new Date().toISOString().split('T')[0];
    
    // Reset form with defaults
    setFormData({
      date: lastTransferDate,
      from_account_id: defaultAccountId,
      amount: '',
      to_description: '',
      notes: ''
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.from_account_id || !formData.amount || !formData.to_description) {
      showToast('error', 'Please fill in all required fields');
      return;
    }

    try {
      const res = await fetch('/api/bank-transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const error = await res.json();
        showToast('error', error.error || 'Failed to save transfer');
        return;
      }

      const newTransfer = await res.json();
      setTransfers(prev => [newTransfer, ...prev]);
      
      // Clear only amount, to_description, and notes; keep date and account
      setFormData(prev => ({
        ...prev,
        amount: '',
        to_description: '',
        notes: ''
      }));
      
      showToast('success', 'Bank transfer recorded successfully!');
    } catch (error) {
      console.error('Failed to save transfer:', error);
      showToast('error', 'Failed to save transfer');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this bank transfer record?')) {
      return;
    }

    try {
      const res = await fetch(`/api/bank-transfers?id=${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        showToast('error', 'Failed to delete transfer');
        return;
      }

      setTransfers(prev => prev.filter(t => t.id !== id));
      showToast('success', 'Bank transfer deleted successfully!');
    } catch (error) {
      console.error('Failed to delete transfer:', error);
      showToast('error', 'Failed to delete transfer');
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg text-gray-600">Loading bank transfers...</p>
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
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <ArrowRightLeft className="w-8 h-8 text-purple-600" />
              Bank Transfers
            </h1>
            <p className="text-gray-600 mt-1">Track internal transfers between bank accounts</p>
            <p className="text-sm text-gray-500 mt-1">
              Note: These are NOT customer payments or expenses - only for internal tracking
            </p>
          </div>
        </div>

        {/* Add Transfer Form - Always Visible */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Record Bank Transfer</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Account <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.from_account_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, from_account_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Account</option>
                    {bankAccounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="10,000"
                    value={formData.amount ? parseFloat(formData.amount).toLocaleString('en-IN') : ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/,/g, '');
                      if (value === '' || !isNaN(Number(value))) {
                        setFormData(prev => ({ ...prev, amount: value }));
                      }
                    }}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To (Destination) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g., ICICI Bank, Savings Account, etc."
                    value={formData.to_description}
                    onChange={(e) => setFormData(prev => ({ ...prev, to_description: e.target.value }))}
                    className="w-full"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <Input
                    type="text"
                    placeholder="Additional notes..."
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={resetFormWithDefaults}>
                  Clear Form
                </Button>
                <Button type="submit">
                  Save Transfer
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Transfers List */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Transfer History</h2>
            {transfers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">From Account</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">To</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Notes</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transfers.map((transfer) => (
                      <tr key={transfer.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                          {formatDisplayDate(transfer.date)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {transfer.bank_accounts?.name || 'Unknown'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-red-600">
                          -{fmt(transfer.amount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {transfer.to_description}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {transfer.notes || '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleDelete(transfer.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <ArrowRightLeft className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium">No bank transfers recorded yet</p>
                <p className="text-gray-400 text-sm mt-2">Click "Record Transfer" to add your first transfer</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
