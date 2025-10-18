'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppLayout } from '@/components/AppLayout';
import { formatDisplayDate } from '@/lib/date-utils';
import { 
  BarChart3, 
  Factory, 
  Layers,
  TrendingUp,
  TrendingDown,
  Calendar,
  Plus,
  Zap,
  Target,
  AlertTriangle,
  Award,
  Activity,
  Box,
  Ruler
} from 'lucide-react';
import Link from 'next/link';

const fmt = (n: number) => (n || 0).toLocaleString('en-IN');

interface AnalyticsSummary {
  total_entries: number;
  total_days: number;
  active_machines: number;
  total_slabs: number;
  total_sqft: number;
  avg_slabs_per_entry: number;
  avg_sqft_per_entry: number;
}

interface MachineBreakdown {
  machine: string;
  entries: number;
  slabs: number;
  sqft: number;
  avg_slabs: number;
  avg_sqft: number;
  working_days: number;
}

interface DailyTrend {
  date: string;
  machines_active: number;
  slabs: number;
  sqft: number;
}

interface MaterialBreakdown {
  material_type: string;
  block_count: number;
  total_slabs: number;
  total_sqft: number;
}

interface TopBlock {
  block_name: string;
  material_type: string;
  times_processed: number;
  total_slabs: number;
  total_sqft: number;
}

interface MultiCutterAnalytics {
  summary: AnalyticsSummary;
  machine_breakdown: MachineBreakdown[];
  daily_trends: DailyTrend[];
  material_breakdown: MaterialBreakdown[];
  top_blocks: TopBlock[];
}

