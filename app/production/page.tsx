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
  Users, 
  Layers,
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Plus,
  Wrench,
  Zap,
  Target,
  AlertTriangle,
  Award,
  Activity
} from 'lucide-react';
import Link from 'next/link';

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const fmt = (n: number) => INR.format(n || 0);

// Formatter for cost metrics with 2 decimal places
const INR_DECIMAL = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDecimal = (n: number) => INR_DECIMAL.format(n || 0);

interface AnalyticsSummary {
  total_entries: number;
  total_days: number;
  total_workers: number;
  total_slabs: number;
  total_sqft: number;
  total_hours: number;
  total_debit: number;
  total_credit: number;
  balance: number;
  avg_rate_per_hour: number;
}

interface ShiftBreakdown {
  shift: string;
  activity: string;
  entries: number;
  workers: number;
  slabs: number;
  sqft: number;
  hours: number;
  debit: number;
  credit: number;
  avg_rate: number;
}

interface DailyTrend {
  date: string;
  workers: number;
  slabs: number;
  sqft: number;
  hours: number;
  debit: number;
  credit: number;
}

interface ProductionAnalytics {
  summary: AnalyticsSummary;
  shift_breakdown: ShiftBreakdown[];
  daily_trends: DailyTrend[];
}

export default function ProductionPage() {
  const [analytics, setAnalytics] = useState<ProductionAnalytics | null>(null);
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
      
      const response = await fetch(`/api/line-polish-reports/analytics?${params.toString()}`);
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load production analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading production analytics...</div>
      </div>
    );
  }

  const summary = analytics?.summary || {} as AnalyticsSummary;
  const shiftBreakdown = analytics?.shift_breakdown || [];
  const dailyTrends = analytics?.daily_trends || [];

  // ============ BUSINESS ANALYTICS CALCULATIONS ============
  
  // 1. Productivity Metrics
  const avgSlabsPerHour = summary.total_hours > 0 ? summary.total_slabs / summary.total_hours : 0;
  const avgSqftPerHour = summary.total_hours > 0 ? summary.total_sqft / summary.total_hours : 0;
  const avgSlabsPerDay = summary.total_days > 0 ? summary.total_slabs / summary.total_days : 0;
  const avgSqftPerDay = summary.total_days > 0 ? summary.total_sqft / summary.total_days : 0;
  const avgHoursPerDay = summary.total_days > 0 ? summary.total_hours / summary.total_days : 0;
  
  // 2. Cost Efficiency
  const costPerSlab = summary.total_slabs > 0 ? summary.total_debit / summary.total_slabs : 0;
  const costPerSqft = summary.total_sqft > 0 ? summary.total_debit / summary.total_sqft : 0;
  const effectiveHourlyRate = summary.total_hours > 0 ? summary.total_debit / summary.total_hours : 0;
  
  // 3. Performance Trends (last 7 days vs previous 7 days)
  const last7Days = dailyTrends.slice(0, 7);
  const prev7Days = dailyTrends.slice(7, 14);
  
  const last7DaysAvgSlabs = last7Days.length > 0 
    ? last7Days.reduce((sum, d) => sum + d.slabs, 0) / last7Days.length 
    : 0;
  const prev7DaysAvgSlabs = prev7Days.length > 0 
    ? prev7Days.reduce((sum, d) => sum + d.slabs, 0) / prev7Days.length 
    : 0;
  const slabsTrend = prev7DaysAvgSlabs > 0 
    ? ((last7DaysAvgSlabs - prev7DaysAvgSlabs) / prev7DaysAvgSlabs) * 100 
    : 0;
    
  const last7DaysAvgSqft = last7Days.length > 0 
    ? last7Days.reduce((sum, d) => sum + d.sqft, 0) / last7Days.length 
    : 0;
  const prev7DaysAvgSqft = prev7Days.length > 0 
    ? prev7Days.reduce((sum, d) => sum + d.sqft, 0) / prev7Days.length 
    : 0;
  const sqftTrend = prev7DaysAvgSqft > 0 
    ? ((last7DaysAvgSqft - prev7DaysAvgSqft) / prev7DaysAvgSqft) * 100 
    : 0;
  
  // 4. Utilization & Efficiency
  const targetHoursPerDay = 24; // 24-hour production target (2 shifts: morning + night)
  const utilizationRate = avgHoursPerDay > 0 ? (avgHoursPerDay / targetHoursPerDay) * 100 : 0;
  
  // 5. Best & Worst Days
  const bestDay = dailyTrends.length > 0 
    ? dailyTrends.reduce((max, day) => day.sqft > max.sqft ? day : max, dailyTrends[0])
    : null;
  const worstDay = dailyTrends.length > 0 
    ? dailyTrends.reduce((min, day) => day.sqft < min.sqft ? day : min, dailyTrends[0])
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

  // Generate dynamic years (3 years back, current year, 2 years forward)
  const years = Array.from({ length: 6 }, (_, i) => {
    const currentYear = new Date().getFullYear();
    return (currentYear - 3 + i).toString();
  }).reverse();

  return (
    <AppLayout>
      <div className="min-h-screen w-full bg-gray-50 p-6 space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Production Analytics</h1>
              <p className="text-gray-600 mt-1">Line Polish Worker Performance & Efficiency Tracking</p>
            </div>
            <Link href="/production/line-polish">
              <Button className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                <Plus className="w-4 h-4 mr-2" />
                Add Line Polish Report
              </Button>
            </Link>
          </div>
          
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <select 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
              <select 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                {months.map(month => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
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
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>

        {/* ========== KEY PRODUCTION METRICS (ROW 1) ========== */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Production</p>
                <p className="text-2xl font-bold text-gray-900">{summary.total_slabs || 0}</p>
                <p className="text-xs text-gray-500 mt-1">Slabs Processed</p>
              </div>
              <Layers className="w-8 h-8 text-purple-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Area</p>
                <p className="text-2xl font-bold text-gray-900">{(summary.total_sqft || 0).toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">Sq. Ft. Produced</p>
              </div>
              <BarChart3 className="w-8 h-8 text-orange-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Hours</p>
                <p className="text-2xl font-bold text-gray-900">{(summary.total_hours || 0).toFixed(0)}</p>
                <p className="text-xs text-gray-500 mt-1">Work Hours</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Labor Cost</p>
                <p className="text-2xl font-bold text-red-600">{fmt(summary.total_debit || 0)}</p>
                <p className="text-xs text-gray-500 mt-1">Total Expenses</p>
              </div>
              <DollarSign className="w-8 h-8 text-red-500" />
            </div>
          </Card>
        </div>

        {/* ========== PRODUCTIVITY METRICS (ROW 2) ========== */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-green-50 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Slabs per Hour</p>
                <p className="text-2xl font-bold text-green-900">{avgSlabsPerHour.toFixed(1)}</p>
                <p className="text-xs text-green-600 mt-1">Productivity Rate</p>
              </div>
              <Zap className="w-8 h-8 text-green-600" />
            </div>
          </Card>
          
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">SqFt per Hour</p>
                <p className="text-2xl font-bold text-blue-900">{avgSqftPerHour.toFixed(0)}</p>
                <p className="text-xs text-blue-600 mt-1">Area Efficiency</p>
              </div>
              <Target className="w-8 h-8 text-blue-600" />
            </div>
          </Card>
          
          <Card className="p-4 bg-purple-50 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 font-medium">Daily Avg</p>
                <p className="text-2xl font-bold text-purple-900">{avgSlabsPerDay.toFixed(0)}</p>
                <p className="text-xs text-purple-600 mt-1">Slabs per Day</p>
              </div>
              <Activity className="w-8 h-8 text-purple-600" />
            </div>
          </Card>
          
          <Card className="p-4 bg-amber-50 border-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-700 font-medium">Utilization</p>
                <p className="text-2xl font-bold text-amber-900">{utilizationRate.toFixed(0)}%</p>
                <p className="text-xs text-amber-600 mt-1">{avgHoursPerDay.toFixed(1)}h / day</p>
              </div>
              <Award className="w-8 h-8 text-amber-600" />
            </div>
          </Card>
        </div>

        {/* ========== COST EFFICIENCY METRICS (ROW 3) ========== */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Cost per Slab</p>
                <p className="text-2xl font-bold text-gray-900">{fmtDecimal(costPerSlab)}</p>
                <p className="text-xs text-gray-500 mt-1">Labor Cost / Slab</p>
              </div>
              <DollarSign className="w-8 h-8 text-gray-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Cost per SqFt</p>
                <p className="text-2xl font-bold text-gray-900">{fmtDecimal(costPerSqft)}</p>
                <p className="text-xs text-gray-500 mt-1">Labor Cost / SqFt</p>
              </div>
              <DollarSign className="w-8 h-8 text-gray-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Hourly Rate</p>
                <p className="text-2xl font-bold text-gray-900">{fmt(effectiveHourlyRate)}</p>
                <p className="text-xs text-gray-500 mt-1">Effective Rate</p>
              </div>
              <Clock className="w-8 h-8 text-indigo-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Working Days</p>
                <p className="text-2xl font-bold text-gray-900">{summary.total_days || 0}</p>
                <p className="text-xs text-gray-500 mt-1">Active Days</p>
              </div>
              <Calendar className="w-8 h-8 text-teal-500" />
            </div>
          </Card>
        </div>

        {/* ========== PERFORMANCE TRENDS (WEEK-OVER-WEEK) ========== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm text-gray-600">Slabs Trend (Last 7 days)</p>
                <p className="text-3xl font-bold text-gray-900">{last7DaysAvgSlabs.toFixed(1)}</p>
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
                <p className="text-3xl font-bold text-gray-900">{last7DaysAvgSqft.toFixed(0)}</p>
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
                    <p className="text-green-700">SqFt: <span className="font-bold">{bestDay.sqft.toLocaleString()}</span></p>
                  </div>
                  <div>
                    <p className="text-green-700">Hours: <span className="font-bold">{bestDay.hours.toFixed(1)}</span></p>
                  </div>
                  <div>
                    <p className="text-green-700">Rate: <span className="font-bold">{(bestDay.sqft / bestDay.hours).toFixed(0)} sqft/hr</span></p>
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
                    <p className="text-red-700">SqFt: <span className="font-bold">{worstDay.sqft.toLocaleString()}</span></p>
                  </div>
                  <div>
                    <p className="text-red-700">Hours: <span className="font-bold">{worstDay.hours.toFixed(1)}</span></p>
                  </div>
                  <div>
                    <p className="text-red-700">Rate: <span className="font-bold">{worstDay.hours > 0 ? (worstDay.sqft / worstDay.hours).toFixed(0) : 0} sqft/hr</span></p>
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
              <h3 className="text-lg font-semibold text-gray-900">Daily Performance Trend</h3>
            </div>
            <p className="text-sm text-gray-600">Last {dailyTrends.length} days</p>
          </div>
          
          {/* Visual Bar Chart */}
          <div className="space-y-3">
            {dailyTrends.slice(0, 15).map((trend, index) => {
              const maxSqft = Math.max(...dailyTrends.slice(0, 15).map(d => d.sqft));
              const percentage = maxSqft > 0 ? (trend.sqft / maxSqft) * 100 : 0;
              const productivityRate = trend.hours > 0 ? trend.sqft / trend.hours : 0;
              
              return (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700 w-24">{formatDisplayDate(trend.date)}</span>
                    <div className="flex-1 mx-4">
                      <div className="w-full bg-gray-200 rounded-full h-8 relative overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-end pr-2"
                          style={{ width: `${percentage}%` }}
                        >
                          <span className="text-xs font-bold text-white">{trend.sqft.toLocaleString()} sqft</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right space-y-0.5">
                      <p className="text-xs text-gray-600">{trend.slabs} slabs</p>
                      <p className="text-xs text-gray-500">{trend.hours.toFixed(1)}h | {productivityRate.toFixed(0)} sqft/h</p>
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

        {/* ========== SHIFT & ACTIVITY BREAKDOWN ========== */}
        <Card className="p-6">
          <div className="flex items-center mb-4">
            <Wrench className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Activity Breakdown Analysis</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shiftBreakdown.map((item, index) => (
              <div key={index} className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">
                    {item.shift === 'MORNING' ? '🌅 Morning' : '🌙 Night'} - {item.activity}
                  </h4>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                    {item.entries} entries
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center py-1 border-b border-gray-200">
                    <span className="text-gray-600">Production:</span>
                    <span className="font-bold text-gray-900">{item.slabs} slabs / {item.sqft.toLocaleString()} sqft</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-gray-200">
                    <span className="text-gray-600">Hours Worked:</span>
                    <span className="font-bold text-blue-600">{item.hours.toFixed(1)} hrs</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-gray-200">
                    <span className="text-gray-600">Productivity:</span>
                    <span className="font-bold text-green-600">{item.hours > 0 ? (item.sqft / item.hours).toFixed(0) : 0} sqft/hr</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-gray-200">
                    <span className="text-gray-600">Labor Cost:</span>
                    <span className="font-bold text-red-600">{fmt(item.debit)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-600">Avg Rate:</span>
                    <span className="font-bold text-indigo-600">{fmt(item.avg_rate)}/hr</span>
                  </div>
                </div>
              </div>
            ))}
            {shiftBreakdown.length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-500">
                No activity breakdown available
              </div>
            )}
          </div>
        </Card>

        {/* ========== DETAILED DAILY TABLE ========== */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Calendar className="w-5 h-5 text-green-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Detailed Daily Records</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b-2 border-gray-300 bg-gray-50">
                  <th className="text-left py-3 px-3 text-sm font-semibold text-gray-700">Date</th>
                  <th className="text-right py-3 px-3 text-sm font-semibold text-gray-700">Slabs</th>
                  <th className="text-right py-3 px-3 text-sm font-semibold text-gray-700">Sq Ft</th>
                  <th className="text-right py-3 px-3 text-sm font-semibold text-gray-700">Hours</th>
                  <th className="text-right py-3 px-3 text-sm font-semibold text-gray-700">Productivity</th>
                  <th className="text-right py-3 px-3 text-sm font-semibold text-gray-700">Labor Cost</th>
                  <th className="text-right py-3 px-3 text-sm font-semibold text-gray-700">Cost/Slab</th>
                  <th className="text-right py-3 px-3 text-sm font-semibold text-gray-700">Cost/SqFt</th>
                </tr>
              </thead>
              <tbody>
                {dailyTrends.slice(0, 30).map((trend, index) => {
                  const productivityRate = trend.hours > 0 ? trend.sqft / trend.hours : 0;
                  const costPerSlab = trend.slabs > 0 ? trend.debit / trend.slabs : 0;
                  const costPerSqft = trend.sqft > 0 ? trend.debit / trend.sqft : 0;
                  
                  return (
                    <tr key={index} className="border-b border-gray-100 hover:bg-blue-50 transition-colors">
                      <td className="py-3 px-3 text-sm font-medium text-gray-900">
                        {formatDisplayDate(trend.date)}
                      </td>
                      <td className="py-3 px-3 text-sm text-right font-semibold text-gray-900">{trend.slabs}</td>
                      <td className="py-3 px-3 text-sm text-right font-semibold text-gray-900">{trend.sqft.toLocaleString()}</td>
                      <td className="py-3 px-3 text-sm text-right text-blue-600">{trend.hours.toFixed(1)}</td>
                      <td className="py-3 px-3 text-sm text-right font-semibold text-green-600">
                        {productivityRate.toFixed(0)} sqft/hr
                      </td>
                      <td className="py-3 px-3 text-sm text-right font-semibold text-red-600">
                        {fmt(trend.debit)}
                      </td>
                      <td className="py-3 px-3 text-sm text-right text-gray-600">
                        {fmtDecimal(costPerSlab)}
                      </td>
                      <td className="py-3 px-3 text-sm text-right text-gray-600">
                        {fmtDecimal(costPerSqft)}
                      </td>
                    </tr>
                  );
                })}
                {dailyTrends.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-500">
                      No production data available for the selected period
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
