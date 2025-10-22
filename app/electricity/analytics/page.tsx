'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { AppLayout } from '@/components/AppLayout';
import { TrendingUp, Zap, Factory, DollarSign, Activity, AlertCircle, Info, TrendingDown, Minus } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';

interface MonthlyData {
  month: string;
  bill_date: string;
  bill_number: string;
  kwh_consumption: number;
  total_cost: number;
  demand_kva: number;
  power_factor: number;
  cost_per_kwh: number;
  fixed_charges: number;
  variable_charges: number;
  demand_charges: number;
  energy_charges: number;
  tod_charges: number;
  arrears: number;
  consumption_change: number;
  cost_change: number;
  pf_change: number;
  demand_change: number;
}

interface Stats {
  total_months: number;
  total_consumption: number;
  total_cost: number;
  avg_consumption: number;
  avg_cost: number;
  avg_power_factor: number;
  avg_demand: number;
  peak_consumption: number;
  lowest_consumption: number;
  peak_demand: number;
  best_power_factor: number;
  worst_power_factor: number;
  total_arrears: number;
}

interface Trends {
  consumption_trend: string;
  cost_trend: string;
  pf_trend: string;
  demand_trend: string;
}

export default function ElectricityAnalyticsPage() {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [trends, setTrends] = useState<Trends | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      const response = await fetch('/api/electricity-bills/analytics?months=12');
      const data = await response.json();
      setMonthlyData(data.monthlyData || []);
      setStats(data.stats || null);
      setTrends(data.trends || null);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  // Power Factor savings potential
  const pfSavings = stats && stats.avg_power_factor < 0.99
    ? (0.99 - stats.avg_power_factor) * 0.02 * stats.avg_cost * 12
    : 0;

  // Trend indicators
  const getTrendIcon = (trend: string) => {
    if (trend === 'increasing') return <TrendingUp className="w-4 h-4 text-red-600" />;
    if (trend === 'decreasing') return <TrendingDown className="w-4 h-4 text-green-600" />;
    return <Minus className="w-4 h-4 text-gray-600" />;
  };

  const getTrendColor = (trend: string, isGood: boolean = false) => {
    if (trend === 'increasing') return isGood ? 'text-green-600' : 'text-red-600';
    if (trend === 'decreasing') return isGood ? 'text-red-600' : 'text-green-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading analytics...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!stats || monthlyData.length === 0) {
    return (
      <AppLayout>
        <div className="p-6 max-w-7xl mx-auto">
          <Card className="p-12">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No bills data available</p>
              <p className="text-sm text-gray-500">Upload electricity bills to see analytics</p>
            </div>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="text-blue-600" />
            Electricity Analytics - Month-wise Comparison
          </h1>
          <p className="text-gray-600 mt-2">
            Compare consumption, costs, and efficiency across {stats.total_months} months
          </p>
        </div>

        {/* Key Stats with Trends */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Avg Monthly Consumption</p>
              <Activity className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.avg_consumption.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <p className="text-xs text-gray-500">KWH/month</p>
              {trends && (
                <span className={`flex items-center gap-1 text-xs ${getTrendColor(trends.consumption_trend)}`}>
                  {getTrendIcon(trends.consumption_trend)}
                  {trends.consumption_trend}
                </span>
              )}
            </div>
          </Card>

          <Card className="p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Avg Monthly Cost</p>
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ₹{(stats.avg_cost / 100000).toFixed(2)}L
            </p>
            <div className="flex items-center gap-1 mt-1">
              <p className="text-xs text-gray-500">Per month</p>
              {trends && (
                <span className={`flex items-center gap-1 text-xs ${getTrendColor(trends.cost_trend)}`}>
                  {getTrendIcon(trends.cost_trend)}
                  {trends.cost_trend}
                </span>
              )}
            </div>
          </Card>

          <Card className="p-4 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Average Power Factor</p>
              <Zap className="w-5 h-5 text-yellow-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.avg_power_factor.toFixed(3)}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <p className="text-xs text-gray-500">
                {stats.avg_power_factor < 0.95 ? 'Needs improvement' : 'Good'}
              </p>
              {trends && (
                <span className={`flex items-center gap-1 text-xs ${getTrendColor(trends.pf_trend, true)}`}>
                  {getTrendIcon(trends.pf_trend)}
                </span>
              )}
            </div>
          </Card>

          <Card className="p-4 border-l-4 border-red-500">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Peak Demand</p>
              <Factory className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.peak_demand.toFixed(1)}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <p className="text-xs text-gray-500">KVA max</p>
              {trends && (
                <span className={`flex items-center gap-1 text-xs ${getTrendColor(trends.demand_trend)}`}>
                  {getTrendIcon(trends.demand_trend)}
                </span>
              )}
            </div>
          </Card>
        </div>

        {/* Power Factor Improvement Card */}
        {stats.avg_power_factor < 0.95 && pfSavings > 0 && (
          <Card className="p-6 mb-6 bg-yellow-50 border-yellow-200">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                  💡 Power Factor Improvement Opportunity
                </h3>
                <p className="text-sm text-yellow-800 mb-3">
                  Your average power factor is {stats.avg_power_factor.toFixed(3)}. Improving it to 0.99 could save approximately:
                </p>
                <div className="bg-white rounded-lg p-4 border border-yellow-300">
                  <p className="text-3xl font-bold text-yellow-900">
                    ₹{(pfSavings / 100000).toFixed(2)}L per year
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    ≈ ₹{(pfSavings / 12 / 1000).toFixed(1)}K per month
                  </p>
                </div>
                <p className="text-sm text-yellow-800 mt-3">
                  <strong>Recommendation:</strong> Install capacitor banks (KVAR rating: {((stats.peak_demand * (1 - stats.avg_power_factor)) / Math.sqrt(1 - Math.pow(stats.avg_power_factor, 2))).toFixed(0)} KVAR) to improve power factor
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Month-wise Consumption Bar Chart */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Monthly Consumption Comparison</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => `${value.toLocaleString()} KWH`}
                contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }}
              />
              <Legend />
              <Bar dataKey="kwh_consumption" name="Consumption (KWH)" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div className="bg-blue-50 p-3 rounded">
              <p className="text-gray-600">Peak Month</p>
              <p className="font-semibold">{stats.peak_consumption.toLocaleString()} KWH</p>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <p className="text-gray-600">Lowest Month</p>
              <p className="font-semibold">{stats.lowest_consumption.toLocaleString()} KWH</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-gray-600">Average</p>
              <p className="font-semibold">{stats.avg_consumption.toLocaleString()} KWH</p>
            </div>
          </div>
        </Card>

        {/* Cost Comparison Chart */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Monthly Cost Comparison</h2>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" angle={-45} textAnchor="end" height={80} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                formatter={(value: number, name: string) => {
                  if (name.includes('Cost') || name.includes('Charges')) {
                    return `₹${(value / 1000).toFixed(1)}K`;
                  }
                  return value.toFixed(2);
                }}
                contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="total_cost" name="Total Cost (₹)" fill="#10b981" />
              <Line yAxisId="right" type="monotone" dataKey="cost_per_kwh" name="Cost/KWH (₹)" stroke="#f59e0b" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        {/* Power Factor Trend */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Power Factor Trend</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" angle={-45} textAnchor="end" height={80} />
              <YAxis domain={[0.85, 1.0]} />
              <Tooltip 
                formatter={(value: number) => value.toFixed(3)}
                contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }}
              />
              <Legend />
              <Line type="monotone" dataKey="power_factor" name="Power Factor" stroke="#eab308" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div className="bg-green-50 p-3 rounded">
              <p className="text-gray-600">Best PF</p>
              <p className="font-semibold text-green-700">{stats.best_power_factor.toFixed(3)}</p>
            </div>
            <div className="bg-red-50 p-3 rounded">
              <p className="text-gray-600">Worst PF</p>
              <p className="font-semibold text-red-700">{stats.worst_power_factor.toFixed(3)}</p>
            </div>
          </div>
        </Card>

        {/* Charge Breakdown Stacked Bar Chart */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Charges Breakdown by Month</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => `₹${(value / 1000).toFixed(1)}K`}
                contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }}
              />
              <Legend />
              <Bar dataKey="fixed_charges" stackId="a" name="Fixed Charges" fill="#6366f1" />
              <Bar dataKey="variable_charges" stackId="a" name="Variable Charges" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-sm text-gray-600 mt-4">
            <strong>Fixed charges</strong> include demand charges and customer charges. 
            <strong> Variable charges</strong> include energy, TOD, duty, and FPPCA.
          </p>
        </Card>
        
        {/* Month-over-Month Changes */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Month-over-Month % Changes</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-2 px-3 text-sm font-semibold">Month</th>
                  <th className="text-right py-2 px-3 text-sm font-semibold">Consumption</th>
                  <th className="text-right py-2 px-3 text-sm font-semibold">Cost</th>
                  <th className="text-right py-2 px-3 text-sm font-semibold">Power Factor</th>
                  <th className="text-right py-2 px-3 text-sm font-semibold">Demand</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((data, index) => (
                  <tr key={data.month} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-3 font-medium">{data.month}</td>
                    <td className="py-2 px-3 text-right">
                      {index > 0 ? (
                        <span className={`${data.consumption_change > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {data.consumption_change > 0 ? '↑' : '↓'} {Math.abs(data.consumption_change).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {index > 0 ? (
                        <span className={`${data.cost_change > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {data.cost_change > 0 ? '↑' : '↓'} {Math.abs(data.cost_change).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {index > 0 ? (
                        <span className={`${data.pf_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {data.pf_change > 0 ? '↑' : '↓'} {Math.abs(data.pf_change).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {index > 0 ? (
                        <span className={`${data.demand_change > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {data.demand_change > 0 ? '↑' : '↓'} {Math.abs(data.demand_change).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Time of Day Optimization */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-600" />
            Production Scheduling Recommendations
          </h2>
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="font-medium text-green-900 mb-1">💡 Off-Peak Hours (00:00 - 06:00)</p>
              <p className="text-sm text-green-800">
                Lowest electricity rates. Run gang saws and energy-intensive cutting operations during this period.
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="font-medium text-blue-900 mb-1">⚡ Normal Hours (10:00 - 15:00)</p>
              <p className="text-sm text-blue-800">
                Standard rates. Schedule polishing and finishing operations.
              </p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="font-medium text-red-900 mb-1">🚨 Peak Hours (15:00 - 18:00)</p>
              <p className="text-sm text-red-800">
                Highest TOD charges. Avoid running heavy machinery. Focus on quality checks and manual work.
              </p>
            </div>
          </div>
        </Card>

        {/* Efficiency Metrics Table */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Monthly Consumption Trends</h2>
          
          {monthlyData.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No billing data available</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Month</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Consumption (KWH)</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Peak Demand (KVA)</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Power Factor</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Cost/KWH</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Total Cost</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.map((data, index) => {
                    return (
                      <tr key={data.month} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{data.month}</td>
                        <td className="py-3 px-4 text-right">
                          {data.kwh_consumption?.toLocaleString() || 0}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {data.demand_kva?.toFixed(1) || 0}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`font-medium ${data.power_factor < 0.95 ? 'text-yellow-600' : 'text-green-600'}`}>
                            {data.power_factor?.toFixed(3) || '0.000'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          ₹{data.cost_per_kwh?.toFixed(2) || '0.00'}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold">
                          ₹{(data.total_cost / 1000).toFixed(1)}K
                        </td>
                        <td className="py-3 px-4 text-right">
                          {data.consumption_change !== null && (
                            <span className={`inline-flex items-center text-sm ${data.consumption_change > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {data.consumption_change > 0 ? '↑' : '↓'} {Math.abs(data.consumption_change).toFixed(1)}%
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Business Insights */}
        <Card className="p-6 mt-6 bg-blue-50 border-blue-200">
          <h2 className="text-xl font-semibold mb-4 text-blue-900">💡 Business Insights</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-blue-900 mb-2">Cost Optimization Strategies:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Schedule heavy cutting operations during off-peak hours (00:00-06:00)</li>
                <li>• Improve power factor to 0.99+ using capacitor banks</li>
                <li>• Monitor peak demand to avoid demand charge penalties</li>
                <li>• Clear arrears to avoid additional interest charges</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-blue-900 mb-2">Production Efficiency Tracking:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Calculate KWH per sqft produced</li>
                <li>• Track electricity cost per slab</li>
                <li>• Compare month-over-month efficiency</li>
                <li>• Link consumption spikes to production volumes</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
