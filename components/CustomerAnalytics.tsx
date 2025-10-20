import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  BarChart3, 
  Users, 
  DollarSign, 
  TrendingUp,
  TrendingDown,
  Star,
  AlertCircle
} from 'lucide-react';

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const fmt = (n: number) => INR.format(n || 0);

interface CustomerSummary {
  id: string;
  name: string;
  totalInvoiced: number;
  totalReceived: number;
  totalPending: number;
  oldDueAmount: number;
  waivedAmount: number;
  totalReceivables: number;
  consignmentCount: number;
  lastPaymentDate: string | null;
  collectionEfficiency: number;
  avgPaymentDelay: number;
}

interface BankAccountSummary {
  id: string;
  name: string;
  total: number;
  rtgs: number;
  cash: number;
}

interface CustomerAnalyticsProps {
  dateFrom?: string;
  dateTo?: string;
}

export function CustomerAnalytics({ dateFrom, dateTo }: CustomerAnalyticsProps) {
  const [customerSummaries, setCustomerSummaries] = useState<CustomerSummary[]>([]);
  const [bankAccountsSummary, setBankAccountsSummary] = useState<BankAccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadData();
  }, [dateFrom, dateTo]);

  async function loadData() {
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      
      const [customerResponse, bankResponse] = await Promise.all([
        fetch(`/api/customers/summary?${params.toString()}`),
        fetch(`/api/bank-accounts/summary?${params.toString()}`)
      ]);
      
      const customerData = await customerResponse.json();
      const bankData = await bankResponse.json();
      
      // Ensure customerData is always an array
      setCustomerSummaries(Array.isArray(customerData) ? customerData : []);
      setBankAccountsSummary(bankData);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
      setCustomerSummaries([]); // Set empty array on error
      setBankAccountsSummary([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredCustomers = customerSummaries.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Analytics calculations
  const totalCustomers = filteredCustomers.length;
  const totalOutstanding = filteredCustomers.reduce((sum, c) => sum + c.totalPending, 0);
  const totalInvoiced = filteredCustomers.reduce((sum, c) => sum + c.totalInvoiced, 0);
  const totalPreviousDues = filteredCustomers.reduce((sum, c) => sum + (c.oldDueAmount || 0), 0);
  const totalWaived = filteredCustomers.reduce((sum, c) => sum + (c.waivedAmount || 0), 0);
  const avgCollectionEfficiency = totalCustomers > 0 
    ? filteredCustomers.reduce((sum, c) => sum + c.collectionEfficiency, 0) / totalCustomers 
    : 0;

  // Top performers
  const topPerformers = [...filteredCustomers]
    .sort((a, b) => b.totalInvoiced - a.totalInvoiced)
    .slice(0, 5);

  // Customers with high outstanding (using totalReceivables)
  const highOutstanding = [...filteredCustomers]
    .filter(c => (c.totalReceivables !== undefined ? c.totalReceivables : c.totalPending) > 0)
    .sort((a, b) => {
      const aReceivables = a.totalReceivables !== undefined ? a.totalReceivables : a.totalPending;
      const bReceivables = b.totalReceivables !== undefined ? b.totalReceivables : b.totalPending;
      return bReceivables - aReceivables;
    })
    .slice(0, 5);

  // Customers with highest waived amounts
  const highestWaived = [...filteredCustomers]
    .filter(c => (c.waivedAmount || 0) > 0)
    .sort((a, b) => (b.waivedAmount || 0) - (a.waivedAmount || 0))
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-lg text-gray-600">Loading customer analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          placeholder="Search customers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Overview KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900">{totalCustomers}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4 bg-orange-50 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-700">Total Previous Dues</p>
              <p className="text-2xl font-bold text-orange-900">{fmt(totalPreviousDues)}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-orange-600" />
          </div>
        </Card>

        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-700">Total Waived</p>
              <p className="text-2xl font-bold text-amber-900">{fmt(totalWaived)}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-amber-600" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Collection %</p>
              <p className="text-2xl font-bold text-gray-900">{avgCollectionEfficiency.toFixed(1)}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-500" />
          </div>
        </Card>
      </div>

      {/* Customer Summaries Grid */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900">Customer Summaries</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.slice(0, 12).map((customer) => (
            <Card key={customer.id} className="p-4 hover:shadow-lg transition-shadow">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-lg text-gray-900">{customer.name}</h4>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    customer.collectionEfficiency > 80 
                      ? 'bg-green-100 text-green-800' 
                      : customer.collectionEfficiency > 60 
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {customer.collectionEfficiency.toFixed(0)}%
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Total Invoiced</p>
                    <p className="font-semibold text-green-600">{fmt(customer.totalInvoiced)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Received</p>
                    <p className="font-semibold text-blue-600">{fmt(customer.totalReceived)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Waived Amount</p>
                    <p className="font-semibold text-amber-600">{fmt(customer.waivedAmount || 0)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">
                      {customer.totalReceivables !== undefined ? 'Total Receivables' : 'Total Pending'}
                    </p>
                    <p className="font-semibold text-orange-600">
                      {fmt(customer.totalReceivables !== undefined ? customer.totalReceivables : customer.totalPending)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{customer.consignmentCount} consignments</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Outstanding Amounts Chart */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
          Total Receivables by Customer
        </h3>
        <div className="space-y-4">
          {filteredCustomers
            .filter(c => (c.totalReceivables !== undefined ? c.totalReceivables : c.totalPending) > 0)
            .sort((a, b) => {
              const aReceivables = a.totalReceivables !== undefined ? a.totalReceivables : a.totalPending;
              const bReceivables = b.totalReceivables !== undefined ? b.totalReceivables : b.totalPending;
              return bReceivables - aReceivables;
            })
            .slice(0, 10)
            .map((customer) => {
              const receivablesAmount = customer.totalReceivables !== undefined ? customer.totalReceivables : customer.totalPending;
              const maxReceivables = Math.max(...filteredCustomers.map(c => 
                c.totalReceivables !== undefined ? c.totalReceivables : c.totalPending
              ));
              const barWidth = maxReceivables > 0 ? (receivablesAmount / maxReceivables) * 100 : 0;
              
              // Determine color based on amount ranges
              let barColor = 'bg-gradient-to-r from-green-400 to-green-500'; // Low
              if (receivablesAmount > maxReceivables * 0.6) {
                barColor = 'bg-gradient-to-r from-red-400 to-red-500'; // High
              } else if (receivablesAmount > maxReceivables * 0.3) {
                barColor = 'bg-gradient-to-r from-orange-400 to-orange-500'; // Medium
              }
              
              return (
                <div key={customer.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 truncate flex-1 mr-4">{customer.name}</span>
                    <span className="text-gray-700 font-semibold text-sm whitespace-nowrap">
                      {fmt(receivablesAmount)}
                    </span>
                  </div>
                  <div className="relative">
                    <div className="w-full bg-gray-100 rounded-lg h-3 shadow-inner">
                      <div 
                        className={`${barColor} h-3 rounded-lg transition-all duration-500 ease-out shadow-sm`}
                        style={{ width: `${barWidth}%` }}
                      ></div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-lg"></div>
                  </div>
                </div>
              );
            })}
          {filteredCustomers.filter(c => (c.totalReceivables !== undefined ? c.totalReceivables : c.totalPending) > 0).length === 0 && (
            <p className="text-center text-gray-500 py-8">No outstanding receivables</p>
          )}
        </div>
      </Card>

      {/* Analytics Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Performers */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Star className="w-5 h-5 mr-2 text-yellow-500" />
            Top Performers
          </h3>
          <div className="space-y-3">
            {topPerformers.map((customer, index) => (
              <div key={customer.id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="w-6 h-6 bg-yellow-100 text-yellow-800 rounded-full flex items-center justify-center text-xs font-medium mr-3">
                    {index + 1}
                  </span>
                  <span className="font-medium">{customer.name}</span>
                </div>
                <span className="text-green-600 font-semibold">{fmt(customer.totalInvoiced)}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* High Outstanding */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
            High Outstanding
          </h3>
          <div className="space-y-3">
            {highOutstanding.map((customer, index) => {
              const receivablesAmount = customer.totalReceivables !== undefined ? customer.totalReceivables : customer.totalPending;
              return (
                <div key={customer.id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="w-6 h-6 bg-red-100 text-red-800 rounded-full flex items-center justify-center text-xs font-medium mr-3">
                      {index + 1}
                    </span>
                    <span className="font-medium">{customer.name}</span>
                  </div>
                  <span className="text-red-600 font-semibold">{fmt(receivablesAmount)}</span>
                </div>
              );
            })}
            {highOutstanding.length === 0 && (
              <p className="text-center text-gray-500 py-4 text-sm">No outstanding amounts</p>
            )}
          </div>
        </Card>

        {/* Highest Waived */}
        <Card className="p-6 bg-amber-50 border-amber-200">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-amber-900">
            <TrendingDown className="w-5 h-5 mr-2 text-amber-600" />
            Highest Waived
          </h3>
          <div className="space-y-3">
            {highestWaived.map((customer, index) => (
              <div key={customer.id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="w-6 h-6 bg-amber-200 text-amber-900 rounded-full flex items-center justify-center text-xs font-medium mr-3">
                    {index + 1}
                  </span>
                  <span className="font-medium text-gray-900">{customer.name}</span>
                </div>
                <span className="text-amber-700 font-semibold">{fmt(customer.waivedAmount || 0)}</span>
              </div>
            ))}
            {highestWaived.length === 0 && (
              <p className="text-center text-amber-700 py-4 text-sm">No waived amounts</p>
            )}
          </div>
        </Card>
      </div>

      {/* Bank Accounts Summary */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <DollarSign className="w-5 h-5 mr-2 text-green-500" />
          Bank Collections
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bankAccountsSummary.map((account) => (
            <div key={account.id} className="space-y-2 p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm truncate">{account.name}</span>
                <span className="text-green-600 font-semibold text-sm">{fmt(account.total)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>RTGS: {fmt(account.rtgs)}</span>
                <span>Cash: {fmt(account.cash)}</span>
              </div>
            </div>
          ))}
          {bankAccountsSummary.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">No payment data available</p>
          )}
        </div>
      </Card>
    </div>
  );
}