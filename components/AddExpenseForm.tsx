'use client';

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { X, Plus, Trash2, Calculator } from "lucide-react";

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Vendor {
  id: string;
  name: string;
  vendor_code: string;
}

interface Account {
  id: string;
  name: string;
  account_type: string;
}

interface ExpenseItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

interface AddExpenseFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function AddExpenseForm({ onClose, onSuccess }: AddExpenseFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category_id: "",
    vendor_id: "",
    account_id: "",
    description: "",
    invoice_number: "",
    payment_method: "Cash",
    notes: "",
    tax_rate: 18
  });

  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([
    { description: "", quantity: 1, unit_price: 0, amount: 0 }
  ]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [categoriesRes, vendorsRes, accountsRes] = await Promise.all([
        fetch("/api/expense-categories"),
        fetch("/api/vendors"),
        fetch("/api/expense-accounts")
      ]);

      const [categoriesData, vendorsData, accountsData] = await Promise.all([
        categoriesRes.json(),
        vendorsRes.json(),
        accountsRes.json()
      ]);

      setCategories(categoriesData);
      setVendors(vendorsData);
      setAccounts(accountsData);

      // Set default account if available
      if (accountsData.length > 0) {
        setFormData(prev => ({ ...prev, account_id: accountsData[0].id }));
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    }
  }

  function updateExpenseItem(index: number, field: keyof ExpenseItem, value: string | number) {
    const newItems = [...expenseItems];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto-calculate amount for quantity and unit_price changes
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].amount = Number(newItems[index].quantity) * Number(newItems[index].unit_price);
    }
    
    setExpenseItems(newItems);
  }

  function addExpenseItem() {
    setExpenseItems([...expenseItems, { description: "", quantity: 1, unit_price: 0, amount: 0 }]);
  }

  function removeExpenseItem(index: number) {
    if (expenseItems.length > 1) {
      setExpenseItems(expenseItems.filter((_, i) => i !== index));
    }
  }

  const subtotal = expenseItems.reduce((sum, item) => sum + Number(item.amount), 0);
  const taxAmount = (subtotal * Number(formData.tax_rate)) / 100;
  const totalAmount = subtotal + taxAmount;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.category_id || !formData.account_id || !formData.description) {
      alert("Please fill in all required fields");
      return;
    }

    if (expenseItems.some(item => !item.description || item.amount <= 0)) {
      alert("Please complete all expense items");
      return;
    }

    setLoading(true);

    try {
      const expense = {
        ...formData,
        amount: subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        expense_items: expenseItems.filter(item => item.amount > 0)
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Add New Expense</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                Vendor
              </label>
              <select
                value={formData.vendor_id}
                onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Direct Purchase</option>
                {vendors.map(vendor => (
                  <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method
              </label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Cheque">Cheque</option>
                <option value="UPI">UPI</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Number
              </label>
              <Input
                type="text"
                value={formData.invoice_number}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                placeholder="INV-001"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the expense"
              required
            />
          </div>

          {/* Expense Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Expense Items</h3>
              <Button
                type="button"
                onClick={addExpenseItem}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item</span>
              </Button>
            </div>

            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {expenseItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border rounded-lg">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Item Description
                        </label>
                        <Input
                          value={item.description}
                          onChange={(e) => updateExpenseItem(index, 'description', e.target.value)}
                          placeholder="Item description"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Quantity
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => updateExpenseItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Unit Price
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateExpenseItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="flex items-end space-x-2">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Amount
                          </label>
                          <Input
                            type="number"
                            value={item.amount.toFixed(2)}
                            readOnly
                            className="bg-gray-50"
                          />
                        </div>
                        {expenseItems.length > 1 && (
                          <Button
                            type="button"
                            onClick={() => removeExpenseItem(index)}
                            className="bg-red-600 hover:bg-red-700 px-3"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tax and Total */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tax Rate (%)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.tax_rate}
                    onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subtotal
                  </label>
                  <div className="text-lg font-semibold py-2">₹{subtotal.toFixed(2)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tax Amount
                  </label>
                  <div className="text-lg font-semibold py-2">₹{taxAmount.toFixed(2)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Amount
                  </label>
                  <div className="text-xl font-bold text-blue-600 py-2">₹{totalAmount.toFixed(2)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Additional notes about this expense..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t">
            <Button
              type="button"
              onClick={onClose}
              className="bg-gray-500 hover:bg-gray-600"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <Calculator className="w-4 h-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Create Expense</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}