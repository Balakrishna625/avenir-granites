'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppLayout } from '@/components/AppLayout';
import Link from 'next/link';
import { ArrowLeft, Plus, Search, Scissors, Package } from 'lucide-react';

interface GraniteBlock {
  id: string;
  consignment_id: string;
  block_no: string;
  grade: string;
  gross_measurement: number;
  net_measurement: number;
  elavance: number;
  total_sqft: number;
  total_slabs: number;
  status: string;
  consignment_number: string;
  supplier_name: string;
}

interface BlockPart {
  id?: string;
  block_id: string;
  part_name: 'A' | 'B' | 'C';
  slabs_count: number;
  sqft: number;
  thickness: number;
  is_available: boolean;
}

interface SlabManufacturingEntry {
  block_id: string;
  block_no: string;
  consignment_number: string;
  supplier_name: string;
  parts: BlockPart[];
}

export default function SlabManufacturingPage() {
  const [blocks, setBlocks] = useState<GraniteBlock[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<GraniteBlock | null>(null);
  const [currentEntry, setCurrentEntry] = useState<SlabManufacturingEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch available blocks
  useEffect(() => {
    fetchBlocks();
  }, []);

  const fetchBlocks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/granite-blocks');
      if (response.ok) {
        const data = await response.json();
        setBlocks(data.filter((block: GraniteBlock) => block.status === 'RAW' || block.status === 'CUTTING'));
      }
    } catch (error) {
      console.error('Error fetching blocks:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectBlock = async (block: GraniteBlock) => {
    setSelectedBlock(block);
    
    // Check if this block already has parts recorded
    try {
      const response = await fetch(`/api/granite-block-parts?block_id=${block.id}`);
      if (response.ok) {
        const existingParts = await response.json();
        setCurrentEntry({
          block_id: block.id,
          block_no: block.block_no,
          consignment_number: block.consignment_number,
          supplier_name: block.supplier_name,
          parts: existingParts.length > 0 ? existingParts : [
            { block_id: block.id, part_name: 'A', slabs_count: 0, sqft: 0, thickness: 20, is_available: true },
            { block_id: block.id, part_name: 'B', slabs_count: 0, sqft: 0, thickness: 20, is_available: true },
            { block_id: block.id, part_name: 'C', slabs_count: 0, sqft: 0, thickness: 20, is_available: true }
          ]
        });
      }
    } catch (error) {
      console.error('Error fetching block parts:', error);
      // Initialize with empty parts if error
      setCurrentEntry({
        block_id: block.id,
        block_no: block.block_no,
        consignment_number: block.consignment_number,
        supplier_name: block.supplier_name,
        parts: [
          { block_id: block.id, part_name: 'A', slabs_count: 0, sqft: 0, thickness: 20, is_available: true },
          { block_id: block.id, part_name: 'B', slabs_count: 0, sqft: 0, thickness: 20, is_available: true },
          { block_id: block.id, part_name: 'C', slabs_count: 0, sqft: 0, thickness: 20, is_available: true }
        ]
      });
    }
  };

  const updatePartValue = (partIndex: number, field: keyof BlockPart, value: any) => {
    if (!currentEntry) return;
    
    const updatedParts = [...currentEntry.parts];
    updatedParts[partIndex] = { ...updatedParts[partIndex], [field]: value };
    
    setCurrentEntry({ ...currentEntry, parts: updatedParts });
  };

  const saveSlabData = async () => {
    if (!currentEntry) return;

    try {
      setLoading(true);
      
      // Save each part
      for (const part of currentEntry.parts) {
        if (part.slabs_count > 0 || part.sqft > 0) {
          const method = part.id ? 'PUT' : 'POST';
          const url = part.id ? `/api/granite-block-parts/${part.id}` : '/api/granite-block-parts';
          
          await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(part)
          });
        }
      }

      // Update block status to CUT
      await fetch(`/api/granite-blocks/${currentEntry.block_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CUT' })
      });

      alert('Slab data saved successfully!');
      setCurrentEntry(null);
      setSelectedBlock(null);
      fetchBlocks(); // Refresh the blocks list
      
    } catch (error) {
      console.error('Error saving slab data:', error);
      alert('Error saving slab data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredBlocks = blocks.filter(block => 
    block.block_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    block.consignment_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    block.supplier_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTotalSlabs = () => currentEntry?.parts.reduce((sum, part) => sum + part.slabs_count, 0) || 0;
  const getTotalSqft = () => currentEntry?.parts.reduce((sum, part) => sum + part.sqft, 0) || 0;

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
              <Scissors className="inline w-8 h-8 mr-3 text-blue-600" />
              Slab Manufacturing
            </h1>
            <p className="text-gray-600">Record block cutting into slabs and track production</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Available Blocks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="w-5 h-5" />
                <span>Available Blocks</span>
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search blocks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredBlocks.map((block) => (
                  <div
                    key={block.id}
                    onClick={() => selectBlock(block)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedBlock?.id === block.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-gray-900">{block.block_no}</h4>
                        <p className="text-sm text-gray-600">{block.consignment_number}</p>
                        <p className="text-xs text-gray-500">{block.supplier_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{block.net_measurement.toFixed(3)} m³</p>
                        <p className="text-xs text-gray-500">{block.grade}</p>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                          block.status === 'RAW' ? 'bg-yellow-100 text-yellow-800' :
                          block.status === 'CUTTING' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {block.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredBlocks.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    {loading ? 'Loading blocks...' : 'No blocks available for cutting'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Slab Manufacturing Form */}
          {currentEntry && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Record Slab Production</span>
                  <Button 
                    onClick={saveSlabData} 
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {loading ? 'Saving...' : 'Save Slab Data'}
                  </Button>
                </CardTitle>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p><strong>Block:</strong> {currentEntry.block_no}</p>
                  <p><strong>Consignment:</strong> {currentEntry.consignment_number}</p>
                  <p><strong>Supplier:</strong> {currentEntry.supplier_name}</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Parts Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Part</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Slabs Count</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Total Sq.Ft</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Thickness (mm)</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Available</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {currentEntry.parts.map((part, index) => (
                        <tr key={part.part_name}>
                          <td className="px-4 py-3 font-medium text-gray-900">
                            Part {part.part_name}
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              value={part.slabs_count}
                              onChange={(e) => updatePartValue(index, 'slabs_count', parseInt(e.target.value) || 0)}
                              className="w-20 text-center"
                              min="0"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              value={part.sqft}
                              onChange={(e) => updatePartValue(index, 'sqft', parseFloat(e.target.value) || 0)}
                              className="w-24 text-center"
                              step="0.01"
                              min="0"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              value={part.thickness}
                              onChange={(e) => updatePartValue(index, 'thickness', parseInt(e.target.value) || 20)}
                              className="w-20 text-center"
                              min="10"
                              max="50"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={part.is_available}
                              onChange={(e) => updatePartValue(index, 'is_available', e.target.checked)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-blue-700 font-medium">Total Slabs:</span>
                      <span className="ml-2 text-blue-900 font-bold">{getTotalSlabs()}</span>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">Total Sq.Ft:</span>
                      <span className="ml-2 text-blue-900 font-bold">{getTotalSqft().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!currentEntry && (
            <Card>
              <CardContent className="flex items-center justify-center h-96">
                <div className="text-center text-gray-500">
                  <Scissors className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">Select a block to start recording slab production</p>
                  <p className="text-sm">Choose from the available blocks on the left</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}