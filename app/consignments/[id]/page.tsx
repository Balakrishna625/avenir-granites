'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { ArrowLeft, Plus, Edit, Trash2, Package, Calculator } from 'lucide-react';
import Link from 'next/link';
import { AppLayout } from '@/components/AppLayout';

interface Block {
  id: string;
  block_no: string;
  gross_measurement: number;
  net_measurement: number;
  elavance: number;
  grade?: string;
  status: string;
}

interface Consignment {
  id: string;
  consignment_number: string;
  supplier_id: string;
  arrival_date: string;
  total_blocks: number;
  total_net_measurement: number;
  total_gross_measurement: number;
  total_elavance: number;
  payment_cash: number;
  payment_upi: number;
  transport_cost: number;
  total_expenditure: number;
  status: string;
  notes?: string;
  supplier?: {
    id: string;
    name: string;
    contact_person: string;
  };
  blocks?: Block[];
}

export default function ConsignmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const consignmentId = params.id as string;
  
  const [consignment, setConsignment] = useState<Consignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [newBlock, setNewBlock] = useState({
    block_no: '',
    gross_measurement: '',
    net_measurement: ''
  });

  useEffect(() => {
    loadConsignment();
  }, [consignmentId]);

  const loadConsignment = async () => {
    try {
      const response = await fetch(`/api/granite-consignments?id=${consignmentId}`);
      if (!response.ok) throw new Error('Failed to load consignment');
      
      const data = await response.json();
      setConsignment(data);
    } catch (error) {
      console.error('Error loading consignment:', error);
      // Fallback to mock data if API fails
      const mockConsignment: Consignment = {
        id: consignmentId,
        consignment_number: 'CON-001',
        supplier_id: '1',
        arrival_date: '2024-01-15',
        total_blocks: 3,
        total_net_measurement: 45.5,
        total_gross_measurement: 52.0,
        total_elavance: 6.5,
        payment_cash: 50000,
        payment_upi: 25000,
        transport_cost: 5000,
        total_expenditure: 80000,
        status: 'ACTIVE',
        supplier: { id: '1', name: 'Rising Sun Exports', contact_person: 'Manager' },
        blocks: [
          {
            id: '1',
            block_no: 'AVG-33',
            gross_measurement: 18.5,
            net_measurement: 16.2,
            elavance: 2.3,
            grade: 'A',
            status: 'RAW'
          },
          {
            id: '2',
            block_no: 'AVG-34',
            gross_measurement: 20.0,
            net_measurement: 17.8,
            elavance: 2.2,
            grade: 'A',
            status: 'RAW'
          },
          {
            id: '3',
            block_no: 'AVG-35',
            gross_measurement: 13.5,
            net_measurement: 11.5,
            elavance: 2.0,
            grade: 'B',
            status: 'RAW'
          }
        ]
      };
      setConsignment(mockConsignment);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBlock = async () => {
    if (!newBlock.block_no || !newBlock.gross_measurement || !newBlock.net_measurement) {
      showToast('error', 'Please fill in all required fields');
      return;
    }

    const grossMeasurement = parseFloat(newBlock.gross_measurement);
    const netMeasurement = parseFloat(newBlock.net_measurement);
    
    if (grossMeasurement <= netMeasurement) {
      showToast('error', 'Gross measurement must be greater than net measurement');
      return;
    }

    try {
      const response = await fetch('/api/granite-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consignment_id: consignmentId,
          block_no: newBlock.block_no,
          gross_measurement: grossMeasurement,
          net_measurement: netMeasurement,
          elavance: grossMeasurement - netMeasurement
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add block');
      }

      // Reload consignment to get updated data
      await loadConsignment();
      
      // Reset form
      setNewBlock({
        block_no: '',
        gross_measurement: '',
        net_measurement: ''
      });
      setShowAddBlock(false);
      showToast('success', 'Block added successfully!');
    } catch (error) {
      console.error('Error adding block:', error);
      showToast('error', error instanceof Error ? error.message : 'Failed to add block. Please try again.');
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    if (!confirm('Are you sure you want to delete this block?')) return;

    try {
      const response = await fetch(`/api/granite-blocks?id=${blockId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete block');
      }

      await loadConsignment(); // Reload to get updated data
      showToast('success', 'Block deleted successfully!');
    } catch (error) {
      console.error('Error deleting block:', error);
      showToast('error', error instanceof Error ? error.message : 'Failed to delete block. Please try again.');
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg">Loading consignment details...</div>
        </div>
      </AppLayout>
    );
  }

  if (!consignment) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900">Consignment not found</h2>
            <Link href="/consignments" className="text-blue-600 hover:text-blue-800 mt-2 inline-block">
              Back to consignments
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/consignments">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {consignment.consignment_number}
            </h1>
            <p className="text-gray-600 mt-1">
              {consignment.supplier?.name} • {new Date(consignment.arrival_date).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Edit Consignment</Button>
          <Button 
            onClick={() => setShowAddBlock(!showAddBlock)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Block
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Blocks</p>
              <p className="text-2xl font-bold text-gray-900">{consignment.total_blocks}</p>
            </div>
            <Package className="w-8 h-8 text-blue-600" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Gross Measurement</p>
              <p className="text-2xl font-bold text-gray-900">{consignment.total_gross_measurement.toFixed(1)}m</p>
            </div>
            <Calculator className="w-8 h-8 text-green-600" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Measurement</p>
              <p className="text-2xl font-bold text-gray-900">{consignment.total_net_measurement.toFixed(1)}m</p>
            </div>
            <Calculator className="w-8 h-8 text-purple-600" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Elavance</p>
              <p className="text-2xl font-bold text-gray-900">{consignment.total_elavance.toFixed(1)}m</p>
            </div>
            <Calculator className="w-8 h-8 text-orange-600" />
          </div>
        </Card>
      </div>

      {/* Add Block Form */}
      {showAddBlock && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Block</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Block No (e.g., AVG-36)
              </label>
              <Input
                value={newBlock.block_no}
                onChange={(e) => setNewBlock({ ...newBlock, block_no: e.target.value })}
                placeholder="AVG-36"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gross Measurement (m)
              </label>
              <Input
                type="number"
                step="0.1"
                value={newBlock.gross_measurement}
                onChange={(e) => setNewBlock({ ...newBlock, gross_measurement: e.target.value })}
                placeholder="20.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Net Measurement (m)
              </label>
              <Input
                type="number"
                step="0.1"
                value={newBlock.net_measurement}
                onChange={(e) => setNewBlock({ ...newBlock, net_measurement: e.target.value })}
                placeholder="18.2"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleAddBlock}>Add Block</Button>
            <Button variant="outline" onClick={() => setShowAddBlock(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Blocks Table */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Granite Blocks</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Block No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gross Measurement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Net Measurement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Elavance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {consignment.blocks?.map((block) => (
                <tr key={block.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{block.block_no}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                    {block.gross_measurement.toFixed(1)}m
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                    {block.net_measurement.toFixed(1)}m
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                    {block.elavance.toFixed(1)}m
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                    {block.grade || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      {block.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteBlock(block.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {(!consignment.blocks || consignment.blocks.length === 0) && (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No blocks added</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by adding granite blocks to this consignment.
            </p>
            <div className="mt-6">
              <Button onClick={() => setShowAddBlock(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Block
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
    </AppLayout>
  );
}
