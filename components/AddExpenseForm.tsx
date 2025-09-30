'use client';

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Account {
  id: string;
  name: string;
  account_type: string;
}

interface AddExpenseFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function AddExpenseForm({ onClose, onSuccess }: AddExpenseFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Simplified form state for petty transactions
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category_id: "",
    account_id: "",
    description: "",
    amount: "",
    payment_method: "CASH",
    notes: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [categoriesRes, accountsRes] = await Promise.all([
        fetch("/api/expense-categories"),
        fetch("/api/expense-accounts")
      ]);

      const [categoriesData, accountsData] = await Promise.all([
        categoriesRes.json(),
        accountsRes.json()
      ]);

      setCategories(categoriesData);
      setAccounts(accountsData);

      // Set default account if available
      if (accountsData.length > 0) {
        setFormData(prev => ({ ...prev, account_id: accountsData[0].id }));
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.category_id || !formData.account_id || !formData.description || !formData.amount) {
      alert("Please fill in all required fields");
      return;
    }

    if (Number(formData.amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    setLoading(true);

    try {
      const expense = {
        ...formData,
        amount: Number(formData.amount),
        tax_amount: 0, // No tax for petty transactions
        total_amount: Number(formData.amount)
      };

      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expense)
      });

      if (!response.ok) {
        throw new Error("Failed to create expense");
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to create expense:", error);
      alert("Failed to create expense. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Add New Expense</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Simplified form for petty transactions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date *
              </label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount *
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                required
              >
                <option value="">Select Category</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Account *
              </label>
              <select
                value={formData.account_id}
                onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                required
              >
                <option value="">Select Account</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.account_type})
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method
              </label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="CASH">Cash</option>
                <option value="RTGS">Bank Transfer</option>
                <option value="UPI">UPI</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CREDIT_CARD">Credit Card</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <Input
              placeholder="e.g., Donation to temple, Office supplies, Petrol for vehicle..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              placeholder="Additional notes or details about this expense..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm h-20 resize-none"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? "Saving..." : "Save Expense"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}