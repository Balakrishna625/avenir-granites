'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  History, 
  Search,
  Calendar,
  DollarSign,
  User,
  FileText,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import Link from 'next/link';
import { formatDisplayDate } from '@/lib/date-utils';

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const fmt = (n: number) => INR.format(n || 0);

interface SettlementPeriod {
  id: string;
  customer_id: string;
  customer_name: string;
  period_number: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  total_invoiced: number;
  total_received: number;
  total_pending: number;
  settlement_amount: number;
  settlement_date: string;
  settlement_mode: string;
  settlement_reference: string;
  settlement_notes: string;
  waived_amount: number;
  carried_forward: number;
}

interface PeriodDetails {
  consignments: any[];
  transactions: any[];
  expanded: boolean;
}

export default function SettlementsPage() {
  const [settlements, setSettlements] = useState<SettlementPeriod[]>([]);
  const [filteredSettlements, setFilteredSettlements] = useState<SettlementPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedPeriods, setExpandedPeriods] = useState<{ [key: string]: PeriodDetails }>({});
  const [loadingDetails, setLoadingDetails] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    loadSettlements();
  }, []);

  useEffect(() => {
    filterSettlements();
  }, [searchQuery, dateFrom, dateTo, settlements]);

  async function loadSettlements() {
    try {
      setLoading(true);
      const response = await fetch('/api/customers/periods');
      if (!response.ok) {
        throw new Error('Failed to load settlements');
      }
      const data = await response.json();
      
      // Filter only settled (inactive) periods and sort by settlement date descending
      const settledPeriods = data
        .filter((period: SettlementPeriod) => !period.is_active)
        .sort((a: SettlementPeriod, b: SettlementPeriod) => 
          new Date(b.settlement_date || b.end_date).getTime() - 
          new Date(a.settlement_date || a.end_date).getTime()
        );
      
      setSettlements(settledPeriods);
      setFilteredSettlements(settledPeriods);
    } catch (error) {
      console.error('Failed to load settlements:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterSettlements() {
    let filtered = [...settlements];

    // Filter by search query (customer name)
    if (searchQuery) {
      filtered = filtered.filter(s => 
        s.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by date range
    if (dateFrom) {
      filtered = filtered.filter(s => 
        new Date(s.settlement_date || s.end_date) >= new Date(dateFrom)
      );
    }
    if (dateTo) {
      filtered = filtered.filter(s => 
        new Date(s.settlement_date || s.end_date) <= new Date(dateTo)
      );
    }

    setFilteredSettlements(filtered);
  }

  async function togglePeriodDetails(periodId: string, customerId: string) {
    if (expandedPeriods[periodId]) {
      // Collapse
      const newExpanded = { ...expandedPeriods };
      delete newExpanded[periodId];
      setExpandedPeriods(newExpanded);
      return;
    }

    // Expand - load details if not already loaded
    setLoadingDetails({ ...loadingDetails, [periodId]: true });

    try {
      const [consignmentsRes, transactionsRes] = await Promise.all([
        fetch(`/api/consignments?customerId=${customerId}&periodId=${periodId}`),
        fetch(`/api/transactions?customerId=${customerId}&periodId=${periodId}`)
      ]);

      const consignments = await consignmentsRes.json();
      const transactions = await transactionsRes.json();

      setExpandedPeriods({
        ...expandedPeriods,
        [periodId]: {
          consignments,
          transactions,
          expanded: true
        }
      });
    } catch (error) {
      console.error('Failed to load period details:', error);
    } finally {
      setLoadingDetails({ ...loadingDetails, [periodId]: false });
    }
  }

  const stats = {
    totalSettlements: filteredSettlements.length,
    totalInvoiced: filteredSettlements.reduce((sum, s) => sum + (s.total_invoiced || 0), 0),
    totalReceived: filteredSettlements.reduce((sum, s) => sum + (s.total_received || 0), 0),
    totalWaived: filteredSettlements.reduce((sum, s) => sum + (s.waived_amount || 0), 0),
    totalCarriedForward: filteredSettlements.reduce((sum, s) => sum + (s.carried_forward || 0), 0),
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg text-gray-600">Loading settlement history...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen w-full bg-gray-50 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/customers">
              <Button variant="secondary" className="flex items-center space-x-2">
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Customers</span>
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <History className="w-8 h-8 text-blue-600" />
                All Settlement History
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                View all customer account settlements and archived periods
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search by customer name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-400" />
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  placeholder="From Date"
                />
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-400" />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  placeholder="To Date"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">Total Settlements</p>
                <p className="text-2xl font-bold text-blue-900">{stats.totalSettlements}</p>
              </div>
              <History className="w-8 h-8 text-blue-600" />
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Total Invoiced</p>
                <p className="text-2xl font-bold text-green-900">{fmt(stats.totalInvoiced)}</p>
              </div>
              <FileText className="w-8 h-8 text-green-600" />
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 font-medium">Total Received</p>
                <p className="text-2xl font-bold text-purple-900">{fmt(stats.totalReceived)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700 font-medium">Total Waived</p>
                <p className="text-2xl font-bold text-orange-900">{fmt(stats.totalWaived)}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-orange-600" />
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700 font-medium">Carried Forward</p>
                <p className="text-2xl font-bold text-red-900">{fmt(stats.totalCarriedForward)}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </Card>
        </div>

        {/* Settlements List */}
        <div className="space-y-4">
          {filteredSettlements.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No Settlements Found</h3>
                <p className="text-gray-500">
                  {searchQuery || dateFrom || dateTo
                    ? 'Try adjusting your filters'
                    : 'No customer accounts have been settled yet'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredSettlements.map((settlement) => {
              const isExpanded = expandedPeriods[settlement.id]?.expanded;
              const isLoading = loadingDetails[settlement.id];
              const details = expandedPeriods[settlement.id];

              return (
                <Card key={settlement.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardContent className="p-0">
                    {/* Settlement Header */}
                    <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <User className="w-5 h-5 text-blue-600" />
                            <Link 
                              href={`/customers/${settlement.customer_id}`}
                              className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors"
                            >
                              {settlement.customer_name}
                            </Link>
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                              Period #{settlement.period_number}
                            </span>
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDisplayDate(settlement.start_date)} - {formatDisplayDate(settlement.end_date)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                              <span className="font-medium">Settled on {formatDisplayDate(settlement.settlement_date || settlement.end_date)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => togglePeriodDetails(settlement.id, settlement.customer_id)}
                            className="flex items-center gap-2"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-4 h-4" /> Hide Details
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4" /> View Details
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Financial Summary */}
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-4">
                        <div className="bg-white rounded-lg p-3">
                          <p className="text-xs text-gray-600 mb-1">Total Invoiced</p>
                          <p className="text-lg font-bold text-gray-900">{fmt(settlement.total_invoiced || 0)}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3">
                          <p className="text-xs text-gray-600 mb-1">Total Received</p>
                          <p className="text-lg font-bold text-green-600">{fmt(settlement.total_received || 0)}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3">
                          <p className="text-xs text-gray-600 mb-1">Pending</p>
                          <p className="text-lg font-bold text-orange-600">{fmt(settlement.total_pending || 0)}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3">
                          <p className="text-xs text-gray-600 mb-1">Settlement Paid</p>
                          <p className="text-lg font-bold text-blue-600">{fmt(settlement.settlement_amount || 0)}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3">
                          <p className="text-xs text-gray-600 mb-1">Waived</p>
                          <p className="text-lg font-bold text-purple-600">{fmt(settlement.waived_amount || 0)}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3">
                          <p className="text-xs text-gray-600 mb-1">Carried Forward</p>
                          <p className="text-lg font-bold text-red-600">{fmt(settlement.carried_forward || 0)}</p>
                        </div>
                      </div>

                      {/* Settlement Details */}
                      {(settlement.settlement_mode || settlement.settlement_reference || settlement.settlement_notes) && (
                        <div className="mt-4 p-4 bg-white rounded-lg">
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Settlement Details</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                            {settlement.settlement_mode && (
                              <div>
                                <span className="text-gray-600">Payment Mode:</span>
                                <span className="ml-2 font-semibold text-gray-900">{settlement.settlement_mode}</span>
                              </div>
                            )}
                            {settlement.settlement_reference && (
                              <div>
                                <span className="text-gray-600">Reference:</span>
                                <span className="ml-2 font-semibold text-gray-900">{settlement.settlement_reference}</span>
                              </div>
                            )}
                            {settlement.settlement_notes && (
                              <div className="md:col-span-3">
                                <span className="text-gray-600">Notes:</span>
                                <span className="ml-2 font-semibold text-gray-900">{settlement.settlement_notes}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="p-6 bg-gray-50 border-t">
                        {isLoading ? (
                          <div className="text-center py-8">
                            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                            <p className="text-sm text-gray-600">Loading details...</p>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {/* Consignments */}
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-blue-600" />
                                Consignments ({details?.consignments?.length || 0})
                              </h4>
                              {details?.consignments?.length > 0 ? (
                                <div className="bg-white rounded-lg overflow-hidden border">
                                  <table className="w-full">
                                    <thead className="bg-gray-100">
                                      <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Total</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">RTGS Expected</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Cash Expected</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Remarks</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                      {details.consignments.map((c: any) => (
                                        <tr key={c.id} className="hover:bg-gray-50">
                                          <td className="px-4 py-3 text-sm">{formatDisplayDate(c.date)}</td>
                                          <td className="px-4 py-3 text-sm font-semibold">{fmt(c.total)}</td>
                                          <td className="px-4 py-3 text-sm text-blue-600">{fmt(c.rtgs_expected)}</td>
                                          <td className="px-4 py-3 text-sm text-green-600">{fmt(c.cash_expected)}</td>
                                          <td className="px-4 py-3 text-sm text-gray-600">{c.remarks || '-'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500">No consignments in this period</p>
                              )}
                            </div>

                            {/* Transactions */}
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-green-600" />
                                Transactions ({details?.transactions?.length || 0})
                              </h4>
                              {details?.transactions?.length > 0 ? (
                                <div className="bg-white rounded-lg overflow-hidden border">
                                  <table className="w-full">
                                    <thead className="bg-gray-100">
                                      <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Mode</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Amount</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Note</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                      {details.transactions.map((t: any) => (
                                        <tr key={t.id} className="hover:bg-gray-50">
                                          <td className="px-4 py-3 text-sm">{formatDisplayDate(t.date)}</td>
                                          <td className="px-4 py-3 text-sm">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                              t.mode === 'RTGS' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                                            }`}>
                                              {t.mode}
                                            </span>
                                          </td>
                                          <td className="px-4 py-3 text-sm font-semibold text-green-600">{fmt(t.amount)}</td>
                                          <td className="px-4 py-3 text-sm text-gray-600">{t.note || '-'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500">No transactions in this period</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}
