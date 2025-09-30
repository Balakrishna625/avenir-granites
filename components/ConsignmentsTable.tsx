import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, PlusCircle, Edit, Trash2, Save, X } from "lucide-react";

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
  onEditConsignment: (id: string, data: Partial<Consignment>) => void;
  onDeleteConsignment: (id: string) => void;
  customerId: string;
  customers: any[];
}

export function ConsignmentsTable({ consignments, onAddConsignment, onEditConsignment, onDeleteConsignment, customerId, customers }: ConsignmentsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Consignment>>({});

  const handleEdit = (consignment: Consignment) => {
    setEditingId(consignment.id);
    setEditValues({
      total: consignment.total,
      rtgs_expected: consignment.rtgs_expected,
      cash_expected: consignment.cash_expected,
      remarks: consignment.remarks
    });
  };

  const handleSave = () => {
    if (editingId) {
      const rtgs = editValues.rtgs_expected || 0;
      const cash = editValues.cash_expected || 0;
      const calculatedTotal = rtgs + cash;
      
      // Ensure total is always correctly calculated
      const finalValues = {
        ...editValues,
        total: calculatedTotal
      };
      
      onEditConsignment(editingId, finalValues);
      setEditingId(null);
      setEditValues({});
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValues({});
  };

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
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {consignments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No consignments found. Add your first consignment using the form above.
                  </td>
                </tr>
              ) : (
                consignments.map((c, idx) => {
                  const customer = customers.find(cust => cust.id === c.customer_id);
                  const isEditing = editingId === c.id;
                  
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-900">{idx + 1}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{c.date}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{customer?.name || 'Unknown'}</td>
                      
                      {/* Total Amount */}
                      <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">
                        {isEditing ? (
                          <div className="w-24 text-right p-2 text-sm bg-gray-100 rounded border-2 border-dashed border-gray-300">
                            {fmt(editValues.total || 0)}
                            <div className="text-xs text-gray-500 mt-1">Auto-calculated</div>
                          </div>
                        ) : (
                          fmt(c.total)
                        )}
                      </td>
                      
                      {/* RTGS Expected */}
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">
                        {isEditing ? (
                          <div className="space-y-1">
                            <Input
                              type="number"
                              value={editValues.rtgs_expected || 0}
                              onChange={(e) => {
                                const rtgs = parseFloat(e.target.value) || 0;
                                const cash = editValues.cash_expected || 0;
                                setEditValues({ 
                                  ...editValues, 
                                  rtgs_expected: rtgs,
                                  total: rtgs + cash // Auto-calculate total
                                });
                              }}
                              className="w-24 text-right p-1 text-sm"
                              step="0.01"
                              min="0"
                            />
                          </div>
                        ) : (
                          fmt(c.rtgs_expected)
                        )}
                      </td>
                      
                      {/* Cash Expected */}
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">
                        {isEditing ? (
                          <div className="space-y-1">
                            <Input
                              type="number"
                              value={editValues.cash_expected || 0}
                              onChange={(e) => {
                                const cash = parseFloat(e.target.value) || 0;
                                const rtgs = editValues.rtgs_expected || 0;
                                setEditValues({ 
                                  ...editValues, 
                                  cash_expected: cash,
                                  total: rtgs + cash // Auto-calculate total
                                });
                              }}
                              className="w-24 text-right p-1 text-sm"
                              step="0.01"
                              min="0"
                            />
                          </div>
                        ) : (
                          fmt(c.cash_expected)
                        )}
                      </td>
                      
                      {/* Remarks */}
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {isEditing ? (
                          <Input
                            type="text"
                            value={editValues.remarks || ''}
                            onChange={(e) => setEditValues({ ...editValues, remarks: e.target.value })}
                            className="w-32 p-1 text-sm"
                            placeholder="Remarks"
                          />
                        ) : (
                          c.remarks || "-"
                        )}
                      </td>
                      
                      {/* Actions */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          {isEditing ? (
                            <>
                              <button
                                onClick={handleSave}
                                className="text-green-600 hover:text-green-800 p-1 rounded"
                                title="Save changes"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={handleCancel}
                                className="text-gray-600 hover:text-gray-800 p-1 rounded"
                                title="Cancel editing"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEdit(c)}
                                className="text-blue-600 hover:text-blue-800 p-1 rounded"
                                title="Edit consignment"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this consignment?')) {
                                    onDeleteConsignment(c.id);
                                  }
                                }}
                                className="text-red-600 hover:text-red-800 p-1 rounded"
                                title="Delete consignment"
                              >
                                <Trash2 className="w-4 h-4" />
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