'use client';

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import { formatDisplayDate } from "@/lib/date-utils";
import { useToast } from "@/components/ui/toast";
import * as XLSX from 'xlsx';
import { 
  Plus, 
  Trash2,
  Calendar,
  DollarSign,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Edit2,
  Save,
  X,
  Filter,
  Download
} from "lucide-react";

interface BankCollection {
  id: string;
  name: string;
  openingBalance: number;     // Balance carried forward from previous months
  totalReceived: number;      // Total collected from customers in current period
  rtgs: number;               // RTGS collections in current period
  cash: number;               // Cash collections in current period
  totalExpenses: number;      // Total spent from this account in current period
  currentBalance: number;     // Closing balance (opening + received - spent)
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

// Helper function to format number with Indian comma style (1,00,000)
const formatIndianNumber = (value: string): string => {
  if (!value) return '';
  
  // Remove existing commas and non-numeric characters except decimal point
  const numStr = value.replace(/[^\d.]/g, '');
  
  // Split into integer and decimal parts
  const parts = numStr.split('.');
  let intPart = parts[0];
  const decPart = parts.length > 1 ? '.' + parts[1] : '';
  
  // Apply Indian number system formatting
  if (intPart.length > 3) {
    const lastThree = intPart.slice(-3);
    const remaining = intPart.slice(0, -3);
    intPart = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  }
  
  return intPart + decPart;
};

// Helper function to remove commas for saving to database
const parseIndianNumber = (value: string): string => {
  return value.replace(/,/g, '');
};

export default function ExpensesPage() {
  const { showToast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bankCollections, setBankCollections] = useState<BankCollection[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
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

  // Sort and filter state
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc'); // asc = oldest first (default)
  const [filterAccount, setFilterAccount] = useState<string>(''); // empty = show all

  // Edit state
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{
    date: string;
    amount: string;
    account_id: string;
    notes: string;
  }>({
    date: '',
    amount: '',
    account_id: '',
    notes: ''
  });

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

      // Sort expenses by date (respects sortOrder state)
      const sortedExpenses = Array.isArray(expensesData) 
        ? expensesData.sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
          })
        : [];

      setExpenses(sortedExpenses);
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
        
        // Reload data (this will show updated collections minus expenses)
        await loadData();
        
