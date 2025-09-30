import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, PlusCircle } from "lucide-react";

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
  onAddTransaction: (e: React.FormEvent<HTMLFormElement>) => void;
}

export function TransactionsTable({ transactions, accounts, customers, onAddTransaction }: TransactionsTableProps) {
  const rtgsTransactions = transactions.filter(t => t.mode === 'RTGS');
  const cashTransactions = transactions.filter(t => t.mode === 'CASH');

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-0 overflow-hidden">
        <div className="p-6 border-b bg-gray-50">
          <h2 className="text-2xl font-semibold mb-4">Payments (Transactions)</h2>
          <form onSubmit={onAddTransaction} className="space-y-4">
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
              <Button className="rounded-xl" type="submit">
                <PlusCircle className="w-4 h-4 mr-2" /> Add Transaction
              </Button>
            </div>
          </form>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          {/* RTGS Transactions */}
          <div className="border-r">
            <div className="p-4 bg-blue-50 border-b">
              <h3 className="text-lg font-semibold text-blue-800">RTGS Transactions</h3>
              <p className="text-sm text-blue-600">
                Total: {fmt(rtgsTransactions.reduce((sum, t) => sum + (t.amount || 0), 0))} 
                ({rtgsTransactions.length} transactions)
              </p>
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rtgsTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500 text-sm">
                        No RTGS transactions found
                      </td>
                    </tr>
                  ) : (
                    rtgsTransactions.map((t) => {
                      const customer = customers.find(c => c.id === t.customer_id);
                      const account = accounts.find(a => a.id === t.account_id);
                      return (
                        <tr key={t.id} className="hover:bg-blue-25 transition-colors">
                          <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{t.date}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{customer?.name || 'Unknown'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{account?.name || 'Unknown'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">{fmt(t.amount)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{t.note || "-"}</td>
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
              <h3 className="text-lg font-semibold text-green-800">Cash Transactions</h3>
              <p className="text-sm text-green-600">
                Total: {fmt(cashTransactions.reduce((sum, t) => sum + (t.amount || 0), 0))} 
                ({cashTransactions.length} transactions)
              </p>
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {cashTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500 text-sm">
                        No cash transactions found
                      </td>
                    </tr>
                  ) : (
                    cashTransactions.map((t) => {
                      const customer = customers.find(c => c.id === t.customer_id);
                      const account = accounts.find(a => a.id === t.account_id);
                      return (
                        <tr key={t.id} className="hover:bg-green-25 transition-colors">
                          <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{t.date}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{customer?.name || 'Unknown'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{account?.name || 'Unknown'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">{fmt(t.amount)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{t.note || "-"}</td>
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