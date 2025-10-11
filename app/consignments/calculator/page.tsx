'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calculator, Save, Trash2, Plus, Edit3 } from 'lucide-react';

interface ConsignmentCalculation {
  id?: string;
  calculation_name: string;
  description?: string;
  total_blocks: number;
  net_meters_per_block: number;  // What you pay for
  gross_meters_per_block: number; // What you actually get
  cost_per_meter: number;
  loading_charges: number;
  transport_charges: number;
  quarry_commission: number;
  polish_percentage: number;
  laputra_percentage: number;
  whiteline_percentage: number;
  // Sale price fields
  polish_sale_price: number;
  laputra_sale_price: number;
  whiteline_sale_price: number;
  // Computed fields
  total_expected_sqft?: number;
  polish_sqft?: number;
  laputra_sqft?: number;
  whiteline_sqft?: number;
  raw_material_cost?: number;
  polish_cost?: number;
  laputra_cost?: number;
  whiteline_cost?: number;
  total_production_cost?: number;
  total_cost?: number;
  cost_per_sqft?: number; // New field
  // Computed fields for sales
  polish_sale_amount?: number;
  laputra_sale_amount?: number;
  whiteline_sale_amount?: number;
  total_sale_revenue?: number;
  profit_loss?: number;
  profit_margin_percentage?: number;
  created_at?: string;
  updated_at?: string;
}

