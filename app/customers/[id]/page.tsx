'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/AppLayout';
import { CustomerSettlementModal } from '@/components/CustomerSettlementModal';
import { CustomerPeriodHistory } from '@/components/CustomerPeriodHistory';
import { formatDisplayDate } from '@/lib/date-utils';
import { 
  ArrowLeft, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  FileText,
  History,
  AlertCircle,
  Archive
} from 'lucide-react';
import Link from 'next/link';

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const fmt = (n: number) => INR.format(n || 0);

interface CustomerDetails {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  old_due_amount: number;
  waived_amount: number;
  created_at: string;
  current_period_number: number | null;
}

interface CurrentPeriodSummary {
  total_invoiced: number;
  total_received: number;
  total_pending: number;
  consignment_count: number;
  transaction_count: number;
  last_payment_date: string | null;
  last_invoice_date: string | null;
}

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const customerId = params.id;
  
  const [customer, setCustomer] = useState<CustomerDetails | null>(null);
  const [currentPeriodSummary, setCurrentPeriodSummary] = useState<CurrentPeriodSummary | null>(null);
  const [consignments, setConsignments] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');

  useEffect(() => {
    loadCustomerData();
    loadCommonData();
  }, [customerId]);

  async function loadCommonData() {
    try {
      const [customersRes, accountsRes] = await Promise.all([
        fetch('/api/customers'),
        fetch('/api/bank-accounts')
      ]);
      setCustomers(await customersRes.json());
      setAccounts(await accountsRes.json());
    } catch (error) {
      console.error('Failed to load common data:', error);
    }
  }

  async function loadCustomerData() {
    try {
      setLoading(true);

      // Load customer details
      const customerRes = await fetch(`/api/customers?id=${customerId}`);
      const customerData = await customerRes.json();
      setCustomer(customerData[0] || null);

      // Load current period summary
      const summaryRes = await fetch(`/api/customers/summary?customerId=${customerId}`);
      const summaryData = await summaryRes.json();
      setCurrentPeriodSummary(summaryData[0] || null);

      // Load consignments and transactions for current period
      const [consignmentsRes, transactionsRes] = await Promise.all([
        fetch(`/api/consignments?customerId=${customerId}`),
        fetch(`/api/transactions?customerId=${customerId}`)
      ]);
      
      setConsignments(await consignmentsRes.json());
      setTransactions(await transactionsRes.json());
    } catch (error) {
      console.error('Failed to load customer data:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleSettlementSuccess = () => {
    // Reload all data after settlement
    loadCustomerData();
  };

  if (loading || !customer) {
    return (
      <AppLayout>
        <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg text-gray-600">Loading customer details...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const totalReceivables = (currentPeriodSummary?.total_pending || 0) + customer.old_due_amount - customer.waived_amount;

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
              <h1 className="text-3xl font-bold text-gray-900">{customer.name}</h1>
              {customer.current_period_number && (
                <p className="text-sm text-gray-600 mt-1">
                  Account Period #{customer.current_period_number}
                </p>
              )}
            </div>
          </div>
          <Button 
            onClick={() => setShowSettlementModal(true)}
            className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
          >
            <Archive className="w-4 h-4" />
            Settle Account
          </Button>
        </div>

        {/* Customer Info Card */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-semibold text-gray-900">{customer.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-semibold text-gray-900">{customer.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Customer Since</p>
                <p className="font-semibold text-gray-900">{formatDisplayDate(customer.created_at)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Address</p>
                <p className="font-semibold text-gray-900">{customer.address || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Overview KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Invoiced</p>
                <p className="text-2xl font-bold text-gray-900">{fmt(currentPeriodSummary?.total_invoiced || 0)}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Received</p>
                <p className="text-2xl font-bold text-gray-900">{fmt(currentPeriodSummary?.total_received || 0)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Current Pending</p>
                <p className="text-2xl font-bold text-gray-900">{fmt(currentPeriodSummary?.total_pending || 0)}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Old Due Amount</p>
                <p className="text-2xl font-bold text-gray-900">{fmt(customer.old_due_amount)}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Receivables</p>
                <p className="text-2xl font-bold text-red-600">{fmt(totalReceivables)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-500" />
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('current')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'current'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Current Period
              </div>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <History className="w-4 h-4" />
                Settlement History
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'current' && (
          <div className="space-y-6">
            {/* Activity Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Consignments</p>
                  <p className="text-3xl font-bold text-blue-600">{currentPeriodSummary?.consignment_count || 0}</p>
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Transactions</p>
                  <p className="text-3xl font-bold text-green-600">{currentPeriodSummary?.transaction_count || 0}</p>
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Last Invoice</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {currentPeriodSummary?.last_invoice_date 
                      ? formatDisplayDate(currentPeriodSummary.last_invoice_date)
                      : 'N/A'}
                  </p>
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Last Payment</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {currentPeriodSummary?.last_payment_date 
                      ? formatDisplayDate(currentPeriodSummary.last_payment_date)
                      : 'N/A'}
                  </p>
                </div>
              </Card>
            </div>

            {/* Consignments Table */}
            <Card>
              <div className="border-b px-6 py-4">
                <h3 className="text-lg font-semibold text-gray-900">Consignments</h3>
              </div>
              <CardContent className="p-6">
                {consignments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b">
                        <tr className="text-left">
                          <th className="pb-3 font-semibold text-gray-700">Date</th>
                          <th className="pb-3 font-semibold text-gray-700">Block No</th>
                          <th className="pb-3 font-semibold text-gray-700">Sqft</th>
                          <th className="pb-3 font-semibold text-gray-700">Rate</th>
                          <th className="pb-3 font-semibold text-gray-700 text-right">Total</th>
                          <th className="pb-3 font-semibold text-gray-700 text-right">RTGS</th>
                          <th className="pb-3 font-semibold text-gray-700 text-right">Cash</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {consignments.map((c) => (
                          <tr key={c.id} className="hover:bg-gray-50">
                            <td className="py-3">{formatDisplayDate(c.date)}</td>
                            <td className="py-3">{c.block_no}</td>
                            <td className="py-3">{c.sqft}</td>
                            <td className="py-3">{fmt(c.rate)}</td>
                            <td className="py-3 text-right font-semibold">{fmt(c.total)}</td>
                            <td className="py-3 text-right text-blue-600">{fmt(c.rtgs_expected)}</td>
                            <td className="py-3 text-right text-green-600">{fmt(c.cash_expected)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No consignments in current period</p>
                )}
              </CardContent>
            </Card>

            {/* Transactions Table */}
            <Card>
              <div className="border-b px-6 py-4">
                <h3 className="text-lg font-semibold text-gray-900">Transactions</h3>
              </div>
              <CardContent className="p-6">
                {transactions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b">
                        <tr className="text-left">
                          <th className="pb-3 font-semibold text-gray-700">Date</th>
                          <th className="pb-3 font-semibold text-gray-700">Mode</th>
                          <th className="pb-3 font-semibold text-gray-700">Bank Account</th>
                          <th className="pb-3 font-semibold text-gray-700 text-right">Amount</th>
                          <th className="pb-3 font-semibold text-gray-700">Reference</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {transactions.map((t) => {
                          const account = accounts.find(a => a.id === t.bank_account_id);
                          return (
                            <tr key={t.id} className="hover:bg-gray-50">
                              <td className="py-3">{formatDisplayDate(t.date)}</td>
                              <td className="py-3">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  t.mode === 'RTGS' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                }`}>
                                  {t.mode}
                                </span>
                              </td>
                              <td className="py-3">{account?.name || 'Unknown'}</td>
                              <td className="py-3 text-right font-semibold text-green-600">{fmt(t.amount)}</td>
                              <td className="py-3 text-gray-600">{t.reference_number || '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No transactions in current period</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <CustomerPeriodHistory customerId={customerId} />
          </div>
        )}
      </div>

      {/* Settlement Modal */}
      {showSettlementModal && (
        <CustomerSettlementModal
          customerId={customerId}
          customerName={customer.name}
          currentBalance={currentPeriodSummary?.total_pending || 0}
          oldDueAmount={customer.old_due_amount}
          waivedAmount={customer.waived_amount}
          onClose={() => setShowSettlementModal(false)}
          onSuccess={handleSettlementSuccess}
        />
      )}
    </AppLayout>
  );
}
