'use client';

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import { useToast } from "@/components/ui/toast";
import { 
  Plus,
  Users,
  DollarSign,
  X,
  Calendar,
  ArrowRight,
  Wallet,
  TrendingUp,
  Receipt,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

const INR = new Intl.NumberFormat("en-IN", { 
  style: "currency", 
  currency: "INR", 
  maximumFractionDigits: 0 
});
const fmt = (n: number) => INR.format(n || 0);

// Helper function to format numbers with Indian comma separators (without ₹ symbol)
const formatIndianNumber = (value: string): string => {
  if (!value) return '';
  // Remove all non-digits
  const numericValue = value.replace(/\D/g, '');
  if (!numericValue) return '';
  
  // Format with Indian comma separators
  const number = parseInt(numericValue);
  return number.toLocaleString('en-IN');
};

// Helper function to parse Indian formatted number back to numeric string
const parseIndianNumber = (value: string): string => {
  return value.replace(/,/g, '');
};

interface ContractorPayment {
  id: string;
  contractor_name: string;
  month: string;
  total_payable: number;
  carry_forward: number;
  total_paid: number;
  balance: number;
  manually_adjusted?: boolean;
}

interface PaymentTransaction {
  id: string;
  payment_date: string;
  amount: number;
  payment_mode: string;
  notes?: string;
}

export default function ContractorPaymentsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [dineshData, setDineshData] = useState<ContractorPayment | null>(null);
  const [linePolishData, setLinePolishData] = useState<ContractorPayment | null>(null);
  const [dineshTransactions, setDineshTransactions] = useState<PaymentTransaction[]>([]);
  const [linePolishTransactions, setLinePolishTransactions] = useState<PaymentTransaction[]>([]);
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPayableModal, setShowPayableModal] = useState(false);
  const [selectedContractor, setSelectedContractor] = useState('');
  
  const [paymentForm, setPaymentForm] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount: '',
    payment_mode: 'Cash',
    notes: ''
  });
  
  const [payableAmount, setPayableAmount] = useState('');
  const [autoCalculatedAmount, setAutoCalculatedAmount] = useState<{dinesh: number, linePolish: number}>({dinesh: 0, linePolish: 0});
  const [metadata, setMetadata] = useState<{dinesh: any, linePolish: any}>({dinesh: null, linePolish: null});

  // Track if auto-calculation applies (>= March 2026)
  const isAutoCalculated = React.useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const currentMonthDate = new Date(year, month - 1, 1);
    const marchCutoff = new Date(2026, 2, 1);
    return currentMonthDate >= marchCutoff;
  }, [selectedMonth]);

  // Calculate previous month for display
  const previousMonth = React.useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(year, month - 2, 1);
    return `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  }, [selectedMonth]);

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  async function loadData() {
    try {
      setLoading(true);
      const response = await fetch(`/api/contractor-payments?month=${selectedMonth}`);
      if (!response.ok) throw new Error('Failed to load data');
      
      const data = await response.json();
      setDineshData(data.dinesh);
      setLinePolishData(data.linePolish);
      setDineshTransactions(data.dineshTransactions || []);
      setLinePolishTransactions(data.linePolishTransactions || []);
      setMetadata({
        dinesh: data.dineshMeta,
        linePolish: data.linePolishMeta
      });
      
      // Store auto-calculated amounts if available
      if (isAutoCalculated) {
        setAutoCalculatedAmount({
          dinesh: data.dinesh?.total_payable || 0,
          linePolish: data.linePolish?.total_payable || 0
        });
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      showToast('error', 'Failed to load contractor data');
    } finally {
      setLoading(false);
    }
  }

  const handleAddPayment = async () => {
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      showToast('error', 'Please enter a valid payment amount');
      return;
    }

    try {
      const response = await fetch('/api/contractor-payments/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractor_name: selectedContractor,
          month: selectedMonth,
          ...paymentForm,
          amount: parseFloat(paymentForm.amount)
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add payment');
      }

      showToast('success', 'Payment added successfully');
      setShowPaymentModal(false);
      setPaymentForm({
        payment_date: new Date().toISOString().split('T')[0],
        amount: '',
        payment_mode: 'Cash',
        notes: ''
      });
      await loadData();
    } catch (error: any) {
      console.error('Failed to add payment:', error);
      showToast('error', error.message || 'Failed to add payment');
    }
  };

  const handleSetPayable = async () => {
    if (!payableAmount || parseFloat(payableAmount) < 0) {
      showToast('error', 'Please enter a valid amount');
      return;
    }

    try {
      const response = await fetch('/api/contractor-payments/payable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractor_name: selectedContractor,
          month: selectedMonth,
          total_payable: parseFloat(payableAmount)
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to set payable amount');
      }

      showToast('success', 'Payable amount set successfully');
      setShowPayableModal(false);
      setPayableAmount('');
      await loadData();
    } catch (error: any) {
      console.error('Failed to set payable:', error);
      showToast('error', error.message || 'Failed to set payable amount');
    }
  }

  async function resetToAutoCalculation(contractorName: string) {
    const prevMonthName = getMonthName(previousMonth);
    if (!confirm(`Reset ${contractorName} to auto-calculated amount? This will recalculate the payable based on ${prevMonthName} ${contractorName === 'Contractor Dinesh' ? 'sales' : 'line polish hours'} data.`)) {
      return;
    }

    try {
      // Reset manually_adjusted flag to false
      const response = await fetch('/api/contractor-payments/reset-auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractor_name: contractorName,
          month: selectedMonth
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reset to auto-calculation');
      }

      showToast('success', 'Reset to auto-calculation successfully');
      await loadData();
    } catch (error: any) {
      console.error('Failed to reset:', error);
      showToast('error', error.message || 'Failed to reset to auto-calculation');
    }
  };

  const changeMonth = (offset: number) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + offset, 1);
    const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newMonth);
  };

  const getMonthName = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const totalPayable = (dineshData?.total_payable || 0) + (linePolishData?.total_payable || 0);
  const totalPaid = (dineshData?.total_paid || 0) + (linePolishData?.total_paid || 0);
  const totalBalance = (dineshData?.balance || 0) + (linePolishData?.balance || 0);
  const totalCarryForward = (dineshData?.carry_forward || 0) + (linePolishData?.carry_forward || 0);
  const totalPayableWithCarryForward = totalPayable + totalCarryForward;

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg text-gray-600">Loading contractor payments...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const ContractorCard = ({ 
    name, 
    data, 
    transactions 
  }: { 
    name: string; 
    data: ContractorPayment | null; 
    transactions: PaymentTransaction[] 
  }) => {
    const isDinesh = name === 'Contractor Dinesh';
    const meta = isDinesh ? metadata.dinesh : metadata.linePolish;
    const theme = isDinesh ? {
      primary: 'orange',
      border: 'border-l-orange-500',
      icon: 'text-orange-600',
      badge: 'bg-orange-50 text-orange-700',
      carryForward: 'bg-gray-50 text-gray-700 border border-gray-200',
      payable: 'bg-gray-50 text-gray-700 border border-gray-200',
      paid: 'bg-gray-50 text-gray-700 border border-gray-200',
      balance: 'bg-gray-50 text-gray-700 border border-gray-200',
    } : {
      primary: 'indigo',
      border: 'border-l-indigo-500',
      icon: 'text-indigo-600',
      badge: 'bg-indigo-50 text-indigo-700',
      carryForward: 'bg-gray-50 text-gray-700 border border-gray-200',
      payable: 'bg-gray-50 text-gray-700 border border-gray-200',
      paid: 'bg-gray-50 text-gray-700 border border-gray-200',
      balance: 'bg-gray-50 text-gray-700 border border-gray-200',
    };

    return (
      <Card className={`border-l-4 ${theme.border}`}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-xl font-bold text-gray-900 flex items-center gap-2`}>
              <Users className={`w-6 h-6 ${theme.icon}`} />
              {name}
            </h3>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                setSelectedContractor(name);
                setPayableAmount(data?.total_payable.toString() || '');
                setShowPayableModal(true);
              }}
              variant="outline"
              size="sm"
              className={`${isDinesh ? 'text-orange-600 hover:bg-orange-50' : 'text-indigo-600 hover:bg-indigo-50'}`}
            >
              {isAutoCalculated ? 'Adjust Payable' : 'Set Payable'}
            </Button>
            {isAutoCalculated && data?.manually_adjusted && (
              <Button
                onClick={() => resetToAutoCalculation(name)}
                variant="outline"
                size="sm"
                className={`${isDinesh ? 'text-orange-600 hover:bg-orange-50' : 'text-indigo-600 hover:bg-indigo-50'} flex items-center gap-1`}
                title="Reset to auto-calculated amount"
              >
                <span className="text-lg">🔄</span>
                Reset to Auto
              </Button>
            )}
          </div>
        </div>
          {isAutoCalculated && (
            <div className="mb-3">
              {data?.manually_adjusted ? (
                <span className="text-xs text-amber-700 font-medium flex items-center gap-1 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                  <span>✏️</span>
                  Manually adjusted
                </span>
              ) : (
                <span className={`text-xs font-medium flex items-center gap-1 ${theme.badge} px-2 py-1 rounded border ${isDinesh ? 'border-orange-200' : 'border-indigo-200'}`}>
                  <span>🤖</span>
                  Auto-calculated
                </span>
              )}
            </div>
          )}

          {/* Summary Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className={`${theme.carryForward} p-3 rounded-lg`}>
              <p className="text-xs font-medium mb-1">Carry Forward</p>
              <p className="text-lg font-bold">{fmt(data?.carry_forward || 0)}</p>
            </div>
            <div className={`${theme.payable} p-3 rounded-lg`}>
              <p className="text-xs font-medium mb-1">Total Payable (incl. C/F)</p>
              <p className="text-lg font-bold">{fmt((data?.carry_forward || 0) + (data?.total_payable || 0))}</p>
              <p className="text-xs opacity-70">C/F: {fmt(data?.carry_forward || 0)} + {fmt(data?.total_payable || 0)}</p>
              {isAutoCalculated && name === 'Contractor Dinesh' && meta && (
                <p className="text-xs font-medium mt-1 opacity-70">
                  🔹 {meta.source_month ? getMonthName(meta.source_month) : 'Prev'}: {meta.total_sqft.toFixed(0)} SqFt × ₹{meta.rate_per_sqft}
                </p>
              )}
              {isAutoCalculated && name === 'Contractor LinePolish' && meta && (
                <p className="text-xs font-medium mt-1 opacity-70">
                  🔹 {meta.source_month ? getMonthName(meta.source_month) : 'Prev'}: {meta.total_hours} Hours × ₹{meta.rate_per_hour}
                </p>
              )}
            </div>
            <div className={`${theme.paid} p-3 rounded-lg`}>
              <p className="text-xs font-medium mb-1">Total Paid</p>
              <p className="text-lg font-bold">{fmt(data?.total_paid || 0)}</p>
            </div>
            <div className={`${theme.balance} p-3 rounded-lg`}>
              <p className="text-xs font-medium mb-1">Balance Due</p>
              <p className="text-lg font-bold">{fmt(data?.balance || 0)}</p>
            </div>
          </div>

        {/* Payments Section */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Payments This Month
            </h4>
            <Button
              onClick={() => {
                setSelectedContractor(name);
                setShowPaymentModal(true);
              }}
              size="sm"
              className="flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add Payment
            </Button>
          </div>

          {transactions.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Date</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-700">Amount</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Mode</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Notes</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((txn) => (
                    <tr key={txn.id} className="hover:bg-gray-50">
                      <td className="py-2.5 px-3 text-gray-600">
                        {new Date(txn.payment_date).toLocaleDateString('en-GB')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-gray-900">
                        {fmt(txn.amount)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                          {txn.payment_mode}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-gray-600 text-xs">
                        {txn.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-6 bg-gray-50 rounded-lg">
              <Wallet className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No payments recorded yet</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
    );
  };

  return (
    <AppLayout>
      <div className="min-h-screen w-full bg-gray-50 p-6 space-y-4">
        {/* Header & Month Selector Row */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contractor Payments</h1>
            <p className="text-sm text-gray-600">Track monthly payments for contractors</p>
          </div>
          
          <div className="flex items-center gap-3 bg-white border border-gray-300 rounded-lg px-4 py-2">
            <Button
              onClick={() => changeMonth(-1)}
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 border-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex flex-col items-center min-w-[120px]">
              <span className="text-lg font-bold text-gray-900">
                {new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]) - 1).toLocaleDateString('en-US', { month: 'long' })}
              </span>
              <span className="text-xs text-gray-500">
                {selectedMonth.split('-')[0]}
              </span>
            </div>
            <Button
              onClick={() => changeMonth(1)}
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 border-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Total Carry Forward</p>
                  <p className="text-2xl font-bold text-blue-600">{fmt(totalCarryForward)}</p>
                </div>
                <ArrowRight className="w-6 h-6 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-gray-600">Total Payable (incl. C/F)</p>
                  <p className="text-2xl font-bold text-purple-600">{fmt(totalPayableWithCarryForward)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">C/F: {fmt(totalCarryForward)} + {fmt(totalPayable)}</p>
                </div>
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Total Paid</p>
                  <p className="text-2xl font-bold text-green-600">{fmt(totalPaid)}</p>
                </div>
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Total Balance</p>
                  <p className="text-2xl font-bold text-red-600">{fmt(totalBalance)}</p>
                </div>
                <Wallet className="w-6 h-6 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contractor Cards */}
        <div className="space-y-4">
          <ContractorCard 
            name="Contractor Dinesh" 
            data={dineshData} 
            transactions={dineshTransactions}
          />
          <ContractorCard 
            name="Contractor LinePolish" 
            data={linePolishData} 
            transactions={linePolishTransactions}
          />
        </div>

        {/* Add Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Add Payment - {selectedContractor}</h3>
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setPaymentForm({
                      payment_date: new Date().toISOString().split('T')[0],
                      amount: '',
                      payment_mode: 'Cash',
                      notes: ''
                    });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Date *
                  </label>
                  <Input
                    type="date"
                    value={paymentForm.payment_date}
                    onChange={(e) => setPaymentForm({...paymentForm, payment_date: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount *
                  </label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={formatIndianNumber(paymentForm.amount)}
                    onChange={(e) => {
                      const rawValue = parseIndianNumber(e.target.value);
                      setPaymentForm({...paymentForm, amount: rawValue});
                    }}
                    placeholder="Enter amount"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {paymentForm.amount && `₹${formatIndianNumber(paymentForm.amount)}`}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Mode *
                  </label>
                  <select
                    value={paymentForm.payment_mode}
                    onChange={(e) => setPaymentForm({...paymentForm, payment_mode: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <Input
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                    placeholder="Enter notes (optional)"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleAddPayment}
                    variant="default"
                    className="flex-1"
                  >
                    Add Payment
                  </Button>
                  <Button
                    onClick={() => {
                      setShowPaymentModal(false);
                      setPaymentForm({
                        payment_date: new Date().toISOString().split('T')[0],
                        amount: '',
                        payment_mode: 'Cash',
                        notes: ''
                      });
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Set Payable Modal */}
        {showPayableModal && (() => {
          const isCurrentlyAutoCalc = isAutoCalculated;
          const currentAutoAmount = selectedContractor === 'Contractor Dinesh' 
            ? autoCalculatedAmount.dinesh 
            : autoCalculatedAmount.linePolish;
          const meta = selectedContractor === 'Contractor Dinesh'
            ? metadata.dinesh
            : metadata.linePolish;
          const calculationMethod = selectedContractor === 'Contractor Dinesh'
            ? (meta ? `${meta.total_sqft.toFixed(0)} SqFt × ₹${meta.rate_per_sqft}` : 'SqFt sold × ₹6')
            : (meta ? `${meta.total_hours} Hours × ₹${meta.rate_per_hour}` : 'Hours worked × ₹250');
          
          return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  {isCurrentlyAutoCalc ? 'Adjust' : 'Set'} Payable - {selectedContractor}
                </h3>
                <button
                  onClick={() => {
                    setShowPayableModal(false);
                    setPayableAmount('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {isCurrentlyAutoCalc && currentAutoAmount > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <span className="text-lg">🤖</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-blue-900">Auto-Calculated Amount</p>
                        <p className="text-xs text-blue-600 mb-1">Based on {getMonthName(previousMonth)} data</p>
                        <p className="text-2xl font-bold text-blue-700 mt-1">{fmt(currentAutoAmount)}</p>
                        <p className="text-xs text-blue-600 mt-1">{calculationMethod}</p>
                        <p className="text-xs text-gray-600 mt-2">
                          You can adjust this amount below to add bonuses, deductions, or corrections.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isCurrentlyAutoCalc ? 'Adjusted' : 'Total'} Payable for {getMonthName(selectedMonth)} *
                  </label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={formatIndianNumber(payableAmount)}
                    onChange={(e) => {
                      const rawValue = parseIndianNumber(e.target.value);
                      setPayableAmount(rawValue);
                    }}
                    placeholder="Enter payable amount"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {payableAmount && `₹${formatIndianNumber(payableAmount)}`}
                  </p>
                  {isCurrentlyAutoCalc ? (
                    <p className="text-xs text-gray-500 mt-1">
                      Payment for {getMonthName(previousMonth)} work - modify if adjustments needed
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">
                      This is the total amount to pay for last month's work
                    </p>
                  )}
                </div>

                {/* Carry Forward Impact Notice */}
                {payableAmount && parseFloat(payableAmount) > 0 && (() => {
                  const currentData = selectedContractor === 'Contractor Dinesh' ? dineshData : linePolishData;
                  const carryForward = currentData?.carry_forward || 0;
                  const totalPaid = currentData?.total_paid || 0;
                  const newBalance = carryForward + parseFloat(payableAmount) - totalPaid;
                  
                  return (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-yellow-900 mb-1">💡 Carry Forward Impact</p>
                      <p className="text-xs text-yellow-800">
                        This amount will be used for next month's carry forward:
                      </p>
                      <p className="text-sm font-bold text-yellow-900 mt-1">
                        Balance = {fmt(carryForward)} (C/F) + {fmt(parseFloat(payableAmount))} (Payable) - {fmt(totalPaid)} (Paid) = <span className="text-yellow-700">{fmt(newBalance)}</span>
                      </p>
                      <p className="text-xs text-yellow-700 mt-1">
                        → Next month's carry forward: <strong>{fmt(newBalance)}</strong>
                      </p>
                    </div>
                  );
                })()}

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleSetPayable}
                    variant="default"
                    className="flex-1"
                  >
                    {isCurrentlyAutoCalc ? 'Save Adjustment' : 'Set Payable'}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowPayableModal(false);
                      setPayableAmount('');
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
          );
        })()}
      </div>
    </AppLayout>
  );
}
