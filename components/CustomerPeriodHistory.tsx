'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  History, 
  Calendar, 
  DollarSign, 
  TrendingDown,
  FileText,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Download
} from 'lucide-react';
import { formatDisplayDate } from '@/lib/date-utils';

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const fmt = (n: number) => INR.format(n || 0);

interface AccountPeriod {
  id: string;
  period_number: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  opening_balance: number;
  total_invoiced: number;
  total_received: number;
  total_waived: number;
  closing_balance: number;
  settlement_amount: number | null;
  settlement_mode: string | null;
  settlement_reference: string | null;
  settlement_notes: string | null;
  settled_by: string | null;
  customer_name: string;
  consignments_count?: number;
  transactions_count?: number;
}

interface PeriodDetails {
  period: AccountPeriod;
  consignments: any[];
  transactions: any[];
  summary: {
    totalInvoiced: number;
    totalReceived: number;
    totalPending: number;
    totalWaived: number;
    settlementAmount: number;
  };
}

interface CustomerPeriodHistoryProps {
  customerId: string;
}

export function CustomerPeriodHistory({ customerId }: CustomerPeriodHistoryProps) {
  const [periods, setPeriods] = useState<AccountPeriod[]>([]);
  const [expandedPeriod, setExpandedPeriod] = useState<string | null>(null);
  const [periodDetails, setPeriodDetails] = useState<Record<string, PeriodDetails>>({});
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPeriods();
  }, [customerId]);

  const fetchPeriods = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/customers/settlement?customerId=${customerId}`);
      if (!response.ok) throw new Error('Failed to fetch period history');
      
      const data = await response.json();
      setPeriods(data.periods || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load period history');
    } finally {
      setLoading(false);
    }
  };

  const fetchPeriodDetails = async (periodId: string) => {
    if (periodDetails[periodId]) {
      // Already loaded, just toggle
      setExpandedPeriod(expandedPeriod === periodId ? null : periodId);
      return;
    }

    try {
      setLoadingDetails(periodId);
      
      const response = await fetch(`/api/customers/periods/${periodId}`);
      if (!response.ok) throw new Error('Failed to fetch period details');
      
      const data = await response.json();
      setPeriodDetails(prev => ({ ...prev, [periodId]: data }));
      setExpandedPeriod(periodId);
    } catch (err: any) {
      console.error('Failed to load period details:', err);
    } finally {
      setLoadingDetails(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-600">Loading period history...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-red-800">{error}</p>
            <Button variant="outline" onClick={fetchPeriods} className="mt-2">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (periods.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <History className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">No settlement history yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <div className="border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <History className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Account Period History</h3>
          <span className="ml-auto text-sm text-gray-600">{periods.length} period(s)</span>
        </div>
      </div>

      <CardContent className="p-0">
        <div className="divide-y">
          {periods.map((period) => {
            const isExpanded = expandedPeriod === period.id;
            const details = periodDetails[period.id];
            const isLoadingThis = loadingDetails === period.id;

            return (
              <div key={period.id} className="hover:bg-gray-50 transition-colors">
                {/* Period Header */}
                <button
                  onClick={() => fetchPeriodDetails(period.id)}
                  className="w-full px-6 py-4 text-left flex items-center gap-4 cursor-pointer"
                  disabled={isLoadingThis}
                >
                  {/* Expand Icon */}
                  <div className="flex-shrink-0">
                    {isLoadingThis ? (
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    ) : isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-600" />
                    )}
                  </div>

                  {/* Period Badge */}
                  <div className="flex-shrink-0">
                    <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${
                      period.is_active 
                        ? 'bg-green-100 border-2 border-green-500' 
                        : 'bg-gray-100 border-2 border-gray-300'
                    }`}>
                      <div className="text-center">
                        <div className={`text-xs font-medium ${
                          period.is_active ? 'text-green-600' : 'text-gray-600'
                        }`}>
                          Period
                        </div>
                        <div className={`text-xl font-bold ${
                          period.is_active ? 'text-green-700' : 'text-gray-700'
                        }`}>
                          {period.period_number}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Period Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">
                        {formatDisplayDate(period.start_date)}
                        {period.end_date && ` - ${formatDisplayDate(period.end_date)}`}
                        {period.is_active && <span className="text-green-600 ml-2">(Active)</span>}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                      <div>
                        <div className="text-xs text-gray-500">Invoiced</div>
                        <div className="text-sm font-semibold text-gray-900">{fmt(period.total_invoiced)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Received</div>
                        <div className="text-sm font-semibold text-green-600">{fmt(period.total_received)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Pending</div>
                        <div className="text-sm font-semibold text-orange-600">{fmt(period.closing_balance)}</div>
                      </div>
                      {period.settlement_amount !== null && (
                        <div>
                          <div className="text-xs text-gray-500">Settled</div>
                          <div className="text-sm font-semibold text-blue-600">{fmt(period.settlement_amount)}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  {!period.is_active && period.settlement_mode && (
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {period.settlement_mode}
                      </span>
                    </div>
                  )}
                </button>

                {/* Expanded Details */}
                {isExpanded && details && (
                  <div className="px-6 pb-4 bg-gray-50 border-t">
                    <div className="pt-4 space-y-4">
                      {/* Settlement Details */}
                      {period.settlement_amount !== null && (
                        <div className="bg-white rounded-lg border p-4">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-blue-600" />
                            Settlement Details
                          </h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Settlement Amount:</span>
                              <span className="font-semibold text-gray-900 ml-2">{fmt(period.settlement_amount)}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Payment Mode:</span>
                              <span className="font-semibold text-gray-900 ml-2">{period.settlement_mode}</span>
                            </div>
                            {period.settlement_reference && (
                              <div>
                                <span className="text-gray-600">Reference:</span>
                                <span className="font-semibold text-gray-900 ml-2">{period.settlement_reference}</span>
                              </div>
                            )}
                            {period.settled_by && (
                              <div>
                                <span className="text-gray-600">Settled By:</span>
                                <span className="font-semibold text-gray-900 ml-2">{period.settled_by}</span>
                              </div>
                            )}
                            {period.settlement_notes && (
                              <div className="col-span-2">
                                <span className="text-gray-600">Notes:</span>
                                <p className="text-gray-900 mt-1">{period.settlement_notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Financial Summary */}
                      <div className="bg-white rounded-lg border p-4">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <TrendingDown className="w-4 h-4 text-green-600" />
                          Financial Summary
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600 block">Opening</span>
                            <span className="font-semibold text-gray-900">{fmt(period.opening_balance)}</span>
                          </div>
                          <div>
                            <span className="text-gray-600 block">Invoiced</span>
                            <span className="font-semibold text-blue-600">{fmt(details.summary.totalInvoiced)}</span>
                          </div>
                          <div>
                            <span className="text-gray-600 block">Received</span>
                            <span className="font-semibold text-green-600">{fmt(details.summary.totalReceived)}</span>
                          </div>
                          <div>
                            <span className="text-gray-600 block">Waived</span>
                            <span className="font-semibold text-orange-600">{fmt(details.summary.totalWaived)}</span>
                          </div>
                          <div>
                            <span className="text-gray-600 block">Closing</span>
                            <span className="font-semibold text-red-600">{fmt(period.closing_balance)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Transaction Counts */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg border p-4 text-center">
                          <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-gray-900">{details.consignments.length}</div>
                          <div className="text-sm text-gray-600">Consignments</div>
                        </div>
                        <div className="bg-white rounded-lg border p-4 text-center">
                          <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-gray-900">{details.transactions.length}</div>
                          <div className="text-sm text-gray-600">Transactions</div>
                        </div>
                      </div>

                      {/* View Details Link */}
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => window.open(`/customers/${customerId}/period/${period.id}`, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Full Period Details
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
