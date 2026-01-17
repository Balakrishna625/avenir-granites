'use client';

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import { formatDisplayDate } from "@/lib/date-utils";
import { useToast } from "@/components/ui/toast";
import { 
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowRightLeft,
  Wallet,
  Edit,
  X,
  Eye,
  EyeOff
} from "lucide-react";

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const fmt = (n: number) => INR.format(n || 0);

interface BankAccount {
  id: string;
  name: string;
}

interface Transaction {
  id: string;
  date: string;
  customer_id: string;
  account_id: string;
  amount: number;
  mode: string;
  note?: string;
  customers?: {
    name: string;
  };
}

interface Expense {
  id: string;
  date: string;
  account_id: string;
  amount: number;
  description: string;
  expense_categories?: {
    name: string;
  };
}

interface BankTransfer {
  id: string;
  date: string;
  from_account_id: string;
  amount: number;
  to_description: string;
  notes?: string;
}

interface Settlement {
  id: string;
  settlement_date: string;
  settlement_amount: number;
  settlement_mode: string;
  settlement_reference?: string;
  settlement_notes?: string;
  customers?: {
    name: string;
  };
}

interface Adjustment {
  id: string;
  bank_account_id: string;
  adjustment_amount: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export default function BankAccountsPage() {
  const { showToast } = useToast();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bankTransfers, setBankTransfers] = useState<BankTransfer[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [selectedAccountForAdjustment, setSelectedAccountForAdjustment] = useState<BankAccount | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentNotes, setAdjustmentNotes] = useState("");
  const [hiddenAccounts, setHiddenAccounts] = useState<Set<string>>(new Set());
  const [showHiddenAccounts, setShowHiddenAccounts] = useState(false);
  
  // Date filters
  const [fromDate, setFromDate] = useState('2025-09-01');
  
