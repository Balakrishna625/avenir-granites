'use client';

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AppLayout } from "@/components/AppLayout";
import { useSessionMonthYear } from "@/hooks/useSessionMonth";
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Calendar,
  PieChart,
  BarChart3,
  Activity,
  Zap
} from "lucide-react";

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
  const [topCategory, setTopCategory] = useState<string>('');

  useEffect(() => {
    loadAnalytics();
  }, [selectedYear, selectedMonth]);

  async function loadAnalytics() {
    try {
      setLoading(true);
      
      // Calculate date range for selected month
      const startDate = new Date(selectedYear, selectedMonth - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];

      // Fetch expense data
      const response = await fetch(`/api/expenses?from=${startDate}&to=${endDate}`);
      const expenses = await response.json();

      if (!Array.isArray(expenses)) {
        setLoading(false);
        return;
      }

      // Calculate total and average
      const total = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
      const count = expenses.length;
      const average = count > 0 ? total / count : 0;

      setTotalExpenses(total);
      setExpenseCount(count);
      setAvgExpense(average);

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
      setTopCategory(categories[0]?.category_name || 'N/A');

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

      // Load 6-month trend
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
      
      for (let i = 5; i >= 0; i--) {
        const month = selectedMonth - i;
        const year = selectedYear + Math.floor((month - 1) / 12);
        const adjustedMonth = ((month - 1 + 12) % 12) + 1;
        
        const startDate = new Date(year, adjustedMonth - 1, 1).toISOString().split('T')[0];
        const endDate = new Date(year, adjustedMonth, 0).toISOString().split('T')[0];
        
        const response = await fetch(`/api/expenses?from=${startDate}&to=${endDate}`);
        const expenses = await response.json();
        
        const total = Array.isArray(expenses) 
          ? expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0)
          : 0;
        
        const monthName = new Date(year, adjustedMonth - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        trends.push({ month: monthName, total });
      }
      
      setMonthlyTrend(trends);
    } catch (error) {
      console.error("Failed to load trend:", error);
    }
  }

  const getMaxTrendValue = () => {
    return Math.max(...monthlyTrend.map(m => m.total), 1);
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Expense Analytics</h1>
            <p className="text-gray-600 mt-1">Insights and trends for your expenses</p>
          </div>
          
          {/* Month/Year Selector */}
          <div className="flex items-center gap-3">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-2">{fmt(totalExpenses)}</h3>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-2">{expenseCount}</h3>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Average Expense</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-2">{fmt(avgExpense)}</h3>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Activity className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Top Category</p>
                  <h3 className="text-lg font-bold text-gray-900 mt-2">{topCategory}</h3>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Zap className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Breakdown */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <PieChart className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">Category Breakdown</h2>
              </div>
              
              <div className="space-y-4">
                {categoryData.map((cat, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: cat.category_color }}
                        />
                        <span className="text-sm font-medium text-gray-700">{cat.category_name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{fmt(cat.total_amount)}</p>
                        <p className="text-xs text-gray-500">{cat.percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${cat.percentage}%`,
                          backgroundColor: cat.category_color
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500">{cat.expense_count} transactions</p>
                  </div>
                ))}
                
                {categoryData.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No expense data available</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Account Usage */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <BarChart3 className="w-5 h-5 text-green-600" />
                <h2 className="text-xl font-bold text-gray-900">Spending by Account</h2>
              </div>
              
              <div className="space-y-4">
                {accountData.map((acc, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{acc.account_name}</span>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{fmt(acc.total_spent)}</p>
                        <p className="text-xs text-gray-500">{acc.percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${acc.percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500">{acc.expense_count} transactions</p>
                  </div>
                ))}
                
                {accountData.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No account data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 6-Month Trend */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <h2 className="text-xl font-bold text-gray-900">6-Month Expense Trend</h2>
            </div>
            
            <div className="h-64 flex items-end justify-between gap-4">
              {monthlyTrend.map((trend, idx) => {
                const maxValue = getMaxTrendValue();
                const heightPercent = maxValue > 0 ? (trend.total / maxValue) * 100 : 0;
                
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-3">
                    <div className="w-full flex flex-col items-center">
                      <span className="text-xs font-semibold text-gray-900 mb-2">{fmt(trend.total)}</span>
                      <div 
                        className="w-full bg-gradient-to-t from-blue-500 to-blue-300 rounded-t-lg transition-all duration-500 hover:from-blue-600 hover:to-blue-400"
                        style={{ height: `${heightPercent}%`, minHeight: trend.total > 0 ? '8px' : '0px' }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-600">{trend.month}</span>
                  </div>
                );
              })}
            </div>
            
            {monthlyTrend.length === 0 && (
              <p className="text-center text-gray-500 py-8">No trend data available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
