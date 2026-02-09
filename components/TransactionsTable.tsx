import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, PlusCircle, Edit, Trash2, Save, X, Check, ArrowUpDown, ArrowUp, ArrowDown, Download } from "lucide-react";
import { formatDisplayDate } from "@/lib/date-utils";
import { useMasking } from "@/contexts/MaskingContext";
import * as xlsx from "xlsx-js-style";

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const fmt = (n: number) => INR.format(n || 0);

interface Transaction {
  id: string;
  customer_id: string;
  date: string;
  mode: 'RTGS' | 'CASH';
  account_id: string;
  amount: number;
  note?: string;
}

interface TransactionsTableProps {
  transactions: Transaction[];
  accounts: any[];
  customers: any[];
  onAddTransaction?: (e: React.FormEvent<HTMLFormElement>) => void;
  onEditTransaction: (id: string, data: Partial<Transaction>) => void;
  onDeleteTransaction: (id: string) => void;
  showSubmissionSuccess?: boolean;
}

export function TransactionsTable({ transactions, accounts, customers, onAddTransaction, onEditTransaction, onDeleteTransaction, showSubmissionSuccess }: TransactionsTableProps) {
  const { maskName } = useMasking();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Transaction>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rtgsSortOrder, setRtgsSortOrder] = useState<'asc' | 'desc'>('asc'); // Default: ascending (oldest first)
  const [cashSortOrder, setCashSortOrder] = useState<'asc' | 'desc'>('asc'); // Default: ascending (oldest first)
  const [rtgsFromDate, setRtgsFromDate] = useState<string>('');
  const [rtgsToDate, setRtgsToDate] = useState<string>('');
  const [cashFromDate, setCashFromDate] = useState<string>('');
  const [cashToDate, setCashToDate] = useState<string>('');
  const formRef = useRef<HTMLFormElement>(null);
  const [amountInput, setAmountInput] = useState<string>(''); // For formatted display
  const amountInputRef = useRef<HTMLInputElement>(null); // Hidden input for form submission
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<'RTGS' | 'CASH'>('RTGS');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  // Initialize account selection when component mounts or accounts change
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      // Find IDBI RTGS account
      const idbiRtgsAccount = accounts.find(acc => 
        acc.name && acc.name.toLowerCase().includes('idbi') && acc.name.toLowerCase().includes('rtgs')
      );
      
      if (idbiRtgsAccount) {
        setSelectedAccountId(idbiRtgsAccount.id);
      } else {
        // Fallback to first account if IDBI RTGS not found
        setSelectedAccountId(accounts[0].id);
      }
    }
  }, [accounts, selectedAccountId]);

  // Handle payment mode change - auto-select IDBI RTGS for RTGS mode
  const handlePaymentModeChange = (mode: 'RTGS' | 'CASH') => {
    setSelectedPaymentMode(mode);
    
    if (mode === 'RTGS') {
      // Auto-select IDBI RTGS account when RTGS is selected
      const idbiRtgsAccount = accounts.find(acc => 
        acc.name && acc.name.toLowerCase().includes('idbi') && acc.name.toLowerCase().includes('rtgs')
      );
      
      if (idbiRtgsAccount) {
        setSelectedAccountId(idbiRtgsAccount.id);
      }
    }
  };

  // Export transactions to Excel
  const handleExportToExcel = (mode: 'RTGS' | 'CASH') => {
    try {
      const transactionsToExport = mode === 'RTGS' ? rtgsTransactions : cashTransactions;
      
      if (transactionsToExport.length === 0) {
        alert(`No ${mode} transactions to export`);
        return;
      }

      // Prepare data for Excel with all fields
      const excelData = transactionsToExport.map((t) => {
        const customer = customers.find(c => c.id === t.customer_id);
        const account = accounts.find(a => a.id === t.account_id);
        
        return {
          'Date': formatDisplayDate(t.date),
          'Customer': customer?.name || 'Unknown',
          'Account': account?.name || 'Unknown',
          'Amount (₹)': t.amount || 0,
          'Note': t.note || '',
          'Transaction ID': t.id
        };
      });

      // Calculate totals
      const totalAmount = transactionsToExport.reduce((sum, t) => sum + (t.amount || 0), 0);
      
      // Add summary row
      excelData.push({
        'Date': '',
        'Customer': '',
        'Account': 'TOTAL',
        'Amount (₹)': totalAmount,
        'Note': `${transactionsToExport.length} transactions`,
        'Transaction ID': ''
      });

      // Create workbook and worksheet
      const ws = xlsx.utils.json_to_sheet(excelData);
      const wb = xlsx.utils.book_new();
      
      // Set column widths for better readability
      ws['!cols'] = [
        { wch: 12 },  // Date
        { wch: 25 },  // Customer
        { wch: 20 },  // Account
        { wch: 15 },  // Amount
        { wch: 30 },  // Note
        { wch: 40 }   // Transaction ID
      ];

      // Style the header row
      const range = xlsx.utils.decode_range(ws['!ref'] || 'A1');
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = xlsx.utils.encode_cell({ r: 0, c: col });
        if (!ws[cellAddress]) continue;
        ws[cellAddress].s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: mode === 'RTGS' ? "2563EB" : "16A34A" } },
          alignment: { horizontal: "center", vertical: "center" }
        };
      }

      // Style the total row (last row)
      const lastRow = range.e.r;
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = xlsx.utils.encode_cell({ r: lastRow, c: col });
        if (!ws[cellAddress]) continue;
        ws[cellAddress].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: "F3F4F6" } }
        };
      }

      xlsx.utils.book_append_sheet(wb, ws, `${mode} Transactions`);

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = `${mode}-Transactions-${timestamp}.xlsx`;
      
      // Write file
      xlsx.writeFile(wb, fileName);
      
      alert(`✅ Successfully exported ${transactionsToExport.length} ${mode} transactions to ${fileName}`);
    } catch (error) {
      console.error('Export error:', error);
      alert(`❌ Failed to export transactions. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setEditValues({
      date: transaction.date,
      amount: transaction.amount,
      note: transaction.note
    });
  };

  // Format number in Indian numbering system as user types
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Remove all non-digit characters
    const numericValue = value.replace(/[^\d]/g, '');
    
    if (numericValue === '') {
      setAmountInput('');
      return;
    }
    
    // Format in Indian numbering system
    const formatted = new Intl.NumberFormat('en-IN').format(parseInt(numericValue));
    setAmountInput(formatted);
  };

  const handleAddTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    if (isSubmitting) return; // Prevent double submission
    setIsSubmitting(true);
    
    try {
      if (onAddTransaction) {
        await onAddTransaction(e);
        // Reset form after successful submission
        if (formRef.current) {
          formRef.current.reset();
        }
        setAmountInput(''); // Clear formatted amount input
      }
    } catch (error) {
      // Error is already handled by the parent component
      console.error("Transaction submission error:", error);
    } finally {
      // Re-enable submission after a short delay
      setTimeout(() => setIsSubmitting(false), 1000);
    }
  };

  const handleSave = () => {
    if (editingId) {
      // Validation: Amount should be positive
      const amount = editValues.amount || 0;
      if (amount <= 0) {
        alert('Amount must be greater than 0');
        return;
      }
      
      onEditTransaction(editingId, editValues);
      setEditingId(null);
      setEditValues({});
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValues({});
  };

  // Sort transactions by date
  const sortByDate = (a: Transaction, b: Transaction, order: 'asc' | 'desc') => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return order === 'asc' ? dateA - dateB : dateB - dateA;
  };

  const rtgsTransactions = transactions
    .filter(t => {
      if (t.mode !== 'RTGS') return false;
      
      // Apply date filters if set
      if (rtgsFromDate && t.date < rtgsFromDate) return false;
      if (rtgsToDate && t.date > rtgsToDate) return false;
      
      return true;
    })
    .sort((a, b) => sortByDate(a, b, rtgsSortOrder));
  
  const cashTransactions = transactions
    .filter(t => {
      if (t.mode !== 'CASH') return false;
      
      // Apply date filters if set
      if (cashFromDate && t.date < cashFromDate) return false;
      if (cashToDate && t.date > cashToDate) return false;
      
      return true;
    })
    .sort((a, b) => sortByDate(a, b, cashSortOrder));

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-0 overflow-hidden">
        <div className="p-4 sm:p-6 border-b bg-gray-50 border-t-4 border-t-green-500">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-8 bg-green-500 rounded-full"></div>
            <h2 className="text-xl sm:text-2xl font-semibold">Payments (Transactions)</h2>
          </div>
          {onAddTransaction && (
            <form ref={formRef} onSubmit={handleAddTransaction} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Date</label>
                <div className="flex items-center gap-2 border rounded-xl px-3 py-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <Input 
                    name="t_date" 
                    type="date" 
                    className="border-0 p-0 focus-visible:ring-0 w-full" 
                    required 
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Payment Mode</label>
                <select 
                  name="t_mode" 
                  value={selectedPaymentMode}
                  onChange={(e) => handlePaymentModeChange(e.target.value as 'RTGS' | 'CASH')}
                  className="border rounded-xl px-3 py-2 w-full h-10 text-sm"
                >
                  <option value="RTGS">RTGS</option>
                  <option value="CASH">CASH</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Bank Account</label>
                <select 
                  name="t_account" 
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="border rounded-xl px-3 py-2 w-full h-10 text-sm"
                >
                  {accounts.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Amount (₹)</label>
                <Input 
                  type="text" 
                  value={amountInput}
                  onChange={handleAmountChange}
                  placeholder="Enter amount" 
                  className="border rounded-xl px-3 py-2 w-full" 
                  required 
                />
                {/* Hidden input for form submission with numeric value */}
                <input 
                  ref={amountInputRef}
                  type="hidden" 
                  name="t_amount" 
                  value={amountInput.replace(/,/g, '')} // Remove commas for numeric value
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Note (Optional)</label>
                <Input 
                  name="t_note" 
                  type="text" 
                  placeholder="Enter note" 
                  className="border rounded-xl px-3 py-2 w-full" 
                />
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button 
                className="rounded-xl w-full sm:w-auto justify-center" 
                type="submit"
                disabled={isSubmitting}
              >
                {showSubmissionSuccess ? (
                  <Check className="w-4 h-4 mr-2 text-green-600" />
                ) : (
                  <PlusCircle className="w-4 h-4 mr-2" />
                )}
                {isSubmitting ? "Adding..." : "Add Transaction"}
              </Button>
            </div>
          </form>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          {/* RTGS Transactions */}
          <div className="border-r">
            <div className="p-4 bg-blue-50 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-blue-800">RTGS Transactions</h3>
                  <p className="text-sm text-blue-600">
                    Total: {fmt(rtgsTransactions.reduce((sum, t) => sum + (t.amount || 0), 0))} 
                    ({rtgsTransactions.length} transactions)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExportToExcel('RTGS')}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    title="Export RTGS transactions to Excel"
                  >
                    <Download className="w-4 h-4" />
                    <span className="text-sm font-medium">Export</span>
                  </button>
                  <button
                    onClick={() => setRtgsSortOrder(rtgsSortOrder === 'asc' ? 'desc' : 'asc')}
                    className="flex items-center gap-2 px-3 py-2 bg-white border border-blue-300 rounded-lg hover:bg-blue-100 transition-colors"
                    title={rtgsSortOrder === 'asc' ? 'Sort by newest first' : 'Sort by oldest first'}
                  >
                    {rtgsSortOrder === 'asc' ? (
                      <ArrowUp className="w-4 h-4 text-blue-600" />
                    ) : (
                      <ArrowDown className="w-4 h-4 text-blue-600" />
                    )}
                    <span className="text-sm font-medium text-blue-800">
                      {rtgsSortOrder === 'asc' ? 'Oldest First' : 'Newest First'}
                    </span>
                  </button>
                </div>
              </div>
              
              {/* Date Filters for RTGS */}
              <div className="flex items-center gap-3 pt-2 border-t border-blue-200">
                <span className="text-sm font-medium text-blue-800">Filter by Date:</span>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-blue-700">From:</label>
                  <Input
                    type="date"
                    value={rtgsFromDate}
                    onChange={(e) => setRtgsFromDate(e.target.value)}
                    className="w-36 h-8 text-sm border-blue-300 focus:ring-blue-500"
                    placeholder="From date"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-blue-700">To:</label>
                  <Input
                    type="date"
                    value={rtgsToDate}
                    onChange={(e) => setRtgsToDate(e.target.value)}
                    className="w-36 h-8 text-sm border-blue-300 focus:ring-blue-500"
                    placeholder="To date"
                  />
                </div>
                {(rtgsFromDate || rtgsToDate) && (
                  <button
                    onClick={() => {
                      setRtgsFromDate('');
                      setRtgsToDate('');
                    }}
                    className="text-xs px-3 py-1 bg-white border border-blue-300 rounded hover:bg-blue-100 text-blue-700 transition-colors"
                    title="Clear date filters"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="min-w-full">
                <thead className="sticky top-0 bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Customer</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Account</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Amount (₹)</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Note</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rtgsTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500 text-sm">
                        No RTGS transactions found
                      </td>
                    </tr>
                  ) : (
                    rtgsTransactions.map((t) => {
                      const customer = customers.find(c => c.id === t.customer_id);
                      const account = accounts.find(a => a.id === t.account_id);
                      const isEditing = editingId === t.id;
                      
                      return (
                        <tr key={t.id} className="hover:bg-blue-25 transition-colors">
                          <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                            {isEditing ? (
                              <Input
                                type="date"
                                value={editValues.date || t.date}
                                onChange={(e) => setEditValues({ ...editValues, date: e.target.value })}
                                className="w-32 p-1 text-sm"
                              />
                            ) : (
                              formatDisplayDate(t.date)
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{maskName(customer?.name || 'Unknown')}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{account?.name || 'Unknown'}</td>
                          
                          {/* Amount */}
                          <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                            {isEditing ? (
                              <Input
                                type="number"
                                value={editValues.amount || 0}
                                onChange={(e) => setEditValues({ ...editValues, amount: parseFloat(e.target.value) || 0 })}
                                className="w-20 text-right p-1 text-sm"
                                step="0.01"
                                min="0"
                              />
                            ) : (
                              fmt(t.amount)
                            )}
                          </td>
                          
                          {/* Note */}
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {isEditing ? (
                              <Input
                                type="text"
                                value={editValues.note || ''}
                                onChange={(e) => setEditValues({ ...editValues, note: e.target.value })}
                                className="w-24 p-1 text-sm"
                                placeholder="Note"
                              />
                            ) : (
                              t.note || "-"
                            )}
                          </td>
                          
                          {/* Actions */}
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={handleSave}
                                    className="text-green-600 hover:text-green-800 p-1 rounded"
                                    title="Save changes"
                                  >
                                    <Save className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={handleCancel}
                                    className="text-gray-600 hover:text-gray-800 p-1 rounded"
                                    title="Cancel editing"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleEdit(t)}
                                    className="text-blue-600 hover:text-blue-800 p-1 rounded"
                                    title="Edit transaction"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => onDeleteTransaction(t.id)}
                                    className="text-red-600 hover:text-red-800 p-1 rounded"
                                    title="Delete transaction"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cash Transactions */}
          <div>
            <div className="p-4 bg-green-50 border-b">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-green-800">Cash Transactions</h3>
                    <p className="text-sm text-green-600">
                      Total: {fmt(cashTransactions.reduce((sum, t) => sum + (t.amount || 0), 0))} 
                      ({cashTransactions.length} transactions)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExportToExcel('CASH')}
                      className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      title="Export cash transactions to Excel"
                    >
                      <Download className="w-4 h-4" />
                      <span className="text-sm font-medium">Export Excel</span>
                    </button>
                    <button
                      onClick={() => setCashSortOrder(cashSortOrder === 'asc' ? 'desc' : 'asc')}
                      className="flex items-center gap-2 px-3 py-2 bg-white border border-green-300 rounded-lg hover:bg-green-100 transition-colors"
                      title={cashSortOrder === 'asc' ? 'Sort by newest first' : 'Sort by oldest first'}
                    >
                      {cashSortOrder === 'asc' ? (
                        <ArrowUp className="w-4 h-4 text-green-600" />
                      ) : (
                        <ArrowDown className="w-4 h-4 text-green-600" />
                      )}
                      <span className="text-sm font-medium text-green-800">
                        {cashSortOrder === 'asc' ? 'Oldest First' : 'Newest First'}
                      </span>
                    </button>
                  </div>
                </div>
                
                {/* Date Filters */}
                <div className="flex items-center gap-3 pt-2 border-t border-green-200">
                  <span className="text-sm font-medium text-green-800">Filter by Date:</span>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-green-700">From:</label>
                    <Input
                      type="date"
                      value={cashFromDate}
                      onChange={(e) => setCashFromDate(e.target.value)}
                      className="w-36 h-8 text-sm border-green-300 focus:ring-green-500"
                      placeholder="From date"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-green-700">To:</label>
                    <Input
                      type="date"
                      value={cashToDate}
                      onChange={(e) => setCashToDate(e.target.value)}
                      className="w-36 h-8 text-sm border-green-300 focus:ring-green-500"
                      placeholder="To date"
                    />
                  </div>
                  {(cashFromDate || cashToDate) && (
                    <button
                      onClick={() => {
                        setCashFromDate('');
                        setCashToDate('');
                      }}
                      className="text-xs px-3 py-1 bg-white border border-green-300 rounded hover:bg-green-100 text-green-700 transition-colors"
                      title="Clear date filters"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="min-w-full">
                <thead className="sticky top-0 bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Customer</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Account</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Amount (₹)</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Note</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {cashTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500 text-sm">
                        No cash transactions found
                      </td>
                    </tr>
                  ) : (
                    cashTransactions.map((t) => {
                      const customer = customers.find(c => c.id === t.customer_id);
                      const account = accounts.find(a => a.id === t.account_id);
                      const isEditing = editingId === t.id;
                      
                      return (
                        <tr key={t.id} className="hover:bg-green-25 transition-colors">
                          <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                            {isEditing ? (
                              <Input
                                type="date"
                                value={editValues.date || t.date}
                                onChange={(e) => setEditValues({ ...editValues, date: e.target.value })}
                                className="w-32 p-1 text-sm"
                              />
                            ) : (
                              formatDisplayDate(t.date)
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{maskName(customer?.name || 'Unknown')}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{account?.name || 'Unknown'}</td>
                          
                          {/* Amount */}
                          <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                            {isEditing ? (
                              <Input
                                type="number"
                                value={editValues.amount || 0}
                                onChange={(e) => setEditValues({ ...editValues, amount: parseFloat(e.target.value) || 0 })}
                                className="w-20 text-right p-1 text-sm"
                                step="0.01"
                                min="0"
                              />
                            ) : (
                              fmt(t.amount)
                            )}
                          </td>
                          
                          {/* Note */}
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {isEditing ? (
                              <Input
                                type="text"
                                value={editValues.note || ''}
                                onChange={(e) => setEditValues({ ...editValues, note: e.target.value })}
                                className="w-24 p-1 text-sm"
                                placeholder="Note"
                              />
                            ) : (
                              t.note || "-"
                            )}
                          </td>
                          
                          {/* Actions */}
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={handleSave}
                                    className="text-green-600 hover:text-green-800 p-1 rounded"
                                    title="Save changes"
                                  >
                                    <Save className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={handleCancel}
                                    className="text-gray-600 hover:text-gray-800 p-1 rounded"
                                    title="Cancel editing"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleEdit(t)}
                                    className="text-blue-600 hover:text-blue-800 p-1 rounded"
                                    title="Edit transaction"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => onDeleteTransaction(t.id)}
                                    className="text-red-600 hover:text-red-800 p-1 rounded"
                                    title="Delete transaction"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        {transactions.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700">Total Transactions: {transactions.length}</span>
              <div className="space-x-6">
                <span className="font-medium text-blue-700">
                  RTGS Total: {fmt(rtgsTransactions.reduce((sum, t) => sum + (t.amount || 0), 0))}
                </span>
                <span className="font-medium text-green-700">
                  Cash Total: {fmt(cashTransactions.reduce((sum, t) => sum + (t.amount || 0), 0))}
                </span>
                <span className="font-bold text-gray-900">
                  Grand Total: {fmt(transactions.reduce((sum, t) => sum + (t.amount || 0), 0))}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}