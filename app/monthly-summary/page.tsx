'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  LabelList,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown,
  Factory, 
  DollarSign, 
  Clock, 
  ShoppingBag,
  Calendar,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';

interface MonthlyData {
  month: string;
  fullMonth: string;
  multiCutterProduction: number;
  multiCutterSlabs: number;
  salesSqft: number;
  salesRevenue: number;
  workerHours: number;
}

interface Summary {
  totalMultiCutterProduction: number;
  totalMultiCutterSlabs: number;
  totalSalesSqft: number;
  totalSalesRevenue: number;
  totalWorkerHours: number;
  avgMonthlyProduction: number;
  avgMonthlySales: number;
  avgMonthlyRevenue: number;
  avgMonthlyHours: number;
}

interface CustomerSqftMonth {
  key: string;
  label: string;
}

interface CategoryAvgEntry {
  month: string;
  fullMonth: string;
  sg: number | null;
  bp: number | null;
  burgandy: number | null;
  sgSqft: number;
  bpSqft: number;
  burgundySqft: number;
}

interface ProductionCostEntry {
  month: string;
  fullMonth: string;
  costPerSqft: number | null;
  totalExpenses: number;
  adjustedExpenses: number;
  totalSqft: number;
}

interface CustomerSqftEntry {
  id: string;
  name: string;
  monthlyData: Record<string, number>;
  total: number;
  avgSqft: number;
  activeMonths: number;
}

interface CustomerSqftData {
  months: CustomerSqftMonth[];
  customers: CustomerSqftEntry[];
}

interface LiveComparison {
  currentDay: number;
  thisMonthName: string;
  lastMonthName: string;
  lastMonthDay: number;
  production: {
    thisMonth: { sqft: number; slabs: number };
    lastMonth: { sqft: number; slabs: number };
    sqftChange: number;
    slabsChange: number;
    daily: { day: number; thisMonth: number; lastMonth: number }[];
  };
  sales: {
    thisMonth: { sqft: number; revenue: number };
    lastMonth: { sqft: number; revenue: number };
    sqftChange: number;
    revenueChange: number;
    daily: { day: number; thisMonth: number; lastMonth: number }[];
  };
}

const fmt = (n: number) => (n || 0).toLocaleString('en-IN');

