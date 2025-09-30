import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, PlusCircle } from "lucide-react";

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const fmt = (n: number) => INR.format(n || 0);

interface Consignment {
  id: string;
  customer_id: string;
  date: string;
  total: number;
  rtgs_expected: number;
  cash_expected: number;
  remarks?: string;
}

interface ConsignmentsTableProps {
  consignments: Consignment[];
  onAddConsignment: (e: React.FormEvent<HTMLFormElement>) => void;
  customerId: string;
  customers: any[];
}

export function ConsignmentsTable({ consignments, onAddConsignment, customerId, customers }: ConsignmentsTableProps) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-0 overflow-hidden">
        <div className="p-6 border-b bg-gray-50">
          <h2 className="text-2xl font-semibold mb-4">Consignments (Expected)</h2>
          <form onSubmit={onAddConsignment} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Date</label>
                <div className="flex items-center gap-2 border rounded-xl px-3 py-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <Input 
                    name="c_date" 
                    type="date" 
                    className="border-0 p-0 focus-visible:ring-0 w-full" 
                    required 
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Total Amount (₹)</label>
                <Input 
                  name="c_total" 
                  type="number" 
                  placeholder="Enter total amount" 
                  className="border rounded-xl px-3 py-2 w-full" 
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">RTGS Expected (₹)</label>
                <Input 
                  name="c_rtgs" 
                  type="number" 
                  placeholder="RTGS amount" 
                  className="border rounded-xl px-3 py-2 w-full" 
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Cash Expected (₹)</label>
                <Input 
                  name="c_cash" 
                  type="number" 
                  placeholder="Cash amount" 
                  className="border rounded-xl px-3 py-2 w-full" 
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-3 space-y-2">
                <label className="text-sm font-medium text-gray-700">Remarks (Optional)</label>
                <Input 
                  name="c_remarks" 
                  type="text" 
                  placeholder="Enter any remarks" 
                  className="border rounded-xl px-3 py-2 w-full" 
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">&nbsp;</label>
                <Button className="rounded-xl w-full" type="submit">
                  <PlusCircle className="w-4 h-4 mr-2" /> Add Consignment
                </Button>
              </div>
            </div>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">S.No</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Customer</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Total (₹)</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">RTGS Expected (₹)</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Cash Expected (₹)</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {consignments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No consignments found. Add your first consignment using the form above.
                  </td>
                </tr>
              ) : (
                consignments.map((c, idx) => {
                  const customer = customers.find(cust => cust.id === c.customer_id);
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-900">{idx + 1}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{c.date}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{customer?.name || 'Unknown'}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">{fmt(c.total)}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">{fmt(c.rtgs_expected)}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">{fmt(c.cash_expected)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{c.remarks || "-"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {consignments.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700">Total Records: {consignments.length}</span>
              <div className="space-x-6">
                <span className="font-medium text-gray-700">
                  Total Amount: {fmt(consignments.reduce((sum, c) => sum + (c.total || 0), 0))}
                </span>
                <span className="font-medium text-blue-700">
                  RTGS Expected: {fmt(consignments.reduce((sum, c) => sum + (c.rtgs_expected || 0), 0))}
                </span>
                <span className="font-medium text-green-700">
                  Cash Expected: {fmt(consignments.reduce((sum, c) => sum + (c.cash_expected || 0), 0))}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}