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
      blocks: [...prev.blocks, {
        block_no: '',
        grade: 'A',
        gross_measurement: 0,
        net_measurement: 0
      }]
    }));
  };

  const updateBlock = (index: number, field: keyof GraniteBlock, value: any) => {
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

  const generateConsignmentNumber = () => {
    const count = consignments.length + 1;
    return `CSG-${count.toString().padStart(3, '0')}`;
  };

  const saveConsignment = async () => {
    try {
      const consignmentData = {
        ...currentConsignment,
        consignment_number: currentConsignment.consignment_number || generateConsignmentNumber()
      };

      // Here you would make the API call to save the consignment
      console.log('Saving consignment:', consignmentData);
      
      // Mock success - in reality, you'd get the saved data back from the API
      setConsignments(prev => [...prev, { ...consignmentData, id: Date.now().toString() }]);
      
      // Reset form
      setCurrentConsignment({
        consignment_number: '',
        supplier_id: '',
        arrival_date: new Date().toISOString().split('T')[0],
        rate_per_meter: 30000,
        payment_cash_rate: 19000,
        payment_upi_rate: 11000,
        transport_cost: 0,
        blocks: [],
        notes: ''
      });
      setShowForm(false);
      
      alert('Consignment saved successfully!');
    } catch (error) {
      console.error('Error saving consignment:', error);
      alert('Error saving consignment');
    }
  };

  const getSupplierName = (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier?.name || 'Unknown Supplier';
  };

  const getTotalBlocks = (blocks: GraniteBlock[]) => blocks.length;
  const getTotalNetMeasurement = (blocks: GraniteBlock[]) => 
    blocks.reduce((sum, block) => sum + block.net_measurement, 0);
  const getTotalGrossMeasurement = (blocks: GraniteBlock[]) => 
    blocks.reduce((sum, block) => sum + block.gross_measurement, 0);
  const getTotalElavance = (blocks: GraniteBlock[]) => 
    getTotalGrossMeasurement(blocks) - getTotalNetMeasurement(blocks);

  return (
    <AppLayout>
      <div className="min-h-screen w-full bg-gray-50 p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">Raw Block Entry</h1>
            <p className="text-gray-600">Manage granite consignments and block inventory</p>
          </div>
          <Button 
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Consignment
          </Button>
        </div>

        {/* Add/Edit Consignment Form */}
        {showForm && (
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Add New Consignment</h3>
                <Button 
                  variant="outline" 
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Consignment Number</label>
                  <Input
                    value={currentConsignment.consignment_number}
                    onChange={(e) => setCurrentConsignment(prev => ({ ...prev, consignment_number: e.target.value }))}
                    placeholder={generateConsignmentNumber()}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Supplier</label>
                  <select
                    value={currentConsignment.supplier_id}
                    onChange={(e) => setCurrentConsignment(prev => ({ ...prev, supplier_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Arrival Date</label>
                  <div className="flex items-center gap-2 border rounded-lg px-3 py-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <Input
                      type="date"
                      value={currentConsignment.arrival_date}
                      onChange={(e) => setCurrentConsignment(prev => ({ ...prev, arrival_date: e.target.value }))}
                      className="border-0 p-0 focus-visible:ring-0"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Blocks Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-md font-semibold">Blocks</h4>
                  <Button onClick={addBlock} variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Block
                  </Button>
                </div>

                {currentConsignment.blocks.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-200 rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Block No</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Quality Grade</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Gross (m³)</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Net (m³)</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Elavance (m³)</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {currentConsignment.blocks.map((block, index) => {
                          const elavance = block.gross_measurement - block.net_measurement;
                          return (
                            <tr key={index}>
                              <td className="px-4 py-3">
                                <Input
                                  value={block.block_no}
                                  onChange={(e) => updateBlock(index, 'block_no', e.target.value)}
                                  placeholder="AVG-33"
                                  className="w-24"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <Input
                                  value={block.grade || ''}
                                  onChange={(e) => updateBlock(index, 'grade', e.target.value)}
                                  placeholder="Premium/Standard"
                                  className="w-28"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <Input
                                  type="number"
                                  value={block.gross_measurement}
                                  onChange={(e) => updateBlock(index, 'gross_measurement', parseFloat(e.target.value) || 0)}
                                  className="w-24 text-right"
                                  step="0.001"
                                  min="0"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <Input
                                  type="number"
                                  value={block.net_measurement}
                                  onChange={(e) => updateBlock(index, 'net_measurement', parseFloat(e.target.value) || 0)}
                                  className="w-24 text-right"
                                  step="0.001"
                                  min="0"
                                />
                              </td>
                              <td className="px-4 py-3 text-right text-sm font-medium">
                                {elavance.toFixed(3)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeBlock(index)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Summary */}
                {currentConsignment.blocks.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Total Blocks:</span>
                        <span className="ml-2 font-semibold">{getTotalBlocks(currentConsignment.blocks)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Net:</span>
                        <span className="ml-2 font-semibold">{getTotalNetMeasurement(currentConsignment.blocks).toFixed(3)} m³</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Gross:</span>
                        <span className="ml-2 font-semibold">{getTotalGrossMeasurement(currentConsignment.blocks).toFixed(3)} m³</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Elavance:</span>
                        <span className="ml-2 font-semibold">{getTotalElavance(currentConsignment.blocks).toFixed(3)} m³</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2 mt-6">
                <label className="text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={currentConsignment.notes}
                  onChange={(e) => setCurrentConsignment(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Additional notes about this consignment..."
                />
              </div>

              {/* Save Button */}
              <div className="flex justify-end mt-6">
                <Button 
                  onClick={saveConsignment}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={!currentConsignment.supplier_id || currentConsignment.blocks.length === 0}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Consignment
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Existing Consignments */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Consignments</h3>
            
            {consignments.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No consignments found. Add your first consignment to get started.
              </div>
            ) : (
              <div className="space-y-4">
                {consignments.map((consignment) => (
                  <div key={consignment.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold">{consignment.consignment_number}</h4>
                        <p className="text-sm text-gray-600">
                          {getSupplierName(consignment.supplier_id)} • {consignment.arrival_date}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-gray-50 p-3 rounded">
                      <div>
                        <span className="text-gray-600">Blocks:</span>
                        <span className="ml-2 font-semibold">{getTotalBlocks(consignment.blocks)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Net:</span>
                        <span className="ml-2 font-semibold">{getTotalNetMeasurement(consignment.blocks).toFixed(3)} m³</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Gross:</span>
                        <span className="ml-2 font-semibold">{getTotalGrossMeasurement(consignment.blocks).toFixed(3)} m³</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Elavance:</span>
                        <span className="ml-2 font-semibold">{getTotalElavance(consignment.blocks).toFixed(3)} m³</span>
                      </div>
                    </div>
                    
                    {consignment.notes && (
                      <p className="text-sm text-gray-600 mt-2">
                        <strong>Notes:</strong> {consignment.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}