// Format Y-axis values in Indian style (thousands/lakhs)
const formatYAxis = (value: number) => {
  if (value >= 100000) {
    return `${(value / 100000).toFixed(1)} L`; // Lakhs
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(0)} K`; // Thousands
  }
  return value.toString();
};

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label, prefix = '', suffix = '' }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-3">
        <p className="font-semibold text-gray-900 mb-1.5 text-sm">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            <span className="font-medium">{entry.name}:</span>{' '}
            <span className="font-semibold">{prefix}{fmt(entry.value)}{suffix}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function MonthlySummaryPage() {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [liveComparison, setLiveComparison] = useState<LiveComparison | null>(null);
  const [liveLoading, setLiveLoading] = useState(true);
  const [customerSqft, setCustomerSqft] = useState<CustomerSqftData | null>(null);
  const [customerSqftLoading, setCustomerSqftLoading] = useState(true);
  const [categoryAvgData, setCategoryAvgData] = useState<CategoryAvgEntry[]>([]);
  const [categoryAvgLoading, setCategoryAvgLoading] = useState(true);
  const [productionCostData, setProductionCostData] = useState<ProductionCostEntry[]>([]);
  const [productionCostLoading, setProductionCostLoading] = useState(true);
  
  // Raw material costs per category (optional, user-defined)
  const [sgRawMaterialCost, setSgRawMaterialCost] = useState<number>(0);
  const [bpRawMaterialCost, setBpRawMaterialCost] = useState<number>(0);
  const [burgundyRawMaterialCost, setBurgundyRawMaterialCost] = useState<number>(0);

  // Default: October 2025 to current date
  const currentDate = new Date();
  
  const [fromMonth, setFromMonth] = useState("10"); // October
  const [fromYear, setFromYear] = useState("2025");
  const [toMonth, setToMonth] = useState((currentDate.getMonth() + 1).toString());
  const [toYear, setToYear] = useState(currentDate.getFullYear().toString());

  const fetchMonthlySummary = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/monthly-summary?fromMonth=${fromMonth}&fromYear=${fromYear}&toMonth=${toMonth}&toYear=${toYear}`
      );
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Received data:', data);
        setMonthlyData(data.monthlyData || []);
        setSummary(data.summary || null);
      } else {
        console.error('Failed to fetch data:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching monthly summary:', error);
    } finally {
      setLoading(false);
    }
  }, [fromMonth, fromYear, toMonth, toYear, setMonthlyData, setSummary, setLoading]);

  useEffect(() => {
    fetchMonthlySummary();
  }, [fetchMonthlySummary]);

  const fetchCategoryAvg = useCallback(async () => {
    setCategoryAvgLoading(true);
    try {
      const res = await fetch(
        `/api/monthly-summary/category-avg?fromMonth=${fromMonth}&fromYear=${fromYear}&toMonth=${toMonth}&toYear=${toYear}`
      );
      if (res.ok) {
        const data = await res.json();
        setCategoryAvgData(data);
      }
    } catch (err) {
      console.error('Error fetching category avg:', err);
    } finally {
      setCategoryAvgLoading(false);
    }
  }, [fromMonth, fromYear, toMonth, toYear]);

  useEffect(() => {
    fetchCategoryAvg();
  }, [fetchCategoryAvg]);

  const fetchProductionCost = useCallback(async () => {
    setProductionCostLoading(true);
    try {
      const res = await fetch(
        `/api/monthly-summary/production-cost?fromMonth=${fromMonth}&fromYear=${fromYear}&toMonth=${toMonth}&toYear=${toYear}`
      );
      if (res.ok) {
        const data = await res.json();
        setProductionCostData(data);
      }
    } catch (err) {
      console.error('Error fetching production cost:', err);
    } finally {
      setProductionCostLoading(false);
    }
  }, [fromMonth, fromYear, toMonth, toYear]);

  useEffect(() => {
    fetchProductionCost();
  }, [fetchProductionCost]);

  const fetchCustomerSqft = useCallback(async () => {
    setCustomerSqftLoading(true);
    try {
      const res = await fetch(
        `/api/monthly-summary/customer-sqft?fromMonth=${fromMonth}&fromYear=${fromYear}&toMonth=${toMonth}&toYear=${toYear}`
      );
      if (res.ok) {
        const data = await res.json();
        setCustomerSqft(data);
      }
    } catch (err) {
      console.error('Error fetching customer sqft:', err);
    } finally {
      setCustomerSqftLoading(false);
    }
  }, [fromMonth, fromYear, toMonth, toYear]);

  useEffect(() => {
    fetchCustomerSqft();
  }, [fetchCustomerSqft]);

  // Fetch live month-to-month comparison on mount
  useEffect(() => {
    const fetchLiveComparison = async () => {
      setLiveLoading(true);
      try {
        const res = await fetch('/api/monthly-summary/live-comparison');
        if (res.ok) {
          const data = await res.json();
          setLiveComparison(data);
        }
      } catch (err) {
        console.error('Error fetching live comparison:', err);
      } finally {
        setLiveLoading(false);
      }
    };
    fetchLiveComparison();
  }, []);

  const months = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  const years = Array.from({ length: 6 }, (_, i) => {
    const year = new Date().getFullYear() - 2 + i;
    return { value: year.toString(), label: year.toString() };
  });

  // Quick preset buttons
  const setLastThreeMonths = () => {
    const now = new Date();
    const threeAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    setFromMonth((threeAgo.getMonth() + 1).toString());
    setFromYear(threeAgo.getFullYear().toString());
    setToMonth((now.getMonth() + 1).toString());
    setToYear(now.getFullYear().toString());
  };

  const setLastSixMonths = () => {
    const now = new Date();
    const sixAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    setFromMonth((sixAgo.getMonth() + 1).toString());
    setFromYear(sixAgo.getFullYear().toString());
    setToMonth((now.getMonth() + 1).toString());
    setToYear(now.getFullYear().toString());
  };

  const setCurrentFinancialYear = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    if (currentMonth >= 4) {
      // April to March
      setFromMonth('4');
      setFromYear(currentYear.toString());
      setToMonth('3');
      setToYear((currentYear + 1).toString());
    } else {
      setFromMonth('4');
      setFromYear((currentYear - 1).toString());
      setToMonth('3');
      setToYear(currentYear.toString());
    }
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
        {/* Header + Date Range - single compact row */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {/* Title */}
            <div className="flex items-center gap-2 mr-auto">
              <BarChart3 className="w-5 h-5 text-slate-700" />
              <h1 className="text-base font-bold text-gray-900">Monthly Summary</h1>
            </div>

            {/* Date Range inline */}
            <div className="flex items-center gap-2 text-xs">
              <Calendar className="w-3.5 h-3.5 text-gray-500" />
              <select 
                className="border border-gray-300 rounded px-2 py-1 bg-white text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                value={fromMonth}
                onChange={(e) => setFromMonth(e.target.value)}
              >
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <select 
                className="border border-gray-300 rounded px-2 py-1 bg-white text-xs w-20 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                value={fromYear}
                onChange={(e) => setFromYear(e.target.value)}
              >
                {years.map(y => (
                  <option key={y.value} value={y.value}>{y.label}</option>
                ))}
              </select>
              <span className="text-gray-400">→</span>
              <select 
                className="border border-gray-300 rounded px-2 py-1 bg-white text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                value={toMonth}
                onChange={(e) => setToMonth(e.target.value)}
              >
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <select 
                className="border border-gray-300 rounded px-2 py-1 bg-white text-xs w-20 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                value={toYear}
                onChange={(e) => setToYear(e.target.value)}
              >
                {years.map(y => (
                  <option key={y.value} value={y.value}>{y.label}</option>
                ))}
              </select>
            </div>

            {/* Quick Presets */}
            <div className="flex gap-1.5">
              <button onClick={setLastThreeMonths} className="px-2.5 py-1 text-[11px] font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">3M</button>
              <button onClick={setLastSixMonths} className="px-2.5 py-1 text-[11px] font-medium bg-slate-600 text-white rounded hover:bg-slate-700 transition-colors">6M</button>
              <button onClick={setCurrentFinancialYear} className="px-2.5 py-1 text-[11px] font-medium bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors">FY</button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            <p className="mt-3 text-gray-600 text-sm">Loading data...</p>
          </div>
        ) : (
          <>
            {/* Summary Cards - Compact */}
            {summary && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Card className="p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Factory className="w-5 h-5 text-blue-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-600 font-medium">Production</div>
                      <div className="text-lg font-bold text-gray-900 truncate">{fmt(summary.totalMultiCutterProduction)}</div>
                    </div>
                  </div>
                </Card>

                <Card className="p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <ShoppingBag className="w-5 h-5 text-emerald-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-600 font-medium">Sales</div>
                      <div className="text-lg font-bold text-gray-900 truncate">{fmt(summary.totalSalesSqft)}</div>
                    </div>
                  </div>
                </Card>

                <Card className="p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-100 rounded-lg">
                      <DollarSign className="w-5 h-5 text-violet-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-600 font-medium">Revenue</div>
                      <div className="text-lg font-bold text-gray-900 truncate">₹{fmt(summary.totalSalesRevenue)}</div>
                    </div>
                  </div>
                </Card>

                <Card className="p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <Clock className="w-5 h-5 text-amber-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-600 font-medium">Hours</div>
                      <div className="text-lg font-bold text-gray-900 truncate">{fmt(summary.totalWorkerHours)}</div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Charts Grid - Compact 2-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Multi Cutter Production Chart */}
              <Card className="p-4 bg-white shadow-sm border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Factory className="w-4 h-4 text-blue-600" />
                    <h2 className="text-sm font-semibold text-gray-900">Production (Sq. Ft.)</h2>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3 bg-blue-50 rounded-md px-3 py-1.5">
                  <span className="text-[11px] text-blue-500 font-medium">Monthly Avg</span>
                  <span className="text-sm font-bold text-blue-700">{fmt(summary?.avgMonthlyProduction || 0)}</span>
                  <span className="text-[11px] text-blue-400">sq.ft</span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }} barCategoryGap="20%">
                    <defs>
                      <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9}/>
                        <stop offset="100%" stopColor="#2563eb" stopOpacity={1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatYAxis} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }} />
                    <Bar dataKey="multiCutterProduction" fill="url(#blueGradient)" name="Production (Sq. Ft.)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Sales Volume Chart */}
              <Card className="p-4 bg-white shadow-sm border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-emerald-600" />
                    <h2 className="text-sm font-semibold text-gray-900">Sales Volume (Sq. Ft.)</h2>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3 bg-emerald-50 rounded-md px-3 py-1.5">
                  <span className="text-[11px] text-emerald-500 font-medium">Monthly Avg</span>
                  <span className="text-sm font-bold text-emerald-700">{fmt(summary?.avgMonthlySales || 0)}</span>
                  <span className="text-[11px] text-emerald-400">sq.ft</span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }} barCategoryGap="20%">
                    <defs>
                      <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.9}/>
                        <stop offset="100%" stopColor="#059669" stopOpacity={1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatYAxis} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(16, 185, 129, 0.08)' }} />
                    <Bar dataKey="salesSqft" fill="url(#greenGradient)" name="Sales (Sq. Ft.)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Revenue Chart */}
              <Card className="p-4 bg-white shadow-sm border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-violet-600" />
                    <h2 className="text-sm font-semibold text-gray-900">Sales Revenue (₹)</h2>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3 bg-violet-50 rounded-md px-3 py-1.5">
                  <span className="text-[11px] text-violet-500 font-medium">Monthly Avg</span>
                  <span className="text-sm font-bold text-violet-700">₹{fmt(summary?.avgMonthlyRevenue || 0)}</span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                    <defs>
                      <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.15}/>
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatYAxis} />
                    <Tooltip content={(props) => <CustomTooltip {...props} prefix="₹" />} />
                    <Line 
                      type="monotone" 
                      dataKey="salesRevenue" 
                      stroke="#8b5cf6" 
                      strokeWidth={2.5}
                      name="Revenue (₹)"
                      dot={{ fill: '#fff', r: 4, strokeWidth: 2, stroke: '#8b5cf6' }}
                      activeDot={{ fill: '#8b5cf6', r: 6, strokeWidth: 2, stroke: '#fff' }}
                      fill="url(#purpleGradient)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              {/* Worker Hours Chart */}
              <Card className="p-4 bg-white shadow-sm border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <h2 className="text-sm font-semibold text-gray-900">Line Polish Hours</h2>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3 bg-amber-50 rounded-md px-3 py-1.5">
                  <span className="text-[11px] text-amber-500 font-medium">Monthly Avg</span>
                  <span className="text-sm font-bold text-amber-700">{fmt(summary?.avgMonthlyHours || 0)}</span>
                  <span className="text-[11px] text-amber-400">hrs</span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }} barCategoryGap="20%">
                    <defs>
                      <linearGradient id="amberGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9}/>
                        <stop offset="100%" stopColor="#d97706" stopOpacity={1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatYAxis} />
                    <Tooltip content={(props) => <CustomTooltip {...props} suffix=" hrs" />} cursor={{ fill: 'rgba(245, 158, 11, 0.08)' }} />
                    <Bar dataKey="workerHours" fill="url(#amberGradient)" name="Hours Worked" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Production vs Sales Comparison - compact */}
            <Card className="p-4 bg-white shadow-sm border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 text-gray-600" />
                <h2 className="text-sm font-semibold text-gray-900">Production vs Sales</h2>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }} barCategoryGap="20%" barGap={2}>
                  <defs>
                    <linearGradient id="blueGradient2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9}/>
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={1}/>
                    </linearGradient>
                    <linearGradient id="greenGradient2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.9}/>
                      <stop offset="100%" stopColor="#059669" stopOpacity={1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatYAxis} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }} />
                  <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '12px' }} iconType="rect" iconSize={10} />
                  <Bar dataKey="multiCutterProduction" fill="url(#blueGradient2)" name="Production" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="salesSqft" fill="url(#greenGradient2)" name="Sales" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Live Month-to-Month Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {liveLoading ? (
                <Card className="p-4 bg-white shadow-sm border border-gray-200 rounded-lg col-span-1 lg:col-span-2">
                  <div className="text-center py-6">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-gray-500 text-xs">Loading live comparison...</p>
                  </div>
                </Card>
              ) : liveComparison ? (
                <>
                  {/* Production Comparison */}
                  <Card className="p-4 bg-white shadow-sm border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Factory className="w-4 h-4 text-blue-600" />
                        <h2 className="text-sm font-semibold text-gray-900">Production</h2>
                      </div>
                      <span className="text-[11px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                        Comparing Day 1–{liveComparison.currentDay}
                      </span>
                    </div>

                    {/* This month hero number */}
                    <div className="mb-3">
                      <div className="text-[11px] font-medium text-blue-600 mb-0.5">
                        {liveComparison.thisMonthName} 1–{liveComparison.currentDay}, {new Date().getFullYear()}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-gray-900">{fmt(liveComparison.production.thisMonth.sqft)}</span>
                        <span className="text-xs text-gray-400">sq.ft</span>
                      </div>
                      <div className="text-xs text-gray-500">{fmt(liveComparison.production.thisMonth.slabs)} slabs produced</div>
                    </div>

                    {/* vs Last month */}
                    <div className="bg-gray-50 rounded-lg p-2.5 mb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[11px] text-gray-400 mb-0.5">
                            {liveComparison.lastMonthName} 1–{liveComparison.lastMonthDay} (same period)
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-base font-semibold text-gray-700">{fmt(liveComparison.production.lastMonth.sqft)}</span>
                            <span className="text-[11px] text-gray-400">sq.ft</span>
                            <span className="text-[11px] text-gray-400">· {fmt(liveComparison.production.lastMonth.slabs)} slabs</span>
                          </div>
                        </div>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold ${
                          liveComparison.production.sqftChange > 0 
                            ? 'bg-green-100 text-green-700' 
                            : liveComparison.production.sqftChange < 0 
                              ? 'bg-red-100 text-red-700' 
                              : 'bg-gray-100 text-gray-600'
                        }`}>
                          {liveComparison.production.sqftChange > 0 ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : liveComparison.production.sqftChange < 0 ? (
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          ) : (
                            <Minus className="w-3.5 h-3.5" />
                          )}
                          {Math.abs(liveComparison.production.sqftChange)}%
                        </div>
                      </div>
                      {/* Difference line */}
                      <div className={`text-[11px] mt-1.5 font-medium ${
                        liveComparison.production.sqftChange >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {liveComparison.production.sqftChange >= 0 ? '▲' : '▼'}{' '}
                        {fmt(Math.abs(liveComparison.production.thisMonth.sqft - liveComparison.production.lastMonth.sqft))} sq.ft{' '}
                        {liveComparison.production.sqftChange >= 0 ? 'more' : 'less'} than {liveComparison.lastMonthName}
                      </div>
                    </div>

                    {/* Daily bar chart */}
                    <div className="text-[11px] text-gray-400 mb-1">Daily breakdown (sq.ft)</div>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={liveComparison.production.daily} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barGap={1}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                        <XAxis dataKey="day" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `Day ${v}`} />
                        <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatYAxis} />
                        <Tooltip content={<CustomTooltip suffix=" sq.ft" />} />
                        <Bar dataKey="thisMonth" fill="#3b82f6" name={`${liveComparison.thisMonthName} (this month)`} radius={[3, 3, 0, 0]} />
                        <Bar dataKey="lastMonth" fill="#cbd5e1" name={`${liveComparison.lastMonthName} (last month)`} radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="flex items-center justify-center gap-4 mt-1.5 text-[11px] text-gray-400">
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2 bg-blue-500 rounded-sm inline-block"></span>{liveComparison.thisMonthName}</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2 bg-slate-300 rounded-sm inline-block"></span>{liveComparison.lastMonthName}</span>
                    </div>
                  </Card>

                  {/* Sales / Revenue Comparison */}
                  <Card className="p-4 bg-white shadow-sm border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                        <h2 className="text-sm font-semibold text-gray-900">Sales Revenue</h2>
                      </div>
                      <span className="text-[11px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                        Comparing Day 1–{liveComparison.currentDay}
                      </span>
                    </div>

                    {/* This month hero number */}
                    <div className="mb-3">
                      <div className="text-[11px] font-medium text-emerald-600 mb-0.5">
                        {liveComparison.thisMonthName} 1–{liveComparison.currentDay}, {new Date().getFullYear()}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-gray-900">₹{fmt(liveComparison.sales.thisMonth.revenue)}</span>
                      </div>
                      <div className="text-xs text-gray-500">{fmt(liveComparison.sales.thisMonth.sqft)} sq.ft sold</div>
                    </div>

                    {/* vs Last month */}
                    <div className="bg-gray-50 rounded-lg p-2.5 mb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[11px] text-gray-400 mb-0.5">
                            {liveComparison.lastMonthName} 1–{liveComparison.lastMonthDay} (same period)
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-base font-semibold text-gray-700">₹{fmt(liveComparison.sales.lastMonth.revenue)}</span>
                            <span className="text-[11px] text-gray-400">· {fmt(liveComparison.sales.lastMonth.sqft)} sq.ft</span>
                          </div>
                        </div>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold ${
                          liveComparison.sales.revenueChange > 0 
                            ? 'bg-green-100 text-green-700' 
                            : liveComparison.sales.revenueChange < 0 
                              ? 'bg-red-100 text-red-700' 
                              : 'bg-gray-100 text-gray-600'
                        }`}>
                          {liveComparison.sales.revenueChange > 0 ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : liveComparison.sales.revenueChange < 0 ? (
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          ) : (
                            <Minus className="w-3.5 h-3.5" />
                          )}
                          {Math.abs(liveComparison.sales.revenueChange)}%
                        </div>
                      </div>
                      {/* Difference line */}
                      <div className={`text-[11px] mt-1.5 font-medium ${
                        liveComparison.sales.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {liveComparison.sales.revenueChange >= 0 ? '▲' : '▼'}{' '}
                        ₹{fmt(Math.abs(liveComparison.sales.thisMonth.revenue - liveComparison.sales.lastMonth.revenue))}{' '}
                        {liveComparison.sales.revenueChange >= 0 ? 'more' : 'less'} than {liveComparison.lastMonthName}
                      </div>
                    </div>

                    {/* Daily bar chart */}
                    <div className="text-[11px] text-gray-400 mb-1">Daily breakdown (₹ revenue)</div>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={liveComparison.sales.daily} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barGap={1}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                        <XAxis dataKey="day" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `Day ${v}`} />
                        <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatYAxis} />
                        <Tooltip content={(props: any) => <CustomTooltip {...props} prefix="₹" />} />
                        <Bar dataKey="thisMonth" fill="#10b981" name={`${liveComparison.thisMonthName} (this month)`} radius={[3, 3, 0, 0]} />
                        <Bar dataKey="lastMonth" fill="#cbd5e1" name={`${liveComparison.lastMonthName} (last month)`} radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="flex items-center justify-center gap-4 mt-1.5 text-[11px] text-gray-400">
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2 bg-emerald-500 rounded-sm inline-block"></span>{liveComparison.thisMonthName}</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2 bg-slate-300 rounded-sm inline-block"></span>{liveComparison.lastMonthName}</span>
                    </div>
                  </Card>
                </>
              ) : (
                <Card className="p-4 bg-white shadow-sm border border-gray-200 rounded-lg col-span-1 lg:col-span-2">
                  <p className="text-center text-gray-500 text-xs py-3">Unable to load live comparison data.</p>
                </Card>
              )}
            </div>

            {/* Avg Selling Price by Category Chart */}
            <Card className="p-4 bg-white shadow-sm border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-semibold text-gray-900">Avg Selling Price by Category (₹/Sq.Ft)</h2>
              </div>
              {(() => {
                const sgAvg   = (() => { const ts = categoryAvgData.filter(d => d.sg != null && d.sgSqft > 0); const rev = ts.reduce((s,d) => s + (d.sg ?? 0) * d.sgSqft, 0); const sqft = ts.reduce((s,d) => s + d.sgSqft, 0); return sqft > 0 ? rev / sqft : null; })();
                const bpAvg   = (() => { const ts = categoryAvgData.filter(d => d.bp != null && d.bpSqft > 0); const rev = ts.reduce((s,d) => s + (d.bp ?? 0) * d.bpSqft, 0); const sqft = ts.reduce((s,d) => s + d.bpSqft, 0); return sqft > 0 ? rev / sqft : null; })();
                const buAvg   = (() => { const ts = categoryAvgData.filter(d => d.burgandy != null && d.burgundySqft > 0); const rev = ts.reduce((s,d) => s + (d.burgandy ?? 0) * d.burgundySqft, 0); const sqft = ts.reduce((s,d) => s + d.burgundySqft, 0); return sqft > 0 ? rev / sqft : null; })();
                return (
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                      <span className="w-2.5 h-2 rounded-sm inline-block flex-shrink-0" style={{ backgroundColor: '#708090' }}></span>
                      <span className="text-[11px] font-medium text-slate-600">S/G</span>
                      {sgAvg != null && <span className="text-[12px] font-bold text-slate-800 ml-1">₹{Math.round(sgAvg)}<span className="text-[10px] font-normal text-slate-500">/sft avg</span></span>}
                    </div>
                    <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5">
                      <span className="w-2.5 h-2 rounded-sm inline-block flex-shrink-0" style={{ backgroundColor: '#1e2d40' }}></span>
                      <span className="text-[11px] font-medium text-gray-700">B/P</span>
                      {bpAvg != null && <span className="text-[12px] font-bold text-gray-900 ml-1">₹{Math.round(bpAvg)}<span className="text-[10px] font-normal text-gray-500">/sft avg</span></span>}
                    </div>
                    <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                      <span className="w-2.5 h-2 rounded-sm inline-block flex-shrink-0" style={{ backgroundColor: '#800020' }}></span>
                      <span className="text-[11px] font-medium text-red-800">Burgandy</span>
                      {buAvg != null && <span className="text-[12px] font-bold text-red-900 ml-1">₹{Math.round(buAvg)}<span className="text-[10px] font-normal text-red-500">/sft avg</span></span>}
                    </div>
                  </div>
                );
              })()}
              {categoryAvgLoading ? (
                <div className="flex items-center justify-center h-[220px]">
                  <div className="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={categoryAvgData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }} barCategoryGap="20%" barGap={2}>
                    <defs>
                      <linearGradient id="sgGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8899aa" stopOpacity={0.9}/>
                        <stop offset="100%" stopColor="#5f7a8a" stopOpacity={1}/>
                      </linearGradient>
                      <linearGradient id="bpGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3a4d60" stopOpacity={0.9}/>
                        <stop offset="100%" stopColor="#1e2d40" stopOpacity={1}/>
                      </linearGradient>
                      <linearGradient id="burgandyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#9e1a2f" stopOpacity={0.9}/>
                        <stop offset="100%" stopColor="#6b0018" stopOpacity={1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false}
                      tickFormatter={(v) => `₹${v}`} />
                    <Tooltip
                      cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const entry = categoryAvgData.find(d => d.month === label);
                        return (
                          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
                            <p className="font-semibold text-gray-900 mb-2">{entry?.fullMonth || label}</p>
                            {payload.map((p: any) => p.value != null && (
                              <p key={p.dataKey} className="mb-1" style={{ color: p.fill }}>
                                <span className="font-medium">{p.name}:</span>{' '}
                                <span className="font-bold">₹{p.value.toFixed(2)}/sft</span>
                                {p.dataKey === 'sg'       && entry && <span className="text-gray-400 ml-1">({entry.sgSqft.toLocaleString('en-IN')} sft)</span>}
                                {p.dataKey === 'bp'       && entry && <span className="text-gray-400 ml-1">({entry.bpSqft.toLocaleString('en-IN')} sft)</span>}
                                {p.dataKey === 'burgandy' && entry && <span className="text-gray-400 ml-1">({entry.burgundySqft.toLocaleString('en-IN')} sft)</span>}
                              </p>
                            ))}
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="sg"       fill="url(#sgGradient)"       name="S/G"      radius={[3,3,0,0]}>
                      <LabelList dataKey="sg" position="insideTop" content={({ x, y, width, height, value }: any) => {
                        if (!value || (height ?? 0) < 22) return null;
                        const cx = (x ?? 0) + (width ?? 0) / 2;
                        const cy = (y ?? 0) + (height ?? 0) / 2;
                        return <text x={cx} y={cy} transform={`rotate(-90,${cx},${cy})`} textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={900} fill="#ffffff" stroke="rgba(0,0,0,0.75)" strokeWidth={3} paintOrder="stroke" letterSpacing={0.5}>{`₹${Math.round(value)}`}</text>;
                      }} />
                    </Bar>
                    <Bar dataKey="bp"       fill="url(#bpGradient)"       name="B/P"      radius={[3,3,0,0]}>
                      <LabelList dataKey="bp" position="insideTop" content={({ x, y, width, height, value }: any) => {
                        if (!value || (height ?? 0) < 22) return null;
                        const cx = (x ?? 0) + (width ?? 0) / 2;
                        const cy = (y ?? 0) + (height ?? 0) / 2;
                        return <text x={cx} y={cy} transform={`rotate(-90,${cx},${cy})`} textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={900} fill="#ffffff" stroke="rgba(0,0,0,0.75)" strokeWidth={3} paintOrder="stroke" letterSpacing={0.5}>{`₹${Math.round(value)}`}</text>;
                      }} />
                    </Bar>
                    <Bar dataKey="burgandy" fill="url(#burgandyGradient)" name="Burgandy" radius={[3,3,0,0]}>
                      <LabelList dataKey="burgandy" position="insideTop" content={({ x, y, width, height, value }: any) => {
                        if (!value || (height ?? 0) < 22) return null;
                        const cx = (x ?? 0) + (width ?? 0) / 2;
                        const cy = (y ?? 0) + (height ?? 0) / 2;
                        return <text x={cx} y={cy} transform={`rotate(-90,${cx},${cy})`} textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={900} fill="#ffffff" stroke="rgba(0,0,0,0.75)" strokeWidth={3} paintOrder="stroke" letterSpacing={0.5}>{`₹${Math.round(value)}`}</text>;
                      }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Production Cost per SFT Chart (Excluding Raw Material & GST Challan) */}
            <Card className="p-4 bg-white shadow-sm border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Factory className="w-4 h-4 text-purple-600" />
                  <h2 className="text-sm font-semibold text-gray-900">Total Cost per SFT (Production + Raw Material)</h2>
                </div>
              </div>
              
              {/* Raw Material Cost Inputs */}
              <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg">
                <p className="text-xs font-semibold text-gray-700 mb-2">Optional: Set Raw Material Cost per SFT</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-medium text-slate-600 block mb-1">S/G Raw Material</label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">₹</span>
                      <input
                        type="number"
                        value={sgRawMaterialCost || ''}
                        onChange={(e) => setSgRawMaterialCost(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full pl-5 pr-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-gray-700 block mb-1">B/P Raw Material</label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">₹</span>
                      <input
                        type="number"
                        value={bpRawMaterialCost || ''}
                        onChange={(e) => setBpRawMaterialCost(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full pl-5 pr-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-red-800 block mb-1">Burgandy Raw Material</label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">₹</span>
                      <input
                        type="number"
                        value={burgundyRawMaterialCost || ''}
                        onChange={(e) => setBurgundyRawMaterialCost(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full pl-5 pr-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <div className="inline-flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-lg px-3 py-1.5">
                  <span className="text-[11px] font-medium text-purple-700">Production Cost excludes: Raw Material & GST Challan</span>
                  {(() => {
                    const totalMonths = productionCostData.filter(d => d.costPerSqft != null).length;
                    const avgCost = (() => {
                      const validData = productionCostData.filter(d => d.costPerSqft != null && d.totalSqft > 0);
                      const totalRevenue = validData.reduce((s, d) => s + (d.costPerSqft ?? 0) * d.totalSqft, 0);
                      const totalSqft = validData.reduce((s, d) => s + d.totalSqft, 0);
                      return totalSqft > 0 ? totalRevenue / totalSqft : null;
                    })();
                    return avgCost != null && (
                      <span className="text-[12px] font-bold text-purple-900">
                        Avg Production: ₹{Math.round(avgCost)}<span className="text-[10px] font-normal text-purple-600">/sft</span>
                      </span>
                    );
                  })()}
                </div>
              </div>
              {productionCostLoading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-purple-500"></div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={productionCostData.map(d => ({
                    ...d,
                    sgRaw: sgRawMaterialCost,
                    sgProduction: d.costPerSqft ?? 0,
                    sgTotal: (sgRawMaterialCost || 0) + (d.costPerSqft ?? 0),
                    bpRaw: bpRawMaterialCost,
                    bpProduction: d.costPerSqft ?? 0,
                    bpTotal: (bpRawMaterialCost || 0) + (d.costPerSqft ?? 0),
                    burgundyRaw: burgundyRawMaterialCost,
                    burgundyProduction: d.costPerSqft ?? 0,
                    burgundyTotal: (burgundyRawMaterialCost || 0) + (d.costPerSqft ?? 0),
                  }))} margin={{ top: 30, right: 10, left: -10, bottom: 5 }} barCategoryGap="15%" barGap={2}>
                    <defs>
                      <linearGradient id="sgRawGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.8}/>
                        <stop offset="100%" stopColor="#64748b" stopOpacity={1}/>
                      </linearGradient>
                      <linearGradient id="sgProductionGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a5b4c5" stopOpacity={0.9}/>
                        <stop offset="100%" stopColor="#708090" stopOpacity={1}/>
                      </linearGradient>
                      <linearGradient id="bpRawGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#475569" stopOpacity={0.8}/>
                        <stop offset="100%" stopColor="#334155" stopOpacity={1}/>
                      </linearGradient>
                      <linearGradient id="bpProductionGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#475569" stopOpacity={0.9}/>
                        <stop offset="100%" stopColor="#1e2d40" stopOpacity={1}/>
                      </linearGradient>
                      <linearGradient id="burgundyRawGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#be123c" stopOpacity={0.8}/>
                        <stop offset="100%" stopColor="#9f1239" stopOpacity={1}/>
                      </linearGradient>
                      <linearGradient id="burgundyProductionGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#be123c" stopOpacity={0.9}/>
                        <stop offset="100%" stopColor="#800020" stopOpacity={1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false}
                      tickFormatter={(v) => `₹${v}`} />
                    <Tooltip
                      cursor={{ fill: 'rgba(168,85,247,0.08)' }}
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const entry = productionCostData.find(d => d.month === label);
                        if (!entry || !entry.costPerSqft) return null;
                        const productionCost = entry.costPerSqft;
                        return (
                          <div className="bg-white border border-purple-200 rounded-lg shadow-lg p-3 text-xs">
                            <p className="font-semibold text-gray-900 mb-2">{entry.fullMonth}</p>
                            <div className="space-y-2">
                              {sgRawMaterialCost > 0 && (
                                <div className="pb-2 border-b border-gray-200">
                                  <p className="font-semibold text-slate-700 mb-1">S/G</p>
                                  <p className="text-slate-600 text-[11px]">Raw Material: ₹{sgRawMaterialCost.toFixed(2)}/sft</p>
                                  <p className="text-purple-600 text-[11px]">Production: ₹{productionCost.toFixed(2)}/sft</p>
                                  <p className="text-slate-900 font-bold text-[11px]">Total: ₹{(sgRawMaterialCost + productionCost).toFixed(2)}/sft</p>
                                </div>
                              )}
                              {bpRawMaterialCost > 0 && (
                                <div className="pb-2 border-b border-gray-200">
                                  <p className="font-semibold text-gray-700 mb-1">B/P</p>
                                  <p className="text-gray-600 text-[11px]">Raw Material: ₹{bpRawMaterialCost.toFixed(2)}/sft</p>
                                  <p className="text-purple-600 text-[11px]">Production: ₹{productionCost.toFixed(2)}/sft</p>
                                  <p className="text-gray-900 font-bold text-[11px]">Total: ₹{(bpRawMaterialCost + productionCost).toFixed(2)}/sft</p>
                                </div>
                              )}
                              {burgundyRawMaterialCost > 0 && (
                                <div>
                                  <p className="font-semibold text-red-700 mb-1">Burgandy</p>
                                  <p className="text-red-600 text-[11px]">Raw Material: ₹{burgundyRawMaterialCost.toFixed(2)}/sft</p>
                                  <p className="text-purple-600 text-[11px]">Production: ₹{productionCost.toFixed(2)}/sft</p>
                                  <p className="text-red-900 font-bold text-[11px]">Total: ₹{(burgundyRawMaterialCost + productionCost).toFixed(2)}/sft</p>
                                </div>
                              )}
                              {!sgRawMaterialCost && !bpRawMaterialCost && !burgundyRawMaterialCost && (
                                <p className="text-purple-700">
                                  <span className="font-medium">Production Cost:</span>{' '}
                                  <span className="font-bold">₹{productionCost.toFixed(2)}/sft</span>
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      }}
                    />
                    {sgRawMaterialCost > 0 && (
                      <>
                        <Bar dataKey="sgRaw" stackId="sg" fill="url(#sgRawGradient)" radius={[0,0,0,0]} />
                        <Bar dataKey="sgProduction" stackId="sg" fill="url(#sgProductionGradient)" radius={[3,3,0,0]}>
                          <LabelList dataKey="sgTotal" position="top" content={({ x, y, width, value }: any) => {
                            if (!value) return null;
                            return (
                              <text x={(x ?? 0) + (width ?? 0) / 2} y={(y ?? 0) - 5} textAnchor="middle" fontSize={10} fontWeight={700} fill="#708090">
                                ₹{Math.round(value)}
                              </text>
                            );
                          }} />
                        </Bar>
                      </>
                    )}
                    {bpRawMaterialCost > 0 && (
                      <>
                        <Bar dataKey="bpRaw" stackId="bp" fill="url(#bpRawGradient)" radius={[0,0,0,0]} />
                        <Bar dataKey="bpProduction" stackId="bp" fill="url(#bpProductionGradient)" radius={[3,3,0,0]}>
                          <LabelList dataKey="bpTotal" position="top" content={({ x, y, width, value }: any) => {
                            if (!value) return null;
                            return (
                              <text x={(x ?? 0) + (width ?? 0) / 2} y={(y ?? 0) - 5} textAnchor="middle" fontSize={10} fontWeight={700} fill="#1e2d40">
                                ₹{Math.round(value)}
                              </text>
                            );
                          }} />
                        </Bar>
                      </>
                    )}
                    {burgundyRawMaterialCost > 0 && (
                      <>
                        <Bar dataKey="burgundyRaw" stackId="burgundy" fill="url(#burgundyRawGradient)" radius={[0,0,0,0]} />
                        <Bar dataKey="burgundyProduction" stackId="burgundy" fill="url(#burgundyProductionGradient)" radius={[3,3,0,0]}>
                          <LabelList dataKey="burgundyTotal" position="top" content={({ x, y, width, value }: any) => {
                            if (!value) return null;
                            return (
                              <text x={(x ?? 0) + (width ?? 0) / 2} y={(y ?? 0) - 5} textAnchor="middle" fontSize={10} fontWeight={700} fill="#800020">
                                ₹{Math.round(value)}
                              </text>
                            );
                          }} />
                        </Bar>
                      </>
                    )}
                    {!sgRawMaterialCost && !bpRawMaterialCost && !burgundyRawMaterialCost && (
                      <Bar dataKey="costPerSqft" fill="url(#sgProductionGradient)" radius={[4,4,0,0]}>
                        <LabelList dataKey="costPerSqft" position="top" content={({ x, y, width, value }: any) => {
                          if (!value) return null;
                          return (
                            <text x={(x ?? 0) + (width ?? 0) / 2} y={(y ?? 0) - 5} textAnchor="middle" fontSize={10} fontWeight={700} fill="#7c3aed">
                              ₹{Math.round(value)}
                            </text>
                          );
                        }} />
                      </Bar>
                    )}
                  </BarChart>
                </ResponsiveContainer>
              )}
              
              {/* Profit Analysis */}
              {(sgRawMaterialCost > 0 || bpRawMaterialCost > 0 || burgundyRawMaterialCost > 0) && (() => {
                const sgAvg = (() => { const ts = categoryAvgData.filter(d => d.sg != null && d.sgSqft > 0); const rev = ts.reduce((s,d) => s + (d.sg ?? 0) * d.sgSqft, 0); const sqft = ts.reduce((s,d) => s + d.sgSqft, 0); return sqft > 0 ? rev / sqft : null; })();
                const bpAvg = (() => { const ts = categoryAvgData.filter(d => d.bp != null && d.bpSqft > 0); const rev = ts.reduce((s,d) => s + (d.bp ?? 0) * d.bpSqft, 0); const sqft = ts.reduce((s,d) => s + d.bpSqft, 0); return sqft > 0 ? rev / sqft : null; })();
                const buAvg = (() => { const ts = categoryAvgData.filter(d => d.burgandy != null && d.burgundySqft > 0); const rev = ts.reduce((s,d) => s + (d.burgandy ?? 0) * d.burgundySqft, 0); const sqft = ts.reduce((s,d) => s + d.burgundySqft, 0); return sqft > 0 ? rev / sqft : null; })();
                const avgProductionCost = (() => { const validData = productionCostData.filter(d => d.costPerSqft != null && d.totalSqft > 0); const totalRevenue = validData.reduce((s, d) => s + (d.costPerSqft ?? 0) * d.totalSqft, 0); const totalSqft = validData.reduce((s, d) => s + d.totalSqft, 0); return totalSqft > 0 ? totalRevenue / totalSqft : 0; })();
                
                const sgTotalCost = sgRawMaterialCost + avgProductionCost;
                const bpTotalCost = bpRawMaterialCost + avgProductionCost;
                const buTotalCost = burgundyRawMaterialCost + avgProductionCost;
                
                const sgProfit = sgAvg ? sgAvg - sgTotalCost : null;
                const bpProfit = bpAvg ? bpAvg - bpTotalCost : null;
                const buProfit = buAvg ? buAvg - buTotalCost : null;
                
                return (
                  <div className="mt-4 p-4 bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 border border-green-200 rounded-lg">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      Profit Analysis (Avg Across All Months)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {sgRawMaterialCost > 0 && sgAvg && (
                        <div className="bg-white rounded-lg p-3 border border-slate-200">
                          <p className="text-xs font-bold text-slate-700 mb-2">S/G</p>
                          <div className="space-y-1 text-[11px]">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Selling Price:</span>
                              <span className="font-semibold text-gray-900">₹{Math.round(sgAvg)}/sft</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Total Cost:</span>
                              <span className="font-semibold text-gray-900">₹{Math.round(sgTotalCost)}/sft</span>
                            </div>
                            <div className="pt-1 border-t border-gray-200 flex justify-between items-center">
                              <span className="font-bold text-gray-700">Profit:</span>
                              <span className={`font-bold text-sm ${sgProfit && sgProfit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {sgProfit ? `₹${Math.round(sgProfit)}/sft` : 'N/A'}
                              </span>
                            </div>
                            {sgProfit && sgAvg && (
                              <div className="text-[10px] text-gray-500 text-right">
                                ({((sgProfit / sgAvg) * 100).toFixed(1)}% margin)
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {bpRawMaterialCost > 0 && bpAvg && (
                        <div className="bg-white rounded-lg p-3 border border-gray-300">
                          <p className="text-xs font-bold text-gray-800 mb-2">B/P</p>
                          <div className="space-y-1 text-[11px]">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Selling Price:</span>
                              <span className="font-semibold text-gray-900">₹{Math.round(bpAvg)}/sft</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Total Cost:</span>
                              <span className="font-semibold text-gray-900">₹{Math.round(bpTotalCost)}/sft</span>
                            </div>
                            <div className="pt-1 border-t border-gray-200 flex justify-between items-center">
                              <span className="font-bold text-gray-700">Profit:</span>
                              <span className={`font-bold text-sm ${bpProfit && bpProfit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {bpProfit ? `₹${Math.round(bpProfit)}/sft` : 'N/A'}
                              </span>
                            </div>
                            {bpProfit && bpAvg && (
                              <div className="text-[10px] text-gray-500 text-right">
                                ({((bpProfit / bpAvg) * 100).toFixed(1)}% margin)
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {burgundyRawMaterialCost > 0 && buAvg && (
                        <div className="bg-white rounded-lg p-3 border border-red-200">
                          <p className="text-xs font-bold text-red-800 mb-2">Burgandy</p>
                          <div className="space-y-1 text-[11px]">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Selling Price:</span>
                              <span className="font-semibold text-gray-900">₹{Math.round(buAvg)}/sft</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Total Cost:</span>
                              <span className="font-semibold text-gray-900">₹{Math.round(buTotalCost)}/sft</span>
                            </div>
                            <div className="pt-1 border-t border-gray-200 flex justify-between items-center">
                              <span className="font-bold text-gray-700">Profit:</span>
                              <span className={`font-bold text-sm ${buProfit && buProfit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {buProfit ? `₹${Math.round(buProfit)}/sft` : 'N/A'}
                              </span>
                            </div>
                            {buProfit && buAvg && (
                              <div className="text-[10px] text-gray-500 text-right">
                                ({((buProfit / buAvg) * 100).toFixed(1)}% margin)
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </Card>

            {/* Data Table */}
            <Card className="p-5 bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
              <h2 className="text-base font-semibold mb-4 text-gray-900">Monthly Data Summary</h2>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 text-xs">Month</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700 text-xs">Production</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700 text-xs">Slabs</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700 text-xs">Sales</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700 text-xs">Revenue</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700 text-xs">Hours</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {monthlyData.map((month, index) => (
                      <tr key={index} className="border-t border-gray-200 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{month.fullMonth}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{fmt(month.multiCutterProduction)}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{fmt(month.multiCutterSlabs)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{fmt(month.salesSqft)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">₹{fmt(month.salesRevenue)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{fmt(month.workerHours)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-100 font-semibold border-t-2 border-gray-300">
                    <tr>
                      <td className="px-4 py-3 text-gray-900">Total</td>
                      <td className="px-4 py-3 text-right text-gray-900">{fmt(summary?.totalMultiCutterProduction || 0)}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{fmt(summary?.totalMultiCutterSlabs || 0)}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{fmt(summary?.totalSalesSqft || 0)}</td>
                      <td className="px-4 py-3 text-right text-gray-900">₹{fmt(summary?.totalSalesRevenue || 0)}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{fmt(summary?.totalWorkerHours || 0)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>

            {/* Customer-wise Monthly SFT Widget */}
            <div className="mt-2">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingBag className="w-5 h-5 text-violet-600" />
                <h2 className="text-base font-semibold text-gray-900">Customer-wise Monthly SFT Purchased</h2>
              </div>
              {customerSqftLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-600"></div>
                  <span className="ml-3 text-gray-500 text-sm">Loading customer data...</span>
                </div>
              ) : !customerSqft || customerSqft.customers.length === 0 ? (
                <Card className="p-5 bg-white shadow-sm border border-gray-200 rounded-lg">
                  <p className="text-center text-gray-400 text-sm py-4">No customer sales data for this period.</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {customerSqft.customers.map((customer) => {
                    const maxSqft = Math.max(
                      ...customerSqft.months.map(m => customer.monthlyData[m.key] || 0),
                      1
                    );
                    return (
                      <Card key={customer.id} className="p-4 bg-white shadow-sm border border-gray-200 rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900 truncate">{customer.name}</h3>
                            <p className="text-xs text-violet-600 font-medium mt-0.5">
                              Total: {fmt(Math.round(customer.total))} sq.ft
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              Avg: {fmt(Math.round(customer.avgSqft))} sq.ft / month
                              <span className="ml-1 text-gray-300">({customer.activeMonths} active mo)</span>
                            </p>
                          </div>
                          <span className="ml-2 flex-shrink-0 text-[10px] bg-violet-50 text-violet-700 font-semibold px-2 py-0.5 rounded-full">
                            {customerSqft.months.length} mo
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {customerSqft.months.map((m) => {
                            const sqft = customer.monthlyData[m.key] || 0;
                            const pct = maxSqft > 0 ? (sqft / maxSqft) * 100 : 0;
                            return (
                              <div key={m.key}>
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="text-[11px] text-gray-500 w-16 flex-shrink-0">{m.label}</span>
                                  <span className={`text-[11px] font-semibold ml-1 ${
                                    sqft > 0 ? 'text-gray-800' : 'text-gray-300'
                                  }`}>
                                    {sqft > 0 ? `${fmt(Math.round(sqft))} sq.ft` : '—'}
                                  </span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-1.5">
                                  <div
                                    className="bg-violet-500 h-1.5 rounded-full transition-all duration-500"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
