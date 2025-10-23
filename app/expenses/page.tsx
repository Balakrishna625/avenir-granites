'use client';

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import { formatDisplayDate } from "@/lib/date-utils";
import { 
  Plus, 
  Trash2,
  Calendar,
  DollarSign
} from "lucide-react";

interface BankCollection {
  id: string;
  name: string;
  totalReceived: number;      // Total collected from customers
  rtgs: number;               // RTGS collections
  cash: number;               // Cash collections
  totalExpenses: number;      // Total spent from this account
  currentBalance: number;     // Remaining balance (received - spent)
}

interface Expense {
  id: string;
  date: string;
  account_id: string;
  amount: number;
  notes: string;
  bank_accounts: {
    name: string;
  };
}

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const fmt = (n: number) => INR.format(n || 0);

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bankCollections, setBankCollections] = useState<BankCollection[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formAmount, setFormAmount] = useState("");
  const [formAccount, setFormAccount] = useState("");
  const [formNotes, setFormNotes] = useState("");
  
  // Month selector
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    loadData();
  }, [selectedYear, selectedMonth]);

  async function loadData() {
    try {
      setLoading(true);
      
      // Calculate date range for selected month
      const startDate = new Date(selectedYear, selectedMonth - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];

      const [expensesRes, collectionsRes] = await Promise.all([
        fetch(`/api/expenses?from=${startDate}&to=${endDate}`),
        fetch(`/api/bank-accounts/balance-after-expenses?from=${startDate}&to=${endDate}`)
      ]);

      const [expensesData, collectionsData] = await Promise.all([
        expensesRes.json(),
        collectionsRes.json()
      ]);

      setExpenses(Array.isArray(expensesData) ? expensesData : []);
      setBankCollections(Array.isArray(collectionsData) ? collectionsData : []);
    } catch (error) {
      console.error("Failed to load data:", error);
      setExpenses([]);
      setBankCollections([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formDate || !formAmount || !formAccount) {
      alert("Please fill all required fields");
      return;
    }

    try {
      // Get a default category (we'll use the first one or create a generic one)
      const categoriesRes = await fetch("/api/expense-categories");
      const categories = await categoriesRes.json();
      
      let categoryId;
      if (categories && categories.length > 0) {
        categoryId = categories[0].id;
      } else {
        // Create a default "General" category
        const newCategoryRes = await fetch("/api/expense-categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "General",
            description: "General expenses",
            color: "#6B7280"
          })
        });
        const newCategory = await newCategoryRes.json();
        categoryId = newCategory.id;
      }

      // Create expense (debited from bank_accounts, not expense_accounts)
      const expense = {
        date: formDate,
        category_id: categoryId,
        amount: parseFloat(formAmount),
        tax_amount: 0,
        total_amount: parseFloat(formAmount),
        account_id: formAccount, // This is bank_account_id
        description: formNotes || "Expense",
        payment_method: "Bank Transfer",
        payment_status: "Paid",
        notes: formNotes
      };

      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expense)
      });

      if (response.ok) {
        // Reset form
        setFormDate(new Date().toISOString().split('T')[0]);
        setFormAmount("");
        setFormAccount("");
        setFormNotes("");
        setShowAddForm(false);
        
        // Reload data (this will show updated collections minus expenses)
        await loadData();
      } else {
        const error = await response.json();
        alert(`Failed to add expense: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error adding expense:", error);
      alert("Failed to add expense");
    }
  }

  async function handleDeleteExpense(id: string) {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: "DELETE"
      });

      if (response.ok) {
        await loadData();
      }
    } catch (error) {
      console.error("Error deleting expense:", error);
    }
  }

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const totalExpenses = Array.isArray(expenses) ? expenses.reduce((sum, exp) => sum + exp.amount, 0) : 0;

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Expense Management</h1>
            <p className="text-gray-600">Track expenses and account balances</p>
          </div>
          
          {/* Month Selector */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Year:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Month:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {monthNames.map((month, index) => (
                  <option key={index} value={index + 1}>{month}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Bank Collections Tiles */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">Bank Collections - Current Balance</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bankCollections.map((collection) => (
              <Card key={collection.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">{collection.name}</h3>
                  <p className="text-2xl font-bold text-green-700 mb-2">{fmt(collection.currentBalance)}</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-gray-600">
                      <span>Received:</span>
                      <span className="font-semibold text-blue-600">{fmt(collection.totalReceived)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span className="ml-2">RTGS:</span>
                      <span className="font-medium">{fmt(collection.rtgs)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span className="ml-2">Cash:</span>
                      <span className="font-medium">{fmt(collection.cash)}</span>
                    </div>
                    <div className="flex justify-between text-red-600 pt-1 border-t">
                      <span>Expenses:</span>
                      <span className="font-semibold">-{fmt(collection.totalExpenses)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Add Expense Section */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {showAddForm ? "Add New Expense" : "Expenses"}
              </h2>
              <Button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {showAddForm ? "Cancel" : <><Plus className="w-4 h-4 mr-2" /> Add Expense</>}
              </Button>
            </div>

            {showAddForm && (
              <form onSubmit={handleAddExpense} className="bg-gray-50 p-6 rounded-lg space-y-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Debited From <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formAccount}
                      onChange={(e) => setFormAccount(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Account</option>
                      {bankCollections.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name} - Available: {fmt(acc.currentBalance)}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                    <Input
                      type="text"
                      placeholder="Enter notes"
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                    Add Expense
                  </Button>
                </div>
              </form>
            )}

            {/* Expenses Summary */}
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Expenses for {monthNames[selectedMonth - 1]} {selectedYear}</p>
                  <p className="text-2xl font-bold text-blue-700">{fmt(totalExpenses)}</p>
                </div>
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            {/* Expenses List */}
            <div className="space-y-2">
              {expenses.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No expenses for this month</p>
                </div>
              ) : (
                expenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <p className="font-semibold text-gray-900">{formatDisplayDate(expense.date)}</p>
                        <span className="text-sm text-gray-500">•</span>
                        <p className="text-sm text-gray-600">{expense.bank_accounts.name}</p>
                      </div>
                      {expense.notes && (
                        <p className="text-sm text-gray-500 mt-1">{expense.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-lg font-bold text-red-600">{fmt(expense.amount)}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteExpense(expense.id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