export default function MultiCutterAnalyticsPage() {
  const [analytics, setAnalytics] = useState<MultiCutterAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    loadAnalytics();
  }, [dateFrom, dateTo, selectedMonth, selectedYear]);

  async function loadAnalytics() {
    try {
      const params = new URLSearchParams();
      
      if (selectedMonth && selectedYear) {
        params.set('month', selectedMonth);
        params.set('year', selectedYear);
      } else {
        if (dateFrom) params.set('from', dateFrom);
        if (dateTo) params.set('to', dateTo);
      }
      
      const response = await fetch(`/api/multi-cutter-reports/analytics?${params.toString()}`);
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load multi-cutter analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading multi-cutter analytics...</div>
      </div>
    );
  }

  const summary = analytics?.summary || {} as AnalyticsSummary;
  const machineBreakdown = analytics?.machine_breakdown || [];
  const dailyTrends = analytics?.daily_trends || [];
  const materialBreakdown = analytics?.material_breakdown || [];
  const topBlocks = analytics?.top_blocks || [];

  // ============ BUSINESS ANALYTICS CALCULATIONS ============
  
  // 1. Production Efficiency Metrics
  const avgSlabsPerDay = summary.total_days > 0 ? summary.total_slabs / summary.total_days : 0;
  const avgSqftPerDay = summary.total_days > 0 ? summary.total_sqft / summary.total_days : 0;
  const avgSlabsPerMachine = summary.active_machines > 0 ? summary.total_slabs / (summary.total_days * summary.active_machines) : 0;
  const avgSqftPerMachine = summary.active_machines > 0 ? summary.total_sqft / (summary.total_days * summary.active_machines) : 0;
  
  // 2. Machine Utilization (assuming 24-hour operation)
  const targetDailyOutputPerMachine = 2000; // Sq ft target per machine per day
  const utilizationRate = avgSqftPerMachine > 0 ? (avgSqftPerMachine / targetDailyOutputPerMachine) * 100 : 0;
  
  // 3. Performance Trends (last 7 days vs previous 7 days)
  const last7Days = dailyTrends.slice(0, 7);
  const prev7Days = dailyTrends.slice(7, 14);
  
  const last7DaysAvgSqft = last7Days.length > 0 
    ? last7Days.reduce((sum, d) => sum + d.sqft, 0) / last7Days.length 
    : 0;
  const prev7DaysAvgSqft = prev7Days.length > 0 
    ? prev7Days.reduce((sum, d) => sum + d.sqft, 0) / prev7Days.length 
    : 0;
  const sqftTrend = prev7DaysAvgSqft > 0 
    ? ((last7DaysAvgSqft - prev7DaysAvgSqft) / prev7DaysAvgSqft) * 100 
    : 0;
    
  const last7DaysAvgSlabs = last7Days.length > 0 
    ? last7Days.reduce((sum, d) => sum + d.slabs, 0) / last7Days.length 
    : 0;
  const prev7DaysAvgSlabs = prev7Days.length > 0 
    ? prev7Days.reduce((sum, d) => sum + d.slabs, 0) / prev7Days.length 
    : 0;
  const slabsTrend = prev7DaysAvgSlabs > 0 
    ? ((last7DaysAvgSlabs - prev7DaysAvgSlabs) / prev7DaysAvgSlabs) * 100 
    : 0;
  
  // 4. Best & Worst Days
  const bestDay = dailyTrends.length > 0 
    ? dailyTrends.reduce((max, day) => day.sqft > max.sqft ? day : max, dailyTrends[0])
    : null;
  const worstDay = dailyTrends.length > 0 
    ? dailyTrends.reduce((min, day) => day.sqft < min.sqft ? day : min, dailyTrends[0])
    : null;

  // 5. Machine Performance Comparison
  const bestMachine = machineBreakdown.length > 0 
    ? machineBreakdown.reduce((max, m) => m.sqft > max.sqft ? m : max, machineBreakdown[0])
    : null;
  const worstMachine = machineBreakdown.length > 0 
    ? machineBreakdown.reduce((min, m) => m.sqft < min.sqft ? m : min, machineBreakdown[0])
    : null;

  // Generate month options
  const months = [
    { value: '', label: 'All Months' },
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

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());

  return (
    <AppLayout>
      <div className="min-h-screen w-full bg-gray-50 p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Multi-Cutter Analytics</h1>
          <p className="text-gray-600 mt-1">Production Performance & Machine Efficiency Tracking</p>
        </div>
          
        {/* Filters Section */}
        <Card className="p-4 bg-white border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            {/* Left side: Date filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 flex-1">
              <div className="flex-1 min-w-[140px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full"
                />
              </div>
              <Button 
                variant="outline" 
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                  setSelectedMonth("");
                  setSelectedYear(new Date().getFullYear().toString());
                }}
                className="whitespace-nowrap"
              >
                Clear Filters
              </Button>
            </div>
            
            {/* Right side: Month selector */}
            <div className="flex items-end gap-2">
              <div className="min-w-[100px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <select 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                >
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <div className="min-w-[140px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                <select 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  {months.map(month => (
                    <option key={month.value} value={month.value}>{month.label}</option>
                  ))}
                </select>
              </div>
              <Link href="/production/multi-cutter">
                <Button className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Report
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        {/* ========== KEY PRODUCTION METRICS (ROW 1) ========== */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Production</p>
                <p className="text-2xl font-bold text-gray-900">{fmt(summary.total_slabs || 0)}</p>
                <p className="text-xs text-gray-500 mt-1">Slabs Cut</p>
              </div>
              <Layers className="w-8 h-8 text-purple-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Area</p>
                <p className="text-2xl font-bold text-gray-900">{fmt(summary.total_sqft || 0)}</p>
                <p className="text-xs text-gray-500 mt-1">Sq. Ft. Produced</p>
              </div>
              <BarChart3 className="w-8 h-8 text-orange-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Working Days</p>
                <p className="text-2xl font-bold text-gray-900">{summary.total_days || 0}</p>
                <p className="text-xs text-gray-500 mt-1">Production Days</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Machines</p>
                <p className="text-2xl font-bold text-gray-900">{summary.active_machines || 0}</p>
                <p className="text-xs text-gray-500 mt-1">Multi Cutters</p>
              </div>
              <Factory className="w-8 h-8 text-indigo-500" />
            </div>
          </Card>
        </div>

        {/* ========== EFFICIENCY METRICS (ROW 2) ========== */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-green-50 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Daily Avg Output</p>
                <p className="text-2xl font-bold text-green-900">{fmt(avgSqftPerDay)}</p>
                <p className="text-xs text-green-600 mt-1">Sq. Ft. per Day</p>
              </div>
              <Zap className="w-8 h-8 text-green-600" />
            </div>
          </Card>
          
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">Slabs per Day</p>
                <p className="text-2xl font-bold text-blue-900">{fmt(avgSlabsPerDay)}</p>
                <p className="text-xs text-blue-600 mt-1">Daily Average</p>
              </div>
              <Target className="w-8 h-8 text-blue-600" />
            </div>
          </Card>
          
          <Card className="p-4 bg-purple-50 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 font-medium">Machine Efficiency</p>
                <p className="text-2xl font-bold text-purple-900">{fmt(avgSqftPerMachine)}</p>
                <p className="text-xs text-purple-600 mt-1">Sq. Ft. / Machine / Day</p>
              </div>
              <Activity className="w-8 h-8 text-purple-600" />
            </div>
          </Card>
          
          <Card className="p-4 bg-amber-50 border-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-700 font-medium">Utilization</p>
                <p className="text-2xl font-bold text-amber-900">{utilizationRate.toFixed(0)}%</p>
                <p className="text-xs text-amber-600 mt-1">Target: 2000 sqft/day</p>
              </div>
              <Award className="w-8 h-8 text-amber-600" />
            </div>
          </Card>
        </div>

        {/* ========== PERFORMANCE TRENDS (WEEK-OVER-WEEK) ========== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm text-gray-600">Slabs Trend (Last 7 days)</p>
                <p className="text-3xl font-bold text-gray-900">{fmt(last7DaysAvgSlabs)}</p>
                <p className="text-xs text-gray-500 mt-1">Avg slabs per day</p>
              </div>
              {slabsTrend >= 0 ? (
                <TrendingUp className="w-10 h-10 text-green-500" />
              ) : (
                <TrendingDown className="w-10 h-10 text-red-500" />
              )}
            </div>
            <div className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              slabsTrend >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {slabsTrend >= 0 ? '↑' : '↓'} {Math.abs(slabsTrend).toFixed(1)}% vs previous week
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm text-gray-600">SqFt Trend (Last 7 days)</p>
                <p className="text-3xl font-bold text-gray-900">{fmt(last7DaysAvgSqft)}</p>
                <p className="text-xs text-gray-500 mt-1">Avg sqft per day</p>
              </div>
              {sqftTrend >= 0 ? (
                <TrendingUp className="w-10 h-10 text-green-500" />
              ) : (
                <TrendingDown className="w-10 h-10 text-red-500" />
              )}
            </div>
            <div className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              sqftTrend >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {sqftTrend >= 0 ? '↑' : '↓'} {Math.abs(sqftTrend).toFixed(1)}% vs previous week
            </div>
          </Card>
        </div>

        {/* ========== BEST & WORST PERFORMANCE DAYS ========== */}
        {bestDay && worstDay && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4 bg-green-50 border-green-200">
              <div className="flex items-center mb-3">
                <Award className="w-5 h-5 text-green-600 mr-2" />
                <h3 className="text-sm font-semibold text-green-900">Best Performance Day</h3>
              </div>
              <div className="space-y-2">
                <p className="text-lg font-bold text-green-900">{formatDisplayDate(bestDay.date)}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-green-700">Slabs: <span className="font-bold">{bestDay.slabs}</span></p>
                  </div>
                  <div>
                    <p className="text-green-700">SqFt: <span className="font-bold">{fmt(bestDay.sqft)}</span></p>
                  </div>
                  <div>
                    <p className="text-green-700">Machines: <span className="font-bold">{bestDay.machines_active}</span></p>
                  </div>
                  <div>
                    <p className="text-green-700">Avg: <span className="font-bold">{fmt(bestDay.sqft / bestDay.machines_active)} sqft/machine</span></p>
                  </div>
                </div>
              </div>
            </Card>
            
            <Card className="p-4 bg-red-50 border-red-200">
              <div className="flex items-center mb-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                <h3 className="text-sm font-semibold text-red-900">Needs Improvement Day</h3>
              </div>
              <div className="space-y-2">
                <p className="text-lg font-bold text-red-900">{formatDisplayDate(worstDay.date)}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-red-700">Slabs: <span className="font-bold">{worstDay.slabs}</span></p>
                  </div>
                  <div>
                    <p className="text-red-700">SqFt: <span className="font-bold">{fmt(worstDay.sqft)}</span></p>
                  </div>
                  <div>
                    <p className="text-red-700">Machines: <span className="font-bold">{worstDay.machines_active}</span></p>
                  </div>
                  <div>
                    <p className="text-red-700">Avg: <span className="font-bold">{worstDay.machines_active > 0 ? fmt(worstDay.sqft / worstDay.machines_active) : 0} sqft/machine</span></p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ========== DAILY PERFORMANCE CHART ========== */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Activity className="w-5 h-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Daily Production Trend</h3>
            </div>
            <p className="text-sm text-gray-600">Last {dailyTrends.length} days</p>
          </div>
          
          {/* Visual Bar Chart */}
          <div className="space-y-3">
            {dailyTrends.slice(0, 15).map((trend, index) => {
              const maxSqft = Math.max(...dailyTrends.slice(0, 15).map(d => d.sqft));
              const percentage = maxSqft > 0 ? (trend.sqft / maxSqft) * 100 : 0;
              
              return (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700 w-24">{formatDisplayDate(trend.date)}</span>
                    <div className="flex-1 mx-4">
                      <div className="w-full bg-gray-200 rounded-full h-8 relative overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-end pr-2"
                          style={{ width: `${percentage}%` }}
                        >
                          <span className="text-xs font-bold text-white">{fmt(trend.sqft)} sqft</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right space-y-0.5">
                      <p className="text-xs text-gray-600">{trend.slabs} slabs</p>
                      <p className="text-xs text-gray-500">{trend.machines_active} machines</p>
                    </div>
                  </div>
                </div>
              );
            })}
            {dailyTrends.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No production data available for the selected period
              </div>
            )}
          </div>
        </Card>

        {/* ========== MACHINE BREAKDOWN ========== */}
        <Card className="p-6">
          <div className="flex items-center mb-4">
            <Factory className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Machine Performance Comparison</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {machineBreakdown.map((machine, index) => {
              const colors = [
                { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', badge: 'bg-blue-100 text-blue-800', progressColor: '#1e40af' },
                { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-900', badge: 'bg-green-100 text-green-800', progressColor: '#15803d' },
                { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-900', badge: 'bg-purple-100 text-purple-800', progressColor: '#7e22ce' }
              ];
              const color = colors[index % 3];
              
              // Monthly target: 40,000 sqft per machine
              const monthlyTarget = 40000;
              const progressPercentage = Math.min((machine.sqft / monthlyTarget) * 100, 100);
              const radius = 60;
              const circumference = 2 * Math.PI * radius;
              const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;
              
              return (
                <div key={machine.machine} className={`${color.bg} border ${color.border} p-4 rounded-lg`}>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className={`font-semibold ${color.text}`}>
                      {machine.machine}
                    </h4>
                    <span className={`text-xs ${color.badge} px-2 py-1 rounded-full font-medium`}>
                      {machine.working_days} days
                    </span>
                  </div>
                  
                  {/* Circular Progress - Cutter Disc Style */}
                  <div className="flex justify-center mb-4">
                    <div className="relative">
                      <svg width="140" height="140" className="transform -rotate-90">
                        {/* Background circle (light gray) */}
                        <circle
                          cx="70"
                          cy="70"
                          r={radius}
                          stroke="#e5e7eb"
                          strokeWidth="12"
                          fill="white"
                          className="drop-shadow-sm"
                        />
                        {/* Progress circle (colored) */}
                        <circle
                          cx="70"
                          cy="70"
                          r={radius}
                          stroke={color.progressColor}
                          strokeWidth="12"
                          fill="none"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          className="transition-all duration-1000 ease-out"
                        />
                        {/* Inner cutting disc detail circles */}
                        <circle cx="70" cy="70" r="20" fill="#f9fafb" stroke="#d1d5db" strokeWidth="1" />
                        <circle cx="70" cy="70" r="8" fill="white" stroke={color.progressColor} strokeWidth="2" />
                      </svg>
                      {/* Center text */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className={`text-2xl font-bold ${color.text}`}>
                          {Math.round(progressPercentage)}%
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">of target</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center py-1 border-b border-gray-200">
                      <span className="text-gray-600">Production:</span>
                      <span className={`font-bold ${color.text}`}>{fmt(machine.sqft)} sqft</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-gray-200">
                      <span className="text-gray-600">Target:</span>
                      <span className="font-medium text-gray-700">{fmt(monthlyTarget)} sqft</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-gray-200">
                      <span className="text-gray-600">Remaining:</span>
                      <span className={`font-medium ${machine.sqft >= monthlyTarget ? 'text-green-600' : 'text-amber-600'}`}>
                        {fmt(Math.max(0, monthlyTarget - machine.sqft))} sqft
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-gray-200">
                      <span className="text-gray-600">Daily Avg:</span>
                      <span className={`font-bold ${color.text}`}>{fmt(machine.avg_sqft)} sqft/day</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-600">Entries:</span>
                      <span className={`font-bold ${color.text}`}>{machine.entries}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {machineBreakdown.length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-500">
                No machine data available
              </div>
            )}
          </div>
        </Card>

        {/* ========== MATERIAL TYPE BREAKDOWN ========== */}
        <Card className="p-6">
          <div className="flex items-center mb-4">
            <Box className="w-5 h-5 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Material Type Analysis</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b-2 border-gray-300 bg-gray-50">
                  <th className="text-left py-3 px-3 text-sm font-semibold text-gray-700">Material Type</th>
                  <th className="text-right py-3 px-3 text-sm font-semibold text-gray-700">Blocks Processed</th>
                  <th className="text-right py-3 px-3 text-sm font-semibold text-gray-700">Total Slabs</th>
                  <th className="text-right py-3 px-3 text-sm font-semibold text-gray-700">Total Sq. Ft.</th>
                  <th className="text-right py-3 px-3 text-sm font-semibold text-gray-700">Avg Sqft/Block</th>
                </tr>
              </thead>
              <tbody>
                {materialBreakdown.map((material, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-blue-50 transition-colors">
                    <td className="py-3 px-3 text-sm font-medium text-gray-900">{material.material_type}</td>
                    <td className="py-3 px-3 text-sm text-right font-semibold text-gray-900">{material.block_count}</td>
                    <td className="py-3 px-3 text-sm text-right font-semibold text-gray-900">{fmt(material.total_slabs)}</td>
                    <td className="py-3 px-3 text-sm text-right font-semibold text-green-600">{fmt(material.total_sqft)}</td>
                    <td className="py-3 px-3 text-sm text-right text-gray-600">
                      {fmt(material.total_sqft / material.block_count)}
                    </td>
                  </tr>
                ))}
                {materialBreakdown.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      No material data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ========== TOP PERFORMING BLOCKS ========== */}
        <Card className="p-6">
          <div className="flex items-center mb-4">
            <Ruler className="w-5 h-5 text-purple-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Top Performing Blocks</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b-2 border-gray-300 bg-gray-50">
                  <th className="text-left py-3 px-3 text-sm font-semibold text-gray-700">Block Name</th>
                  <th className="text-left py-3 px-3 text-sm font-semibold text-gray-700">Material</th>
                  <th className="text-right py-3 px-3 text-sm font-semibold text-gray-700">Times Processed</th>
                  <th className="text-right py-3 px-3 text-sm font-semibold text-gray-700">Total Slabs</th>
                  <th className="text-right py-3 px-3 text-sm font-semibold text-gray-700">Total Sq. Ft.</th>
                </tr>
              </thead>
              <tbody>
                {topBlocks.map((block, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-purple-50 transition-colors">
                    <td className="py-3 px-3 text-sm font-medium text-gray-900">{block.block_name}</td>
                    <td className="py-3 px-3 text-sm text-gray-700">{block.material_type}</td>
                    <td className="py-3 px-3 text-sm text-right font-semibold text-blue-600">{block.times_processed}</td>
                    <td className="py-3 px-3 text-sm text-right font-semibold text-gray-900">{fmt(block.total_slabs)}</td>
                    <td className="py-3 px-3 text-sm text-right font-semibold text-green-600">{fmt(block.total_sqft)}</td>
                  </tr>
                ))}
                {topBlocks.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      No block data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
