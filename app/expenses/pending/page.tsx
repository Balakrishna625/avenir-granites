'use client';

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import { formatDisplayDate } from "@/lib/date-utils";
import { useToast } from "@/components/ui/toast";
import { 
  Check, 
  X, 
  Edit2,
  Save,
  AlertCircle,
  Clock,
  DollarSign,
  Calendar,
  FileText,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface PendingExpense {
  id: string;
  message_text: string;
  image_url?: string;
  amount: number;
  description: string;
  expense_date: string;
  category_id?: string;
  account_id?: string;
  payment_method: string;
  notes?: string;
  ocr_amount?: number;
  ocr_vendor?: string;
  parsed_text_amount?: number;
  confidence_score?: number;
  has_conflict: boolean;
  conflict_details?: any;
  created_at: string;
}

interface BankAccount {
  id: string;
  name: string;
}

interface ExpenseCategory {
  id: string;
  name: string;
}

const fmt = (value: number): string => {
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

export default function PendingExpensesPage() {
  const { showToast } = useToast();
  const [pendingExpenses, setPendingExpenses] = useState<PendingExpense[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Edit form state
  const [editForm, setEditForm] = useState<{
    amount: string;
    description: string;
    expense_date: string;
    category_id: string;
    account_id: string;
    payment_method: string;
    notes: string;
  }>({
    amount: '',
    description: '',
    expense_date: '',
    category_id: '',
    account_id: '',
    payment_method: 'CASH',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pendingRes, accountsRes, categoriesRes] = await Promise.all([
        fetch('/api/expenses/pending'),
        fetch('/api/bank-accounts'),
        fetch('/api/expense-categories')
      ]);

      const [pending, accounts, categories] = await Promise.all([
        pendingRes.json(),
        accountsRes.json(),
        categoriesRes.json()
      ]);

      setPendingExpenses(Array.isArray(pending) ? pending : []);
      setBankAccounts(Array.isArray(accounts) ? accounts : []);
      setExpenseCategories(Array.isArray(categories) ? categories : []);
    } catch (error) {
      console.error("Failed to load data:", error);
      showToast('error', 'Failed to load pending expenses');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (expense: PendingExpense) => {
    setEditingId(expense.id);
    setEditForm({
      amount: expense.amount.toString(),
      description: expense.description,
      expense_date: expense.expense_date,
      category_id: expense.category_id || '',
      account_id: expense.account_id || '',
      payment_method: expense.payment_method,
      notes: expense.notes || ''
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({
      amount: '',
      description: '',
      expense_date: '',
      category_id: '',
      account_id: '',
      payment_method: 'CASH',
      notes: ''
    });
  };

  const saveEdit = async (id: string) => {
    try {
      const response = await fetch(`/api/expenses/pending/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(editForm.amount),
          description: editForm.description,
          expense_date: editForm.expense_date,
          category_id: editForm.category_id || null,
          account_id: editForm.account_id || null,
          payment_method: editForm.payment_method,
          notes: editForm.notes || null
        })
      });

      if (response.ok) {
        showToast('success', 'Changes saved');
        await loadData();
        cancelEdit();
      } else {
        const error = await response.json();
        showToast('error', error.error || 'Failed to save changes');
      }
    } catch (error) {
      console.error('Error saving:', error);
      showToast('error', 'Failed to save changes');
    }
  };

  const handleApprove = async (expense: PendingExpense) => {
    if (!expense.account_id) {
      showToast('error', 'Please select a bank account before approving');
      return;
    }

    if (!expense.category_id) {
      showToast('error', 'Please select a category before approving');
      return;
    }

    try {
      const response = await fetch(`/api/expenses/pending/${expense.id}/approve`, {
        method: 'POST'
      });

      if (response.ok) {
        showToast('success', 'Expense approved and added!');
        await loadData();
      } else {
        const error = await response.json();
        showToast('error', error.error || 'Failed to approve expense');
      }
    } catch (error) {
      console.error('Error approving:', error);
      showToast('error', 'Failed to approve expense');
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('Are you sure you want to reject this expense?')) return;

    try {
      const response = await fetch(`/api/expenses/pending/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showToast('success', 'Expense rejected');
        await loadData();
      } else {
        showToast('error', 'Failed to reject expense');
      }
    } catch (error) {
      console.error('Error rejecting:', error);
      showToast('error', 'Failed to reject expense');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading pending expenses...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pending Approvals</h1>
            <p className="text-gray-600 mt-1">Review and approve expenses from WhatsApp</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-orange-100 rounded-lg">
            <Clock className="w-5 h-5 text-orange-600" />
            <span className="font-semibold text-orange-900">{pendingExpenses.length} Pending</span>
          </div>
        </div>

        {/* Empty State */}
        {pendingExpenses.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">All Clear!</h3>
              <p className="text-gray-600">No pending expenses to review.</p>
            </CardContent>
          </Card>
        )}

        {/* Pending Expenses List */}
        <div className="space-y-4">
          {pendingExpenses.map((expense) => {
            const isEditing = editingId === expense.id;
            const isExpanded = expandedId === expense.id;
            const categoryName = expenseCategories.find(c => c.id === expense.category_id)?.name || 'Not set';
            const accountName = bankAccounts.find(a => a.id === expense.account_id)?.name || 'Not set';

            return (
              <Card key={expense.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Header Section */}
                  <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-green-600" />
                        <span className="text-2xl font-bold text-gray-900">{fmt(expense.amount)}</span>
                      </div>
                      <div className="h-8 w-px bg-gray-300" />
                      <div>
                        <div className="font-medium text-gray-900">{expense.description}</div>
                        <div className="text-sm text-gray-500 flex items-center gap-2">
                          <Calendar className="w-3 h-3" />
                          {formatDisplayDate(expense.expense_date)}
                        </div>
                      </div>
                      {expense.has_conflict && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                          <AlertCircle className="w-3 h-3" />
                          Conflict
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleExpand(expense.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="p-4 space-y-4 bg-blue-50">
                      {/* Original Message */}
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-1 block">Original Message</label>
                        <div className="p-3 bg-white rounded border text-sm text-gray-700 italic">
                          "{expense.message_text}"
                        </div>
                      </div>

                      {/* Conflict Details */}
                      {expense.has_conflict && expense.conflict_details && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="w-4 h-4 text-yellow-600" />
                            <span className="text-sm font-medium text-yellow-900">Amount Mismatch Detected</span>
                          </div>
                          <div className="text-sm text-gray-700 space-y-1">
                            {expense.ocr_amount && (
                              <div>Receipt image: {fmt(expense.ocr_amount)}</div>
                            )}
                            {expense.parsed_text_amount && (
                              <div>Text caption: {fmt(expense.parsed_text_amount)}</div>
                            )}
                            <div className="font-medium">Current: {fmt(expense.amount)}</div>
                          </div>
                        </div>
                      )}

                      {/* Receipt Image */}
                      {expense.image_url && (
                        <div>
                          <label className="text-xs font-medium text-gray-700 mb-1 block">Receipt Image</label>
                          <img 
                            src={expense.image_url} 
                            alt="Receipt" 
                            className="max-w-xs rounded border cursor-pointer hover:opacity-90"
                            onClick={() => window.open(expense.image_url, '_blank')}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Edit Form or Details */}
                  <div className="p-4">
                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                            <Input
                              type="number"
                              step="0.01"
                              value={editForm.amount}
                              onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                            <Input
                              type="date"
                              value={editForm.expense_date}
                              onChange={(e) => setEditForm({ ...editForm, expense_date: e.target.value })}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                          <Input
                            type="text"
                            value={editForm.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                            <select
                              value={editForm.category_id}
                              onChange={(e) => setEditForm({ ...editForm, category_id: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select Category</option>
                              {expenseCategories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account *</label>
                            <select
                              value={editForm.account_id}
                              onChange={(e) => setEditForm({ ...editForm, account_id: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select Account</option>
                              {bankAccounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                            <select
                              value={editForm.payment_method}
                              onChange={(e) => setEditForm({ ...editForm, payment_method: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="CASH">Cash</option>
                              <option value="UPI">UPI</option>
                              <option value="BANK_TRANSFER">Bank Transfer</option>
                              <option value="CHEQUE">Cheque</option>
                              <option value="RTGS">RTGS</option>
                              <option value="CREDIT_CARD">Credit Card</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                            <Input
                              type="text"
                              value={editForm.notes}
                              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                              placeholder="Optional notes"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button onClick={() => saveEdit(expense.id)} className="flex items-center gap-2">
                            <Save className="w-4 h-4" />
                            Save Changes
                          </Button>
                          <Button variant="outline" onClick={cancelEdit}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Category:</span>
                            <span className={`ml-2 font-medium ${!expense.category_id ? 'text-red-600' : 'text-gray-900'}`}>
                              {categoryName}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Account:</span>
                            <span className={`ml-2 font-medium ${!expense.account_id ? 'text-red-600' : 'text-gray-900'}`}>
                              {accountName}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Payment:</span>
                            <span className="ml-2 font-medium text-gray-900">{expense.payment_method}</span>
                          </div>
                          {expense.notes && (
                            <div className="col-span-2">
                              <span className="text-gray-600">Notes:</span>
                              <span className="ml-2 text-gray-900">{expense.notes}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 pt-2 border-t">
                          <Button
                            onClick={() => startEdit(expense)}
                            variant="outline"
                            className="flex items-center gap-2"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </Button>
                          <Button
                            onClick={() => handleApprove(expense)}
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                          >
                            <Check className="w-4 h-4" />
                            Approve & Add to Expenses
                          </Button>
                          <Button
                            onClick={() => handleReject(expense.id)}
                            variant="outline"
                            className="flex items-center gap-2 text-red-600 border-red-600 hover:bg-red-50"
                          >
                            <X className="w-4 h-4" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
