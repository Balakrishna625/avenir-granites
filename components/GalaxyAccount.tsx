import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  DollarSign, 
  TrendingUp,
  TrendingDown,
  Star,
  Receipt,
  Wallet,
  Calendar
} from 'lucide-react';
import { formatDisplayDate } from '@/lib/date-utils';

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const fmt = (n: number) => INR.format(n || 0);

interface GalaxyTransaction {
  id: string;
  date: string;
  amount: number;
  mode: string;
  note?: string;
  customers?: {
    name: string;
  };
  bank_accounts?: {
    name: string;
  };
}

interface GalaxyConsignment {
  id: string;
  date: string;
  total: number;
  customers?: {
    name: string;
  };
}

interface GalaxyAccountProps {
  dateFrom?: string;
  dateTo?: string;
}

export function GalaxyAccount({ dateFrom, dateTo }: GalaxyAccountProps) {
  const [loading, setLoading] = useState(true);
  const [galaxyTransactions, setGalaxyTransactions] = useState<GalaxyTransaction[]>([]);
  const [galaxyConsignments, setGalaxyConsignments] = useState<GalaxyConsignment[]>([]);

  useEffect(() => {
    loadGalaxyData();
  }, [dateFrom, dateTo]);

  async function loadGalaxyData() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      
      // Fetch all transactions and consignments, then filter for "galaxy"
      const [transactionsRes, consignmentsRes] = await Promise.all([
        fetch(`/api/transactions?${params.toString()}`),
        fetch(`/api/consignments?${params.toString()}`)
      ]);
      
      const allTransactions = await transactionsRes.json();
      const allConsignments = await consignmentsRes.json();
      
      console.log('Total consignments fetched:', allConsignments.length);
      console.log('Sample consignment:', allConsignments[0]);
      
      // Filter transactions that have "galaxy" in the note (case-insensitive)
      const galaxyTxns = allTransactions.filter((t: GalaxyTransaction) => 
        (t.note || '').toLowerCase().includes('galaxy')
      );
      
      // Filter consignments that have "galaxy" in remarks field only
      const galaxyCons = allConsignments.filter((c: any) => 
        (c.remarks || '').toLowerCase().includes('galaxy')
      );
      
      console.log('Galaxy Consignments found:', galaxyCons.length);
      console.log('Galaxy consignments:', galaxyCons);
      console.log('Galaxy Transactions found:', galaxyTxns.length);
      
      setGalaxyTransactions(galaxyTxns);
      setGalaxyConsignments(galaxyCons);
    } catch (error) {
      console.error('Failed to load Galaxy data:', error);
      setGalaxyTransactions([]);
      setGalaxyConsignments([]);
    } finally {
      setLoading(false);
    }
  }

  // Calculate totals
  const totalSales = galaxyConsignments.reduce((sum, c) => sum + (c.total || 0), 0);
  const totalReceived = galaxyTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalPending = totalSales - totalReceived;
  
  const rtgsTotal = galaxyTransactions
    .filter(t => t.mode === 'RTGS')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  
  const cashTotal = galaxyTransactions
    .filter(t => t.mode === 'CASH')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-lg text-gray-600">Loading Galaxy Account...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center gap-3 mb-6">
        <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Galaxy Account</h1>
          <p className="text-sm text-gray-600">Track all Galaxy-related sales and payments</p>
        </div>
      </div>

      {/* Overview KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">Total Sales</p>
                <p className="text-2xl font-bold text-blue-900">{fmt(totalSales)}</p>
                <p className="text-xs text-blue-600 mt-1">{galaxyConsignments.length} consignments</p>
              </div>
              <Receipt className="w-10 h-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Total Received</p>
                <p className="text-2xl font-bold text-green-900">{fmt(totalReceived)}</p>
                <p className="text-xs text-green-600 mt-1">{galaxyTransactions.length} payments</p>
              </div>
              <Wallet className="w-10 h-10 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${totalPending > 0 ? 'from-orange-50 to-orange-100 border-orange-200' : 'from-gray-50 to-gray-100 border-gray-200'}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${totalPending > 0 ? 'text-orange-700' : 'text-gray-700'}`}>Pending Amount</p>
                <p className={`text-2xl font-bold ${totalPending > 0 ? 'text-orange-900' : 'text-gray-900'}`}>{fmt(totalPending)}</p>
                <p className={`text-xs mt-1 ${totalPending > 0 ? 'text-orange-600' : 'text-gray-600'}`}>
                  {totalPending > 0 ? 'Outstanding' : 'Fully Paid'}
                </p>
              </div>
              {totalPending > 0 ? (
                <TrendingUp className="w-10 h-10 text-orange-600" />
              ) : (
                <TrendingDown className="w-10 h-10 text-gray-600" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 font-medium">Collection %</p>
                <p className="text-2xl font-bold text-purple-900">
                  {totalSales > 0 ? ((totalReceived / totalSales) * 100).toFixed(1) : '0'}%
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  {totalSales > 0 ? 'Efficiency' : 'No sales yet'}
                </p>
              </div>
              <Star className="w-10 h-10 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              Payment Breakdown
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-blue-900">RTGS Payments</span>
                <span className="text-lg font-bold text-blue-700">{fmt(rtgsTotal)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-green-900">Cash Payments</span>
                <span className="text-lg font-bold text-green-700">{fmt(cashTotal)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              Summary
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Consignments</span>
                <span className="font-semibold text-gray-900">{galaxyConsignments.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Transactions</span>
                <span className="font-semibold text-gray-900">{galaxyTransactions.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Avg. Transaction Size</span>
                <span className="font-semibold text-gray-900">
                  {galaxyTransactions.length > 0 ? fmt(totalReceived / galaxyTransactions.length) : fmt(0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sales */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Galaxy Sales</h3>
          {galaxyConsignments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Receipt className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No Galaxy sales found</p>
              <p className="text-sm text-gray-400 mt-1">Add "galaxy" in consignment remarks to track them here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Customer</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {galaxyConsignments
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 10)
                    .map((cons) => (
                      <tr key={cons.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{formatDisplayDate(cons.date)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{cons.customers?.name || '-'}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{fmt(cons.total)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Galaxy Payments</h3>
          {galaxyTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Star className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No Galaxy payments found</p>
              <p className="text-sm text-gray-400 mt-1">Add "galaxy" in transaction notes to track them here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Mode</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Account</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {galaxyTransactions
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 10)
                    .map((txn) => (
                      <tr key={txn.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{formatDisplayDate(txn.date)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{txn.customers?.name || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            txn.mode === 'RTGS' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {txn.mode}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{txn.bank_accounts?.name || '-'}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{fmt(txn.amount)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{txn.note || '-'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Star className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-yellow-900 mb-1">How to Track Galaxy Transactions</h4>
              <p className="text-sm text-yellow-800">
                To include a transaction or sale in Galaxy Account, simply add the word "galaxy" (case-insensitive) 
                in the transaction note or consignment remarks field. The system will automatically track it here.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
