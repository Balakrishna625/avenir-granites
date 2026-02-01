'use client';

import { useState, useEffect, useMemo } from 'react';
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
  Archive,
  Calendar
} from 'lucide-react';
import Link from 'next/link';

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const fmt = (n: number) => INR.format(n || 0);

// Helper function to detect "Galaxy" with fuzzy matching for typos
function isGalaxyRelated(text: string | null | undefined): boolean {
  if (!text) return false;
  const normalized = text.toLowerCase().trim();
  
  // Exact and common variations
  const patterns = [
    'galaxy',
    'galxy',     // missing 'a'
    'galacy',    // switched letters
    'galexy',    // 'e' instead of 'a'
    'galaxi',    // missing 'y'
    'glaxy',     // missing 'a'
    'galaxys',   // plural
    'galxay',    // switched letters
  ];
  
  return patterns.some(pattern => normalized.includes(pattern));
}

// Helper function to detect "Yelhanka" with fuzzy matching for typos
function isYelhankaRelated(text: string | null | undefined): boolean {
  if (!text) return false;
  const normalized = text.toLowerCase().trim();
  
  // Exact and common variations
  const patterns = [
    'yelhanka',    // correct
    'yellhanka',   // double l
    'yelanka',     // missing h
    'yelhanca',    // c instead of k
    'yalehanka',   // switched a/e
    'yelahanka',   // switched h/a
    'yellahanka',  // double l + switched
    'yelhaka',     // missing n
    'yelhnka',     // missing a
  ];
  
  return patterns.some(pattern => normalized.includes(pattern));
}

