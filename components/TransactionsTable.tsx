import React, { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, PlusCircle, Edit, Trash2, Save, X, Check, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { formatDisplayDate } from "@/lib/date-utils";
import { useMasking } from "@/contexts/MaskingContext";

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
  const formRef = useRef<HTMLFormElement>(null);

  const handleEdit = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setEditValues({
      amount: transaction.amount,
      note: transaction.note
    });
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
    .filter(t => t.mode === 'RTGS')
    .sort((a, b) => sortByDate(a, b, rtgsSortOrder));
  
  const cashTransactions = transactions
    .filter(t => t.mode === 'CASH')
    .sort((a, b) => sortByDate(a, b, cashSortOrder));

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-0 overflow-hidden">
        <div className="p-6 border-b bg-gray-50">
          <h2 className="text-2xl font-semibold mb-4">Payments (Transactions)</h2>
          {onAddTransaction && (
            <form ref={formRef} onSubmit={handleAddTransaction} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                <select name="t_mode" className="border rounded-xl px-3 py-2 w-full h-10 text-sm">
                  <option value="RTGS">RTGS</option>
                  <option value="CASH">CASH</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Bank Account</label>
                <select name="t_account" className="border rounded-xl px-3 py-2 w-full h-10 text-sm">
                  {accounts.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Amount (₹)</label>
                <Input 
                  name="t_amount" 
                  type="number" 
                  placeholder="Enter amount" 
                  className="border rounded-xl px-3 py-2 w-full" 
                  required 
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
                className="rounded-xl" 
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
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
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
                          <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatDisplayDate(t.date)}</td>
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
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-green-800">Cash Transactions</h3>
                  <p className="text-sm text-green-600">
                    Total: {fmt(cashTransactions.reduce((sum, t) => sum + (t.amount || 0), 0))} 
                    ({cashTransactions.length} transactions)
                  </p>
                </div>
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
                          <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatDisplayDate(t.date)}</td>
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