export default function ConsignmentCalculatorPage() {
  const [calculations, setCalculations] = useState<ConsignmentCalculation[]>([]);
  const [currentCalculation, setCurrentCalculation] = useState<ConsignmentCalculation>({
    calculation_name: '',
    description: '',
    total_blocks: 0,
    net_meters_per_block: 0,
    gross_meters_per_block: 0,
    cost_per_meter: 0,
    loading_charges: 0,
    transport_charges: 0,
    quarry_commission: 0,
    polish_percentage: 0,
    laputra_percentage: 0,
    whiteline_percentage: 0,
    polish_sale_price: 0,
    laputra_sale_price: 0,
    whiteline_sale_price: 0
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch all calculations on component mount
  useEffect(() => {
    fetchCalculations();
  }, []);

  const fetchCalculations = async () => {
    try {
      const response = await fetch('/api/consignment-calculations');
      const result = await response.json();
      if (response.ok) {
        setCalculations(result.data);
      } else {
        setError(result.error || 'Failed to fetch calculations');
      }
    } catch (err) {
      setError('Failed to fetch calculations');
      console.error('Error fetching calculations:', err);
    }
  };

  // Calculate derived values in real-time with correct business logic
  const calculateDerivedValues = (calc: ConsignmentCalculation) => {
    // SqFt calculations use GROSS meters (what you actually get)
    const totalSqft = calc.total_blocks * calc.gross_meters_per_block * 300;
    const polishSqft = totalSqft * (calc.polish_percentage / 100);
    const laputraSqft = totalSqft * (calc.laputra_percentage / 100);
    const whitelineSqft = totalSqft * (calc.whiteline_percentage / 100);
    
    // Raw material cost uses NET meters (what you pay for)
    const rawMaterialCost = (calc.total_blocks * calc.net_meters_per_block * calc.cost_per_meter) + 
                           calc.loading_charges + calc.transport_charges + calc.quarry_commission;
    
    // Production costs use GROSS meters (processing actual material)
    const polishCost = polishSqft * 25;
    const laputraCost = laputraSqft * 30;
    const whitelineCost = whitelineSqft * 25;
    
    const totalProductionCost = polishCost + laputraCost + whitelineCost;
    const totalCost = rawMaterialCost + totalProductionCost;

    // Cost per SqFt: Raw material cost divided by total SqFt
    const costPerSqft = totalSqft > 0 ? rawMaterialCost / totalSqft : 0;

    // Sale calculations use GROSS meters (selling actual material)
    const polishSaleAmount = polishSqft * (calc.polish_sale_price || 0);
    const laputraSaleAmount = laputraSqft * (calc.laputra_sale_price || 0);
    const whitelineSaleAmount = whitelineSqft * (calc.whiteline_sale_price || 0);
    const totalSaleRevenue = polishSaleAmount + laputraSaleAmount + whitelineSaleAmount;
    
    // Profit/Loss calculation
    const profitLoss = totalSaleRevenue - totalCost;
    const profitMarginPercentage = totalSaleRevenue > 0 ? (profitLoss / totalSaleRevenue) * 100 : 0;

    return {
      totalSqft,
      polishSqft,
      laputraSqft,
      whitelineSqft,
      rawMaterialCost,
      polishCost,
      laputraCost,
      whitelineCost,
      totalProductionCost,
      totalCost,
      costPerSqft,
      polishSaleAmount,
      laputraSaleAmount,
      whitelineSaleAmount,
      totalSaleRevenue,
      profitLoss,
      profitMarginPercentage
    };
  };

  const derived = calculateDerivedValues(currentCalculation);

  const handleInputChange = (field: keyof ConsignmentCalculation, value: string | number) => {
    setCurrentCalculation(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!currentCalculation.calculation_name.trim()) {
      setError('Calculation name is required');
      return;
    }

    if (currentCalculation.total_blocks <= 0 || currentCalculation.net_meters_per_block <= 0 || currentCalculation.gross_meters_per_block <= 0 || currentCalculation.cost_per_meter <= 0) {
      setError('Total blocks, net meters per block, gross meters per block, and cost per meter must be greater than 0');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const method = isEditing ? 'PUT' : 'POST';
      const body = isEditing ? currentCalculation : { ...currentCalculation };

      const response = await fetch('/api/consignment-calculations', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (response.ok) {
        await fetchCalculations(); // Refresh the list
        resetForm();
        // Success message could be shown here
      } else {
        setError(result.error || 'Failed to save calculation');
      }
    } catch (err) {
      setError('Failed to save calculation');
      console.error('Error saving calculation:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (calculation: ConsignmentCalculation) => {
    setCurrentCalculation(calculation);
    setIsEditing(true);
    setError('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this calculation?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/consignment-calculations?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchCalculations(); // Refresh the list
      } else {
        const result = await response.json();
        setError(result.error || 'Failed to delete calculation');
      }
    } catch (err) {
      setError('Failed to delete calculation');
      console.error('Error deleting calculation:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentCalculation({
      calculation_name: '',
      description: '',
      total_blocks: 0,
      net_meters_per_block: 0,
      gross_meters_per_block: 0,
      cost_per_meter: 0,
      loading_charges: 0,
      transport_charges: 0,
      quarry_commission: 0,
      polish_percentage: 0,
      laputra_percentage: 0,
      whiteline_percentage: 0,
      polish_sale_price: 0,
      laputra_sale_price: 0,
      whiteline_sale_price: 0
    });
    setIsEditing(false);
    setError('');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 2
    }).format(num);
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <Calculator className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Consignment Calculator</h1>
            <p className="text-gray-600">Calculate costs and estimates for granite consignments</p>
          </div>
        </div>
        <Button
          onClick={resetForm}
          variant="outline"
          className="flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Calculation</span>
        </Button>
      </div>

      {error && (
        <Card className="mb-6 p-4 bg-red-50 border-red-200">
          <p className="text-red-600">{error}</p>
        </Card>
      )}

      {/* Summary Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {/* Raw Material Cost */}
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">Raw Material Cost</p>
              <p className="text-xl font-bold text-green-900">
                {formatCurrency(derived.rawMaterialCost)}
              </p>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 text-lg">🏗️</span>
            </div>
          </div>
        </Card>

        {/* Processing Costs */}
        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-700">Processing Costs</p>
              <p className="text-xl font-bold text-yellow-900">
                {formatCurrency(derived.totalProductionCost)}
              </p>
            </div>
            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-yellow-600 text-lg">⚙️</span>
            </div>
          </div>
        </Card>

        {/* Total Project Cost */}
        <Card className="p-4 bg-purple-50 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700">Total Project Cost</p>
              <p className="text-xl font-bold text-purple-900">
                {formatCurrency(derived.totalCost)}
              </p>
            </div>
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-purple-600 text-lg">💰</span>
            </div>
          </div>
        </Card>

        {/* Raw Material Cost per SqFt */}
        <Card className="p-4 bg-teal-50 border-teal-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-teal-700">Cost per SqFt</p>
              <p className="text-xl font-bold text-teal-900">
                ₹{derived.costPerSqft.toFixed(2)}
              </p>
            </div>
            <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
              <span className="text-teal-600 text-lg">📏</span>
            </div>
          </div>
        </Card>

        {/* Total Sale Revenue */}
        <Card className="p-4 bg-indigo-50 border-indigo-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-indigo-700">Total Sale Revenue</p>
              <p className="text-xl font-bold text-indigo-900">
                {formatCurrency(derived.totalSaleRevenue)}
              </p>
            </div>
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
              <span className="text-indigo-600 text-lg">💵</span>
            </div>
          </div>
        </Card>

        {/* Profit/Loss */}
        <Card className={`p-4 ${derived.profitLoss >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${derived.profitLoss >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {derived.profitLoss >= 0 ? 'PROFIT' : 'LOSS'}
              </p>
              <p className={`text-xl font-bold ${derived.profitLoss >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>
                {formatCurrency(Math.abs(derived.profitLoss))}
              </p>
              <p className={`text-xs ${derived.profitLoss >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {derived.profitMarginPercentage.toFixed(1)}% margin
              </p>
            </div>
            <div className={`w-8 h-8 ${derived.profitLoss >= 0 ? 'bg-emerald-100' : 'bg-red-100'} rounded-full flex items-center justify-center`}>
              <span className={`${derived.profitLoss >= 0 ? 'text-emerald-600' : 'text-red-600'} text-lg`}>
                {derived.profitLoss >= 0 ? '📈' : '📉'}
              </span>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-8">
        {/* Input Form - Full Width */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">
            {isEditing ? 'Edit Calculation' : 'New Calculation'}
          </h2>
            
            <div className="space-y-4">
              {/* Basic Information */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Calculation Name *
                  </label>
                  <Input
                    type="text"
                    value={currentCalculation.calculation_name}
                    onChange={(e) => handleInputChange('calculation_name', e.target.value)}
                    placeholder="Enter calculation name"
                    className="w-full"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <Input
                    type="text"
                    value={currentCalculation.description || ''}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Optional description"
                    className="w-full"
                  />
                </div>
              </div>

              {/* Raw Material Inputs */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Raw Material Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Blocks *
                    </label>
                    <Input
                      type="number"
                      value={currentCalculation.total_blocks || ''}
                      onChange={(e) => handleInputChange('total_blocks', parseInt(e.target.value) || 0)}
                      min="0"
                      placeholder="e.g., 100"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Net Meters per Block (What you pay for) *
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={currentCalculation.net_meters_per_block || ''}
                      onChange={(e) => handleInputChange('net_meters_per_block', parseFloat(e.target.value) || 0)}
                      min="0"
                      placeholder="e.g., 2.0"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gross Meters per Block (What you actually get) *
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={currentCalculation.gross_meters_per_block || ''}
                      onChange={(e) => handleInputChange('gross_meters_per_block', parseFloat(e.target.value) || 0)}
                      min="0"
                      placeholder="e.g., 7.0"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cost per Meter (₹) *
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={currentCalculation.cost_per_meter || ''}
                      onChange={(e) => handleInputChange('cost_per_meter', parseFloat(e.target.value) || 0)}
                      min="0"
                      placeholder="e.g., 1000"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Loading Charges (₹)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={currentCalculation.loading_charges || ''}
                      onChange={(e) => handleInputChange('loading_charges', parseFloat(e.target.value) || 0)}
                      min="0"
                      placeholder="e.g., 50000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Transport Charges (₹)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={currentCalculation.transport_charges || ''}
                      onChange={(e) => handleInputChange('transport_charges', parseFloat(e.target.value) || 0)}
                      min="0"
                      placeholder="e.g., 25000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quarry Commission (₹)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={currentCalculation.quarry_commission || ''}
                      onChange={(e) => handleInputChange('quarry_commission', parseFloat(e.target.value) || 0)}
                      min="0"
                      placeholder="e.g., 15000"
                    />
                  </div>
                </div>
              </div>

              {/* Processing Percentages */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Processing Distribution (%)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Polish % (₹25/sqft)
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      value={currentCalculation.polish_percentage || ''}
                      onChange={(e) => handleInputChange('polish_percentage', parseFloat(e.target.value) || 0)}
                      min="0"
                      max="100"
                      placeholder="e.g., 40"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Laputra % (₹30/sqft)
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      value={currentCalculation.laputra_percentage || ''}
                      onChange={(e) => handleInputChange('laputra_percentage', parseFloat(e.target.value) || 0)}
                      min="0"
                      max="100"
                      placeholder="e.g., 35"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      White Line % (₹25/sqft)
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      value={currentCalculation.whiteline_percentage || ''}
                      onChange={(e) => handleInputChange('whiteline_percentage', parseFloat(e.target.value) || 0)}
                      min="0"
                      max="100"
                      placeholder="e.g., 25"
                    />
                  </div>
                </div>

                <div className="mt-2 text-sm text-gray-600">
                  Total percentage: {(currentCalculation.polish_percentage + currentCalculation.laputra_percentage + currentCalculation.whiteline_percentage).toFixed(1)}%
                </div>
              </div>

              {/* Expected Sale Prices */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Expected Sale Prices (₹ per sqft)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Polish Sale Price (₹/sqft)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={currentCalculation.polish_sale_price || ''}
                      onChange={(e) => handleInputChange('polish_sale_price', parseFloat(e.target.value) || 0)}
                      min="0"
                      placeholder="e.g., 45"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Laputra Sale Price (₹/sqft)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={currentCalculation.laputra_sale_price || ''}
                      onChange={(e) => handleInputChange('laputra_sale_price', parseFloat(e.target.value) || 0)}
                      min="0"
                      placeholder="e.g., 55"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      White Line Sale Price (₹/sqft)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={currentCalculation.whiteline_sale_price || ''}
                      onChange={(e) => handleInputChange('whiteline_sale_price', parseFloat(e.target.value) || 0)}
                      min="0"
                      placeholder="e.g., 40"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{loading ? 'Saving...' : isEditing ? 'Update' : 'Save'}</span>
                </Button>
                
                {isEditing && (
                  <Button
                    onClick={resetForm}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
        </Card>

        {/* Live Calculations - 3 Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cost Analysis Column */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Cost Analysis</h2>
            
            <div className="space-y-4">
              {/* Production Estimates */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Production Estimates</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">Total Expected SqFt:</span>
                    <div className="font-semibold text-blue-900">{formatNumber(derived.totalSqft)}</div>
                  </div>
                  <div>
                    <span className="text-blue-700">Polish SqFt:</span>
                    <div className="font-semibold text-blue-900">{formatNumber(derived.polishSqft)}</div>
                  </div>
                  <div>
                    <span className="text-blue-700">Laputra SqFt:</span>
                    <div className="font-semibold text-blue-900">{formatNumber(derived.laputraSqft)}</div>
                  </div>
                  <div>
                    <span className="text-blue-700">White Line SqFt:</span>
                    <div className="font-semibold text-blue-900">{formatNumber(derived.whitelineSqft)}</div>
                  </div>
                </div>
              </div>

              {/* Raw Material Costs */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-medium text-green-900 mb-2">Raw Material Cost</h3>
                <div className="text-2xl font-bold text-green-900">
                  {formatCurrency(derived.rawMaterialCost)}
                </div>
              </div>

              {/* Processing Costs */}
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="font-medium text-yellow-900 mb-2">Processing Costs</h3>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-yellow-700">Polish Cost:</span>
                    <span className="font-semibold text-yellow-900">{formatCurrency(derived.polishCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-yellow-700">Laputra Cost:</span>
                    <span className="font-semibold text-yellow-900">{formatCurrency(derived.laputraCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-yellow-700">White Line Cost:</span>
                    <span className="font-semibold text-yellow-900">{formatCurrency(derived.whitelineCost)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-medium text-yellow-900">Total Production:</span>
                    <span className="font-bold text-yellow-900">{formatCurrency(derived.totalProductionCost)}</span>
                  </div>
                </div>
              </div>

              {/* Total Project Cost */}
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-medium text-purple-900 mb-2">Total Project Cost</h3>
                <div className="text-3xl font-bold text-purple-900">
                  {formatCurrency(derived.totalCost)}
                </div>
              </div>

              {/* Cost per SqFt */}
              <div className="bg-teal-50 p-4 rounded-lg">
                <h3 className="font-medium text-teal-900 mb-2">Raw Material Cost per SqFt</h3>
                <div className="text-xl font-bold text-teal-900">
                  ₹{derived.costPerSqft.toFixed(2)} per SqFt
                </div>
                <div className="text-sm text-teal-700 mt-1">
                  Total raw material cost ÷ Total SqFt produced
                </div>
              </div>
            </div>
          </Card>

          {/* Expected Sale Column */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Expected Sales</h2>
            
            <div className="space-y-4">
              {/* Expected Sale Revenue */}
              <div className="bg-indigo-50 p-4 rounded-lg">
                <h3 className="font-medium text-indigo-900 mb-2">Expected Sale Revenue</h3>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-indigo-700">Polish Sale ({formatNumber(derived.polishSqft)} sqft × ₹{currentCalculation.polish_sale_price}):</span>
                    <span className="font-semibold text-indigo-900">{formatCurrency(derived.polishSaleAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-indigo-700">Laputra Sale ({formatNumber(derived.laputraSqft)} sqft × ₹{currentCalculation.laputra_sale_price}):</span>
                    <span className="font-semibold text-indigo-900">{formatCurrency(derived.laputraSaleAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-indigo-700">White Line Sale ({formatNumber(derived.whitelineSqft)} sqft × ₹{currentCalculation.whiteline_sale_price}):</span>
                    <span className="font-semibold text-indigo-900">{formatCurrency(derived.whitelineSaleAmount)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-medium text-indigo-900">Total Sale Revenue:</span>
                    <span className="font-bold text-indigo-900">{formatCurrency(derived.totalSaleRevenue)}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Profit/Loss Column */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Profit/Loss Analysis</h2>
            
            <div className="space-y-4">
              {/* Profit/Loss Analysis */}
              <div className={`p-4 rounded-lg ${derived.profitLoss >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <h3 className={`font-medium mb-2 ${derived.profitLoss >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                  Financial Summary
                </h3>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className={derived.profitLoss >= 0 ? 'text-green-700' : 'text-red-700'}>Total Sale Revenue:</span>
                    <span className={`font-semibold ${derived.profitLoss >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                      {formatCurrency(derived.totalSaleRevenue)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={derived.profitLoss >= 0 ? 'text-green-700' : 'text-red-700'}>Total Cost:</span>
                    <span className={`font-semibold ${derived.profitLoss >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                      {formatCurrency(derived.totalCost)}
                    </span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between items-center">
                      <span className={`font-bold text-lg ${derived.profitLoss >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                        {derived.profitLoss >= 0 ? 'PROFIT:' : 'LOSS:'}
                      </span>
                      <span className={`font-bold text-2xl ${derived.profitLoss >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                        {formatCurrency(Math.abs(derived.profitLoss))}
                      </span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className={`text-sm ${derived.profitLoss >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        Profit Margin:
                      </span>
                      <span className={`text-sm font-semibold ${derived.profitLoss >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                        {derived.profitMarginPercentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Saved Calculations */}
      {calculations.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900">Saved Calculations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {calculations.map((calc) => (
              <Card key={calc.id} className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{calc.calculation_name}</h3>
                    {calc.description && (
                      <p className="text-sm text-gray-600">{calc.description}</p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleEdit(calc)}
                      size="sm"
                      variant="outline"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(calc.id!)}
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Blocks:</span>
                    <span className="font-medium">{calc.total_blocks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Expected SqFt:</span>
                    <span className="font-medium">{formatNumber(calc.total_expected_sqft || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Raw Material:</span>
                    <span className="font-medium">{formatCurrency(calc.raw_material_cost || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Production:</span>
                    <span className="font-medium">{formatCurrency(calc.total_production_cost || 0)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-semibold text-gray-900">Total Cost:</span>
                    <span className="font-bold text-purple-600">{formatCurrency(calc.total_cost || 0)}</span>
                  </div>
                </div>
                
                <div className="mt-3 text-xs text-gray-500">
                  Created: {calc.created_at ? new Date(calc.created_at).toLocaleDateString() : 'Unknown'}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
      </div>
    </AppLayout>
  );
}