// Helper function to detect "Only Bill" in remarks (case-insensitive)
function isOnlyBillRemark(text: string | null | undefined): boolean {
  if (!text) return false;
  const normalized = text.toLowerCase().trim();
  return normalized.includes('only bill') || normalized.includes('onlybill');
}

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
  const [onlyBillSales, setOnlyBillSales] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  
  // Month selector state
  const [selectedYear, setSelectedYear] = useState<number | "all">("all");
  const [selectedMonth, setSelectedMonth] = useState<number | "all">("all");
  
  // Galaxy filter state
  const [excludeGalaxy, setExcludeGalaxy] = useState(false);
  
  // Only Bill filter state
  const [excludeOnlyBill, setExcludeOnlyBill] = useState(false);
  
  // Branch filter state (for SAI KRUPA MARBLES only)
  const [branchFilter, setBranchFilter] = useState<'all' | 'yelhanka' | 'main'>('all');

  useEffect(() => {
    loadCustomerData();
    loadCommonData();
  }, [customerId, selectedYear, selectedMonth]);

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

      // Calculate date range from month selector
      let dateFrom = "";
      let dateTo = "";
      
      if (selectedYear !== "all" && selectedMonth !== "all") {
        // Specific month selected
        const yearNum = typeof selectedYear === "number" ? selectedYear : parseInt(selectedYear as string);
        const monthNum = typeof selectedMonth === "number" ? selectedMonth : parseInt(selectedMonth as string);
        dateFrom = new Date(yearNum, monthNum - 1, 1).toISOString().split('T')[0];
        dateTo = new Date(yearNum, monthNum, 0).toISOString().split('T')[0];
      } else if (selectedYear !== "all") {
        // Only year selected, show full year
        const yearNum = typeof selectedYear === "number" ? selectedYear : parseInt(selectedYear as string);
        dateFrom = new Date(yearNum, 0, 1).toISOString().split('T')[0];
        dateTo = new Date(yearNum, 11, 31).toISOString().split('T')[0];
      }

      // Build query parameters
      const params = new URLSearchParams();
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const queryString = params.toString();

      // Parallel load all data with optimized summary endpoint
      const [customerRes, summaryRes, consignmentsRes, transactionsRes, onlyBillSalesRes] = await Promise.all([
        fetch(`/api/customers?id=${customerId}`),
        fetch(`/api/customers/summary?customerId=${customerId}${queryString ? '&' + queryString : ''}`),
        fetch(`/api/consignments?customerId=${customerId}${queryString ? '&' + queryString : ''}`),
        fetch(`/api/transactions?customerId=${customerId}${queryString ? '&' + queryString : ''}`),
        fetch(`/api/sales?customer_id=${customerId}&only_bill=true`)
      ]);

      const [customerData, summaryData, consignmentsData, transactionsData, onlyBillData] = await Promise.all([
        customerRes.json(),
        summaryRes.json(),
        consignmentsRes.json(),
        transactionsRes.json(),
        onlyBillSalesRes.json()
      ]);

      setCustomer(customerData[0] || null);
      setCurrentPeriodSummary(summaryData[0] || null);
      setConsignments(consignmentsData);
      setTransactions(transactionsData);
      setOnlyBillSales(Array.isArray(onlyBillData) ? onlyBillData : []);
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

  // Memoize calculated values to avoid recalculation on every render
  const totalReceivables = useMemo(() => {
    if (!customer || !currentPeriodSummary) return 0;
    return (currentPeriodSummary.total_pending || 0) + customer.old_due_amount - customer.waived_amount;
  }, [customer, currentPeriodSummary]);

  // Only Bill calculations
  const onlyBillMetrics = useMemo(() => {
    const rtgsTotal = onlyBillSales.reduce((sum, sale) => sum + (Number(sale.official_total) || 0), 0);
    const factoryTotal = onlyBillSales.reduce((sum, sale) => {
      const mining = Number(sale.factory_mining_amount) || 0;
      const gst = Number(sale.factory_gst_amount) || 0;
      return sum + mining + gst;
    }, 0);
    return { rtgsTotal, factoryTotal, hasOnlyBillSales: onlyBillSales.length > 0 };
  }, [onlyBillSales]);

  // Calculate Only Bill consignments from remarks
  const onlyBillConsignmentMetrics = useMemo(() => {
    console.log('Checking consignments for Only Bill:', consignments.map(c => ({ id: c.id, remarks: c.remarks, hasOnlyBill: isOnlyBillRemark(c.remarks) })));
    const onlyBillConsignments = consignments.filter(c => isOnlyBillRemark(c.remarks));
    console.log('Found Only Bill consignments:', onlyBillConsignments.length);
    const rtgsFromOnlyBill = onlyBillConsignments.reduce((sum, c) => sum + (c.rtgs_expected || 0), 0);
    return { 
      rtgsFromOnlyBill, 
      hasOnlyBillConsignments: onlyBillConsignments.length > 0,
      count: onlyBillConsignments.length
    };
  }, [consignments]);

  // Check if customer has any Galaxy-related consignments
  const hasGalaxyConsignments = useMemo(() => {
    return consignments.some(c => isGalaxyRelated(c.remarks));
  }, [consignments]);
  
  // Check if customer has any only bill consignments
  const hasOnlyBillEntries = useMemo(() => {
    return consignments.some(c => c.entry_type === 'only_bill');
  }, [consignments]);
  
  // Check if customer has any Yelhanka-related data
  const hasYelhankaData = useMemo(() => {
    const hasYelhankaConsignments = consignments.some(c => isYelhankaRelated(c.remarks));
    const hasYelhankaTransactions = transactions.some(t => isYelhankaRelated(t.reference_number));
    return hasYelhankaConsignments || hasYelhankaTransactions;
  }, [consignments, transactions]);

  // Filter consignments based on Galaxy exclusion, Only Bill exclusion, and Branch filter
  const filteredConsignments = useMemo(() => {
    let filtered = consignments;
    
    // Apply Galaxy filter
    if (excludeGalaxy) {
      filtered = filtered.filter(c => !isGalaxyRelated(c.remarks));
    }
    
    // Apply Only Bill filter
    if (excludeOnlyBill) {
      filtered = filtered.filter(c => c.entry_type !== 'only_bill');
    }
    
    // Apply Branch filter (only for SAI KRUPA MARBLES)
    if (customer?.name === 'SAI KRUPA MARBLES' && branchFilter !== 'all') {
      if (branchFilter === 'yelhanka') {
        filtered = filtered.filter(c => isYelhankaRelated(c.remarks));
      } else if (branchFilter === 'main') {
        filtered = filtered.filter(c => !isYelhankaRelated(c.remarks));
      }
    }
    
    return filtered;
  }, [consignments, excludeGalaxy, branchFilter, customer]);
  
  // Filter transactions based on Branch filter
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;
    
    // Apply Branch filter (only for SAI KRUPA MARBLES)
    if (customer?.name === 'SAI KRUPA MARBLES' && branchFilter !== 'all') {
      if (branchFilter === 'yelhanka') {
        filtered = filtered.filter(t => isYelhankaRelated(t.reference_number));
      } else if (branchFilter === 'main') {
        filtered = filtered.filter(t => !isYelhankaRelated(t.reference_number));
      }
    }
    
    return filtered;
  }, [transactions, branchFilter, customer]);

  // Recalculate summary based on filtered consignments and transactions
  const filteredSummary = useMemo(() => {
    if (!currentPeriodSummary) return currentPeriodSummary;
    
    // Check if any filters are active
    const hasActiveFilters = excludeGalaxy || (customer?.name === 'SAI KRUPA MARBLES' && branchFilter !== 'all');
    if (!hasActiveFilters) return currentPeriodSummary;
    
    const filteredTotal = filteredConsignments.reduce((sum, c) => sum + (c.total || 0), 0);
    const filteredRtgs = filteredConsignments.reduce((sum, c) => sum + (c.rtgs_expected || 0), 0);
    const filteredCash = filteredConsignments.reduce((sum, c) => sum + (c.cash_expected || 0), 0);
    
    // Calculate total received from filtered transactions
    const filteredReceived = filteredTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    
    // Calculate pending
    const filteredPending = filteredTotal - filteredReceived;
    
    return {
      ...currentPeriodSummary,
      total_invoiced: filteredTotal,
      total_received: filteredReceived,
      total_pending: filteredPending,
      consignment_count: filteredConsignments.length,
      transaction_count: filteredTransactions.length,
    };
  }, [excludeGalaxy, branchFilter, customer, currentPeriodSummary, filteredConsignments, filteredTransactions]);

  // Recalculate total receivables with filtered data
  const filteredTotalReceivables = useMemo(() => {
    if (!customer || !filteredSummary) return totalReceivables;
    
    // Check if any filters are active
    const hasActiveFilters = excludeGalaxy || (customer?.name === 'SAI KRUPA MARBLES' && branchFilter !== 'all');
    if (!hasActiveFilters) return totalReceivables;
    
    // Recalculate based on filtered data
    return (filteredSummary.total_pending || 0) + customer.old_due_amount - customer.waived_amount;
  }, [customer, filteredSummary, excludeGalaxy, branchFilter, totalReceivables]);

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

  // Removed duplicate totalReceivables calculation (now using memoized value)

  // Generate year and month options
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i); // 2 years back, current, 2 years forward
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

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

        {/* Month Selector */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-gray-500" />
              <select 
                value={selectedYear} 
                onChange={(e) => {
                  const val = e.target.value === "all" ? "all" : parseInt(e.target.value);
                  setSelectedYear(val);
                  if (val === "all") setSelectedMonth("all");
                }}
                className="border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Years</option>
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <select 
                value={selectedMonth} 
                onChange={(e) => {
                  const val = e.target.value === "all" ? "all" : parseInt(e.target.value);
                  setSelectedMonth(val);
                }}
                disabled={selectedYear === "all"}
                className="border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="all">All Months</option>
                {months.map((month, index) => (
                  <option key={month} value={index + 1}>{month}</option>
                ))}
              </select>
              {selectedYear !== "all" && (
                <span className="text-sm text-gray-600">
                  {selectedMonth !== "all" 
                    ? `Showing ${months[(selectedMonth as number) - 1]} ${selectedYear}` 
                    : `Showing all of ${selectedYear}`}
                </span>
              )}
              
              {/* Galaxy Filter - Only show if customer has galaxy consignments */}
              {hasGalaxyConsignments && (
                <div className="ml-auto flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-xl">
                  <input
                    type="checkbox"
                    id="excludeGalaxy"
                    checked={excludeGalaxy}
                    onChange={(e) => setExcludeGalaxy(e.target.checked)}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <label htmlFor="excludeGalaxy" className="text-sm font-medium text-green-800 cursor-pointer">
                    Exclude Galaxy
                  </label>
                </div>
              )}
              
              {/* Only Bill Filter - Only show if customer has only bill consignments */}
              {hasOnlyBillEntries && (
                <div className={`${hasGalaxyConsignments ? '' : 'ml-auto'} flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl`}>
                  <input
                    type="checkbox"
                    id="excludeOnlyBill"
                    checked={excludeOnlyBill}
                    onChange={(e) => setExcludeOnlyBill(e.target.checked)}
                    className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                  />
                  <label htmlFor="excludeOnlyBill" className="text-sm font-medium text-amber-800 cursor-pointer">
                    Exclude Only Bill
                  </label>
                </div>
              )}
              
              {/* Branch Filter - Only show for SAI KRUPA MARBLES if has Yelhanka data */}
              {customer?.name === 'SAI KRUPA MARBLES' && hasYelhankaData && (
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl">
                  <label htmlFor="branchFilter" className="text-sm font-medium text-blue-800">
                    Branch:
                  </label>
                  <select
                    id="branchFilter"
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value as 'all' | 'yelhanka' | 'main')}
                    className="border border-blue-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-blue-900 font-medium"
                  >
                    <option value="all">All Branches</option>
                    <option value="yelhanka">Yelhanka Only</option>
                    <option value="main">Main Branch Only</option>
                  </select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

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
        {/* DEBUG: Only Bill Check - hasOnlyBillSales: {onlyBillMetrics.hasOnlyBillSales ? 'YES' : 'NO'}, count: {onlyBillSales.length} */}
        <div className={`grid grid-cols-1 gap-4 ${
          onlyBillMetrics.hasOnlyBillSales && onlyBillConsignmentMetrics.hasOnlyBillConsignments ? 'md:grid-cols-8' :
          onlyBillMetrics.hasOnlyBillSales || onlyBillConsignmentMetrics.hasOnlyBillConsignments ? 'md:grid-cols-6' : 
          'md:grid-cols-5'
        }`}>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Invoiced</p>
                <p className="text-2xl font-bold text-gray-900">{fmt(filteredSummary?.total_invoiced || 0)}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Received</p>
                <p className="text-2xl font-bold text-gray-900">{fmt(filteredSummary?.total_received || 0)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  {(filteredSummary?.total_pending || 0) >= 0 ? 'Current Pending' : 'Advance Credit'}
                </p>
                <p className={`text-2xl font-bold ${(filteredSummary?.total_pending || 0) >= 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {(filteredSummary?.total_pending || 0) >= 0 
                    ? fmt(filteredSummary?.total_pending || 0)
                    : fmt(Math.abs(filteredSummary?.total_pending || 0))
                  }
                </p>
              </div>
              {(filteredSummary?.total_pending || 0) >= 0 
                ? <AlertCircle className="w-8 h-8 text-orange-500" />
                : <TrendingUp className="w-8 h-8 text-green-500" />
              }
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
                <p className="text-sm text-gray-600">
                  {filteredTotalReceivables >= 0 ? 'Total Receivables' : 'Total Advance'}
                </p>
                <p className={`text-2xl font-bold ${filteredTotalReceivables >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {filteredTotalReceivables >= 0 
                    ? fmt(filteredTotalReceivables)
                    : fmt(Math.abs(filteredTotalReceivables))
                  }
                </p>
              </div>
              <DollarSign className={`w-8 h-8 ${filteredTotalReceivables >= 0 ? 'text-purple-500' : 'text-green-500'}`} />
            </div>
          </Card>

          {/* Only Bill Tiles - Show only if customer has Only Bill sales */}
          {onlyBillMetrics.hasOnlyBillSales && (
            <>
              <Card className="p-4 bg-gradient-to-br from-amber-50 to-yellow-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Only Bill RTGS</p>
                    <p className="text-xl font-bold text-amber-700">{fmt(onlyBillMetrics.rtgsTotal)}</p>
                    <p className="text-xs text-gray-500 mt-1">Billed Amount</p>
                  </div>
                  <FileText className="w-7 h-7 text-amber-600" />
                </div>
              </Card>

              <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Factory Amount</p>
                    <p className="text-xl font-bold text-green-700">{fmt(onlyBillMetrics.factoryTotal)}</p>
                    <p className="text-xs text-gray-500 mt-1">Mining + GST</p>
                  </div>
                  <DollarSign className="w-7 h-7 text-green-600" />
                </div>
              </Card>
            </>
          )}

          {/* Only Bill Consignment Tile - Show if customer has consignments with "only bill" in remarks */}
          {onlyBillConsignmentMetrics.hasOnlyBillConsignments && (
            <Card className="p-4 bg-gradient-to-br from-cyan-50 to-blue-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 font-medium">RTGS from Only Bill</p>
                  <p className="text-xl font-bold text-cyan-700">{fmt(onlyBillConsignmentMetrics.rtgsFromOnlyBill)}</p>
                  <p className="text-xs text-gray-500 mt-1">{onlyBillConsignmentMetrics.count} Consignment{onlyBillConsignmentMetrics.count !== 1 ? 's' : ''}</p>
                </div>
                <FileText className="w-7 h-7 text-cyan-600" />
              </div>
            </Card>
          )}
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
                  <p className="text-3xl font-bold text-blue-600">{filteredSummary?.consignment_count || 0}</p>
                  {excludeGalaxy && hasGalaxyConsignments && (
                    <p className="text-xs text-green-600 mt-1">(Galaxy excluded)</p>
                  )}
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Transactions</p>
                  <p className="text-3xl font-bold text-green-600">{filteredSummary?.transaction_count || 0}</p>
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Last Invoice</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {filteredSummary?.last_invoice_date 
                      ? formatDisplayDate(filteredSummary.last_invoice_date)
                      : 'N/A'}
                  </p>
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Last Payment</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {filteredSummary?.last_payment_date 
                      ? formatDisplayDate(filteredSummary.last_payment_date)
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
                {filteredConsignments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b">
                        <tr className="text-left">
                          <th className="pb-3 font-semibold text-gray-700">Date</th>
                          <th className="pb-3 font-semibold text-gray-700">Type</th>
                          <th className="pb-3 font-semibold text-gray-700">Block No</th>
                          <th className="pb-3 font-semibold text-gray-700">Sqft</th>
                          <th className="pb-3 font-semibold text-gray-700">Rate</th>
                          <th className="pb-3 font-semibold text-gray-700 text-right">Total</th>
                          <th className="pb-3 font-semibold text-gray-700 text-right">RTGS</th>
                          <th className="pb-3 font-semibold text-gray-700 text-right">Cash</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredConsignments.map((c) => (
                          <tr key={c.id} className="hover:bg-gray-50">
                            <td className="py-3">{formatDisplayDate(c.date)}</td>
                            <td className="py-3">
                              {c.entry_type === 'only_bill' && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded">
                                  Only Bill
                                </span>
                              )}
                              {c.entry_type === 'job_work' && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                                  Job Work
                                </span>
                              )}
                              {c.entry_type === 'sales' && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                                  Sales
                                </span>
                              )}
                              {!c.entry_type && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                                  Regular
                                </span>
                              )}
                            </td>
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
                  <p className="text-center text-gray-500 py-8">
                    {excludeGalaxy && hasGalaxyConsignments 
                      ? 'All consignments are Galaxy-related. Uncheck "Exclude Galaxy" to view them.'
                      : 'No consignments in current period'}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Transactions - Split into RTGS and Cash sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* RTGS Transactions */}
              <Card className="border-2 border-blue-200">
                <div className="bg-blue-50 border-b border-blue-200 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-blue-900">RTGS Transactions</h3>
                    <div className="text-right">
                      <p className="text-xs text-blue-600 font-medium">Total: {fmt(
                        filteredTransactions.filter(t => t.mode === 'RTGS').reduce((sum, t) => sum + (t.amount || 0), 0)
                      )}</p>
                      <p className="text-xs text-blue-500">({filteredTransactions.filter(t => t.mode === 'RTGS').length} transactions)</p>
                    </div>
                  </div>
                </div>
                <CardContent className="p-6">
                  {filteredTransactions.filter(t => t.mode === 'RTGS').length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b border-blue-100">
                          <tr className="text-left">
                            <th className="pb-3 font-semibold text-gray-700">Date</th>
                            <th className="pb-3 font-semibold text-gray-700">Account</th>
                            <th className="pb-3 font-semibold text-gray-700 text-right">Amount (₹)</th>
                            <th className="pb-3 font-semibold text-gray-700">Note</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredTransactions
                            .filter(t => t.mode === 'RTGS')
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .map((t) => {
                              const account = accounts.find(a => a.id === t.bank_account_id);
                              return (
                                <tr key={t.id} className="hover:bg-blue-50">
                                  <td className="py-3 text-gray-900">{formatDisplayDate(t.date)}</td>
                                  <td className="py-3 text-gray-700">{account?.name || 'Unknown'}</td>
                                  <td className="py-3 text-right font-bold text-blue-600">{fmt(t.amount)}</td>
                                  <td className="py-3 text-gray-600 text-sm">{t.reference_number || '-'}</td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-center text-gray-400 py-8">No RTGS transactions</p>
                  )}
                </CardContent>
              </Card>

              {/* Cash Transactions */}
              <Card className="border-2 border-green-200">
                <div className="bg-green-50 border-b border-green-200 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-green-900">Cash Transactions</h3>
                    <div className="text-right">
                      <p className="text-xs text-green-600 font-medium">Total: {fmt(
                        filteredTransactions.filter(t => t.mode === 'Cash').reduce((sum, t) => sum + (t.amount || 0), 0)
                      )}</p>
                      <p className="text-xs text-green-500">({filteredTransactions.filter(t => t.mode === 'Cash').length} transactions)</p>
                    </div>
                  </div>
                </div>
                <CardContent className="p-6">
                  {filteredTransactions.filter(t => t.mode === 'Cash').length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b border-green-100">
                          <tr className="text-left">
                            <th className="pb-3 font-semibold text-gray-700">Date</th>
                            <th className="pb-3 font-semibold text-gray-700">Account</th>
                            <th className="pb-3 font-semibold text-gray-700 text-right">Amount (₹)</th>
                            <th className="pb-3 font-semibold text-gray-700">Note</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredTransactions
                            .filter(t => t.mode === 'Cash')
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .map((t) => {
                              const account = accounts.find(a => a.id === t.bank_account_id);
                              return (
                                <tr key={t.id} className="hover:bg-green-50">
                                  <td className="py-3 text-gray-900">{formatDisplayDate(t.date)}</td>
                                  <td className="py-3 text-gray-700">{account?.name || 'Unknown'}</td>
                                  <td className="py-3 text-right font-bold text-green-600">{fmt(t.amount)}</td>
                                  <td className="py-3 text-gray-600 text-sm">{t.reference_number || '-'}</td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-center text-gray-400 py-8">No cash transactions</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            {/* Only load history when tab is active to improve initial page load */}
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
