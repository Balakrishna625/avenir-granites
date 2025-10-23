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
  Calendar
} from "lucide-react";

interface BankAccount {
  id: string;
  name: string;
  current_balance: number;
}

interface Expense {
  id: string;
  date: string;
  account_id: string;
  amount: number;
  notes: string;
  expense_accounts: {
    name: string;
  };
}

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const fmt = (n: number) => INR.format(n || 0);

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
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

      const [expensesRes, accountsRes] = await Promise.all([
        fetch(`/api/expenses?from=${startDate}&to=${endDate}`),
        fetch("/api/expense-accounts")
      ]);

      const [expensesData, accountsData] = await Promise.all([
        expensesRes.json(),
        accountsRes.json()
      ]);

      setExpenses(expensesData);
      setAccounts(accountsData);
    } catch (error) {
      console.error("Failed to load data:", error);
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
      // Create a minimal expense entry
      const expense = {
        date: formDate,
        amount: parseFloat(formAmount),
        tax_amount: 0,
        total_amount: parseFloat(formAmount),
        account_id: formAccount,
        description: formNotes || "Expense",
        payment_method: "Bank Transfer",
        payment_status: "Paid",
        notes: formNotes
      };

      // Get a default category (we'll use the first one or create a generic one)
      const categoriesRes = await fetch("/api/expense-categories");
      const categories = await categoriesRes.json();
      
      if (categories && categories.length > 0) {
        expense.category_id = categories[0].id;
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
        expense.category_id = newCategory.id;
      }

      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expense)
      });

      if (response.ok) {
        // Update the account balance
        const account = accounts.find(a => a.id === formAccount);
        if (account) {
          await fetch("/api/expense-accounts", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: formAccount,
              current_balance: account.current_balance - parseFloat(formAmount)
            })
          });
        }

        // Reset form
        setFormDate(new Date().toISOString().split('T')[0]);
        setFormAmount("");
        setFormAccount("");
        setFormNotes("");
        setShowAddForm(false);
        
        // Reload data
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

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

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

        {/* Account Balance Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {accounts.map((account) => (
            <Card key={account.id} className="border-2">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">{account.name}</h3>
                <p className="text-3xl font-bold text-gray-900">{fmt(account.current_balance)}</p>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-sm text-gray-600">Current Balance</div>
                </div>
              </CardContent>
            </Card>
          ))}
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
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
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
                        <p className="text-sm text-gray-600">{expense.expense_accounts.name}</p>
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

interface Expense {
  id: string;
  expense_number: string;
  date: string;
  category_id: string;
  vendor_id?: string;
  account_id: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  description: string;
  invoice_number?: string;
  payment_method: string;
  payment_status: string;
  notes?: string;
  expense_categories: {
    name: string;
    color: string;
  };
  vendors?: {
    name: string;
    vendor_code: string;
  };
  expense_accounts: {
    name: string;
    account_type: string;
  };
}

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
  current_balance: number;
}

interface MonthlyFinancialSummary {
  month: string;
  monthDate: string;
  totalReceived: number;
  totalExpenses: number;
  outstandingBalance: number;
  transactionCount: number;
  expenseCount: number;
}

interface FinancialTotals {
  totalReceived: number;
  totalExpenses: number;
  totalOutstanding: number;
  totalMonths: number;
}

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const fmt = (n: number) => INR.format(n || 0);

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<MonthlyFinancialSummary[]>([]);
  const [totals, setTotals] = useState<FinancialTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedVendor, setSelectedVendor] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>(""); // For filtering expenses by month

  useEffect(() => {
    loadData();
  }, [selectedCategory, selectedAccount, dateFrom, dateTo]);

  useEffect(() => {
    loadMonthlySummary();
  }, []);

  async function loadMonthlySummary() {
    try {
      const response = await fetch("/api/expenses/monthly-summary?months=12");
      const data = await response.json();
      setMonthlySummary(data.monthlySummary || []);
      setTotals(data.totals || null);
    } catch (error) {
      console.error("Failed to load monthly summary:", error);
    }
  }

  async function loadData() {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (selectedCategory) params.set("category_id", selectedCategory);
      if (selectedAccount) params.set("account_id", selectedAccount);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);

      const [expensesRes, categoriesRes, accountsRes] = await Promise.all([
        fetch(`/api/expenses?${params.toString()}`),
        fetch("/api/expense-categories"),
        fetch("/api/expense-accounts")
      ]);

      const [expensesData, categoriesData, accountsData] = await Promise.all([
        expensesRes.json(),
        categoriesRes.json(),
        accountsRes.json()
      ]);

      setExpenses(expensesData);
      setCategories(categoriesData);
      setAccounts(accountsData);
      
      // Reload monthly summary to get latest data
      await loadMonthlySummary();
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredExpenses = expenses.filter(expense =>
    expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.expense_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.expense_categories.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (expense.vendors?.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Add sorting for expenses table
  const { sortedData: sortedExpenses, sortConfig: expensesSortConfig, requestSort: requestExpensesSort } = useTableSort(filteredExpenses);

  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.total_amount, 0);
  const monthlyExpenses = filteredExpenses
    .filter(expense => new Date(expense.date).getMonth() === new Date().getMonth())
    .reduce((sum, expense) => sum + expense.total_amount, 0);

  return (
    <AppLayout>
      {showAddForm && (
        <AddExpenseForm
          onClose={() => setShowAddForm(false)}
          onSuccess={() => loadData()}
        />
      )}
      
      {showCategoryManagement && (
        <CategoryManagement
          onClose={() => setShowCategoryManagement(false)}
          onSuccess={() => loadData()}
        />
      )}
      
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Expense Management</h1>
            <p className="text-gray-600">Track and manage all your business expenses</p>
          </div>
          <div className="flex items-center space-x-3">
            <Input
              type="date"
              placeholder="From Date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-auto"
            />
            <Input
              type="date"
              placeholder="To Date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-auto"
            />
            <Button 
              onClick={() => setShowAddForm(true)}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span>Add Expense</span>
            </Button>
          </div>
        </div>

        {/* Overall Financial Summary Cards */}
        {totals && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Received</p>
                    <p className="text-2xl font-bold text-green-700">{formatCurrency(totals.totalReceived)}</p>
                    <p className="text-xs text-gray-500 mt-1">From all transactions</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                    <p className="text-2xl font-bold text-red-700">{formatCurrency(totals.totalExpenses)}</p>
                    <p className="text-xs text-gray-500 mt-1">{filteredExpenses.length} records</p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <TrendingDown className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Outstanding Balance</p>
                    <p className={`text-2xl font-bold ${totals.totalOutstanding >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                      {formatCurrency(totals.totalOutstanding)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Received - Expenses</p>
                  </div>
                  <div className={`w-12 h-12 ${totals.totalOutstanding >= 0 ? 'bg-blue-100' : 'bg-red-100'} rounded-lg flex items-center justify-center`}>
                    <Wallet className={`w-6 h-6 ${totals.totalOutstanding >= 0 ? 'text-blue-600' : 'text-red-600'}`} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setShowCategoryManagement(true)}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Categories</p>
                    <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
                    <p className="text-xs text-blue-600 mt-1">Click to manage</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Month-wise Financial Tracking */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Month-wise Financial Tracking</h2>
            <p className="text-sm text-gray-600">
              Amounts received are auto-calculated from all customer transactions
            </p>
          </div>

          {monthlySummary.length === 0 ? (
            <Card>
              <CardContent className="p-12">
                <div className="text-center">
                  <Wallet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">No financial data available</p>
                  <p className="text-sm text-gray-500">Add transactions and expenses to see monthly tracking</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            monthlySummary.map((month) => {
              // Filter expenses for this specific month
              const monthExpenses = expenses.filter(expense => {
                const expenseDate = new Date(expense.date);
                const monthDate = new Date(month.monthDate);
                return expenseDate.getMonth() === monthDate.getMonth() && 
                       expenseDate.getFullYear() === monthDate.getFullYear();
              });

              return (
                <Card key={month.month} className="border-l-4 border-blue-500">
                  <CardContent className="p-6">
                    {/* Month Header */}
                    <div className="mb-4">
                      <h3 className="text-2xl font-bold text-gray-900">{formatMonthName(month.month)}</h3>
                      <p className="text-sm text-gray-600">
                        {month.transactionCount} transactions • {month.expenseCount} expenses
                      </p>
                    </div>

                    {/* Financial Summary Tiles */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-5 h-5 text-green-600" />
                          <p className="text-sm font-medium text-green-900">Total Received</p>
                        </div>
                        <p className="text-2xl font-bold text-green-700">{formatCurrency(month.totalReceived)}</p>
                        <p className="text-xs text-green-600 mt-1">From {month.transactionCount} transaction(s)</p>
                      </div>

                      <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingDown className="w-5 h-5 text-red-600" />
                          <p className="text-sm font-medium text-red-900">Total Expenses</p>
                        </div>
                        <p className="text-2xl font-bold text-red-700">{formatCurrency(month.totalExpenses)}</p>
                        <p className="text-xs text-red-600 mt-1">From {month.expenseCount} expense(s)</p>
                      </div>

                      <div className={`${month.outstandingBalance >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'} p-4 rounded-lg border`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Wallet className={`w-5 h-5 ${month.outstandingBalance >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
                          <p className={`text-sm font-medium ${month.outstandingBalance >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>
                            Outstanding Balance
                          </p>
                        </div>
                        <p className={`text-2xl font-bold ${month.outstandingBalance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                          {formatCurrency(month.outstandingBalance)}
                        </p>
                        <p className={`text-xs ${month.outstandingBalance >= 0 ? 'text-blue-600' : 'text-orange-600'} mt-1`}>
                          {month.outstandingBalance >= 0 ? 'Surplus' : 'Deficit'}
                        </p>
                      </div>
                    </div>

                    {/* Expenses List for this month */}
                    {monthExpenses.length > 0 && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-700">Expenses Details</h4>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedMonth(month.month);
                              setDateFrom(new Date(month.monthDate).toISOString().split('T')[0]);
                              const monthEnd = new Date(new Date(month.monthDate).getFullYear(), new Date(month.monthDate).getMonth() + 1, 0);
                              setDateTo(monthEnd.toISOString().split('T')[0]);
                            }}
                          >
                            View Details
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {monthExpenses.slice(0, 5).map((expense) => (
                            <div key={expense.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: expense.expense_categories.color }}
                                />
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{expense.expense_categories.name}</p>
                                  <p className="text-xs text-gray-500">{expense.description}</p>
                                </div>
                              </div>
                              <p className="text-sm font-semibold text-gray-900">{formatCurrency(expense.total_amount)}</p>
                            </div>
                          ))}
                          {monthExpenses.length > 5 && (
                            <p className="text-xs text-gray-500 text-center py-2">
                              +{monthExpenses.length - 5} more expenses
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search expenses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>

              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">All Payment Accounts</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.account_type})
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Expenses Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-xs uppercase tracking-wider">
                      <SortButton column="date" sortConfig={expensesSortConfig} onSort={requestExpensesSort} label="Expense Details" align="left" />
                    </th>
                    <th className="px-6 py-3 text-xs uppercase tracking-wider">
                      <SortButton column="expense_categories" sortConfig={expensesSortConfig} onSort={requestExpensesSort} label="Category" align="left" />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Account
                    </th>
                    <th className="px-6 py-3 text-xs uppercase tracking-wider">
                      <SortButton column="total_amount" sortConfig={expensesSortConfig} onSort={requestExpensesSort} label="Amount" align="right" />
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        Loading expenses...
                      </td>
                    </tr>
                  ) : sortedExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        No expenses found. Add your first expense to get started.
                      </td>
                    </tr>
                  ) : (
                    sortedExpenses.map((expense) => (
                      <tr key={expense.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {expense.expense_number}
                            </div>
                            <div className="text-sm text-gray-500">{expense.description}</div>
                            <div className="text-xs text-gray-400">{formatDisplayDate(expense.date)}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span 
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                            style={{ 
                              backgroundColor: expense.expense_categories.color + '20',
                              color: expense.expense_categories.color 
                            }}
                          >
                            {expense.expense_categories.name}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{expense.expense_accounts.name}</div>
                          <div className="text-xs text-gray-500">{expense.payment_method} • {expense.expense_accounts.account_type}</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {fmt(expense.total_amount)}
                          </div>
                          {expense.tax_amount > 0 && (
                            <div className="text-xs text-gray-500">
                              (Tax: {fmt(expense.tax_amount)})
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <button className="text-blue-600 hover:text-blue-900">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="text-green-600 hover:text-green-900">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button className="text-red-600 hover:text-red-900">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}