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
  notes?: string;
  description?: string;
  bank_accounts?: {
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
  const [formDate, setFormDate] = useState(() => {
    // Initialize with current month and year
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const day = String(new Date().getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
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

      console.log(`Loading expenses from ${startDate} to ${endDate}`);

      const [expensesRes, collectionsRes] = await Promise.all([
        fetch(`/api/expenses?from=${startDate}&to=${endDate}`),
        fetch(`/api/bank-accounts/balance-after-expenses?from=${startDate}&to=${endDate}`)
      ]);

      const [expensesData, collectionsData] = await Promise.all([
        expensesRes.json(),
        collectionsRes.json()
      ]);

      console.log(`Loaded ${Array.isArray(expensesData) ? expensesData.length : 0} expenses:`, expensesData);

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
        payment_method: "RTGS", // Valid values: CASH, CHEQUE, RTGS, UPI, CREDIT_CARD
        payment_status: "PAID", // Use uppercase to match database convention
        notes: formNotes
      };

      console.log('Submitting expense:', expense);

      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expense)
      });

      if (response.ok) {
        const addedExpense = await response.json();
        console.log('Expense added successfully:', addedExpense);
        
        // Reset form but keep date in current month
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        const day = String(new Date().getDate()).padStart(2, '0');
        setFormDate(`${year}-${month}-${day}`);
        setFormAmount("");
        setFormAccount("");
        setFormNotes("");
        setShowAddForm(false);
        
        // Reload data (this will show updated collections minus expenses)
        await loadData();
        
        alert('Expense added successfully!');
      } else {
        const error = await response.json();
        console.error('Failed to add expense:', error);
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
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">Bank Collections - Current Balance</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {bankCollections.map((collection) => (
              <Card key={collection.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                <CardContent className="p-3">
                  <h3 className="text-xs font-semibold text-gray-700 mb-1.5 truncate" title={collection.name}>
                    {collection.name}
                  </h3>
                  <p className="text-xl font-bold text-green-700 mb-2">{fmt(collection.currentBalance)}</p>
                  <div className="space-y-0.5 text-[10px]">
                    <div className="flex justify-between text-gray-600">
                      <span>Received:</span>
                      <span className="font-semibold text-blue-600">{fmt(collection.totalReceived)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500 ml-1">
                      <span>RTGS:</span>
                      <span className="font-medium">{fmt(collection.rtgs)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500 ml-1">
                      <span>Cash:</span>
                      <span className="font-medium">{fmt(collection.cash)}</span>
                    </div>
                    <div className="flex justify-between text-red-600 pt-0.5 border-t border-gray-200 mt-1">
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
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Total Expenses - {monthNames[selectedMonth - 1]} {selectedYear}</p>
                  <p className="text-3xl font-bold text-blue-700 mt-1">{fmt(totalExpenses)}</p>
                  <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                    {expenses.length} transaction{expenses.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="bg-white rounded-full p-3 shadow-sm">
                  <Calendar className="w-8 h-8 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Expenses Table */}
            <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
              {expenses.length === 0 ? (
                <div className="text-center py-16 bg-gray-50">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No expenses recorded for this month</p>
                  <p className="text-xs text-gray-400 mt-1">Add an expense to get started</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Account
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Amount (₹)
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {expenses.map((expense, index) => (
                        <tr 
                          key={expense.id} 
                          className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                <Calendar className="w-4 h-4 text-blue-600" />
                              </div>
                              <span className="text-sm font-medium text-gray-900">
                                {formatDisplayDate(expense.date)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900 font-medium">
                              {expense.bank_accounts?.name || 'Unknown Account'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-600">
                              {expense.notes || expense.description || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className="text-sm font-bold text-red-600">
                              {fmt(expense.amount)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteExpense(expense.id)}
                              className="text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