        // Show success toast
        showToast('success', 'Expense added successfully!');
      } else {
        const error = await response.json();
        console.error('Failed to add expense:', error);
        showToast('error', `Failed to add expense: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error adding expense:", error);
      showToast('error', 'Failed to add expense');
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
        showToast('success', 'Expense deleted successfully!');
      }
    } catch (error) {
      console.error("Error deleting expense:", error);
      showToast('error', 'Failed to delete expense');
    }
  }

  function handleEditExpense(expense: Expense) {
    setEditingExpenseId(expense.id);
    setEditFormData({
      date: expense.date,
      amount: expense.amount.toString(),
      account_id: expense.account_id,
      notes: expense.notes || ''
    });
  }

  function handleCancelEdit() {
    setEditingExpenseId(null);
    setEditFormData({
      date: '',
      amount: '',
      account_id: '',
      notes: ''
    });
  }

  async function handleSaveEdit(expenseId: string) {
    try {
      // Get category_id from the existing expense
      const categoriesRes = await fetch("/api/expense-categories");
      const categories = await categoriesRes.json();
      
      let categoryId;
      if (categories && categories.length > 0) {
        categoryId = categories[0].id;
      }

      const updatedExpense = {
        date: editFormData.date,
        category_id: categoryId,
        amount: parseFloat(editFormData.amount),
        tax_amount: 0,
        total_amount: parseFloat(editFormData.amount),
        account_id: editFormData.account_id,
        description: editFormData.notes || "Expense",
        payment_method: "RTGS",
        payment_status: "PAID",
        notes: editFormData.notes
      };

      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedExpense)
      });

      if (response.ok) {
        await loadData();
        setEditingExpenseId(null);
        showToast('success', 'Expense updated successfully!');
      } else {
        const error = await response.json();
        showToast('error', `Failed to update expense: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error updating expense:", error);
      showToast('error', 'Failed to update expense');
    }
  }

  function toggleSortOrder() {
    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(newOrder);
    
    // Re-sort the existing expenses
    const sorted = [...expenses].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return newOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
    setExpenses(sorted);
  }

  // Filter expenses by account
  const filteredExpenses = filterAccount 
    ? expenses.filter(exp => exp.account_id === filterAccount)
    : expenses;

  // Export to Excel function
  function exportToExcel() {
    if (!filterAccount) {
      showToast('error', 'Please select an account to export');
      return;
    }

    // Get the selected account details
    const selectedAccount = bankCollections.find(acc => acc.id === filterAccount);
    if (!selectedAccount) {
      showToast('error', 'Account not found');
      return;
    }

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Account Summary Sheet
    const summaryData = [
      ['EXPENSE REPORT'],
      ['Account Name:', selectedAccount.name],
      ['Period:', `${monthNames[selectedMonth - 1]} ${selectedYear}`],
      [''],
      ['ACCOUNT BALANCE SUMMARY'],
      ['Opening Balance:', selectedAccount.openingBalance],
      ['Received (RTGS):', selectedAccount.rtgs],
      ['Received (Cash):', selectedAccount.cash],
      ['Total Received:', selectedAccount.totalReceived],
      ['Total Expenses:', selectedAccount.totalExpenses],
      ['Current Balance:', selectedAccount.currentBalance],
      [''],
      ['EXPENSE DETAILS']
    ];

    // Expense details headers
    const expenseHeaders = ['Date', 'Description', 'Amount'];
    summaryData.push(expenseHeaders);

    // Add expense rows
    filteredExpenses.forEach(expense => {
      summaryData.push([
        formatDisplayDate(expense.date),
        expense.notes || expense.description || '-',
        expense.amount
      ]);
    });

    // Add total row
    const totalFilteredExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    summaryData.push(['', 'TOTAL:', totalFilteredExpenses]);

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(summaryData);

    // Set column widths
    ws['!cols'] = [
      { wch: 20 },
      { wch: 40 },
      { wch: 15 }
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Expense Report');

    // Generate filename
    const filename = `${selectedAccount.name}_Expenses_${monthNames[selectedMonth - 1]}_${selectedYear}.xlsx`;

    // Save file
    XLSX.writeFile(wb, filename);

    showToast('success', 'Excel file exported successfully!');
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
                    <div className="flex justify-between text-purple-600 pb-0.5 border-b border-gray-200 mb-1">
                      <span>Opening Balance:</span>
                      <span className="font-semibold">{fmt(collection.openingBalance)}</span>
                    </div>
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
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Add New Expense</h2>
            </div>

            <form onSubmit={handleAddExpense} className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm mb-6">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-shrink-0 w-full md:w-40">
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full"
                      required
                    />
                  </div>

                  <div className="flex-shrink-0 w-full md:w-36">
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                      Amount <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="50,000"
                      value={formatIndianNumber(formAmount)}
                      onChange={(e) => setFormAmount(parseIndianNumber(e.target.value))}
                      className="w-full"
                      required
                    />
                  </div>

                  <div className="flex-shrink-0 w-full md:w-56">
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                      Debited From <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formAccount}
                      onChange={(e) => setFormAccount(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select Account</option>
                      {bankCollections.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name} - {fmt(acc.currentBalance)}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1 w-full">
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                      Notes
                    </label>
                    <Input
                      type="text"
                      placeholder="Enter description or notes"
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700 px-6">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Expense
                    </Button>
                  </div>
                </div>
              </form>

            {/* Expenses Summary */}
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Total Expenses - {monthNames[selectedMonth - 1]} {selectedYear}</p>
                  <p className="text-3xl font-bold text-blue-700 mt-1">{fmt(totalExpenses)}</p>
                  <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                    {filteredExpenses.length} transaction{filteredExpenses.length !== 1 ? 's' : ''} {filterAccount && '(filtered)'}
                  </p>
                </div>
                <div className="bg-white rounded-full p-3 shadow-sm">
                  <Calendar className="w-8 h-8 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Filter and Sort Controls */}
            <div className="mb-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-600" />
                <label className="text-sm font-medium text-gray-700">Filter by Account:</label>
                <select
                  value={filterAccount}
                  onChange={(e) => setFilterAccount(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Accounts</option>
                  {bankCollections.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                {filterAccount && (
                  <Button
                    onClick={exportToExcel}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export to Excel</span>
                  </Button>
                )}
                
                <Button
                  onClick={toggleSortOrder}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                {sortOrder === 'asc' ? (
                  <>
                    <ArrowUp className="w-4 h-4" />
                    <span>Oldest First</span>
                  </>
                ) : (
                  <>
                    <ArrowDown className="w-4 h-4" />
                    <span>Newest First</span>
                  </>
                )}
              </Button>
              </div>
            </div>

            {/* Expenses Table */}
            <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
              {filteredExpenses.length === 0 ? (
                <div className="text-center py-16 bg-gray-50">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">
                    {filterAccount ? 'No expenses for selected account' : 'No expenses recorded for this month'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {filterAccount ? 'Try selecting a different account' : 'Add an expense to get started'}
                  </p>
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
                      {filteredExpenses.map((expense, index) => {
                        const isEditing = editingExpenseId === expense.id;
                        
                        return (
                        <tr 
                          key={expense.id} 
                          className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            {isEditing ? (
                              <Input
                                type="date"
                                value={editFormData.date}
                                onChange={(e) => setEditFormData({...editFormData, date: e.target.value})}
                                className="w-full"
                              />
                            ) : (
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                <Calendar className="w-4 h-4 text-blue-600" />
                              </div>
                              <span className="text-sm font-medium text-gray-900">
                                {formatDisplayDate(expense.date)}
                              </span>
                            </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {isEditing ? (
                              <select
                                value={editFormData.account_id}
                                onChange={(e) => setEditFormData({...editFormData, account_id: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              >
                                {bankCollections.map(acc => (
                                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                                ))}
                              </select>
                            ) : (
                            <span className="text-sm text-gray-900 font-medium">
                              {expense.bank_accounts?.name || 'Unknown Account'}
                            </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {isEditing ? (
                              <Input
                                type="text"
                                value={editFormData.notes}
                                onChange={(e) => setEditFormData({...editFormData, notes: e.target.value})}
                                className="w-full"
                                placeholder="Enter notes"
                              />
                            ) : (
                            <span className="text-sm text-gray-600">
                              {expense.notes || expense.description || '-'}
                            </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            {isEditing ? (
                              <Input
                                type="text"
                                value={formatIndianNumber(editFormData.amount)}
                                onChange={(e) => setEditFormData({...editFormData, amount: parseIndianNumber(e.target.value)})}
                                className="w-full text-right"
                              />
                            ) : (
                            <span className="text-sm font-bold text-red-600">
                              {fmt(expense.amount)}
                            </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-2">
                              {isEditing ? (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSaveEdit(expense.id)}
                                    className="text-green-600 hover:bg-green-50 hover:border-green-200"
                                  >
                                    <Save className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCancelEdit}
                                    className="text-gray-600 hover:bg-gray-50"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditExpense(expense)}
                                    className="text-blue-600 hover:bg-blue-50 hover:border-blue-200"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteExpense(expense.id)}
                                    className="text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                        );
                      })}
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