  const [toDate, setToDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  useEffect(() => {
    loadData();
    // Load hidden accounts from localStorage
    const stored = localStorage.getItem('hiddenBankAccounts');
    if (stored) {
      setHiddenAccounts(new Set(JSON.parse(stored)));
    }
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      
      const [accountsRes, transactionsRes, expensesRes, transfersRes, settlementsRes, adjustmentsRes] = await Promise.all([
        fetch('/api/bank-accounts'),
        fetch(`/api/transactions?from=${fromDate}&to=${toDate}`),
        fetch(`/api/expenses?from=${fromDate}&to=${toDate}`),
        fetch(`/api/bank-transfers?from=${fromDate}&to=${toDate}`),
        fetch(`/api/settlements?from=${fromDate}&to=${toDate}`),
        fetch('/api/bank-accounts/adjustments'),
      ]);

      const [accountsData, transactionsData, expensesData, transfersData, settlementsData, adjustmentsData] = await Promise.all([
        accountsRes.json(),
        transactionsRes.json(),
        expensesRes.json(),
        transfersRes.json(),
        settlementsRes.json(),
        adjustmentsRes.json()
      ]);

      setBankAccounts(accountsData);
      setTransactions(transactionsData);
      setExpenses(expensesData);
      setBankTransfers(transfersData);
      setSettlements(settlementsData);
      setAdjustments(adjustmentsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      showToast('error', 'Failed to load bank accounts data');
    } finally {
      setLoading(false);
    }
  }

  // Calculate account summaries
  const accountSummaries = useMemo(() => {
    // Define preferred order for bank accounts
    const preferredOrder = [
      'IDBI RTGS',
      'RAMYA',
      'RAJESWARI',
      'ANJIBABU',
      'ARUNA',
      'PRUDHVI',
      'DINESH'
    ];
    
    // Helper function to get sort priority
    const getSortPriority = (accountName: string): number => {
      if (!accountName) return 999; // Handle undefined/null account names
      const normalizedName = accountName.toLowerCase();
      const index = preferredOrder.findIndex(preferred => 
        normalizedName.includes(preferred.toLowerCase())
      );
      console.log(`Account: "${accountName}" -> Normalized: "${normalizedName}" -> Priority: ${index === -1 ? 999 : index}`);
      return index === -1 ? 999 : index; // Unmatched accounts go to end
    };
    
    if (!bankAccounts || !Array.isArray(transactions) || !Array.isArray(expenses) || !Array.isArray(bankTransfers) || !Array.isArray(settlements)) {
      return [];
    }
    
    return bankAccounts
      .map(account => {
        // Credits: Customer payments to this account
        const transactionCredits = transactions
          .filter(t => t.account_id === account.id)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        // Add RTGS settlements as credits for all accounts
        const settlementCredits = settlements
          .filter(s => s.settlement_mode === 'RTGS') // Only RTGS settlements
          .sort((a, b) => new Date(a.settlement_date).getTime() - new Date(b.settlement_date).getTime());
        
        // Combine transaction and settlement credits
        const credits = [
          ...transactionCredits.map(t => ({ ...t, type: 'transaction' as const })),
          ...settlementCredits.map(s => ({ 
            ...s, 
            type: 'settlement' as const, 
            date: s.settlement_date, 
            amount: s.settlement_amount,
            account_id: account.id 
          }))
        ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        const totalCredits = transactionCredits.reduce((sum, t) => sum + (t.amount || 0), 0) +
                             settlementCredits.reduce((sum, s) => sum + (s.settlement_amount || 0), 0);

// Debits: Expenses from this account + Bank transfers out
      const expenseDebits = expenses
        .filter(e => e.account_id === account.id)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      const transferDebits = bankTransfers
        .filter(t => t.from_account_id === account.id)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Combine expenses and transfers for display
      const debits = [
        ...expenseDebits.map(e => ({ ...e, type: 'expense' as const })),
        ...transferDebits.map(t => ({ ...t, type: 'transfer' as const, account_id: t.from_account_id, description: `Transfer to ${t.to_description}` }))
      ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      const totalDebits = expenseDebits.reduce((sum, e) => sum + (e.amount || 0), 0) + 
                          transferDebits.reduce((sum, t) => sum + (t.amount || 0), 0);

        // Apply adjustment if exists for this account
        const accountAdjustment = adjustments.find(adj => adj.bank_account_id === account.id);
        const adjustmentAmount = accountAdjustment?.adjustment_amount || 0;
        const effectiveBalance = totalCredits - totalDebits + adjustmentAmount;

        return {
          account,
          credits,
          debits,
          totalCredits,
          totalDebits,
          effectiveBalance,
          adjustmentAmount,
          hasAdjustment: adjustmentAmount !== 0,
          hasActivity: credits.length > 0 || debits.length > 0
        };
      })
      .filter(summary => summary.hasActivity) // Only show accounts with transactions
      .sort((a, b) => {
        // Sort by preferred order
        const aPriority = getSortPriority(a.account.name);
        const bPriority = getSortPriority(b.account.name);
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        
        // If same priority (or both unmatched), sort by activity count
        const aActivity = a.credits.length + a.debits.length;
        const bActivity = b.credits.length + b.debits.length;
        return bActivity - aActivity;
      });
  }, [bankAccounts, transactions, expenses, bankTransfers, settlements, adjustments]);

  const toggleHideAccount = (accountId: string) => {
    setHiddenAccounts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(accountId)) {
        newSet.delete(accountId);
      } else {
        newSet.add(accountId);
      }
      localStorage.setItem('hiddenBankAccounts', JSON.stringify([...newSet]));
      return newSet;
    });
  };

  const openAdjustmentModal = (account: BankAccount) => {
    setSelectedAccountForAdjustment(account);
    const currentAdjustment = adjustments.find(adj => adj.bank_account_id === account.id);
    setAdjustmentAmount(currentAdjustment ? String(currentAdjustment.adjustment_amount) : "0");
    setAdjustmentNotes(currentAdjustment?.notes || "");
    setShowAdjustmentModal(true);
  };

  const closeAdjustmentModal = () => {
    setShowAdjustmentModal(false);
    setSelectedAccountForAdjustment(null);
    setAdjustmentAmount("");
    setAdjustmentNotes("");
  };

  const handleSaveAdjustment = async () => {
    if (!selectedAccountForAdjustment) return;

    try {
      const response = await fetch('/api/bank-accounts/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bank_account_id: selectedAccountForAdjustment.id,
          adjustment_amount: parseFloat(adjustmentAmount) || 0,
          notes: adjustmentNotes
        })
      });

      if (!response.ok) throw new Error('Failed to save adjustment');

