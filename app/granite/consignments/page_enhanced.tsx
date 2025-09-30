'use client';

import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Mountain, 
  Plus, 
  Save, 
  Calendar,
  Building2,
  ArrowLeft,
  Edit,
  Trash2,
  Calculator,
  Truck,
  CreditCard,
  Banknote
} from "lucide-react";
import Link from "next/link";

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const fmt = (n: number) => INR.format(n || 0);

interface GraniteSupplier {
  id: string;
  name: string;
  contact_person?: string;
}

interface GraniteBlock {
  id?: string;
  block_no: string;
  grade: string;
  gross_measurement: number;
  net_measurement: number;
  elavance?: number;
}

interface GraniteConsignment {
  id?: string;
  consignment_number: string;
  supplier_id: string;
  arrival_date: string;
  rate_per_meter: number;
  payment_cash_rate: number;
  payment_upi_rate: number;
  transport_cost: number;
  blocks: GraniteBlock[];
  notes?: string;
  // Calculated fields
  total_net_measurement?: number;
  total_gross_measurement?: number;
  total_elavance?: number;
  total_payment_cash?: number;
  total_payment_upi?: number;
  total_expenditure?: number;
}

export default function GraniteConsignments() {
  const [suppliers, setSuppliers] = useState<GraniteSupplier[]>([]);
  const [consignments, setConsignments] = useState<GraniteConsignment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [currentConsignment, setCurrentConsignment] = useState<GraniteConsignment>({
    consignment_number: '',
    supplier_id: '',
    arrival_date: new Date().toISOString().split('T')[0],
    rate_per_meter: 30000, // Default rate as per your data
    payment_cash_rate: 19000,
    payment_upi_rate: 11000,
    transport_cost: 0,
    blocks: [],
    notes: ''
  });

  useEffect(() => {
    fetchSuppliers();
    fetchConsignments();
  }, []);

  const fetchSuppliers = async () => {
    try {
      // Mock data based on your Excel - replace with actual API call
      setSuppliers([
        { id: '1', name: 'Rising Sun Exports', contact_person: 'Manager' },
        { id: '2', name: 'Bargandy Quarry', contact_person: 'Sales Head' },
        { id: '3', name: 'Local Granite Quarry', contact_person: 'Owner' }
      ]);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const fetchConsignments = async () => {
    try {
      // Mock data based on your Excel sheet
      const mockConsignment: GraniteConsignment = {
        id: '1',
        consignment_number: 'RISING SUN-29.09.23',
        supplier_id: '1',
        arrival_date: '2023-09-29',
        rate_per_meter: 30000,
        payment_cash_rate: 19000,
        payment_upi_rate: 11000,
        transport_cost: 215926,
        blocks: [
          { id: '1', block_no: 'AVG-33', grade: 'A', gross_measurement: 9.026, net_measurement: 4.563 },
          { id: '2', block_no: 'AVG-34', grade: 'A', gross_measurement: 7.44, net_measurement: 4.675 },
          { id: '3', block_no: 'AVG-35', grade: 'A', gross_measurement: 6.006, net_measurement: 3.54 },
          { id: '4', block_no: 'AVG-36', grade: 'A', gross_measurement: 6.119, net_measurement: 3.536 },
          { id: '5', block_no: 'AVG-37', grade: 'A', gross_measurement: 12.089, net_measurement: 9.6 },
          { id: '6', block_no: 'AVG-38', grade: 'A', gross_measurement: 11.593, net_measurement: 7.883 }
        ],
        notes: 'MAHI consignment - Good quality blocks with proper measurements'
      };

      // Calculate totals
      const totalNet = mockConsignment.blocks.reduce((sum, block) => sum + block.net_measurement, 0);
      const totalGross = mockConsignment.blocks.reduce((sum, block) => sum + block.gross_measurement, 0);
      
      mockConsignment.total_net_measurement = totalNet;
      mockConsignment.total_gross_measurement = totalGross;
      mockConsignment.total_elavance = totalGross - totalNet;
      mockConsignment.total_payment_cash = totalNet * mockConsignment.payment_cash_rate;
      mockConsignment.total_payment_upi = totalNet * mockConsignment.payment_upi_rate;
      mockConsignment.total_expenditure = mockConsignment.total_payment_cash + mockConsignment.total_payment_upi + mockConsignment.transport_cost;

      setConsignments([mockConsignment]);
    } catch (error) {
      console.error('Error fetching consignments:', error);
    }
  };

  const addBlock = () => {
    setCurrentConsignment(prev => ({
      ...prev,
      blocks: [...prev.blocks, { block_no: '', grade: 'A', gross_measurement: 0, net_measurement: 0 }]
    }));
  };

  const updateBlock = (index: number, field: keyof GraniteBlock, value: string | number) => {
    setCurrentConsignment(prev => ({
      ...prev,
      blocks: prev.blocks.map((block, i) => 
        i === index ? { ...block, [field]: value } : block
      )
    }));
  };

  const removeBlock = (index: number) => {
    setCurrentConsignment(prev => ({
      ...prev,
      blocks: prev.blocks.filter((_, i) => i !== index)
    }));
  };

  const calculateTotals = (consignment: GraniteConsignment) => {
    const totalNet = consignment.blocks.reduce((sum, block) => sum + block.net_measurement, 0);
    const totalGross = consignment.blocks.reduce((sum, block) => sum + block.gross_measurement, 0);
    
    return {
      total_net_measurement: totalNet,
      total_gross_measurement: totalGross,
      total_elavance: totalGross - totalNet,
      total_payment_cash: totalNet * consignment.payment_cash_rate,
      total_payment_upi: totalNet * consignment.payment_upi_rate,
      total_expenditure: (totalNet * consignment.payment_cash_rate) + (totalNet * consignment.payment_upi_rate) + consignment.transport_cost
    };
  };

  const handleSave = async () => {
    try {
      const totals = calculateTotals(currentConsignment);
      const consignmentToSave = { ...currentConsignment, ...totals };
      
      // Here you would make API call to save
      console.log('Saving consignment:', consignmentToSave);
      
      setShowForm(false);
      fetchConsignments(); // Refresh the list
    } catch (error) {
      console.error('Error saving consignment:', error);
    }
  };

  const totals = calculateTotals(currentConsignment);

  return (
    <AppLayout>
      <div className="min-h-screen w-full bg-gray-50 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Granite Consignments</h1>
              <p className="text-gray-600">Manage quarry purchases and block entries</p>
            </div>
          </div>
          <Button 
            onClick={() => setShowForm(true)} 
            className="flex items-center space-x-2"
            disabled={showForm}
          >
            <Plus className="h-4 w-4" />
            <span>New Consignment</span>
          </Button>
        </div>

        {showForm && (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Add New Consignment</h3>
              
              {/* Basic Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Consignment Number</label>
                  <Input
                    value={currentConsignment.consignment_number}
                    onChange={(e) => setCurrentConsignment(prev => ({ ...prev, consignment_number: e.target.value }))}
                    placeholder="e.g., RISING SUN-29.09.23"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Supplier</label>
                  <select
                    value={currentConsignment.supplier_id}
                    onChange={(e) => setCurrentConsignment(prev => ({ ...prev, supplier_id: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Arrival Date</label>
                  <Input
                    type="date"
                    value={currentConsignment.arrival_date}
                    onChange={(e) => setCurrentConsignment(prev => ({ ...prev, arrival_date: e.target.value }))}
                  />
                </div>
              </div>

              {/* Payment Details */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Rate per Meter (₹)</label>
                  <Input
                    type="number"
                    value={currentConsignment.rate_per_meter}
                    onChange={(e) => setCurrentConsignment(prev => ({ ...prev, rate_per_meter: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Cash Rate (₹/m)</label>
                  <Input
                    type="number"
                    value={currentConsignment.payment_cash_rate}
                    onChange={(e) => setCurrentConsignment(prev => ({ ...prev, payment_cash_rate: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">UPI Rate (₹/m)</label>
                  <Input
                    type="number"
                    value={currentConsignment.payment_upi_rate}
                    onChange={(e) => setCurrentConsignment(prev => ({ ...prev, payment_upi_rate: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Transport Cost (₹)</label>
                  <Input
                    type="number"
                    value={currentConsignment.transport_cost}
                    onChange={(e) => setCurrentConsignment(prev => ({ ...prev, transport_cost: Number(e.target.value) }))}
                  />
                </div>
              </div>

              {/* Blocks Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-semibold">Granite Blocks</h4>
                  <Button onClick={addBlock} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Block
                  </Button>
                </div>

                {currentConsignment.blocks.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 p-2 text-left">Block No</th>
                          <th className="border border-gray-300 p-2 text-left">Grade</th>
                          <th className="border border-gray-300 p-2 text-right">Gross (m)</th>
                          <th className="border border-gray-300 p-2 text-right">Net (m)</th>
                          <th className="border border-gray-300 p-2 text-right">Elavance (m)</th>
                          <th className="border border-gray-300 p-2 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentConsignment.blocks.map((block, index) => (
                          <tr key={index}>
                            <td className="border border-gray-300 p-2">
                              <Input
                                value={block.block_no}
                                onChange={(e) => updateBlock(index, 'block_no', e.target.value)}
                                placeholder="AVG-33"
                                className="w-full"
                              />
                            </td>
                            <td className="border border-gray-300 p-2">
                              <select
                                value={block.grade}
                                onChange={(e) => updateBlock(index, 'grade', e.target.value)}
                                className="w-full p-1 border rounded"
                              >
                                <option value="A">A</option>
                                <option value="B">B</option>
                                <option value="C">C</option>
                              </select>
                            </td>
                            <td className="border border-gray-300 p-2">
                              <Input
                                type="number"
                                step="0.001"
                                value={block.gross_measurement}
                                onChange={(e) => updateBlock(index, 'gross_measurement', Number(e.target.value))}
                                className="w-full text-right"
                              />
                            </td>
                            <td className="border border-gray-300 p-2">
                              <Input
                                type="number"
                                step="0.001"
                                value={block.net_measurement}
                                onChange={(e) => updateBlock(index, 'net_measurement', Number(e.target.value))}
                                className="w-full text-right"
                              />
                            </td>
                            <td className="border border-gray-300 p-2 text-right">
                              {(block.gross_measurement - block.net_measurement).toFixed(3)}
                            </td>
                            <td className="border border-gray-300 p-2 text-center">
                              <Button
                                onClick={() => removeBlock(index)}
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                        {/* Totals Row */}
                        <tr className="bg-blue-50 font-semibold">
                          <td className="border border-gray-300 p-2" colSpan={2}>TOTAL</td>
                          <td className="border border-gray-300 p-2 text-right">{totals.total_gross_measurement.toFixed(3)}</td>
                          <td className="border border-gray-300 p-2 text-right">{totals.total_net_measurement.toFixed(3)}</td>
                          <td className="border border-gray-300 p-2 text-right">{totals.total_elavance.toFixed(3)}</td>
                          <td className="border border-gray-300 p-2"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Payment Calculation */}
              {currentConsignment.blocks.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <Card className="bg-green-50">
                    <CardContent className="p-4">
                      <h5 className="font-semibold text-green-800 mb-3 flex items-center">
                        <Calculator className="h-4 w-4 mr-2" />
                        Payment Calculation
                      </h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Net Measurement:</span>
                          <span className="font-medium">{totals.total_net_measurement.toFixed(3)} m</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cash Payment ({currentConsignment.payment_cash_rate}/m):</span>
                          <span className="font-medium">₹{totals.total_payment_cash.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>UPI Payment ({currentConsignment.payment_upi_rate}/m):</span>
                          <span className="font-medium">₹{totals.total_payment_upi.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Transport Cost:</span>
                          <span className="font-medium">₹{currentConsignment.transport_cost.toLocaleString()}</span>
                        </div>
                        <hr className="my-2" />
                        <div className="flex justify-between font-bold text-green-800">
                          <span>Total Expenditure:</span>
                          <span>₹{totals.total_expenditure.toLocaleString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-blue-50">
                    <CardContent className="p-4">
                      <h5 className="font-semibold text-blue-800 mb-3">Summary</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Total Blocks:</span>
                          <span className="font-medium">{currentConsignment.blocks.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Gross Measurement:</span>
                          <span className="font-medium">{totals.total_gross_measurement.toFixed(3)} m</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Net Measurement:</span>
                          <span className="font-medium">{totals.total_net_measurement.toFixed(3)} m</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Free Elavance:</span>
                          <span className="font-medium text-green-600">{totals.total_elavance.toFixed(3)} m</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Notes</label>
                <textarea
                  value={currentConsignment.notes}
                  onChange={(e) => setCurrentConsignment(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-md"
                  rows={3}
                  placeholder="Add any notes about this consignment..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} className="flex items-center space-x-2">
                  <Save className="h-4 w-4" />
                  <span>Save Consignment</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Existing Consignments */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Existing Consignments</h2>
          {consignments.map((consignment) => {
            const supplier = suppliers.find(s => s.id === consignment.supplier_id);
            return (
              <Card key={consignment.id}>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Basic Info */}
                    <div>
                      <h3 className="text-lg font-semibold text-blue-600 mb-2">{consignment.consignment_number}</h3>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center">
                          <Building2 className="h-4 w-4 mr-2 text-gray-500" />
                          <span>{supplier?.name}</span>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                          <span>{new Date(consignment.arrival_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center">
                          <Mountain className="h-4 w-4 mr-2 text-gray-500" />
                          <span>{consignment.blocks.length} blocks</span>
                        </div>
                      </div>
                    </div>

                    {/* Measurements */}
                    <div>
                      <h4 className="font-semibold mb-2">Measurements</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Gross:</span>
                          <span className="font-medium">{consignment.total_gross_measurement?.toFixed(3)} m</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Net:</span>
                          <span className="font-medium">{consignment.total_net_measurement?.toFixed(3)} m</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Elavance:</span>
                          <span className="font-medium text-green-600">{consignment.total_elavance?.toFixed(3)} m</span>
                        </div>
                      </div>
                    </div>

                    {/* Financial */}
                    <div>
                      <h4 className="font-semibold mb-2">Financial</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Cash Payment:</span>
                          <span className="font-medium">₹{consignment.total_payment_cash?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>UPI Payment:</span>
                          <span className="font-medium">₹{consignment.total_payment_upi?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Transport:</span>
                          <span className="font-medium">₹{consignment.transport_cost?.toLocaleString()}</span>
                        </div>
                        <hr className="my-1" />
                        <div className="flex justify-between font-bold text-green-600">
                          <span>Total:</span>
                          <span>₹{consignment.total_expenditure?.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Blocks List */}
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Blocks</h4>
                    <div className="flex flex-wrap gap-2">
                      {consignment.blocks.map((block) => (
                        <span 
                          key={block.id} 
                          className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs"
                        >
                          {block.block_no} ({block.net_measurement}m)
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex justify-end space-x-2">
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Link href={`/granite/cutting?consignment=${consignment.id}`}>
                      <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                        Start Cutting
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}