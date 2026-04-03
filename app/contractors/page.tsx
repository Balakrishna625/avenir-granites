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

interface ContractorPayment {
  id: string;
  contractor_name: string;
  month: string;
  total_payable: number;
  carry_forward: number;
  total_paid: number;
  balance: number;
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
      setLinePolishData(data.linePolish); // Fixed: use linePolish instead of linepolish
      setDineshTransactions(data.dineshTransactions || []);
      setLinePolishTransactions(data.linePolishTransactions || []);
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
  }) => (
    <Card className="border-2 border-gray-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            {name}
          </h3>
          <Button
            onClick={() => {
              setSelectedContractor(name);
              setPayableAmount(data?.total_payable.toString() || '');
              setShowPayableModal(true);
            }}
            variant="outline"
            size="sm"
            className="text-purple-600 hover:text-purple-800"
          >
            Set Payable
          </Button>
        </div>

        {/* Summary Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Carry Forward</p>
            <p className="text-lg font-bold text-blue-700">{fmt(data?.carry_forward || 0)}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Total Payable (incl. C/F)</p>
            <p className="text-lg font-bold text-purple-700">{fmt((data?.carry_forward || 0) + (data?.total_payable || 0))}</p>
            <p className="text-xs text-gray-500">C/F: {fmt(data?.carry_forward || 0)} + {fmt(data?.total_payable || 0)}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Total Paid</p>
            <p className="text-lg font-bold text-green-700">{fmt(data?.total_paid || 0)}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Balance Due</p>
            <p className="text-lg font-bold text-red-700">{fmt(data?.balance || 0)}</p>
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
            <div className="space-y-2">
              {transactions.map((txn) => (
                <div key={txn.id} className="bg-gray-50 p-3 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{fmt(txn.amount)}</p>
                    <div className="flex gap-3 text-xs text-gray-600 mt-1">
                      <span>{new Date(txn.payment_date).toLocaleDateString('en-GB')}</span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                        {txn.payment_mode}
                      </span>
                    </div>
                    {txn.notes && (
                      <p className="text-xs text-gray-500 mt-1">{txn.notes}</p>
                    )}
                  </div>
                  <Wallet className="w-5 h-5 text-green-600" />
                </div>
              ))}
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

  return (
    <AppLayout>
      <div className="min-h-screen w-full bg-gray-50 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              Contractor Payments
            </h1>
            <p className="text-gray-600 mt-1">Track monthly payments for internal contractors</p>
          </div>
        </div>

        {/* Month Selector */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button
                onClick={() => changeMonth(-1)}
                variant="outline"
                size="sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span className="text-lg font-semibold text-gray-900">
                  {getMonthName(selectedMonth)}
                </span>
              </div>
              <Button
                onClick={() => changeMonth(1)}
                variant="outline"
                size="sm"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Carry Forward</p>
                  <p className="text-2xl font-bold text-blue-600">{fmt(totalCarryForward)}</p>
                </div>
                <ArrowRight className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Payable (incl. C/F)</p>
                  <p className="text-2xl font-bold text-purple-600">{fmt(totalPayableWithCarryForward)}</p>
                  <p className="text-xs text-gray-500 mt-1">C/F: {fmt(totalCarryForward)} + Current: {fmt(totalPayable)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Paid</p>
                  <p className="text-2xl font-bold text-green-600">{fmt(totalPaid)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Balance</p>
                  <p className="text-2xl font-bold text-red-600">{fmt(totalBalance)}</p>
                </div>
                <Wallet className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contractor Cards */}
        <div className="space-y-6">
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
                    type="number"
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                    placeholder="Enter amount"
                  />
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
        {showPayableModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Set Payable Amount - {selectedContractor}</h3>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Payable for {getMonthName(selectedMonth)} *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={payableAmount}
                    onChange={(e) => setPayableAmount(e.target.value)}
                    placeholder="Enter payable amount"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This is the total amount you need to pay for work done this month
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleSetPayable}
           variant="default"
                    className="flex-1"
                  >
                    Set Payable
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
        )}
      </div>
    </AppLayout>
  );
}
