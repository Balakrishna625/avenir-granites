'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  BarChart3, 
  Factory, 
  Users, 
  Layers,
  Clock,
  DollarSign,
  TrendingUp,
  Calendar,
  ArrowLeft,
  Plus,
  Wrench
} from 'lucide-react';
import Link from 'next/link';

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const fmt = (n: number) => INR.format(n || 0);

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
    <div className="min-h-screen w-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Production Management</h1>
              <p className="text-sm text-gray-600">Line polish reports and analytics</p>
            </div>
          </div>
          <Link href="/production/line-polish">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Line Polish Report
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <select 
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
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
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
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
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="flex items-end">
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
        </Card>

        {/* Summary KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Entries</p>
                <p className="text-2xl font-bold text-gray-900">{summary.total_entries || 0}</p>
              </div>
              <Factory className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Workers</p>
                <p className="text-2xl font-bold text-gray-900">{summary.total_workers || 0}</p>
              </div>
              <Users className="w-8 h-8 text-green-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Slabs</p>
                <p className="text-2xl font-bold text-gray-900">{summary.total_slabs || 0}</p>
              </div>
              <Layers className="w-8 h-8 text-purple-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total SqFt</p>
                <p className="text-2xl font-bold text-gray-900">{(summary.total_sqft || 0).toLocaleString()}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-orange-500" />
            </div>
          </Card>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Hours</p>
                <p className="text-2xl font-bold text-gray-900">{(summary.total_hours || 0).toFixed(1)}</p>
              </div>
              <Clock className="w-8 h-8 text-indigo-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Debit</p>
                <p className="text-2xl font-bold text-red-600">{fmt(summary.total_debit || 0)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-red-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Credit</p>
                <p className="text-2xl font-bold text-green-600">{fmt(summary.total_credit || 0)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Balance Due</p>
                <p className={`text-2xl font-bold ${(summary.balance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {fmt(summary.balance || 0)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
        </div>

        {/* Shift & Activity Breakdown */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Wrench className="w-5 h-5 mr-2 text-blue-500" />
            Shift & Activity Breakdown
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {shiftBreakdown.map((item, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">
                    {item.shift === 'MORNING' ? 'Morning' : 'Night'} - {item.activity}
                  </h4>
                  <span className="text-sm text-gray-600">{item.entries} entries</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Workers:</span>
                    <span className="font-medium">{item.workers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Slabs:</span>
                    <span className="font-medium">{item.slabs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">SqFt:</span>
                    <span className="font-medium">{item.sqft.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Hours:</span>
                    <span className="font-medium">{item.hours.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-medium text-red-600">{fmt(item.debit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Rate:</span>
                    <span className="font-medium">{fmt(item.avg_rate)}/hr</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Daily Trends */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-green-500" />
            Recent Daily Activity
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Date</th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Workers</th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Slabs</th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">SqFt</th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Hours</th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Amount</th>
                </tr>
              </thead>
              <tbody>
                {dailyTrends.slice(0, 10).map((trend, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 text-sm font-medium">
                      {new Date(trend.date).toLocaleDateString()}
                    </td>
                    <td className="py-2 px-3 text-sm text-right">{trend.workers}</td>
                    <td className="py-2 px-3 text-sm text-right">{trend.slabs}</td>
                    <td className="py-2 px-3 text-sm text-right">{trend.sqft.toLocaleString()}</td>
                    <td className="py-2 px-3 text-sm text-right">{trend.hours.toFixed(1)}</td>
                    <td className="py-2 px-3 text-sm text-right font-medium text-red-600">
                      {fmt(trend.debit)}
                    </td>
                  </tr>
                ))}
                {dailyTrends.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      No production data available for the selected period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}