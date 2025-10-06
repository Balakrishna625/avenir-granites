'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Package, 
  Scissors, 
  BarChart3, 
  TrendingUp,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';

interface Block {
  id: string;
  block_no: string;
  consignment_id: string;
  gross_measurement: number;
  net_measurement: number;
  granite_consignments: {
    id: string;
    consignment_number: string;
    granite_suppliers: {
      id: string;
      name: string;
    };
  };
}

interface SlabProcessing {
  id: string;
  block_id: string;
  part_name: string;
  slabs_count: number;
  sqft: number;
  thickness: number;
  status: string;
  created_at: string;
  granite_blocks: {
    id: string;
    block_no: string;
    consignment_id: string;
  };
}

interface NewSlabForm {
  block_id: string;
  part_name: string;
  slabs_count: string;
  sqft: string;
  thickness: string;
}

export default function SlabProcessingPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [availableBlocks, setAvailableBlocks] = useState<Block[]>([]);
  const [slabProcessings, setSlabProcessings] = useState<SlabProcessing[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterConsignment, setFilterConsignment] = useState('all');
  
  const [newSlab, setNewSlab] = useState<NewSlabForm>({
    block_id: '',
    part_name: '',
    slabs_count: '',
    sqft: '',
    thickness: '20'
  });

  const partOptions = ['A', 'B', 'C', 'D'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [blocksRes, slabsRes] = await Promise.all([
        fetch('/api/available-blocks'),
        fetch('/api/slab-processing')
      ]);

      if (blocksRes.ok) {
        const blocks = await blocksRes.json();
        setAvailableBlocks(blocks);
      }

      if (slabsRes.ok) {
        const slabs = await slabsRes.json();
        setSlabProcessings(slabs);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSlab = async () => {
    if (!newSlab.block_id || !newSlab.part_name || !newSlab.slabs_count || !newSlab.sqft) {
      showToast('error', 'Please fill in all required fields');
      return;
    }

    const slabsCount = parseInt(newSlab.slabs_count);
    const sqft = parseFloat(newSlab.sqft);
    const thickness = parseFloat(newSlab.thickness);

    if (slabsCount <= 0 || sqft <= 0 || thickness <= 0) {
      showToast('error', 'Please enter valid positive numbers');
      return;
    }

    try {
      const response = await fetch('/api/slab-processing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          block_id: newSlab.block_id,
          part_name: newSlab.part_name,
          slabs_count: slabsCount,
          sqft: sqft,
          thickness: thickness
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add slab processing');
      }

      await loadData();
      setNewSlab({
        block_id: '',
        part_name: '',
        slabs_count: '',
        sqft: '',
        thickness: '20'
      });
      setShowAddForm(false);
      showToast('success', 'Slab processing added successfully!');
    } catch (error) {
      console.error('Error adding slab processing:', error);
      showToast('error', error instanceof Error ? error.message : 'Failed to add slab processing');
    }
  };

  const handleDeleteSlab = async (id: string) => {
    if (!confirm('Are you sure you want to delete this slab processing record?')) {
      return;
    }

    try {
      const response = await fetch(`/api/slab-processing?id=${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete slab processing');
      }

      await loadData();
      showToast('success', 'Slab processing deleted successfully!');
    } catch (error) {
      console.error('Error deleting slab processing:', error);
      showToast('error', error instanceof Error ? error.message : 'Failed to delete slab processing');
    }
  };

  // Calculate summary statistics
  const summary = {
    totalBlocks: availableBlocks.length,
    processedParts: slabProcessings.length,
    totalSlabs: slabProcessings.reduce((sum, slab) => sum + slab.slabs_count, 0),
    totalSqft: slabProcessings.reduce((sum, slab) => sum + slab.sqft, 0)
  };

  // Get unique consignments for filter
  const uniqueConsignments = Array.from(
    new Set(availableBlocks.map(block => block.granite_consignments.consignment_number))
  );

  // Filter slab processings based on search and filter
  const filteredSlabProcessings = slabProcessings.filter(slab => {
    const matchesSearch = slab.granite_blocks.block_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         slab.part_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterConsignment === 'all' || 
                         availableBlocks.find(block => 
                           block.id === slab.block_id && 
                           block.granite_consignments.consignment_number === filterConsignment
                         );
    
    return matchesSearch && matchesFilter;
  });

  const selectedBlock = availableBlocks.find(block => block.id === newSlab.block_id);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading slab processing data...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Slab Processing</h1>
            <p className="text-gray-600 mt-1">Process raw granite blocks into slabs</p>
          </div>
          <Button 
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Process New Slab
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Available Blocks</p>
                <p className="text-2xl font-bold text-gray-900">{summary.totalBlocks}</p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Processed Parts</p>
                <p className="text-2xl font-bold text-gray-900">{summary.processedParts}</p>
              </div>
              <Scissors className="w-8 h-8 text-green-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Slabs</p>
                <p className="text-2xl font-bold text-gray-900">{summary.totalSlabs}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Sq Ft</p>
                <p className="text-2xl font-bold text-gray-900">{summary.totalSqft.toFixed(1)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-600" />
            </div>
          </Card>
        </div>

        {/* Add New Slab Form */}
        {showAddForm && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Process New Slab</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Block
                </label>
                <select
                  value={newSlab.block_id}
                  onChange={(e) => setNewSlab({ ...newSlab, block_id: e.target.value })}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm p-2"
                >
                  <option value="">Select a block</option>
                  {availableBlocks.map(block => (
                    <option key={block.id} value={block.id}>
                      {block.block_no} - {block.granite_consignments.granite_suppliers.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Part Name
                </label>
                <select
                  value={newSlab.part_name}
                  onChange={(e) => setNewSlab({ ...newSlab, part_name: e.target.value })}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm p-2"
                >
                  <option value="">Select part</option>
                  {partOptions.map(part => (
                    <option key={part} value={part}>Part {part}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Slabs
                </label>
                <Input
                  type="number"
                  min="1"
                  value={newSlab.slabs_count}
                  onChange={(e) => setNewSlab({ ...newSlab, slabs_count: e.target.value })}
                  placeholder="85"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Sq Ft
                </label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={newSlab.sqft}
                  onChange={(e) => setNewSlab({ ...newSlab, sqft: e.target.value })}
                  placeholder="450.5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Thickness (mm)
                </label>
                <Input
                  type="number"
                  min="1"
                  value={newSlab.thickness}
                  onChange={(e) => setNewSlab({ ...newSlab, thickness: e.target.value })}
                  placeholder="20"
                />
              </div>
            </div>

            {/* Block Details */}
            {selectedBlock && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Selected Block Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Block No:</span>
                    <span className="ml-2 font-medium">{selectedBlock.block_no}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Consignment:</span>
                    <span className="ml-2 font-medium">{selectedBlock.granite_consignments.consignment_number}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Supplier:</span>
                    <span className="ml-2 font-medium">{selectedBlock.granite_consignments.granite_suppliers.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Gross Measurement:</span>
                    <span className="ml-2 font-medium">{selectedBlock.gross_measurement}m</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Net Measurement:</span>
                    <span className="ml-2 font-medium">{selectedBlock.net_measurement}m</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <Button onClick={handleAddSlab}>Add Slab Processing</Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {/* Search and Filter */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by block number or part name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="sm:w-64">
              <select
                value={filterConsignment}
                onChange={(e) => setFilterConsignment(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm p-2"
              >
                <option value="all">All Consignments</option>
                {uniqueConsignments.map(consignment => (
                  <option key={consignment} value={consignment}>
                    {consignment}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Slab Processing Table */}
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Slab Processing Records</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Block No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Part
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Slabs Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sq Ft
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thickness
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
                {filteredSlabProcessings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No slab processing records found
                    </td>
                  </tr>
                ) : (
                  filteredSlabProcessings.map((slab) => (
                    <tr key={slab.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {slab.granite_blocks.block_no}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Part {slab.part_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                        {slab.slabs_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                        {slab.sqft.toFixed(1)} sq ft
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                        {slab.thickness}mm
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {slab.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleDeleteSlab(slab.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}