      showToast('success', 'Adjustment saved successfully');
      closeAdjustmentModal();
      await loadData();
    } catch (error) {
      console.error('Failed to save adjustment:', error);
      showToast('error', 'Failed to save adjustment');
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg text-gray-600">Loading bank accounts...</p>
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
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Wallet className="w-8 h-8 text-blue-600" />
              Bank Accounts
            </h1>
            <p className="text-gray-600 mt-1">Track credits, debits, and balances for each bank account</p>
          </div>
          {hiddenAccounts.size > 0 && (
            <Button
              onClick={() => setShowHiddenAccounts(!showHiddenAccounts)}
              variant="outline"
              className="flex items-center gap-2"
            >
              {showHiddenAccounts ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showHiddenAccounts ? 'Hide' : 'Show'} Hidden Accounts ({hiddenAccounts.size})
            </Button>
          )}
        </div>

        {/* Date Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Calendar className="w-5 h-5 text-gray-500" />
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">From:</label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">To:</label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <Button onClick={loadData} variant="default">
                Apply Filter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bank Account Cards */}
        <div className="space-y-6">
          {accountSummaries
            .filter(({ account }) => showHiddenAccounts || !hiddenAccounts.has(account.id))
            .map(({ account, credits, debits, totalCredits, totalDebits, effectiveBalance, adjustmentAmount, hasAdjustment }) => (
            <Card key={account.id} className="overflow-hidden">
              {/* Account Header */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                      <DollarSign className="w-6 h-6 text-blue-600" />
                      {account.name}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Period: {formatDisplayDate(fromDate)} to {formatDisplayDate(toDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-2 mb-2">
                      <Button
                        onClick={() => toggleHideAccount(account.id)}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        {hiddenAccounts.has(account.id) ? (
                          <><Eye className="w-3 h-3" />Unhide</>
                        ) : (
                          <><EyeOff className="w-3 h-3" />Hide</>
                        )}
                      </Button>
                      <Button
                        onClick={() => openAdjustmentModal(account)}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <Edit className="w-3 h-3" />
                        Adjust
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600">Effective Balance</p>
                    <p className={`text-3xl font-bold ${effectiveBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {effectiveBalance >= 0 ? '+' : ''}{fmt(effectiveBalance)}
                    </p>
                    {hasAdjustment && (
                      <p className="text-xs text-blue-600 mt-1">
                        (Adjusted: {adjustmentAmount >= 0 ? '+' : ''}{fmt(adjustmentAmount)})
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Summary Row */}
              <div className="bg-gray-50 border-b px-6 py-4 grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-xs text-gray-600 uppercase tracking-wide">Total Credits</p>
                  <p className="text-xl font-bold text-green-600">{fmt(totalCredits)}</p>
                  <p className="text-xs text-gray-500">{credits.length} transactions</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-600 uppercase tracking-wide">Total Debits</p>
                  <p className="text-xl font-bold text-red-600">{fmt(totalDebits)}</p>
                  <p className="text-xs text-gray-500">{debits.length} expenses</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-600 uppercase tracking-wide">Net Movement</p>
                  <p className={`text-xl font-bold ${effectiveBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {effectiveBalance >= 0 ? '+' : ''}{fmt(effectiveBalance)}
                  </p>
                </div>
              </div>

              {/* Transactions Tables */}
              <CardContent className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Credits Column */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      <h3 className="text-lg font-semibold text-green-800">Credits (Money In)</h3>
                    </div>
                    {credits.length > 0 ? (
                      <div className="border rounded-lg overflow-hidden">
                        <div className="overflow-x-auto max-h-96 overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-green-50 border-b">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-green-900">Date</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-green-900">Customer</th>
                                <th className="px-3 py-2 text-right text-xs font-semibold text-green-900">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {credits.map((credit) => (
                                <tr key={credit.id} className="hover:bg-green-25">
                                  <td className="px-3 py-2 text-gray-900 whitespace-nowrap">
                                    {formatDisplayDate(credit.date)}
                                  </td>
                                  <td className="px-3 py-2 text-gray-900">
                                    {(credit as any).type === 'settlement' 
                                      ? `${(credit as any).customers?.name || 'Customer'} (Settlement)`
                                      : (credit as any).customers?.name || 'Unknown'}
                                  </td>
                                  <td className="px-3 py-2 text-right font-semibold text-green-600">
                                    +{fmt(credit.amount)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center">
                        <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">No credits in this period</p>
                      </div>
                    )}
                  </div>

                  {/* Debits Column */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingDown className="w-5 h-5 text-red-600" />
                      <h3 className="text-lg font-semibold text-red-800">Debits (Money Out)</h3>
                    </div>
                    {debits.length > 0 ? (
                      <div className="border rounded-lg overflow-hidden">
                        <div className="overflow-x-auto max-h-96 overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-red-50 border-b">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-red-900">Date</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-red-900">Description</th>
                                <th className="px-3 py-2 text-right text-xs font-semibold text-red-900">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {debits.map((debit) => (
                                <tr key={debit.id} className="hover:bg-red-25">
                                  <td className="px-3 py-2 text-gray-900 whitespace-nowrap">
                                    {formatDisplayDate(debit.date)}
                                  </td>
                                  <td className="px-3 py-2 text-gray-900">
                                    {debit.type === 'expense' 
                                      ? (debit.description || (debit as any).expense_categories?.name || 'Expense')
                                      : (debit.description || 'Bank Transfer')}
                                  </td>
                                  <td className="px-3 py-2 text-right font-semibold text-red-600">
                                    -{fmt(debit.amount)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center">
                        <TrendingDown className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">No debits in this period</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {accountSummaries.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Wallet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium">No bank accounts found</p>
              <p className="text-gray-400 text-sm mt-2">Bank accounts will appear here once configured</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Adjustment Modal */}
      {showAdjustmentModal && selectedAccountForAdjustment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Adjust Balance</h3>
              <button
                onClick={closeAdjustmentModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account
                </label>
                <Input
                  value={selectedAccountForAdjustment.name}
                  disabled
                  className="bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adjustment Amount (₹)
                </label>
                <Input
                  type="number"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(e.target.value)}
                  placeholder="Enter adjustment amount"
                  className="text-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Positive to add, negative to subtract from balance
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <Input
                  value={adjustmentNotes}
                  onChange={(e) => setAdjustmentNotes(e.target.value)}
                  placeholder="Reason for adjustment"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSaveAdjustment}
                  variant="default"
                  className="flex-1"
                >
                  Save Adjustment
                </Button>
                <Button
                  onClick={closeAdjustmentModal}
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
    </AppLayout>
  );
}
