'use client';

import React, { useEffect, useState } from "react";
import { AddExpenseForm } from "@/components/AddExpenseForm";
import { useTableSort } from "@/hooks/useTableSort";
import { SortButton } from "@/components/ui/SortButton";
import { CategoryManagement } from "@/components/CategoryManagement";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import { formatDisplayDate } from "@/lib/date-utils";
import { formatCurrency, formatMonthName } from "@/lib/formatters";
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Receipt, 
  Eye, 
  Edit, 
  Trash2,
  Download,
  Building2,
  Package,
  CreditCard,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet
} from "lucide-react";

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