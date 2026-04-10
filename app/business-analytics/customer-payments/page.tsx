'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Clock, AlertTriangle, ArrowUpCircle, Users, IndianRupee } from 'lucide-react';

interface CustomerAnalytics {
  customerId: number;
  customerName: string;
  
  // Regular Customer Indicators
  isRegularCustomer: boolean;
  businessValueScore: number;
  lastConsignmentDate: string | null;
  
  // Payment Pattern Metrics
  paymentCount: number;
  avgPaymentInterval: number;
  stdDevPaymentInterval: number;
  longestPaymentGap: number;
  consistencyScore: number;
  lastPaymentDate: string | null;
  daysSinceLastPayment: number | null;
  
  // Outstanding Balance Metrics
  totalInvoiced: number;
  totalReceived: number;
  outstandingBalance: number;
  oldestConsignmentDate: string | null;
  oldestReceivableAgeDays: number;
  weightedAvgAge: number;
  
  // Behavior Classification
  behaviorCluster: 'Fast Payer' | 'Regular Slow Payer' | 'Irregular Payer' | 'At-Risk' | 'No History';
  
  // Prediction Metrics
  avgPaymentAmount: number;
  predictedNextPaymentDate: string | null;
  predictionConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
  avgDaysToFirstPayment: number;
  
  // Additional Context
  consignmentCount: number;
}

interface AnalyticsSummary {
  totalCustomers: number;
  regularCustomers: number;
  customersWithHistory: number;
  
  // Cluster breakdown
  fastPayers: number;
  regularSlowPayers: number;
  irregularPayers: number;
  atRiskPayers: number;
  noHistory: number;
  
  // Outstanding by cluster
  fastPayersOutstanding: number;
  regularSlowOutstanding: number;
  irregularOutstanding: number;
  atRiskOutstanding: number;
  
  // Total outstanding
  totalOutstanding: number;
  
  // Average metrics
  avgPaymentInterval: number;
  
  // Predictions
  predictedInflows30Days: number;
  highConfidencePredictions: number;
  
  // Business value metrics
  avgBusinessValue: number;
  highValueCustomers: number;
}

