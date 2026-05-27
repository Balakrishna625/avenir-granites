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
  remarks?: string[]; // Array of remarks/notes for this day
}

interface ProductionAnalytics {
  summary: AnalyticsSummary;
  shift_breakdown: ShiftBreakdown[];
  daily_trends: DailyTrend[];
}

interface LinePolishReport {
  id: string;
  date: string;
  shift: 'MORNING' | 'NIGHT';
  activity: string;
  activities?: Array<{
    block_name?: string;
    activity: string;
    slabs: number;
    sqft: number;
    grade?: string; // Optional: Blackline, White line, Fresh, Patch, Variation
  }>;
  no_of_workers: number;
  number_of_slabs: number;
  total_slabs?: number;
  total_sqft: number;
  no_of_hours: number;
  rate_per_hour: number;
  debit_amount: number;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export default function ProductionPage() {
  const [analytics, setAnalytics] = useState<ProductionAnalytics | null>(null);
  const [linePolishReports, setLinePolishReports] = useState<LinePolishReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    loadAnalytics();
    loadLinePolishReports();
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

  async function loadLinePolishReports() {
    try {
      const params = new URLSearchParams();
      
      if (selectedMonth && selectedYear) {
        params.set('month', selectedMonth);
        params.set('year', selectedYear);
      } else {
        if (dateFrom) params.set('from', dateFrom);
        if (dateTo) params.set('to', dateTo);
      }
      
      const response = await fetch(`/api/line-polish-reports?${params.toString()}`);
      const data = await response.json();
      setLinePolishReports(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load line polish reports:', error);
      setLinePolishReports([]);
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
                className="text-sm"
                placeholder="Select start date"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-sm"
                placeholder="Select end date"
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
                {/* Display remarks/notes if available */}
                {worstDay.remarks && worstDay.remarks.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-red-200">
                    <p className="text-xs font-semibold text-red-800 mb-1">Notes/Comments:</p>
                    <div className="space-y-1">
                      {worstDay.remarks.map((remark: string, idx: number) => (
                        <p key={idx} className="text-xs text-red-700 bg-white px-2 py-1 rounded">
                          • {remark}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
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

        {/* ========== ACTIVITY SUMMARY ========== */}
        <Card className="p-6">
          <div className="flex items-center mb-1">
            <BarChart3 className="w-5 h-5 text-indigo-600 mr-2" />
            <h3 className="text-lg font-semibold text-indigo-900">
              Activity Summary
              {selectedMonth && selectedYear
                ? ` for ${new Date(`${selectedYear}-${selectedMonth.padStart(2, '0')}-01`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`
                : ''}
            </h3>
          </div>
          <p className="text-sm text-indigo-600 mb-4">Material-wise breakdown of polished/ground slabs</p>

          {(() => {
            const activitySummary: Record<string, { slabs: number; sqft: number }> = {};

            linePolishReports.forEach(report => {
              if (report.activities && Array.isArray(report.activities)) {
                report.activities.forEach((act: any) => {
                  const name = act.activity;
                  if (!activitySummary[name]) activitySummary[name] = { slabs: 0, sqft: 0 };
                  activitySummary[name].slabs += act.slabs || 0;
                  activitySummary[name].sqft += act.sqft || 0;
                });
              } else if (report.activity) {
                const name = report.activity;
                if (!activitySummary[name]) activitySummary[name] = { slabs: 0, sqft: 0 };
                activitySummary[name].slabs += report.number_of_slabs || 0;
                activitySummary[name].sqft += report.total_sqft || 0;
              }
            });

            const sortedActivities = Object.entries(activitySummary).sort(([, a], [, b]) => b.slabs - a.slabs);

            const graniteTypeSummary: Record<string, { slabs: number; sqft: number }> = {
              'S/G (Sadarahalli)': { slabs: 0, sqft: 0 },
              'B/P (Black Pearl)': { slabs: 0, sqft: 0 },
              'Burgandy': { slabs: 0, sqft: 0 },
            };
            sortedActivities.forEach(([activity, stats]) => {
              if (activity.startsWith('S/G')) {
                graniteTypeSummary['S/G (Sadarahalli)'].slabs += stats.slabs;
                graniteTypeSummary['S/G (Sadarahalli)'].sqft += stats.sqft;
              } else if (activity.startsWith('B/P')) {
                graniteTypeSummary['B/P (Black Pearl)'].slabs += stats.slabs;
                graniteTypeSummary['B/P (Black Pearl)'].sqft += stats.sqft;
              } else if (activity.startsWith('Burgandy') || activity.startsWith('Burgandy')) {
                graniteTypeSummary['Burgandy'].slabs += stats.slabs;
                graniteTypeSummary['Burgandy'].sqft += stats.sqft;
              }
            });

            if (sortedActivities.length === 0) {
              return (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No activity data for the selected period</p>
                </div>
              );
            }

            return (
              <>
                {/* Granite Type Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-indigo-50 rounded-lg border mb-4">
                  {Object.entries(graniteTypeSummary).map(([type, stats]) =>
                    stats.slabs > 0 ? (
                      <Card key={type} className="p-3">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">{type}</h4>
                        <p className="text-xs text-gray-600">
                          Slabs: <span className="font-bold text-indigo-600">{stats.slabs.toLocaleString('en-IN')}</span>
                        </p>
                        <p className="text-xs text-gray-600">
                          Sqft: <span className="font-bold text-indigo-600">{stats.sqft.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                        </p>
                      </Card>
                    ) : null
                  )}
                </div>

                {/* Detailed Activity Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Activity Type</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700">Total Slabs</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700">Total Sqft</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedActivities.map(([activity, stats]) => (
                        <tr key={activity} className="border-b hover:bg-indigo-50">
                          <td className="py-3 px-4 font-medium text-gray-900">{activity}</td>
                          <td className="py-3 px-4 text-right font-semibold text-indigo-600 text-lg">
                            {stats.slabs.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-indigo-600 text-lg">
                            {stats.sqft.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t-2 bg-indigo-50 font-bold">
                        <td className="py-3 px-4 text-gray-900 text-lg">TOTAL</td>
                        <td className="py-3 px-4 text-right text-indigo-700 text-lg">
                          {sortedActivities.reduce((s, [, v]) => s + v.slabs, 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right text-indigo-700 text-lg">
                          {sortedActivities.reduce((s, [, v]) => s + v.sqft, 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}
        </Card>

        {/* ========== GRADE-WISE BREAKDOWN ========== */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Award className="w-5 h-5 text-amber-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Quality Grade Breakdown</h3>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-6">Polished slabs categorized by material type and quality grade</p>
          
          {(() => {
            // Helper function to determine material type from block name
            const getMaterialType = (blockName: string): 'S/G' | 'B/P' | 'Burgandy' => {
              if (!blockName) return 'S/G'; // Default to S/G
              
              const normalized = blockName.toUpperCase().trim();
              
              // Check for specific prefixes
              if (normalized.startsWith('SJ') || normalized.startsWith('SL') || 
                  normalized.startsWith('VR') || normalized.startsWith('AVG')) {
                return 'S/G';
              }
              
              if (normalized.startsWith('GK')) {
                return 'B/P';
              }
              
              if (normalized.startsWith('BG')) {
                return 'Burgandy';
              }
              
              // Default to S/G if no match
              return 'S/G';
            };

            // Calculate grade-wise statistics grouped by material type
            interface GradeStats {
              grade: string;
              material: string;
              totalSlabs: number;
              totalSqft: number;
              blocks: Map<string, { slabs: number; sqft: number }>;
              color: string;
              bgColor: string;
            }

            const gradeStatsMap = new Map<string, GradeStats>(); // Key: "material-grade"
            
            // Define grade colors
            const gradeColors: Record<string, { color: string; bgColor: string }> = {
              'Blackline': { color: 'text-gray-900', bgColor: 'bg-gray-100' },
              'White line': { color: 'text-blue-900', bgColor: 'bg-blue-100' },
              'Fresh': { color: 'text-green-900', bgColor: 'bg-green-100' },
              'Patch': { color: 'text-orange-900', bgColor: 'bg-orange-100' },
              'Variation': { color: 'text-purple-900', bgColor: 'bg-purple-100' }
            };

            // Process all line polish reports to extract grade data
            linePolishReports.forEach(report => {
              if (report.activities && Array.isArray(report.activities)) {
                report.activities.forEach(activity => {
                  // Only process polishing activities with grade
                  if (activity.grade && activity.activity.toLowerCase().includes('polish')) {
                    const grade = activity.grade;
                    const material = getMaterialType(activity.block_name || '');
                    const key = `${material}-${grade}`;
                    
                    if (!gradeStatsMap.has(key)) {
                      gradeStatsMap.set(key, {
                        grade,
                        material,
                        totalSlabs: 0,
                        totalSqft: 0,
                        blocks: new Map(),
                        color: gradeColors[grade]?.color || 'text-gray-900',
                        bgColor: gradeColors[grade]?.bgColor || 'bg-gray-100'
                      });
                    }

                    const gradeStats = gradeStatsMap.get(key)!;
                    gradeStats.totalSlabs += activity.slabs || 0;
                    gradeStats.totalSqft += activity.sqft || 0;

                    // Track block-level data
                    if (activity.block_name) {
                      const blockName = activity.block_name;
                      if (!gradeStats.blocks.has(blockName)) {
                        gradeStats.blocks.set(blockName, { slabs: 0, sqft: 0 });
                      }
                      const blockData = gradeStats.blocks.get(blockName)!;
                      blockData.slabs += activity.slabs || 0;
                      blockData.sqft += activity.sqft || 0;
                    }
                  }
                });
              }
            });

            // Group by material type
            const materialGroups = new Map<string, GradeStats[]>();
            Array.from(gradeStatsMap.values()).forEach(gradeStats => {
              if (!materialGroups.has(gradeStats.material)) {
                materialGroups.set(gradeStats.material, []);
              }
              materialGroups.get(gradeStats.material)!.push(gradeStats);
            });

            // Sort each material group by sqft descending
            materialGroups.forEach(grades => {
              grades.sort((a, b) => b.totalSqft - a.totalSqft);
            });

            if (gradeStatsMap.size === 0) {
              return (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Award className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No graded polishing data available for the selected period</p>
                </div>
              );
            }

            // Define material order and display names
            const materialOrder: Array<{ key: 'S/G' | 'B/P' | 'Burgandy'; label: string }> = [
              { key: 'S/G', label: 'Steel Grey' },
              { key: 'B/P', label: 'Black Pearl' },
              { key: 'Burgandy', label: 'Burgandy' }
            ];

            return (
              <div className="space-y-6">
                {materialOrder.map(({ key, label }) => {
                  const grades = materialGroups.get(key);
                  if (!grades || grades.length === 0) return null;

                  return (
                    <div key={key}>
                      <h4 className="text-md font-bold text-gray-800 mb-3">
                        {label}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {grades.map(gradeStats => {
                          // Sort blocks by sqft descending
                          const sortedBlocks = Array.from(gradeStats.blocks.entries())
                            .sort((a, b) => b[1].sqft - a[1].sqft);

                          return (
                            <Card key={`${key}-${gradeStats.grade}`} className={`p-4 border-l-4 ${gradeStats.bgColor.replace('bg-', 'border-l-')}`}>
                              <div className="flex items-center justify-between mb-3">
                                <h5 className={`text-lg font-bold ${gradeStats.color}`}>
                                  {gradeStats.grade}
                                </h5>
                                <Award className={`w-5 h-5 ${gradeStats.color}`} />
                              </div>
                              
                              <div className="space-y-2 mb-4">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600">Total Slabs:</span>
                                  <span className="text-lg font-bold text-gray-900">{gradeStats.totalSlabs}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600">Total Sq Ft:</span>
                                  <span className="text-lg font-bold text-gray-900">{gradeStats.totalSqft.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600">Blocks:</span>
                                  <span className="text-sm font-semibold text-gray-900">{gradeStats.blocks.size}</span>
                                </div>
                              </div>

                              {sortedBlocks.length > 0 && (
                                <div className="border-t pt-3">
                                  <p className="text-xs font-semibold text-gray-700 mb-2">Block Details:</p>
                                  <div className="max-h-48 overflow-y-auto">
                                    <table className="w-full text-xs">
                                      <tbody>
                                        {sortedBlocks.map(([blockName, blockData]) => (
                                          <tr key={blockName} className="border-b border-gray-100 last:border-0">
                                            <td className="py-1.5 font-medium text-gray-700 text-left">{blockName}</td>
                                            <td className="py-1.5 text-gray-600 text-center w-20">{blockData.slabs} slabs</td>
                                            <td className="py-1.5 text-gray-900 font-medium text-right w-28">{blockData.sqft.toLocaleString('en-IN')} sqft</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </Card>

        {/* ========== SLAB PROCESSING FLOW ANALYSIS ========== */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center">
                <BarChart3 className="w-5 h-5 text-purple-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Slab Processing Flow Analysis</h3>
              </div>
              <p className="text-sm text-gray-600 mt-1">Track how slabs move through grinding and polishing stages</p>
            </div>
          </div>

          <div className="space-y-6">
            {(() => {
              // Helper function to normalize block names with chronological sorting
              const normalizeBlockName = (blockName: string): { normalized: string; blockGroup: string; sortKey: string } => {
                if (!blockName) return { normalized: '', blockGroup: '', sortKey: '' };
                
                // Remove spaces and standardize separators
                let normalized = blockName.toUpperCase().trim();
                normalized = normalized.replace(/\s+/g, ''); // Remove all spaces
                normalized = normalized.replace(/--+/g, '-'); // Replace multiple dashes with single dash
                
                // Extract block group and remove leading zeros from numbers
                // e.g., AVG-01A → AVG-1A, AVG-001B → AVG-1B (so AVG-01A and AVG-1A are treated as same)
                const match = normalized.match(/^([A-Z]+)-?(\d+)([A-Z]*)$/);
                if (match) {
                  const prefix = match[1];
                  const numberWithoutLeadingZeros = parseInt(match[2], 10).toString(); // Remove leading zeros
                  const suffix = match[3];
                  normalized = `${prefix}-${numberWithoutLeadingZeros}${suffix}`;
                  
                  // Block group also needs normalized number (AVG-06 and AVG-6 should both become AVG-6)
                  const blockGroup = `${prefix}-${numberWithoutLeadingZeros}`;
                  
                  // Create sort key: prefix + numeric part for proper chronological ordering
                  // AVG-1, AVG-2, AVG-10 will sort as 1, 2, 10 (not 1, 10, 2)
                  const sortKey = `${prefix}-${numberWithoutLeadingZeros.padStart(5, '0')}`;
                  
                  return { normalized, blockGroup, sortKey };
                }
                
                // Fallback for non-matching patterns
                return { normalized, blockGroup: normalized, sortKey: normalized };
              };

              // Process all line polish activities and group by normalized block name
              interface BlockProcessing {
                blockName: string;
                blockGroup: string;
                sortKey: string;
                dates: Set<string>; // Track all dates when this block was processed
                directPolish: number;
                directPolishSqft: number;
                grindThenPolish: number;
                grindThenPolishSqft: number;
                directLaputra: number;
                directLaputraSqft: number;
                laputraGrindThenLaputra: number;
                laputraGrindThenLaputraSqft: number;
                grindingOnly: number;
                grindingOnlySqft: number;
                laputraGrindingOnly: number;
                laputraGrindingOnlySqft: number;
                totalProcessed: number;
                totalProcessedSqft: number;
              }

              const blockProcessing: Record<string, BlockProcessing> = {};

              linePolishReports.forEach(report => {
                if (report.activities && Array.isArray(report.activities)) {
                  report.activities.forEach((act: any) => {
                    const blockNameRaw = act.block_name || '';
                    const { normalized, blockGroup, sortKey } = normalizeBlockName(blockNameRaw);
                    
                    if (!normalized) return;

                    if (!blockProcessing[normalized]) {
                      blockProcessing[normalized] = {
                        blockName: normalized,
                        blockGroup: blockGroup,
                        sortKey: sortKey,
                        dates: new Set<string>(),
                        directPolish: 0,
                        directPolishSqft: 0,
                        grindThenPolish: 0,
                        grindThenPolishSqft: 0,
                        directLaputra: 0,
                        directLaputraSqft: 0,
                        laputraGrindThenLaputra: 0,
                        laputraGrindThenLaputraSqft: 0,
                        grindingOnly: 0,
                        grindingOnlySqft: 0,
                        laputraGrindingOnly: 0,
                        laputraGrindingOnlySqft: 0,
                        totalProcessed: 0,
                        totalProcessedSqft: 0
                      };
                    }

                    // Track the date when this block was processed
                    blockProcessing[normalized].dates.add(report.date);

                    const activity = act.activity;
                    const slabs = act.slabs || 0;
                    const sqft = act.sqft || 0;

                    // Categorize activities
                    if (activity.includes('Polishing') && !activity.includes('Polish Grinding')) {
                      const hasGrindingActivity = report.activities!.some((a: any) => 
                        normalizeBlockName(a.block_name || '').normalized === normalized && 
                        (a.activity.includes('Grinding') || a.activity.includes('Polish Grinding'))
                      );
                      
                      if (hasGrindingActivity) {
                        blockProcessing[normalized].grindThenPolish += slabs;
                        blockProcessing[normalized].grindThenPolishSqft += sqft;
                      } else {
                        blockProcessing[normalized].directPolish += slabs;
                        blockProcessing[normalized].directPolishSqft += sqft;
                      }
                    } else if (activity.includes('Laputra') && !activity.includes('Laputra Grinding')) {
                      const hasLaputraGrinding = report.activities!.some((a: any) => 
                        normalizeBlockName(a.block_name || '').normalized === normalized && 
                        a.activity.includes('Laputra Grinding')
                      );
                      
                      if (hasLaputraGrinding) {
                        blockProcessing[normalized].laputraGrindThenLaputra += slabs;
                        blockProcessing[normalized].laputraGrindThenLaputraSqft += sqft;
                      } else {
                        blockProcessing[normalized].directLaputra += slabs;
                        blockProcessing[normalized].directLaputraSqft += sqft;
                      }
                    } else if (activity.includes('Laputra Grinding')) {
                      const hasLaputraActivity = report.activities!.some((a: any) => 
                        normalizeBlockName(a.block_name || '').normalized === normalized && 
                        a.activity.includes('Laputra') && !a.activity.includes('Laputra Grinding')
                      );
                      
                      if (!hasLaputraActivity) {
                        blockProcessing[normalized].laputraGrindingOnly += slabs;
                        blockProcessing[normalized].laputraGrindingOnlySqft += sqft;
                      }
                    } else if (activity.includes('Grinding') || activity.includes('Polish Grinding')) {
                      const hasPolishActivity = report.activities!.some((a: any) => 
                        normalizeBlockName(a.block_name || '').normalized === normalized && 
                        a.activity.includes('Polishing') && !a.activity.includes('Polish Grinding')
                      );
                      
                      if (!hasPolishActivity) {
                        blockProcessing[normalized].grindingOnly += slabs;
                        blockProcessing[normalized].grindingOnlySqft += sqft;
                      }
                    }

                    blockProcessing[normalized].totalProcessed += slabs;
                    blockProcessing[normalized].totalProcessedSqft += sqft;
                  });
                }
              });

              // Group by block group
              const blockGroupSummary: Record<string, {
                blockNames: string[];
                dates: Set<string>; // Track all dates for this block group
                sortKey: string;
                directPolish: number;
                directPolishSqft: number;
                grindThenPolish: number;
                grindThenPolishSqft: number;
                directLaputra: number;
                directLaputraSqft: number;
                laputraGrindThenLaputra: number;
                laputraGrindThenLaputraSqft: number;
                grindingOnly: number;
                grindingOnlySqft: number;
                laputraGrindingOnly: number;
                laputraGrindingOnlySqft: number;
                totalProcessed: number;
                totalProcessedSqft: number;
              }> = {};

              Object.values(blockProcessing).forEach(block => {
                if (!blockGroupSummary[block.blockGroup]) {
                  blockGroupSummary[block.blockGroup] = {
                    blockNames: [],
                    dates: new Set<string>(),
                    sortKey: block.sortKey,
                    directPolish: 0,
                    directPolishSqft: 0,
                    grindThenPolish: 0,
                    grindThenPolishSqft: 0,
                    directLaputra: 0,
                    directLaputraSqft: 0,
                    laputraGrindThenLaputra: 0,
                    laputraGrindThenLaputraSqft: 0,
                    grindingOnly: 0,
                    grindingOnlySqft: 0,
                    laputraGrindingOnly: 0,
                    laputraGrindingOnlySqft: 0,
                    totalProcessed: 0,
                    totalProcessedSqft: 0
                  };
                }

                blockGroupSummary[block.blockGroup].blockNames.push(block.blockName);
                // Merge dates from this block into the group
                block.dates.forEach(date => blockGroupSummary[block.blockGroup].dates.add(date));
                blockGroupSummary[block.blockGroup].directPolish += block.directPolish;
                blockGroupSummary[block.blockGroup].directPolishSqft += block.directPolishSqft;
                blockGroupSummary[block.blockGroup].grindThenPolish += block.grindThenPolish;
                blockGroupSummary[block.blockGroup].grindThenPolishSqft += block.grindThenPolishSqft;
                blockGroupSummary[block.blockGroup].directLaputra += block.directLaputra;
                blockGroupSummary[block.blockGroup].directLaputraSqft += block.directLaputraSqft;
                blockGroupSummary[block.blockGroup].laputraGrindThenLaputra += block.laputraGrindThenLaputra;
                blockGroupSummary[block.blockGroup].laputraGrindThenLaputraSqft += block.laputraGrindThenLaputraSqft;
                blockGroupSummary[block.blockGroup].grindingOnly += block.grindingOnly;
                blockGroupSummary[block.blockGroup].grindingOnlySqft += block.grindingOnlySqft;
                blockGroupSummary[block.blockGroup].laputraGrindingOnly += block.laputraGrindingOnly;
                blockGroupSummary[block.blockGroup].laputraGrindingOnlySqft += block.laputraGrindingOnlySqft;
                blockGroupSummary[block.blockGroup].totalProcessed += block.totalProcessed;
                blockGroupSummary[block.blockGroup].totalProcessedSqft += block.totalProcessedSqft;
              });

              // Sort chronologically by sortKey (AVG-1, AVG-2, AVG-10)
              const sortedBlocks = Object.entries(blockGroupSummary)
                .sort(([, a], [, b]) => a.sortKey.localeCompare(b.sortKey));

              if (sortedBlocks.length === 0) {
                return (
                  <div className="text-center py-8">
                    <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No processing flow data available for this period.</p>
                  </div>
                );
              }

              return (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <h4 className="text-sm font-semibold text-blue-900">Direct Polish</h4>
                      </div>
                      <p className="text-2xl font-bold text-blue-700">
                        {sortedBlocks.reduce((sum, [, data]) => sum + data.directPolish, 0).toLocaleString('en-IN')} slabs
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        {sortedBlocks.reduce((sum, [, data]) => sum + data.directPolishSqft, 0).toLocaleString('en-IN')} sqft
                      </p>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <h4 className="text-sm font-semibold text-green-900">Grind → Polish</h4>
                      </div>
                      <p className="text-2xl font-bold text-green-700">
                        {sortedBlocks.reduce((sum, [, data]) => sum + data.grindThenPolish, 0).toLocaleString('en-IN')} slabs
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        {sortedBlocks.reduce((sum, [, data]) => sum + data.grindThenPolishSqft, 0).toLocaleString('en-IN')} sqft
                      </p>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                        <h4 className="text-sm font-semibold text-purple-900">Direct Laputra</h4>
                      </div>
                      <p className="text-2xl font-bold text-purple-700">
                        {sortedBlocks.reduce((sum, [, data]) => sum + data.directLaputra, 0).toLocaleString('en-IN')} slabs
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        {sortedBlocks.reduce((sum, [, data]) => sum + data.directLaputraSqft, 0).toLocaleString('en-IN')} sqft
                      </p>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                        <h4 className="text-sm font-semibold text-amber-900">Laputra Flow</h4>
                      </div>
                      <p className="text-2xl font-bold text-amber-700">
                        {sortedBlocks.reduce((sum, [, data]) => sum + data.laputraGrindThenLaputra, 0).toLocaleString('en-IN')} slabs
                      </p>
                      <p className="text-xs text-amber-600 mt-1">
                        {sortedBlocks.reduce((sum, [, data]) => sum + data.laputraGrindThenLaputraSqft, 0).toLocaleString('en-IN')} sqft
                      </p>
                    </div>
                  </div>

                  {/* In-Progress Slabs */}
                  {(sortedBlocks.reduce((sum, [, data]) => sum + data.grindingOnly + data.laputraGrindingOnly, 0) > 0) && (
                    <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-5 h-5 text-yellow-600" />
                        <h4 className="text-sm font-semibold text-yellow-900">In-Progress Slabs (Awaiting Final Polish)</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-yellow-700 mb-1">Grinding Only (Not Yet Polished)</p>
                          <p className="text-xl font-bold text-yellow-800">
                            {sortedBlocks.reduce((sum, [, data]) => sum + data.grindingOnly, 0).toLocaleString('en-IN')} slabs
                          </p>
                          <p className="text-xs text-yellow-600 mt-1">
                            {sortedBlocks.reduce((sum, [, data]) => sum + data.grindingOnlySqft, 0).toLocaleString('en-IN')} sqft
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-yellow-700 mb-1">Laputra Grinding Only (Not Yet Laputra)</p>
                          <p className="text-xl font-bold text-yellow-800">
                            {sortedBlocks.reduce((sum, [, data]) => sum + data.laputraGrindingOnly, 0).toLocaleString('en-IN')} slabs
                          </p>
                          <p className="text-xs text-yellow-600 mt-1">
                            {sortedBlocks.reduce((sum, [, data]) => sum + data.laputraGrindingOnlySqft, 0).toLocaleString('en-IN')} sqft
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Detailed Block-wise Table */}
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-purple-50">
                          <th className="text-left py-3 px-4 font-medium text-purple-900">Block Group</th>
                          <th className="text-left py-3 px-4 font-medium text-purple-900 text-xs">Parts Processed</th>
                          <th className="text-right py-3 px-4 font-medium text-blue-700">Direct Polish</th>
                          <th className="text-right py-3 px-4 font-medium text-green-700">Grind→Polish</th>
                          <th className="text-right py-3 px-4 font-medium text-purple-700">Direct Laputra</th>
                          <th className="text-right py-3 px-4 font-medium text-amber-700">Laputra Flow</th>
                          <th className="text-right py-3 px-4 font-medium text-yellow-700">In Progress</th>
                          <th className="text-right py-3 px-4 font-medium text-purple-900">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedBlocks.map(([blockGroup, data]) => (
                          <tr key={blockGroup} className="border-b hover:bg-purple-50 transition-colors">
                            <td className="py-3 px-4">
                              <span className="font-semibold text-gray-900">{blockGroup}</span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-col gap-1">
                                <span className="text-xs text-gray-600">
                                  {data.blockNames.sort().join(', ')}
                                </span>
                                <span className="text-xs text-blue-600 font-medium">
                                  {Array.from(data.dates).sort().map(date => formatDisplayDate(date)).join(', ')}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              {data.directPolish > 0 ? (
                                <div className="flex flex-col items-end">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                                    {data.directPolish} slabs
                                  </span>
                                  <span className="text-xs text-gray-500 mt-1">{data.directPolishSqft.toLocaleString('en-IN')} sqft</span>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {data.grindThenPolish > 0 ? (
                                <div className="flex flex-col items-end">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                    {data.grindThenPolish} slabs
                                  </span>
                                  <span className="text-xs text-gray-500 mt-1">{data.grindThenPolishSqft.toLocaleString('en-IN')} sqft</span>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {data.directLaputra > 0 ? (
                                <div className="flex flex-col items-end">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                                    {data.directLaputra} slabs
                                  </span>
                                  <span className="text-xs text-gray-500 mt-1">{data.directLaputraSqft.toLocaleString('en-IN')} sqft</span>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {data.laputraGrindThenLaputra > 0 ? (
                                <div className="flex flex-col items-end">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                                    {data.laputraGrindThenLaputra} slabs
                                  </span>
                                  <span className="text-xs text-gray-500 mt-1">{data.laputraGrindThenLaputraSqft.toLocaleString('en-IN')} sqft</span>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {(data.grindingOnly + data.laputraGrindingOnly) > 0 ? (
                                <div className="flex flex-col items-end">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                                    {data.grindingOnly + data.laputraGrindingOnly} slabs
                                  </span>
                                  <span className="text-xs text-gray-500 mt-1">
                                    {(data.grindingOnlySqft + data.laputraGrindingOnlySqft).toLocaleString('en-IN')} sqft
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex flex-col items-end">
                                <span className="font-bold text-purple-700 text-lg">
                                  {data.totalProcessed.toLocaleString('en-IN')} slabs
                                </span>
                                <span className="text-xs text-gray-500 mt-1">{data.totalProcessedSqft.toLocaleString('en-IN')} sqft</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {/* Total Row */}
                        <tr className="border-t-2 bg-purple-100 font-bold">
                          <td className="py-3 px-4 text-purple-900 text-lg" colSpan={2}>TOTAL</td>
                          <td className="py-3 px-4 text-right text-blue-700">
                            <div className="flex flex-col items-end">
                              <span>{sortedBlocks.reduce((sum, [, data]) => sum + data.directPolish, 0).toLocaleString('en-IN')} slabs</span>
                              <span className="text-xs">{sortedBlocks.reduce((sum, [, data]) => sum + data.directPolishSqft, 0).toLocaleString('en-IN')} sqft</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right text-green-700">
                            <div className="flex flex-col items-end">
                              <span>{sortedBlocks.reduce((sum, [, data]) => sum + data.grindThenPolish, 0).toLocaleString('en-IN')} slabs</span>
                              <span className="text-xs">{sortedBlocks.reduce((sum, [, data]) => sum + data.grindThenPolishSqft, 0).toLocaleString('en-IN')} sqft</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right text-purple-700">
                            <div className="flex flex-col items-end">
                              <span>{sortedBlocks.reduce((sum, [, data]) => sum + data.directLaputra, 0).toLocaleString('en-IN')} slabs</span>
                              <span className="text-xs">{sortedBlocks.reduce((sum, [, data]) => sum + data.directLaputraSqft, 0).toLocaleString('en-IN')} sqft</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right text-amber-700">
                            <div className="flex flex-col items-end">
                              <span>{sortedBlocks.reduce((sum, [, data]) => sum + data.laputraGrindThenLaputra, 0).toLocaleString('en-IN')} slabs</span>
                              <span className="text-xs">{sortedBlocks.reduce((sum, [, data]) => sum + data.laputraGrindThenLaputraSqft, 0).toLocaleString('en-IN')} sqft</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right text-yellow-700">
                            <div className="flex flex-col items-end">
                              <span>{sortedBlocks.reduce((sum, [, data]) => sum + data.grindingOnly + data.laputraGrindingOnly, 0).toLocaleString('en-IN')} slabs</span>
                              <span className="text-xs">{sortedBlocks.reduce((sum, [, data]) => sum + data.grindingOnlySqft + data.laputraGrindingOnlySqft, 0).toLocaleString('en-IN')} sqft</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right text-purple-900 text-lg">
                            <div className="flex flex-col items-end">
                              <span>{sortedBlocks.reduce((sum, [, data]) => sum + data.totalProcessed, 0).toLocaleString('en-IN')} slabs</span>
                              <span className="text-xs">{sortedBlocks.reduce((sum, [, data]) => sum + data.totalProcessedSqft, 0).toLocaleString('en-IN')} sqft</span>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Processing Insights */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Processing Insights
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <p className="text-gray-700">
                          <span className="font-semibold">
                            {Math.round((sortedBlocks.reduce((sum, [, data]) => sum + data.directPolish, 0) / Math.max(sortedBlocks.reduce((sum, [, data]) => sum + data.totalProcessed, 0), 1)) * 100)}%
                          </span> of slabs were polished directly (no grinding needed)
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <p className="text-gray-700">
                          <span className="font-semibold">
                            {Math.round((sortedBlocks.reduce((sum, [, data]) => sum + data.grindThenPolish, 0) / Math.max(sortedBlocks.reduce((sum, [, data]) => sum + data.totalProcessed, 0), 1)) * 100)}%
                          </span> of slabs required grinding before polishing
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                        <p className="text-gray-700">
                          <span className="font-semibold">
                            {Math.round(((sortedBlocks.reduce((sum, [, data]) => sum + data.directLaputra + data.laputraGrindThenLaputra, 0)) / Math.max(sortedBlocks.reduce((sum, [, data]) => sum + data.totalProcessed, 0), 1)) * 100)}%
                          </span> of slabs went through laputra processing
                        </p>
                      </div>
                      {(sortedBlocks.reduce((sum, [, data]) => sum + data.grindingOnly + data.laputraGrindingOnly, 0) > 0) && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                          <p className="text-gray-700">
                            <span className="font-semibold">
                              {sortedBlocks.reduce((sum, [, data]) => sum + data.grindingOnly + data.laputraGrindingOnly, 0)}
                            </span> slabs are currently in-progress (ground but not yet polished)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
