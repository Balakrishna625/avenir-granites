'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppLayout } from '@/components/AppLayout';
import Link from 'next/link';
import { ArrowLeft, Plus, Search, ShoppingBag, Package, DollarSign, Calculator } from 'lucide-react';

interface BlockPart {
  id: string;
  block_id: string;
  part_name: 'A' | 'B' | 'C';
  slabs_count: number;
  sqft: number;
  thickness: number;
  is_available: boolean;
  sold_sqft: number;
  remaining_sqft: number;
  block_no: string;
  consignment_number: string;
  supplier_name: string;
  cost_per_sqft: number;
}

interface SaleRecord {
  id?: string;
  sale_number?: string;
  block_part_id: string;
  consignment_id: string;
  block_no: string;
  part_name: string;
  buyer_name: string;
  sale_date: string;
  sqft_sold: number;
  rate_per_sqft: number;
  cost_per_sqft: number;
  payment_mode: 'CASH' | 'UPI' | 'RTGS' | 'PENDING';
  notes?: string;
}

export default function SalesPage() {
  const [blockParts, setBlockParts] = useState<BlockPart[]>([]);
  const [selectedPart, setSelectedPart] = useState<BlockPart | null>(null);
  const [saleForm, setSaleForm] = useState<SaleRecord>({
    block_part_id: '',
    consignment_id: '',
    block_no: '',
    part_name: 'A',
    buyer_name: '',
    sale_date: new Date().toISOString().split('T')[0],
    sqft_sold: 0,
    rate_per_sqft: 0,
    cost_per_sqft: 0,
    payment_mode: 'PENDING',
    notes: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Fetch available block parts
  useEffect(() => {
    fetchAvailableParts();
  }, []);

  const fetchAvailableParts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/granite-block-parts/available');
      if (response.ok) {
        const data = await response.json();
        setBlockParts(data.filter((part: BlockPart) => part.remaining_sqft > 0));
      }
    } catch (error) {
      console.error('Error fetching available parts:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectPart = (part: BlockPart) => {
    setSelectedPart(part);
    setSaleForm({
      block_part_id: part.id,
      consignment_id: part.block_id, // This would need to be fetched properly
      block_no: part.block_no,
      part_name: part.part_name,
      buyer_name: '',
      sale_date: new Date().toISOString().split('T')[0],
      sqft_sold: 0,
      rate_per_sqft: 0,
      cost_per_sqft: part.cost_per_sqft,
      payment_mode: 'PENDING',
      notes: ''
    });
    setShowForm(true);
  };

  const updateSaleForm = (field: keyof SaleRecord, value: any) => {
    setSaleForm(prev => ({ ...prev, [field]: value }));
  };

  const saveSale = async () => {
    if (!selectedPart || saleForm.sqft_sold <= 0 || saleForm.rate_per_sqft <= 0) {
      alert('Please fill all required fields');
      return;
    }

    if (saleForm.sqft_sold > selectedPart.remaining_sqft) {
      alert(`Cannot sell more than available: ${selectedPart.remaining_sqft} sqft`);
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch('/api/granite-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleForm)
      });

      if (response.ok) {
        alert('Sale recorded successfully!');
        setShowForm(false);
        setSelectedPart(null);
        setSaleForm({
          block_part_id: '',
          consignment_id: '',
          block_no: '',
          part_name: 'A',
          buyer_name: '',
          sale_date: new Date().toISOString().split('T')[0],
          sqft_sold: 0,
          rate_per_sqft: 0,
          cost_per_sqft: 0,
          payment_mode: 'PENDING',
          notes: ''
        });
        fetchAvailableParts(); // Refresh the list
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error saving sale:', error);
      alert('Error saving sale. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredParts = blockParts.filter(part => 
    part.block_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    part.consignment_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    part.supplier_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calculateProfit = () => {
    return (saleForm.rate_per_sqft - saleForm.cost_per_sqft) * saleForm.sqft_sold;
  };

  const calculateTotalPrice = () => {
    return saleForm.rate_per_sqft * saleForm.sqft_sold;
  };

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
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">
              <ShoppingBag className="inline w-8 h-8 mr-3 text-green-600" />
              Sales Tracking
            </h1>
            <p className="text-gray-600">Record slab sales and track profit margins</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Available Parts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="w-5 h-5" />
                <span>Available Slabs</span>
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by block or consignment..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredParts.map((part) => (
                  <div
                    key={part.id}
                    onClick={() => selectPart(part)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedPart?.id === part.id 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {part.block_no} - Part {part.part_name}
                        </h4>
                        <p className="text-sm text-gray-600">{part.consignment_number}</p>
                        <p className="text-xs text-gray-500">{part.supplier_name}</p>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          <span className="text-blue-600">Slabs: {part.slabs_count}</span>
                          <span className="text-purple-600">Thickness: {part.thickness}mm</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">
                          {part.remaining_sqft.toFixed(2)} sqft
                        </p>
                        <p className="text-sm text-gray-500">Available</p>
                        <p className="text-xs text-gray-600">
                          Cost: ₹{part.cost_per_sqft.toFixed(0)}/sqft
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredParts.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    {loading ? 'Loading available slabs...' : 'No slabs available for sale'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sales Form */}
          {showForm && selectedPart && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Record Sale</span>
                  <Button 
                    onClick={saveSale} 
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {loading ? 'Saving...' : 'Save Sale'}
                  </Button>
                </CardTitle>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p><strong>Block:</strong> {selectedPart.block_no} - Part {selectedPart.part_name}</p>
                  <p><strong>Available:</strong> {selectedPart.remaining_sqft.toFixed(2)} sqft</p>
                  <p><strong>Cost:</strong> ₹{selectedPart.cost_per_sqft.toFixed(0)}/sqft</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Buyer Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Buyer Name *</label>
                    <Input
                      value={saleForm.buyer_name}
                      onChange={(e) => updateSaleForm('buyer_name', e.target.value)}
                      placeholder="Enter buyer name"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Sale Date *</label>
                    <Input
                      type="date"
                      value={saleForm.sale_date}
                      onChange={(e) => updateSaleForm('sale_date', e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Sale Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Square Feet Sold *</label>
                    <Input
                      type="number"
                      value={saleForm.sqft_sold}
                      onChange={(e) => updateSaleForm('sqft_sold', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      max={selectedPart.remaining_sqft}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Max: {selectedPart.remaining_sqft.toFixed(2)} sqft
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Rate per Sqft *</label>
                    <Input
                      type="number"
                      value={saleForm.rate_per_sqft}
                      onChange={(e) => updateSaleForm('rate_per_sqft', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      min="0"
                      required
                    />
                  </div>
                </div>

                {/* Payment Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Payment Mode</label>
                    <select
                      value={saleForm.payment_mode}
                      onChange={(e) => updateSaleForm('payment_mode', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="CASH">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="RTGS">RTGS</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Notes</label>
                    <Input
                      value={saleForm.notes || ''}
                      onChange={(e) => updateSaleForm('notes', e.target.value)}
                      placeholder="Additional notes"
                    />
                  </div>
                </div>

                {/* Calculation Summary */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                    <Calculator className="w-4 h-4 mr-2" />
                    Sale Summary
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-blue-700">Cost per sqft:</p>
                      <p className="font-bold">₹{saleForm.cost_per_sqft.toFixed(0)}</p>
                    </div>
                    <div>
                      <p className="text-blue-700">Selling rate:</p>
                      <p className="font-bold">₹{saleForm.rate_per_sqft.toFixed(0)}</p>
                    </div>
                    <div>
                      <p className="text-blue-700">Total Price:</p>
                      <p className="font-bold text-lg">₹{calculateTotalPrice().toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-blue-700">Total Profit:</p>
                      <p className={`font-bold text-lg ${calculateProfit() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ₹{calculateProfit().toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <p className="text-blue-700">Profit per sqft:</p>
                    <p className={`font-bold ${(saleForm.rate_per_sqft - saleForm.cost_per_sqft) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₹{(saleForm.rate_per_sqft - saleForm.cost_per_sqft).toFixed(0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!showForm && (
            <Card>
              <CardContent className="flex items-center justify-center h-96">
                <div className="text-center text-gray-500">
                  <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">Select a slab to record a sale</p>
                  <p className="text-sm">Choose from the available slabs on the left</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}