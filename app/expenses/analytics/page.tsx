'use client';

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AppLayout } from "@/components/AppLayout";
import { useSessionMonthYear } from "@/hooks/useSessionMonth";
import { formatDisplayDate } from "@/lib/date-utils";
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Calendar,
  PieChart,
  BarChart3,
  Activity,
  Zap,
  ChevronDown,
  ChevronUp,
  X,
  Eye,
  FileText
} from "lucide-react";

interface Expense {
  id: string;
  date: string;
  amount: number;
  description: string;
  expense_categories?: {
    name: string;
    color?: string;
  };
  bank_accounts?: {
    name: string;
  };
}

interface CategorySummary {
  category_name: string;
  category_color: string;
  total_amount: number;
  expense_count: number;
  percentage: number;
}

interface AccountSummary {
  account_name: string;
  total_spent: number;
  expense_count: number;
  percentage: number;
}

interface MonthlyTrend {
  month: string;
  total: number;
}

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const fmt = (n: number) => INR.format(n || 0);

export default function ExpenseAnalyticsPage() {
  const { selectedMonth, selectedYear, setSelectedMonth, setSelectedYear } = useSessionMonthYear('expense-analytics');
  const [loading, setLoading] = useState(true);
  const [categoryData, setCategoryData] = useState<CategorySummary[]>([]);
  const [accountData, setAccountData] = useState<AccountSummary[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrend[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [expenseCount, setExpenseCount] = useState(0);
  const [avgExpense, setAvgExpense] = useState(0);
  const [costPerSqft, setCostPerSqft] = useState(0);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [selectedExpenseDetails, setSelectedExpenseDetails] = useState<Expense | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [selectedYear, selectedMonth]);

  async function loadAnalytics() {
    try {
      setLoading(true);
      
      // Calculate date range for selected month
      const startDate = new Date(selectedYear, selectedMonth - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];

      // Parallel API calls for better performance
      const [expensesResponse, productionResponse] = await Promise.all([
        fetch(`/api/expenses?from=${startDate}&to=${endDate}`),
        fetch(`/api/line-polish-reports?month=${selectedMonth}&year=${selectedYear}`)
      ]);

      const [expenses, productionData] = await Promise.all([
        expensesResponse.json(),
        productionResponse.json()
      ]);

      if (!Array.isArray(expenses)) {
        setLoading(false);
        return;
      }

      // Store all expenses for drill-down
      setAllExpenses(expenses);

      // Calculate total and average
      const total = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
      const count = expenses.length;
      const average = count > 0 ? total / count : 0;

      setTotalExpenses(total);
      setExpenseCount(count);
      setAvgExpense(average);

      // Calculate cost per sqft from production data
      // Formula: Total Expenses / Total Square Feet Produced
      // This updates dynamically when:
      // 1. New expenses are added/edited in Expense page
      // 2. Multi-cutter data is added/edited in Production page
      // 3. Month/Year filter is changed
      const totalSqft = Array.isArray(productionData) 
        ? productionData.reduce((sum, report) => sum + (report.total_sqft || 0), 0)
        : 0;
      const perSqft = totalSqft > 0 ? total / totalSqft : 0;
      setCostPerSqft(perSqft);

      console.log(`[Cost per SFT Calculation] Month: ${selectedMonth}/${selectedYear}`);
      console.log(`  Total Expenses: ₹${total.toLocaleString()}`);
      console.log(`  Total SFT Produced: ${totalSqft.toLocaleString()} sqft`);
      console.log(`  Cost per SFT: ₹${perSqft.toFixed(2)}/sqft`);
      console.log(`  Production Reports Found: ${Array.isArray(productionData) ? productionData.length : 0}`);

      // Group by category
      const categoryMap = new Map<string, {name: string, color: string, total: number, count: number}>();
      
      expenses.forEach(exp => {
        const catName = exp.expense_categories?.name || 'Uncategorized';
        const catColor = exp.expense_categories?.color || '#6B7280';
        
        if (!categoryMap.has(catName)) {
          categoryMap.set(catName, { name: catName, color: catColor, total: 0, count: 0 });
        }
        
        const cat = categoryMap.get(catName)!;
        cat.total += exp.amount || 0;
        cat.count += 1;
      });

      const categories = Array.from(categoryMap.values())
        .map(cat => ({
          category_name: cat.name,
          category_color: cat.color,
          total_amount: cat.total,
          expense_count: cat.count,
          percentage: total > 0 ? (cat.total / total) * 100 : 0
        }))
        .sort((a, b) => b.total_amount - a.total_amount);

      setCategoryData(categories);

      // Group by account
      const accountMap = new Map<string, {name: string, total: number, count: number}>();
      
      expenses.forEach(exp => {
        const accName = exp.bank_accounts?.name || 'Unknown';
        
        if (!accountMap.has(accName)) {
          accountMap.set(accName, { name: accName, total: 0, count: 0 });
        }
        
        const acc = accountMap.get(accName)!;
        acc.total += exp.amount || 0;
        acc.count += 1;
      });

      const accounts = Array.from(accountMap.values())
        .map(acc => ({
          account_name: acc.name,
          total_spent: acc.total,
          expense_count: acc.count,
          percentage: total > 0 ? (acc.total / total) * 100 : 0
        }))
        .sort((a, b) => b.total_spent - a.total_spent);

      setAccountData(accounts);

      // Load 6-month trend in parallel
      await loadMonthlyTrend();

    } catch (error) {
      console.error("Failed to load analytics:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadMonthlyTrend() {
    try {
      const trends: MonthlyTrend[] = [];
      const requests = [];
      
      // Build all requests first
      for (let i = 5; i >= 0; i--) {
        const month = selectedMonth - i;
        const year = selectedYear + Math.floor((month - 1) / 12);
        const adjustedMonth = ((month - 1 + 12) % 12) + 1;
        
        const startDate = new Date(year, adjustedMonth - 1, 1).toISOString().split('T')[0];
        const endDate = new Date(year, adjustedMonth, 0).toISOString().split('T')[0];
        
        const monthName = new Date(year, adjustedMonth - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        requests.push({
          promise: fetch(`/api/expenses?from=${startDate}&to=${endDate}`),
          monthName
        });
      }
      
      // Execute all requests in parallel
      const responses = await Promise.all(requests.map(r => r.promise));
      const dataArrays = await Promise.all(responses.map(r => r.json()));
      
      // Process results
      requests.forEach((req, idx) => {
        const expenses = dataArrays[idx];
        const total = Array.isArray(expenses) 
          ? expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0)
          : 0;
        trends.push({ month: req.monthName, total });
      });
      
      setMonthlyTrend(trends);
    } catch (error) {
      console.error("Failed to load trend:", error);
    }
  }

  const getMaxTrendValue = () => {
    return Math.max(...monthlyTrend.map(m => m.total), 1);
  };

  const getExpensesByCategory = (categoryName: string): Expense[] => {
    return allExpenses.filter(exp => 
      (exp.expense_categories?.name || 'Uncategorized') === categoryName
    );
  };

  const toggleCategoryExpand = (categoryName: string) => {
    setExpandedCategory(prev => prev === categoryName ? null : categoryName);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Expense Analytics</h1>
            <p className="text-sm text-gray-600 mt-0.5">Comprehensive insights for your granite business</p>
          </div>
          
          {/* Month/Year Selector */}
          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({length: 12}, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({length: 5}, (_, i) => (
                <option key={i} value={new Date().getFullYear() - 2 + i}>
                  {new Date().getFullYear() - 2 + i}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600">Total Expenses</p>
                  <h3 className="text-xl font-bold text-gray-900 mt-1">{fmt(totalExpenses)}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{expenseCount} transactions</p>
                </div>
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600">Avg per Transaction</p>
                  <h3 className="text-xl font-bold text-gray-900 mt-1">{fmt(avgExpense)}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Mean value</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Activity className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600">Cost per SFT</p>
                  <h3 className="text-xl font-bold text-gray-900 mt-1">{fmt(costPerSqft)}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Production efficiency</p>
                </div>
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Zap className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600">Categories Used</p>
                  <h3 className="text-xl font-bold text-gray-900 mt-1">{categoryData.length}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Active types</p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <PieChart className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Breakdown with Expandable Details */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="w-4 h-4 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">Expense by Category</h2>
              <span className="text-xs text-gray-500">(Click to view details)</span>
            </div>
            
            <div className="space-y-2">
              {categoryData.map((cat, idx) => {
                const isExpanded = expandedCategory === cat.category_name;
                const categoryExpenses = getExpensesByCategory(cat.category_name);
                
                return (
                  <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Category Header - Clickable */}
                    <button
                      onClick={() => toggleCategoryExpand(cat.category_name)}
                      className="w-full p-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div 
                          className="w-5 h-5 rounded-full flex items-center justify-center" 
                          style={{ backgroundColor: cat.category_color }}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-3 h-3 text-white" />
                          ) : (
                            <ChevronDown className="w-3 h-3 text-white" />
                          )}
                        </div>
                        
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">{cat.category_name}</span>
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                              {cat.expense_count}
                            </span>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="mt-1.5 w-full bg-gray-200 rounded-full h-1.5">
                            <div 
                              className="h-1.5 rounded-full transition-all duration-300"
                              style={{ 
                                width: `${cat.percentage}%`,
                                backgroundColor: cat.category_color
                              }}
                            />
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-base font-bold text-gray-900">{fmt(cat.total_amount)}</p>
                          <p className="text-xs text-gray-500">{cat.percentage.toFixed(1)}%</p>
                        </div>
                      </div>
                    </button>

                    {/* Expanded Expense Table */}
                    {isExpanded && (
                      <div className="p-3 bg-white border-t border-gray-200">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700">Date</th>
                                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700">Description</th>
                                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700">Account</th>
                                <th className="text-right py-2 px-3 text-xs font-semibold text-gray-700">Amount</th>
                                <th className="text-center py-2 px-3 text-xs font-semibold text-gray-700">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {categoryExpenses.map((expense, expIdx) => (
                                <tr 
                                  key={expense.id} 
                                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                                >
                                  <td className="py-2 px-3 text-xs text-gray-700">
                                    {formatDisplayDate(expense.date)}
                                  </td>
                                  <td className="py-2 px-3 text-xs text-gray-900">
                                    {expense.description || '-'}
                                  </td>
                                  <td className="py-2 px-3 text-xs text-gray-700">
                                    {expense.bank_accounts?.name || '-'}
                                  </td>
                                  <td className="py-2 px-3 text-xs font-semibold text-right text-gray-900">
                                    {fmt(expense.amount)}
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    <button
                                      onClick={() => setSelectedExpenseDetails(expense)}
                                      className="text-blue-600 hover:text-blue-800 transition-colors"
                                      title="View details"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="bg-gray-50">
                                <td colSpan={3} className="py-2 px-3 text-xs font-semibold text-gray-700">
                                  Subtotal ({categoryExpenses.length} transactions)
                                </td>
                                <td className="py-2 px-3 text-xs font-bold text-right text-gray-900">
                                  {fmt(cat.total_amount)}
                                </td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              
              {categoryData.length === 0 && (
                <p className="text-center text-gray-500 py-6 text-sm">No expense data available for this period</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bottom Row: Account Usage & Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Account Usage */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-green-600" />
                <h2 className="text-lg font-bold text-gray-900">Payment Method Analysis</h2>
              </div>
              
              <div className="space-y-3">
                {accountData.map((acc, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">{acc.account_name}</span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                          {acc.expense_count}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{fmt(acc.total_spent)}</p>
                        <p className="text-xs text-gray-500">{acc.percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${acc.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
                
                {accountData.length === 0 && (
                  <p className="text-center text-gray-500 py-6 text-sm">No account data available</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 6-Month Trend */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                <h2 className="text-lg font-bold text-gray-900">6-Month Trend</h2>
              </div>
              
              <div className="h-48 flex items-end justify-between gap-2">
                {monthlyTrend.map((trend, idx) => {
                  const maxValue = getMaxTrendValue();
                  const heightPercent = maxValue > 0 ? (trend.total / maxValue) * 100 : 0;
                  
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full flex flex-col items-center">
                        <span className="text-xs font-semibold text-gray-900 mb-1.5">
                          {trend.total > 0 ? fmt(trend.total) : '₹0'}
                        </span>
                        <div 
                          className="w-full bg-gradient-to-t from-purple-500 to-purple-300 rounded-t-lg transition-all duration-500 hover:from-purple-600 hover:to-purple-400 cursor-pointer"
                          style={{ 
                            height: `${heightPercent}%`, 
                            minHeight: trend.total > 0 ? '10px' : '4px',
                            opacity: trend.total > 0 ? 1 : 0.3
                          }}
                          title={`${trend.month}: ${fmt(trend.total)}`}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-600 text-center">{trend.month}</span>
                    </div>
                  );
                })}
              </div>
              
              {monthlyTrend.length === 0 && (
                <p className="text-center text-gray-500 py-6 text-sm">No trend data available</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Expense Details Modal */}
      {selectedExpenseDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-900">Expense Details</h3>
              </div>
              <button
                onClick={() => setSelectedExpenseDetails(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-3">
              <div>
                <p className="text-xs text-gray-600">Date</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">
                  {formatDisplayDate(selectedExpenseDetails.date)}
                </p>
              </div>
              
              <div>
                <p className="text-xs text-gray-600">Category</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: selectedExpenseDetails.expense_categories?.color || '#6B7280' }}
                  />
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedExpenseDetails.expense_categories?.name || 'Uncategorized'}
                  </p>
                </div>
              </div>
              
              <div>
                <p className="text-xs text-gray-600">Amount</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">
                  {fmt(selectedExpenseDetails.amount)}
                </p>
              </div>
              
              <div>
                <p className="text-xs text-gray-600">Payment Account</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">
                  {selectedExpenseDetails.bank_accounts?.name || 'Not specified'}
                </p>
              </div>
              
              <div>
                <p className="text-xs text-gray-600">Description</p>
                <p className="text-sm text-gray-900 mt-0.5">
                  {selectedExpenseDetails.description || 'No description provided'}
                </p>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setSelectedExpenseDetails(null)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
