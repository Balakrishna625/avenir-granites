'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppLayout } from '@/components/AppLayout';
import Link from 'next/link';
import { ArrowLeft, Plus, Search, Scissors, Package, Save } from 'lucide-react';

interface GraniteConsignment {
  id: string;
  consignment_number: string;
  supplier_name: string;
  arrival_date: string;
  total_blocks: number;
}

interface GraniteBlock {
  id: string;
  consignment_id: string;
  block_no: string;
  grade: string;
  net_measurement: number;
  status: string;
}

interface SlabEntry {
  consignment_id: string;
  block_id: string;
  part_name: 'A' | 'B' | 'C' | 'C+D';
  slabs_count: number;
  sqft: number;
  thickness: number;
}

interface FormData {
  consignment_id: string;
  block_id: string;
  parts: SlabEntry[];
}

export default function SlabManufacturingPage() {
  const [consignments, setConsignments] = useState<GraniteConsignment[]>([]);
  const [blocks, setBlocks] = useState<GraniteBlock[]>([]);
  const [selectedConsignment, setSelectedConsignment] = useState<GraniteConsignment | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<GraniteBlock | null>(null);
  const [formData, setFormData] = useState<FormData>({
    consignment_id: '',
    block_id: '',
    parts: [
      { consignment_id: '', block_id: '', part_name: 'A', slabs_count: 0, sqft: 0, thickness: 20 },
      { consignment_id: '', block_id: '', part_name: 'B', slabs_count: 0, sqft: 0, thickness: 20 },
      { consignment_id: '', block_id: '', part_name: 'C', slabs_count: 0, sqft: 0, thickness: 20 }
    ]
  });
  const [loading, setLoading] = useState(false);

  // Fetch consignments on load
  useEffect(() => {
    fetchConsignments();
  }, []);

  // Fetch blocks when consignment is selected
  useEffect(() => {
    if (selectedConsignment) {
      fetchBlocksForConsignment(selectedConsignment.id);
    }
  }, [selectedConsignment]);

  const fetchConsignments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/granite-consignments');
      if (response.ok) {
        const data = await response.json();
        setConsignments(data);
      }
    } catch (error) {
      console.error('Error fetching consignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBlocksForConsignment = async (consignmentId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/granite-blocks?consignment_id=${consignmentId}`);
      if (response.ok) {
        const data = await response.json();
        // Only show blocks that are RAW or CUTTING status
        setBlocks(data.filter((block: GraniteBlock) => ['RAW', 'CUTTING'].includes(block.status)));
      }
    } catch (error) {
      console.error('Error fetching blocks:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectConsignment = (consignment: GraniteConsignment) => {
    setSelectedConsignment(consignment);
    setSelectedBlock(null);
    setFormData({
      consignment_id: consignment.id,
      block_id: '',
      parts: [
        { consignment_id: consignment.id, block_id: '', part_name: 'A', slabs_count: 0, sqft: 0, thickness: 20 },
        { consignment_id: consignment.id, block_id: '', part_name: 'B', slabs_count: 0, sqft: 0, thickness: 20 },
        { consignment_id: consignment.id, block_id: '', part_name: 'C', slabs_count: 0, sqft: 0, thickness: 20 }
      ]
    });
  };

  const selectBlock = (block: GraniteBlock) => {
    setSelectedBlock(block);
    setFormData(prev => ({
      ...prev,
      block_id: block.id,
      parts: prev.parts.map(part => ({
        ...part,
        block_id: block.id
      }))
    }));
  };

  const updatePart = (partIndex: number, field: keyof SlabEntry, value: any) => {
    setFormData(prev => ({
      ...prev,
      parts: prev.parts.map((part, index) => 
        index === partIndex ? { ...part, [field]: value } : part
      )
    }));
  };

  const saveSlabData = async () => {
    if (!selectedConsignment || !selectedBlock) {
      alert('Please select consignment and block');
      return;
    }

    const hasData = formData.parts.some(part => part.slabs_count > 0 || part.sqft > 0);
    if (!hasData) {
      alert('Please enter slab data for at least one part');
      return;
    }

    try {
      setLoading(true);
      
      // Save each part that has data
      for (const part of formData.parts) {
        if (part.slabs_count > 0 || part.sqft > 0) {
          const response = await fetch('/api/granite-block-parts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              block_id: part.block_id,
              part_name: part.part_name,
              slabs_count: part.slabs_count,
              sqft: part.sqft,
              thickness: part.thickness,
              is_available: true
            })
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to save part data');
          }
        }
      }

      // Update block status to CUT
      await fetch(`/api/granite-blocks/${selectedBlock.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CUT' })
      });

      alert('Slab data saved successfully!');
      
      // Reset form
      setSelectedBlock(null);
      setFormData({
        consignment_id: selectedConsignment.id,
        block_id: '',
        parts: [
          { consignment_id: selectedConsignment.id, block_id: '', part_name: 'A', slabs_count: 0, sqft: 0, thickness: 20 },
          { consignment_id: selectedConsignment.id, block_id: '', part_name: 'B', slabs_count: 0, sqft: 0, thickness: 20 },
          { consignment_id: selectedConsignment.id, block_id: '', part_name: 'C', slabs_count: 0, sqft: 0, thickness: 20 }
        ]
      });

      // Refresh blocks list
      fetchBlocksForConsignment(selectedConsignment.id);
      
    } catch (error) {
      console.error('Error saving slab data:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getTotalSlabs = () => formData.parts.reduce((sum, part) => sum + (part.slabs_count || 0), 0);
  const getTotalSqft = () => formData.parts.reduce((sum, part) => sum + (part.sqft || 0), 0);

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
              <Link href="/granite/production-entry">
                <Button variant="secondary" size="sm" className="ml-2">
                  Quick Production Entry
                </Button>
              </Link>
              <Link href="/granite/production-table">
                <Button variant="outline" size="sm" className="ml-2">Table View</Button>
              </Link>
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">
              <Scissors className="inline w-8 h-8 mr-3 text-blue-600" />
              Slab Manufacturing
            </h1>
            <p className="text-gray-600">Record block cutting into slabs with parts A, B, C tracking</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Step 1: Select Consignment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
                <span>Select Consignment</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {consignments.map((consignment) => (
                  <div
                    key={consignment.id}
                    onClick={() => selectConsignment(consignment)}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedConsignment?.id === consignment.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <h4 className="font-semibold text-gray-900">{consignment.consignment_number}</h4>
                    <p className="text-sm text-gray-600">{consignment.supplier_name}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(consignment.arrival_date).toLocaleDateString()} • {consignment.total_blocks} blocks
                    </p>
                  </div>
                ))}
                {consignments.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    {loading ? 'Loading consignments...' : 'No consignments found'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Select Block */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span className={`rounded-full w-6 h-6 flex items-center justify-center text-sm ${
                  selectedConsignment ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'
                }`}>2</span>
                <span>Select Block</span>
              </CardTitle>
              {selectedConsignment && (
                <div className="text-sm text-gray-600">
                  From: {selectedConsignment.consignment_number}
                </div>
              )}
            </CardHeader>
            <CardContent>
              {!selectedConsignment ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>Select a consignment first</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {blocks.map((block) => (
                    <div
                      key={block.id}
                      onClick={() => selectBlock(block)}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedBlock?.id === block.id 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-900">{block.block_no}</h4>
                          <p className="text-sm text-gray-600">Grade: {block.grade}</p>
                          <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                            block.status === 'RAW' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {block.status}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{block.net_measurement.toFixed(3)} m³</p>
                          <p className="text-xs text-gray-500">Net measurement</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {blocks.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      {loading ? 'Loading blocks...' : 'No available blocks for cutting'}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 3: Record Slab Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className={`rounded-full w-6 h-6 flex items-center justify-center text-sm ${
                    selectedBlock ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
                  }`}>3</span>
                  <span>Record Slabs</span>
                </div>
                {selectedBlock && (
                  <Button 
                    onClick={saveSlabData} 
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700"
                    size="sm"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? 'Saving...' : 'Save'}
                  </Button>
                )}
              </CardTitle>
              {selectedBlock && (
                <div className="bg-green-50 p-3 rounded-lg text-sm">
                  <p><strong>Block:</strong> {selectedBlock.block_no}</p>
                  <p><strong>Consignment:</strong> {selectedConsignment?.consignment_number}</p>
                  <p><strong>Net Volume:</strong> {selectedBlock.net_measurement.toFixed(3)} m³</p>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {!selectedBlock ? (
                <div className="text-center py-8 text-gray-500">
                  <Scissors className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>Select a block to record slabs</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Parts Table */}
                  <div className="space-y-4">
                    {formData.parts.map((part, index) => (
                      <div key={part.part_name} className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-3">
                          Part {part.part_name}
                        </h4>
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Number of Slabs</label>
                            <Input
                              type="number"
                              value={part.slabs_count}
                              onChange={(e) => updatePart(index, 'slabs_count', parseInt(e.target.value) || 0)}
                              placeholder="0"
                              min="0"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Total Sq.Ft</label>
                            <Input
                              type="number"
                              value={part.sqft}
                              onChange={(e) => updatePart(index, 'sqft', parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              step="0.01"
                              min="0"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Thickness (mm)</label>
                            <Input
                              type="number"
                              value={part.thickness}
                              onChange={(e) => updatePart(index, 'thickness', parseInt(e.target.value) || 20)}
                              placeholder="20"
                              min="10"
                              max="50"
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">Production Summary</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-blue-700">Total Slabs:</p>
                        <p className="font-bold text-lg">{getTotalSlabs()}</p>
                      </div>
                      <div>
                        <p className="text-blue-700">Total Sq.Ft:</p>
                        <p className="font-bold text-lg">{getTotalSqft().toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}