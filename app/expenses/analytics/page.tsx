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
  perSqft?: number; // Cost per square foot
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
  const [totalSqft, setTotalSqft] = useState(0);
  const [actualExpenses, setActualExpenses] = useState(0); // Expenses from database
  const [calculatedContractorCost, setCalculatedContractorCost] = useState(0); // Accrued contractor costs
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [selectedExpenseDetails, setSelectedExpenseDetails] = useState<Expense | null>(null);
  
  // Category merging feature for temporary visual grouping
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [showMergedView, setShowMergedView] = useState(false);
  
  // Exclusion filters for production cost calculation (checked by default)
  const [excludeRawMaterial, setExcludeRawMaterial] = useState(true);
  const [excludeGSTChallan, setExcludeGSTChallan] = useState(true);
  const [excludeOtherExpenses, setExcludeOtherExpenses] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [selectedYear, selectedMonth, excludeRawMaterial, excludeGSTChallan, excludeOtherExpenses]);

  async function loadAnalytics() {
    try {
      setLoading(true);
      
      // Calculate date range for selected month
      const startDate = new Date(selectedYear, selectedMonth - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];

      // Parallel API calls for better performance
      const [expensesResponse, productionResponse, linePolishResponse] = await Promise.all([
        fetch(`/api/expenses?from=${startDate}&to=${endDate}`),
        fetch(`/api/multi-cutter-reports?month=${selectedMonth}&year=${selectedYear}`),
        fetch(`/api/line-polish-reports?month=${selectedMonth}&year=${selectedYear}`)
      ]);

      const [expenses, productionData, linePolishData] = await Promise.all([
        expensesResponse.json(),
        productionResponse.json(),
        linePolishResponse.json()
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

      // Note: We'll set totalExpenses to finalExpenses after calculating accrued costs
      setExpenseCount(count);
      setAvgExpense(average);

      // Calculate excluded amounts for production cost calculation
      const rawMaterialAmount = expenses
        .filter(exp => {
          const catName = exp.expense_categories?.name || '';
          return catName.toLowerCase().includes('raw material');
        })
        .reduce((sum, exp) => sum + (exp.amount || 0), 0);
      
      const gstChallanAmount = expenses
        .filter(exp => {
          const catName = exp.expense_categories?.name || '';
          return catName.toLowerCase().includes('gst challan') || catName.toLowerCase() === 'gst challan';
        })
        .reduce((sum, exp) => sum + (exp.amount || 0), 0);
      
      const contractorPaymentAmount = expenses
        .filter(exp => {
          const catName = exp.expense_categories?.name || '';
          return catName.toLowerCase().includes('labor & wage') || 
                 catName.toLowerCase().includes('contractor payment') ||
                 catName.toLowerCase().includes('employee salary');
        })
        .reduce((sum, exp) => sum + (exp.amount || 0), 0);
      
      const otherExpensesAmount = expenses
        .filter(exp => {
          const catName = exp.expense_categories?.name || '';
          return catName.toLowerCase().includes('other expenses');
        })
        .reduce((sum, exp) => sum + (exp.amount || 0), 0);
      
      // Calculate adjusted total based on exclusions
      let adjustedTotal = total;
      if (excludeRawMaterial) adjustedTotal -= rawMaterialAmount;
      if (excludeGSTChallan) adjustedTotal -= gstChallanAmount;
      if (excludeOtherExpenses) adjustedTotal -= otherExpensesAmount;
      // Always exclude contractor cash payments (replacing with accrual)
      adjustedTotal -= contractorPaymentAmount;

      // Calculate cost per sqft from multi-cutter production data
      // Formula: (Adjusted Total Expenses + Accrued Contractor Costs) / Total Square Feet Produced
      // This updates dynamically when:
      // 1. New expenses are added/edited in Expense page
      // 2. Multi-cutter data is added/edited in Production page
      // 3. Line polish data is added/edited
      // 4. Month/Year filter is changed
      // 5. Exclusion filters are toggled
      const totalSqft = Array.isArray(productionData) 
        ? productionData.reduce((sum, report) => sum + (report.total_sqft || 0), 0)
        : 0;
      
      // Store totalSqft in state for category per SFT calculations
      setTotalSqft(totalSqft);
      
      const totalHours = Array.isArray(linePolishData)
        ? linePolishData.reduce((sum, report) => sum + (report.no_of_hours || 0), 0)
        : 0;
      
      // Calculate accrued contractor costs
      // Dinesh (multi-cutter): ₹6 per SFT
      // LinePolish: ₹250 per hour
      const dineshCost = totalSqft * 6;
      const linePolishCost = totalHours * 250;
      const accruedContractorCost = dineshCost + linePolishCost;
      
      // Add accrued contractor costs to adjusted expenses
      const finalExpenses = adjustedTotal + accruedContractorCost;
      
      // Update state with breakdown for display
      setActualExpenses(adjustedTotal);
      setCalculatedContractorCost(accruedContractorCost);
      setTotalExpenses(finalExpenses);
      
      const perSqft = totalSqft > 0 ? finalExpenses / totalSqft : 0;
      setCostPerSqft(perSqft);

      console.log(`[Cost per SFT Calculation] Month: ${selectedMonth}/${selectedYear}`);
      console.log(`  Total Expenses: ₹${total.toLocaleString()}`);
      console.log(`  Raw Material Excluded: ${excludeRawMaterial ? 'Yes' : 'No'} (₹${rawMaterialAmount.toLocaleString()})`);
      console.log(`  GST Challan Excluded: ${excludeGSTChallan ? 'Yes' : 'No'} (₹${gstChallanAmount.toLocaleString()})`);
      console.log(`  Other Expenses Excluded: ${excludeOtherExpenses ? 'Yes' : 'No'} (₹${otherExpensesAmount.toLocaleString()})`);
      console.log(`  Contractor Payments Excluded: Always (₹${contractorPaymentAmount.toLocaleString()})`);
      console.log(`  Adjusted Expenses (before accrual): ₹${adjustedTotal.toLocaleString()}`);
      console.log(`  Accrued Contractor Costs:`);
      console.log(`    - Dinesh (${totalSqft.toLocaleString()} sqft × ₹6): ₹${dineshCost.toLocaleString()}`);
      console.log(`    - LinePolish (${totalHours.toFixed(1)} hrs × ₹250): ₹${linePolishCost.toLocaleString()}`);
      console.log(`    - Total Accrued: ₹${accruedContractorCost.toLocaleString()}`);
      console.log(`  Final Production Cost: ₹${finalExpenses.toLocaleString()}`);
      console.log(`  Total SFT Produced (Multi-Cutter): ${totalSqft.toLocaleString()} sqft`);
      console.log(`  Cost per SFT: ₹${perSqft.toFixed(2)}/sqft`);
      console.log(`  Multi-Cutter Reports Found: ${Array.isArray(productionData) ? productionData.length : 0}`);
      console.log(`  Line Polish Reports Found: ${Array.isArray(linePolishData) ? linePolishData.length : 0}`);

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

      // Map regular expense categories
      const categories = Array.from(categoryMap.values())
        .map(cat => ({
          category_name: cat.name,
          category_color: cat.color,
          total_amount: cat.total,
          expense_count: cat.count,
          percentage: total > 0 ? (cat.total / total) * 100 : 0
        }));

      // Add calculated contractor costs as synthetic categories
      // These show accrued costs based on work done, not cash payments
      if (dineshCost > 0) {
        categories.push({
          category_name: `Contractor Dinesh (Calculated: ${totalSqft.toLocaleString()} sqft × ₹6)`,
          category_color: '#8B5CF6', // Purple for calculated
          total_amount: dineshCost,
          expense_count: 0, // Calculated, not actual transactions
          percentage: finalExpenses > 0 ? (dineshCost / finalExpenses) * 100 : 0
        });
      }

      if (linePolishCost > 0) {
        categories.push({
          category_name: `LinePolish (Calculated: ${totalHours.toFixed(1)} hrs × ₹250)`,
          category_color: '#06B6D4', // Cyan for calculated
          total_amount: linePolishCost,
          expense_count: 0, // Calculated, not actual transactions
          percentage: finalExpenses > 0 ? (linePolishCost / finalExpenses) * 100 : 0
        });
      }

      // Calculate per SFT cost for each category (instead of percentage)
      const sortedCategories = categories
        .map(cat => ({
          ...cat,
          percentage: finalExpenses > 0 ? (cat.total_amount / finalExpenses) * 100 : 0, // Keep for progress bar
          perSqft: totalSqft > 0 ? cat.total_amount / totalSqft : 0 // Cost per SFT
        }))
        .sort((a, b) => b.total_amount - a.total_amount);

      setCategoryData(sortedCategories);

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

  const toggleCategorySelection = (categoryName: string) => {
    setSelectedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName);
      } else {
        newSet.add(categoryName);
      }
      return newSet;
    });
  };

  const mergeSelectedCategories = () => {
    if (selectedCategories.size < 2) {
      alert('Please select at least 2 categories to merge');
      return;
    }
    setShowMergedView(true);
  };

  const clearMerge = () => {
    setSelectedCategories(new Set());
    setShowMergedView(false);
  };

  const getMergedCategory = () => {
    const selectedCats = categoryData.filter(cat => selectedCategories.has(cat.category_name));
    const totalAmount = selectedCats.reduce((sum, cat) => sum + cat.total_amount, 0);
    const totalCount = selectedCats.reduce((sum, cat) => sum + cat.expense_count, 0);
    const perSqft = totalSqft > 0 ? totalAmount / totalSqft : 0;
    const percentage = totalExpenses > 0 ? (totalAmount / totalExpenses) * 100 : 0;
    
    return {
      category_name: `Merged (${selectedCategories.size} categories)`,
      category_color: '#6366F1', // Indigo for merged
      total_amount: totalAmount,
      expense_count: totalCount,
      percentage: percentage,
      perSqft: perSqft,
      isMerged: true,
      mergedCategories: Array.from(selectedCategories)
    };
  };

  const getDisplayCategories = () => {
    if (showMergedView && selectedCategories.size >= 2) {
      const merged = getMergedCategory();
      const unselected = categoryData.filter(cat => !selectedCategories.has(cat.category_name));
      return [merged, ...unselected];
    }
    return categoryData;
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

        {/* Exclusion Filters for Production Cost */}
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Production Cost Filters</h3>
                <p className="text-xs text-gray-600 mb-3">
                  Exclude specific expense categories from production cost (Cost per SFT) calculation
                </p>
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={excludeRawMaterial}
                      onChange={(e) => setExcludeRawMaterial(e.target.checked)}
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 focus:ring-2 cursor-pointer"
                    />
                    <span className="text-sm font-medium text-gray-700 group-hover:text-purple-700">
                      Exclude Raw Material Cost
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={excludeGSTChallan}
                      onChange={(e) => setExcludeGSTChallan(e.target.checked)}
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 focus:ring-2 cursor-pointer"
                    />
                    <span className="text-sm font-medium text-gray-700 group-hover:text-purple-700">
                      Exclude GST Challan
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={excludeOtherExpenses}
                      onChange={(e) => setExcludeOtherExpenses(e.target.checked)}
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 focus:ring-2 cursor-pointer"
                    />
                    <span className="text-sm font-medium text-gray-700 group-hover:text-purple-700">
                      Exclude Other expenses
                    </span>
                  </label>
                </div>
                {(excludeRawMaterial || excludeGSTChallan || excludeOtherExpenses) && (
                  <div className="mt-2 text-xs text-purple-700 font-medium">
                    ✓ Filters active - Cost per SFT reflects adjusted expenses
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600">Cash Expenses</p>
                  <h3 className="text-xl font-bold text-gray-900 mt-1">{fmt(actualExpenses)}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{expenseCount} transactions</p>
                  <p className="text-xs text-gray-500 mt-0.5">Recorded expenses only</p>
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
                <div className="w-full">
                  <p className="text-xs font-medium text-gray-600">Total with Contractors</p>
                  <h3 className="text-xl font-bold text-gray-900 mt-1">{fmt(totalExpenses)}</h3>
                  <div className="mt-1 text-xs text-gray-600 space-y-0.5">
                    <div className="flex justify-between">
                      <span>Actual expenses:</span>
                      <span className="font-medium">{fmt(actualExpenses)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-0.5">
                      <span>Contractor costs:</span>
                      <span className="font-medium text-purple-600">+{fmt(calculatedContractorCost)}</span>
                    </div>
                  </div>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 ml-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="w-full">
                  <p className="text-xs font-medium text-gray-600">Cost per SFT</p>
                  <h3 className="text-xl font-bold text-gray-900 mt-1">₹{costPerSqft.toFixed(2)}</h3>
                  <div className="mt-1 text-xs text-gray-600 space-y-0.5">
                    <div className="flex justify-between">
                      <span>Total expenses:</span>
                      <span className="font-medium">{fmt(totalExpenses)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total SFT:</span>
                      <span className="font-medium">{totalSqft.toLocaleString()} sqft</span>
                    </div>
                    <div className="flex justify-between border-t pt-0.5">
                      <span>Calculation:</span>
                      <span className="font-medium text-purple-600">{fmt(totalExpenses)} ÷ {totalSqft.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 ml-2">
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
            
            <div className="mb-3 p-2 bg-purple-50 border border-purple-200 rounded text-xs text-purple-900">
              ℹ️ Includes calculated contractor costs based on actual work done:
              <span className="font-medium"> Dinesh @ ₹6/sqft</span> and
              <span className="font-medium"> LinePolish @ ₹250/hr</span>
            </div>
            
            <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900">
              💡 <strong>Tip:</strong> Select multiple small categories using checkboxes and click "Merge View" to see them combined. Click "Clear Merge" to return to normal view.
            </div>
            
            {/* Category Merging Controls */}
            <div className="mb-3 flex items-center gap-2">
              <div className="flex-1 text-xs text-gray-600">
                {selectedCategories.size > 0 && (
                  <span className="font-medium text-indigo-600">
                    {selectedCategories.size} categor{selectedCategories.size === 1 ? 'y' : 'ies'} selected
                  </span>
                )}
                {selectedCategories.size === 0 && (
                  <span>Select categories to merge temporarily</span>
                )}
              </div>
              {selectedCategories.size >= 2 && !showMergedView && (
                <button
                  onClick={mergeSelectedCategories}
                  className="px-3 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 transition-colors"
                >
                  Merge View
                </button>
              )}
              {showMergedView && (
                <button
                  onClick={clearMerge}
                  className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors"
                >
                  Clear Merge
                </button>
              )}
            </div>
            
            <div className="space-y-2">{getDisplayCategories().map((cat, idx) => {
                const isExpanded = expandedCategory === cat.category_name;
                const isMerged = (cat as any).isMerged;
                const categoryExpenses = isMerged ? [] : getExpensesByCategory(cat.category_name);
                const isSelected = selectedCategories.has(cat.category_name);
                
                return (
                  <div key={idx} className={`border rounded-lg overflow-hidden ${
                    isSelected ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200'
                  } ${isMerged ? 'border-indigo-600 border-2 shadow-md' : ''}`}>
                    {/* Category Header - Clickable */}
                    <div className="flex items-center">
                      {/* Checkbox for selection (hidden in merged view) */}
                      {!showMergedView && !isMerged && (
                        <div className="px-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleCategorySelection(cat.category_name)}
                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                          />
                        </div>
                      )}
                      
                      <button
                        onClick={() => toggleCategoryExpand(cat.category_name)}
                        className="flex-1 p-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
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
                            {isMerged && (
                              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                                &#x25BC; Merged
                              </span>
                            )}
                            {!isMerged && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                {cat.expense_count}
                              </span>
                            )}
                            {isMerged && cat.expense_count > 0 && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                {cat.expense_count} total
                              </span>
                            )}
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
                          <p className="text-xs text-gray-500">₹{(cat as any).perSqft?.toFixed(2) || '0.00'}/sqft</p>
                        </div>
                      </div>
                      </button>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="p-3 bg-white border-t border-gray-200">
                        {/* Show merged category breakdown if it's a merged category */}
                        {isMerged && (cat as any).mergedCategories ? (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-gray-700 mb-2">Merged Categories:</p>
                            {(cat as any).mergedCategories.map((catName: string) => {
                              const originalCat = categoryData.find(c => c.category_name === catName);
                              if (!originalCat) return null;
                              return (
                                <div key={catName} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ backgroundColor: originalCat.category_color }}
                                    />
                                    <span className="text-xs text-gray-900">{catName}</span>
                                    <span className="text-xs text-gray-500">({originalCat.expense_count})</span>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs font-semibold text-gray-900">{fmt(originalCat.total_amount)}</p>
                                    <p className="text-xs text-gray-500">₹{originalCat.perSqft?.toFixed(2)}/sqft</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          /* Show expense table for regular categories */
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
                        )}
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