export default function CustomerPaymentAnalyticsPage() {
  const [analytics, setAnalytics] = useState<CustomerAnalytics[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCluster, setSelectedCluster] = useState<string>('All');

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/business-analytics/customer-payments');
      const data = await response.json();
      setAnalytics(data.analytics);
      setSummary(data.summary);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAnalytics = selectedCluster === 'All'
    ? analytics
    : analytics.filter(a => a.behaviorCluster === selectedCluster);

  const getClusterColor = (cluster: string) => {
    switch (cluster) {
      case 'Fast Payer':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Regular Slow Payer':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Irregular Payer':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'At-Risk':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading analytics...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-blue-600" />
            Customer Payment Analytics
          </h1>
          <p className="text-gray-600 mt-1">
            Payment behavior of regular customers - those with 3+ consignments or recent activity
          </p>
          {summary && (
            <p className="text-sm text-gray-500 mt-1">
              Analyzing {summary.regularCustomers} regular customers (out of {summary.totalCustomers} total)
            </p>
          )}
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Total Outstanding
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-800">
                  {formatCurrency(summary.totalOutstanding)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {summary.regularCustomers} regular customers
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Avg Payment Cycle
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-800">
                  {summary.avgPaymentInterval} days
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Average interval between payments
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <ArrowUpCircle className="w-4 h-4" />
                  Predicted 30d Inflows
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(summary.predictedInflows30Days)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {summary.highConfidencePredictions} high confidence predictions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  At-Risk Customers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {summary.atRiskPayers}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Outstanding: {formatCurrency(summary.atRiskOutstanding)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Customer Risk Clusters */}
        {summary && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Customer Risk Clusters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedCluster === 'Fast Payer'
                      ? 'ring-2 ring-green-500 border-green-500'
                      : 'border-green-200 hover:border-green-400'
                  } bg-green-50`}
                  onClick={() => setSelectedCluster(selectedCluster === 'Fast Payer' ? 'All' : 'Fast Payer')}
                >
                  <div className="text-sm font-medium text-green-800 mb-1">Fast Payers</div>
                  <div className="text-2xl font-bold text-green-900">{summary.fastPayers}</div>
                  <div className="text-xs text-green-700 mt-1">
                    Outstanding: {formatCurrency(summary.fastPayersOutstanding)}
                  </div>
                </div>

                <div
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedCluster === 'Regular Slow Payer'
                      ? 'ring-2 ring-blue-500 border-blue-500'
                      : 'border-blue-200 hover:border-blue-400'
                  } bg-blue-50`}
                  onClick={() => setSelectedCluster(selectedCluster === 'Regular Slow Payer' ? 'All' : 'Regular Slow Payer')}
                >
                  <div className="text-sm font-medium text-blue-800 mb-1">Regular Slow Payers</div>
                  <div className="text-2xl font-bold text-blue-900">{summary.regularSlowPayers}</div>
                  <div className="text-xs text-blue-700 mt-1">
                    Outstanding: {formatCurrency(summary.regularSlowOutstanding)}
                  </div>
                </div>

                <div
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedCluster === 'Irregular Payer'
                      ? 'ring-2 ring-yellow-500 border-yellow-500'
                      : 'border-yellow-200 hover:border-yellow-400'
                  } bg-yellow-50`}
                  onClick={() => setSelectedCluster(selectedCluster === 'Irregular Payer' ? 'All' : 'Irregular Payer')}
                >
                  <div className="text-sm font-medium text-yellow-800 mb-1">Irregular Payers</div>
                  <div className="text-2xl font-bold text-yellow-900">{summary.irregularPayers}</div>
                  <div className="text-xs text-yellow-700 mt-1">
                    Outstanding: {formatCurrency(summary.irregularOutstanding)}
                  </div>
                </div>

                <div
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedCluster === 'At-Risk'
                      ? 'ring-2 ring-red-500 border-red-500'
                      : 'border-red-200 hover:border-red-400'
                  } bg-red-50`}
                  onClick={() => setSelectedCluster(selectedCluster === 'At-Risk' ? 'All' : 'At-Risk')}
                >
                  <div className="text-sm font-medium text-red-800 mb-1">At-Risk</div>
                  <div className="text-2xl font-bold text-red-900">{summary.atRiskPayers}</div>
                  <div className="text-xs text-red-700 mt-1">
                    Outstanding: {formatCurrency(summary.atRiskOutstanding)}
                  </div>
                </div>
              </div>
              {selectedCluster !== 'All' && (
                <div className="text-center mt-3">
                  <button
                    onClick={() => setSelectedCluster('All')}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Clear Filter - Show All Customers
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Customer Details Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Customer Payment Details
              {selectedCluster !== 'All' && (
                <span className="ml-2 text-sm font-normal text-gray-600">
                  (Filtered: {selectedCluster})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cluster
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Outstanding
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Oldest Age
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Interval
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Payment
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Days Since
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Next Predicted
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Confidence
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAnalytics.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                        No customer data available
                      </td>
                    </tr>
                  ) : (
                    filteredAnalytics.map((customer) => (
                      <tr key={customer.customerId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {customer.customerName}
                          <div className="text-xs text-gray-500">
                            {customer.paymentCount} payments • {customer.consignmentCount} consignments
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getClusterColor(
                              customer.behaviorCluster
                            )}`}
                          >
                            {customer.behaviorCluster}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold">
                          {customer.outstandingBalance > 0 ? (
                            <span className={customer.outstandingBalance > 100000 ? 'text-red-600' : 'text-gray-900'}>
                              {formatCurrency(customer.outstandingBalance)}
                            </span>
                          ) : (
                            <span className="text-green-600">₹0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          {customer.oldestReceivableAgeDays > 0 ? (
                            <span
                              className={
                                customer.oldestReceivableAgeDays > 90
                                  ? 'text-red-600 font-semibold'
                                  : customer.oldestReceivableAgeDays > 60
                                  ? 'text-orange-600'
                                  : 'text-gray-700'
                              }
                            >
                              {customer.oldestReceivableAgeDays}d
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-gray-700">
                          {customer.avgPaymentInterval > 0 ? `${customer.avgPaymentInterval}d` : '-'}
                          {customer.consistencyScore > 0 && (
                            <div className="text-xs text-gray-500">±{customer.stdDevPaymentInterval}d</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-gray-700">
                          {formatDate(customer.lastPaymentDate)}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          {customer.daysSinceLastPayment !== null ? (
                            <span
                              className={
                                customer.daysSinceLastPayment > customer.avgPaymentInterval * 1.5
                                  ? 'text-red-600 font-semibold'
                                  : 'text-gray-700'
                              }
                            >
                              {customer.daysSinceLastPayment}d
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-gray-700">
                          {formatDate(customer.predictedNextPaymentDate)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {customer.predictedNextPaymentDate && (
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                customer.predictionConfidence === 'HIGH'
                                  ? 'bg-green-100 text-green-800'
                                  : customer.predictionConfidence === 'MEDIUM'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {customer.predictionConfidence}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
