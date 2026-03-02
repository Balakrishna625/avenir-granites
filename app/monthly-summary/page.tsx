'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Factory, 
  DollarSign, 
  Clock, 
  ShoppingBag,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon
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

const COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#ef4444', // Rose
  '#14b8a6', // Teal
  '#f97316', // Orange
];

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
        {/* Header */}
        <div className="bg-white border-b border-gray-200 rounded-lg shadow-sm p-5">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-slate-700" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Monthly Summary Dashboard</h1>
              <p className="text-gray-600 text-sm">Comprehensive month-on-month performance analysis</p>
            </div>
          </div>
        </div>

        {/* Date Range Selector */}
        <Card className="p-5 bg-white shadow-sm border border-gray-200 rounded-lg">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-600" />
              <h2 className="text-base font-semibold text-gray-900">Date Range</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* From Date */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600 uppercase">From</label>
                <div className="flex gap-2">
                  <select 
                    className="border border-gray-300 rounded-md px-3 py-2 bg-white flex-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    value={fromMonth}
                    onChange={(e) => setFromMonth(e.target.value)}
                  >
                    {months.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <select 
                    className="border border-gray-300 rounded-md px-3 py-2 bg-white w-28 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    value={fromYear}
                    onChange={(e) => setFromYear(e.target.value)}
                  >
                    {years.map(y => (
                      <option key={y.value} value={y.value}>{y.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* To Date */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600 uppercase">To</label>
                <div className="flex gap-2">
                  <select 
                    className="border border-gray-300 rounded-md px-3 py-2 bg-white flex-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    value={toMonth}
                    onChange={(e) => setToMonth(e.target.value)}
                  >
                    {months.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <select 
                    className="border border-gray-300 rounded-md px-3 py-2 bg-white w-28 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    value={toYear}
                    onChange={(e) => setToYear(e.target.value)}
                  >
                    {years.map(y => (
                      <option key={y.value} value={y.value}>{y.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={setLastThreeMonths}
                className="px-4 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Last 3 Months
              </button>
              <button
                onClick={setLastSixMonths}
                className="px-4 py-1.5 text-xs font-medium bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-colors"
              >
                Last 6 Months
              </button>
              <button
                onClick={setCurrentFinancialYear}
                className="px-4 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
              >
                Current FY
              </button>
            </div>
          </div>
        </Card>

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

            {/* Multi Cutter Production Chart */}
            <Card className="p-5 bg-white shadow-sm border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                <Factory className="w-5 h-5 text-gray-700" />
                <h2 className="text-base font-semibold text-gray-900">Multi Cutter Production (Sq. Ft.)</h2>
              </div>
              <ResponsiveContainer width="100%" height={450}>
                <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }} barCategoryGap="15%">
                  <defs>
                    <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9}/>
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    stroke="#9ca3af" 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    axisLine={{ stroke: '#d1d5db' }}
                  />
                  <YAxis 
                    stroke="#9ca3af" 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    axisLine={{ stroke: '#d1d5db' }}
                    tickFormatter={formatYAxis}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }} />
                  <Bar 
                    dataKey="multiCutterProduction" 
                    fill="url(#blueGradient)" 
                    name="Production (Sq. Ft.)" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-2 gap-3 pt-4 border-t border-gray-200">
                <div className="text-center">
                  <div className="text-xs text-gray-600 mb-1">Avg Monthly</div>
                  <div className="text-xl font-semibold text-gray-900">{fmt(summary?.avgMonthlyProduction || 0)}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-600 mb-1">Total Slabs</div>
                  <div className="text-xl font-semibold text-gray-900">{fmt(summary?.totalMultiCutterSlabs || 0)}</div>
                </div>
              </div>
            </Card>

            {/* Sales Volume Chart */}
            <Card className="p-5 bg-white shadow-sm border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingBag className="w-5 h-5 text-gray-700" />
                <h2 className="text-base font-semibold text-gray-900">Sales Volume (Sq. Ft.)</h2>
              </div>
              <ResponsiveContainer width="100%" height={450}>
                <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }} barCategoryGap="15%">
                  <defs>
                    <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.9}/>
                      <stop offset="100%" stopColor="#059669" stopOpacity={1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    stroke="#9ca3af" 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    axisLine={{ stroke: '#d1d5db' }}
                  />
                  <YAxis 
                    stroke="#9ca3af" 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    axisLine={{ stroke: '#d1d5db' }}
                    tickFormatter={formatYAxis}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }} />
                  <Bar 
                    dataKey="salesSqft" 
                    fill="url(#greenGradient)" 
                    name="Sales (Sq. Ft.)" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 pt-4 border-t border-gray-200 text-center">
                <div className="text-xs text-gray-600 mb-1">Avg Monthly Sales</div>
                <div className="text-xl font-semibold text-gray-900">{fmt(summary?.avgMonthlySales || 0)}</div>
              </div>
            </Card>

            {/* Revenue Chart */}
            <Card className="p-5 bg-white shadow-sm border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-gray-700" />
                <h2 className="text-base font-semibold text-gray-900">Sales Revenue (₹)</h2>
              </div>
              <ResponsiveContainer width="100%" height={450}>
                <LineChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <defs>
                    <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    stroke="#9ca3af" 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    axisLine={{ stroke: '#d1d5db' }}
                  />
                  <YAxis 
                    stroke="#9ca3af" 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    axisLine={{ stroke: '#d1d5db' }}
                    tickFormatter={formatYAxis}
                  />
                  <Tooltip content={(props) => <CustomTooltip {...props} prefix="₹" />} />
                  <Line 
                    type="monotone" 
                    dataKey="salesRevenue" 
                    stroke="#8b5cf6" 
                    strokeWidth={3}
                    name="Revenue (₹)"
                    dot={{ fill: '#fff', r: 6, strokeWidth: 3, stroke: '#8b5cf6' }}
                    activeDot={{ fill: '#8b5cf6', r: 8, strokeWidth: 3, stroke: '#fff' }}
                    fill="url(#purpleGradient)"
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 pt-4 border-t border-gray-200 text-center">
                <div className="text-xs text-gray-600 mb-1">Avg Monthly Revenue</div>
                <div className="text-xl font-semibold text-gray-900">₹{fmt(summary?.avgMonthlyRevenue || 0)}</div>
              </div>
            </Card>

            {/* Worker Hours Chart */}
            <Card className="p-5 bg-white shadow-sm border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-gray-700" />
                <h2 className="text-base font-semibold text-gray-900">Line Polish Worker Hours</h2>
              </div>
              <ResponsiveContainer width="100%" height={450}>
                <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }} barCategoryGap="15%">
                  <defs>
                    <linearGradient id="amberGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9}/>
                      <stop offset="100%" stopColor="#d97706" stopOpacity={1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    stroke="#9ca3af" 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    axisLine={{ stroke: '#d1d5db' }}
                  />
                  <YAxis 
                    stroke="#9ca3af" 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    axisLine={{ stroke: '#d1d5db' }}
                    tickFormatter={formatYAxis}
                  />
                  <Tooltip content={(props) => <CustomTooltip {...props} suffix=" hrs" />} cursor={{ fill: 'rgba(245, 158, 11, 0.1)' }} />
                  <Bar 
                    dataKey="workerHours" 
                    fill="url(#amberGradient)" 
                    name="Hours Worked" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 pt-4 border-t border-gray-200 text-center">
                <div className="text-xs text-gray-600 mb-1">Avg Monthly Hours</div>
                <div className="text-xl font-semibold text-gray-900">{fmt(summary?.avgMonthlyHours || 0)}</div>
              </div>
            </Card>

            {/* Combined Comparison Chart */}
            <Card className="p-5 bg-white shadow-sm border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-gray-700" />
                <h2 className="text-base font-semibold text-gray-900">Production vs Sales Comparison</h2>
              </div>
              <ResponsiveContainer width="100%" height={500}>
                <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }} barCategoryGap="20%" barGap={4}>
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    stroke="#9ca3af" 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    axisLine={{ stroke: '#d1d5db' }}
                  />
                  <YAxis 
                    stroke="#9ca3af" 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    axisLine={{ stroke: '#d1d5db' }}
                    tickFormatter={formatYAxis}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
                  <Legend 
                    wrapperStyle={{ paddingTop: '16px' }}
                    iconType="rect"
                  />
                  <Bar 
                    dataKey="multiCutterProduction" 
                    fill="url(#blueGradient2)" 
                    name="Production (Sq. Ft.)" 
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="salesSqft" 
                    fill="url(#greenGradient2)" 
                    name="Sales (Sq. Ft.)" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Monthly Distribution Pie Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Production Distribution */}
              <Card className="p-5 bg-white shadow-sm border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <PieChartIcon className="w-5 h-5 text-gray-700" />
                  <h2 className="text-base font-semibold text-gray-900">Production Distribution</h2>
                </div>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={monthlyData.filter(m => m.multiCutterProduction > 0)}
                      dataKey="multiCutterProduction"
                      nameKey="month"
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      innerRadius={65}
                      paddingAngle={2}
                      label={({ month, percent }) => `${month} ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ stroke: '#9ca3af', strokeWidth: 1 }}
                    >
                      {monthlyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={(props) => <CustomTooltip {...props} suffix=" sq.ft" />} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>

              {/* Revenue Distribution */}
              <Card className="p-5 bg-white shadow-sm border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <PieChartIcon className="w-5 h-5 text-gray-700" />
                  <h2 className="text-base font-semibold text-gray-900">Revenue Distribution</h2>
                </div>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={monthlyData.filter(m => m.salesRevenue > 0)}
                      dataKey="salesRevenue"
                      nameKey="month"
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      innerRadius={65}
                      paddingAngle={2}
                      label={({ month, percent }) => `${month} ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ stroke: '#9ca3af', strokeWidth: 1 }}
                    >
                      {monthlyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={(props) => <CustomTooltip {...props} prefix="₹" />} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </div>

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
          </>
        )}
      </div>
    </AppLayout>
  );
}
