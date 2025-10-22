'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppLayout } from '@/components/AppLayout';
import { formatDisplayDate } from '@/lib/date-utils';
import { useMasking } from '@/contexts/MaskingContext';
import { 
  BarChart3, 
  Users, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  ArrowLeft,
  Download,
  Star,
  Clock,
  AlertCircle,
  Lock,
  Unlock
} from 'lucide-react';
import Link from 'next/link';

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
  collectionEfficiency: number; // percentage
  avgPaymentDelay: number; // days
}

export default function CustomersPage() {
  const { isUnlocked, attemptUnlock, lock, maskName } = useMasking();
  const [customerSummaries, setCustomerSummaries] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingWaivedAmount, setEditingWaivedAmount] = useState<{ id: string; amount: string } | null>(null);

  const handleUnlockToggle = () => {
    if (isUnlocked) {
      // Lock names
      lock();
    } else {
      // Prompt for PIN
      const pin = prompt('Enter PIN to unlock customer names:');
      if (pin) {
        const success = attemptUnlock(pin);
        if (!success) {
          alert('Incorrect PIN');
        }
      }
    }
  };

  useEffect(() => {
    loadCustomerSummaries();
  }, [dateFrom, dateTo]);

  async function loadCustomerSummaries() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      
      const response = await fetch(`/api/customers/summary?${params.toString()}`);
      const data = await response.json();
      
      // Ensure data is always an array
      setCustomerSummaries(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load customer summaries:', error);
      setCustomerSummaries([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateWaivedAmount(customerId: string, newAmount: number) {
    try {
      const response = await fetch('/api/customers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: customerId, waived_amount: newAmount }),
      });

      if (!response.ok) {
        throw new Error('Failed to update waived amount');
      }

      // Reload summaries to reflect changes
      await loadCustomerSummaries();
      setEditingWaivedAmount(null);
    } catch (error) {
      console.error('Error updating waived amount:', error);
      alert('Failed to update waived amount');
    }
  }

  const filteredCustomers = customerSummaries.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Analytics calculations
  const totalCustomers = filteredCustomers.length;
  const totalOutstanding = filteredCustomers.reduce((sum, c) => sum + c.totalPending, 0);
  const totalInvoiced = filteredCustomers.reduce((sum, c) => sum + c.totalInvoiced, 0);
  const totalWaivedAmount = filteredCustomers.reduce((sum, c) => sum + (c.waivedAmount || 0), 0);
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

  // Customers with payment delays
  const paymentDelays = [...filteredCustomers]
    .filter(c => c.avgPaymentDelay > 0)
    .sort((a, b) => b.avgPaymentDelay - a.avgPaymentDelay)
    .slice(0, 5);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading customer analytics...</div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen w-full bg-gray-50 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/">
            <Button variant="secondary" className="flex items-center space-x-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Customer Analytics</h1>
        </div>
        <div className="flex space-x-3">
          <Button 
            onClick={handleUnlockToggle}
            className={`flex items-center space-x-2 ${
              isUnlocked 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-orange-600 hover:bg-orange-700'
            }`}
          >
            {isUnlocked ? (
              <>
                <Unlock className="w-4 h-4" />
                <span>Lock Names</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Unlock Names</span>
              </>
            )}
          </Button>
          <Button variant="secondary">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        <div className="md:col-span-4">
          <Input
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex items-center gap-2 border rounded-xl px-3 py-2 md:col-span-3">
          <Calendar className="w-4 h-4" />
          <Input 
            type="date" 
            className="border-0 p-0 focus-visible:ring-0 w-full" 
            value={dateFrom} 
            onChange={(e) => setDateFrom(e.target.value)} 
          />
        </div>
        <div className="flex items-center gap-2 border rounded-xl px-3 py-2 md:col-span-3">
          <Calendar className="w-4 h-4" />
          <Input 
            type="date" 
            className="border-0 p-0 focus-visible:ring-0 w-full" 
            value={dateTo} 
            onChange={(e) => setDateTo(e.target.value)} 
          />
        </div>
      </div>

      {/* Overview KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900">{totalCustomers}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Invoiced</p>
              <p className="text-2xl font-bold text-gray-900">{fmt(totalInvoiced)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Outstanding</p>
              <p className="text-2xl font-bold text-gray-900">{fmt(totalOutstanding)}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Waived</p>
              <p className="text-2xl font-bold text-gray-900">{fmt(totalWaivedAmount)}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-orange-500" />
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
        <h2 className="text-2xl font-semibold text-gray-900">Customer Summaries</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => (
            <Card key={customer.id} className="p-4 hover:shadow-lg transition-shadow">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg text-gray-900">{maskName(customer.name)}</h3>
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
                    <p className="text-gray-600">Pending</p>
                    <p className="font-semibold text-red-600">{fmt(customer.totalPending)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">
                      {customer.totalReceivables !== undefined ? 'Total Receivables' : 'Total Pending'}
                    </p>
                    <p className="font-semibold text-orange-600">
                      {fmt(customer.totalReceivables !== undefined ? customer.totalReceivables : customer.totalPending)}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-600 mb-1">Amount Waived</p>
                    {editingWaivedAmount?.id === customer.id ? (
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editingWaivedAmount.amount}
                          onChange={(e) => setEditingWaivedAmount({ id: customer.id, amount: e.target.value })}
                          className="flex-1"
                          autoFocus
                        />
                        <Button 
                          size="sm" 
                          onClick={() => handleUpdateWaivedAmount(customer.id, parseFloat(editingWaivedAmount.amount) || 0)}
                        >
                          Save
                        </Button>
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          onClick={() => setEditingWaivedAmount(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div 
                        className="font-semibold text-orange-500 cursor-pointer hover:text-orange-600 flex items-center"
                        onClick={() => setEditingWaivedAmount({ id: customer.id, amount: (customer.waivedAmount || 0).toString() })}
                      >
                        {fmt(customer.waivedAmount || 0)}
                        <span className="ml-2 text-xs text-gray-400">(click to edit)</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{customer.consignmentCount} consignments</span>
                  {customer.avgPaymentDelay > 0 && (
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {customer.avgPaymentDelay.toFixed(0)}d delay
                    </span>
                  )}
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
                    <span className="font-medium text-gray-900 truncate flex-1 mr-4">{maskName(customer.name)}</span>
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
                  <span className="font-medium">{maskName(customer.name)}</span>
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
                    <span className="font-medium">{maskName(customer.name)}</span>
                  </div>
                  <span className="text-red-600 font-semibold">{fmt(receivablesAmount)}</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Payment Delays */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-orange-500" />
            Payment Delays
          </h3>
          <div className="space-y-3">
            {paymentDelays.map((customer, index) => (
              <div key={customer.id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="w-6 h-6 bg-orange-100 text-orange-800 rounded-full flex items-center justify-center text-xs font-medium mr-3">
                    {index + 1}
                  </span>
                  <span className="font-medium">{maskName(customer.name)}</span>
                </div>
                <span className="text-orange-600 font-semibold">{customer.avgPaymentDelay.toFixed(0)}d</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
    </AppLayout>
  );
}