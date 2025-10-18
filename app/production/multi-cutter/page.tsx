'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Plus, Edit3, Trash2, Factory, BarChart3, Layers, TrendingUp, Box, Ruler, AlertCircle, Calendar } from 'lucide-react';
import { formatDisplayDate } from '@/lib/date-utils';

type MaterialType = 
  | 'S/G'
  | 'B/P'
  | 'Burgandy'
  | 'Others';

interface MultiCutterReport {
  id: string;
  date: string;
  machine: 'Machine-1' | 'Machine-2' | 'Machine-3';
  blocks: Array<{
    block_name: string;
    material_type: MaterialType;
    slabs: number;
    sqft: number;
  }>;
  total_slabs: number;
  total_sqft: number;
  created_at: string;
  updated_at: string;
}

// Block detail row for each machine
interface BlockRow {
  id: string; // Temporary ID for React keys
  block_name: string;
  material_type: MaterialType;
  slabs: string;
  sqft: string;
}

interface MachineFormData {
  blockRows: BlockRow[];
}

interface FormData {
  date: string;
  machine1: MachineFormData;
  machine2: MachineFormData;
  machine3: MachineFormData;
}

const fmt = (value: string | number): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? '0' : num.toLocaleString('en-IN');
};

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const fmtCurrency = (n: number) => INR.format(n || 0);

export default function MultiCutterPage() {
  const [reports, setReports] = useState<MultiCutterReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Summary stats
  const [totalSlabs, setTotalSlabs] = useState(0);
  const [totalSqft, setTotalSqft] = useState(0);
  const [machine1Total, setMachine1Total] = useState(0);
  const [machine2Total, setMachine2Total] = useState(0);
  const [machine3Total, setMachine3Total] = useState(0);
  const [todayProduction, setTodayProduction] = useState(0);

  // Form state
  const [formData, setFormData] = useState<FormData>({
    date: new Date().toISOString().split('T')[0],
    machine1: {
      blockRows: [{ id: crypto.randomUUID(), block_name: '', material_type: 'S/G', slabs: '', sqft: '' }]
    },
    machine2: {
      blockRows: [{ id: crypto.randomUUID(), block_name: '', material_type: 'S/G', slabs: '', sqft: '' }]
    },
    machine3: {
      blockRows: [{ id: crypto.randomUUID(), block_name: '', material_type: 'S/G', slabs: '', sqft: '' }]
    }
  });

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    loadReports();
  }, [dateFrom, dateTo]);

  async function loadReports() {
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      
      const response = await fetch(`/api/multi-cutter-reports?${params.toString()}`);
      const data = await response.json();
      setReports(data);
      calculateSummary(data);
    } catch (error) {
      console.error('Failed to load multi-cutter reports:', error);
    } finally {
      setLoading(false);
    }
  }

  function calculateSummary(data: MultiCutterReport[]) {
    const totSlabs = data.reduce((sum, r) => sum + (r.total_slabs || 0), 0);
    const totSqft = data.reduce((sum, r) => sum + (r.total_sqft || 0), 0);
    
    const m1 = data.filter(r => r.machine === 'Machine-1').reduce((sum, r) => sum + (r.total_sqft || 0), 0);
    const m2 = data.filter(r => r.machine === 'Machine-2').reduce((sum, r) => sum + (r.total_sqft || 0), 0);
    const m3 = data.filter(r => r.machine === 'Machine-3').reduce((sum, r) => sum + (r.total_sqft || 0), 0);
    
    const today = new Date().toISOString().split('T')[0];
    const todayProd = data.filter(r => r.date === today).reduce((sum, r) => sum + (r.total_sqft || 0), 0);
    
    setTotalSlabs(totSlabs);
    setTotalSqft(totSqft);
    setMachine1Total(m1);
    setMachine2Total(m2);
    setMachine3Total(m3);
    setTodayProduction(todayProd);
  }

  // Add block row to a specific machine
  function addBlockRow(machine: 'machine1' | 'machine2' | 'machine3') {
    setFormData(prev => ({
      ...prev,
      [machine]: {
        blockRows: [...prev[machine].blockRows, { 
          id: crypto.randomUUID(), 
          block_name: '', 
          material_type: 'S/G', 
          slabs: '', 
          sqft: '' 
        }]
      }
    }));
  }

  // Remove block row from a specific machine
  function removeBlockRow(machine: 'machine1' | 'machine2' | 'machine3', rowId: string) {
    setFormData(prev => ({
      ...prev,
      [machine]: {
        blockRows: prev[machine].blockRows.filter(row => row.id !== rowId)
      }
    }));
  }

  // Update block row data
  function updateBlockRow(machine: 'machine1' | 'machine2' | 'machine3', rowId: string, field: keyof BlockRow, value: any) {
    setFormData(prev => ({
      ...prev,
      [machine]: {
        blockRows: prev[machine].blockRows.map(row =>
          row.id === rowId ? { ...row, [field]: value } : row
        )
      }
    }));
  }

  // Calculate machine total
  function calculateMachineTotal(machine: 'machine1' | 'machine2' | 'machine3'): { slabs: number; sqft: number } {
    const blocks = formData[machine].blockRows;
    const slabs = blocks.reduce((sum, row) => sum + (parseFloat(row.slabs) || 0), 0);
    const sqft = blocks.reduce((sum, row) => sum + (parseFloat(row.sqft) || 0), 0);
    return { slabs, sqft };
  }

  // Submit form - creates reports for all 3 machines
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      const machines: Array<'machine1' | 'machine2' | 'machine3'> = ['machine1', 'machine2', 'machine3'];
      
      for (let i = 0; i < machines.length; i++) {
        const machineKey = machines[i];
        const machineData = formData[machineKey];
        
        // Filter out empty rows
        const validBlocks = machineData.blockRows.filter(row => 
          row.block_name.trim() && row.slabs && row.sqft
        );
        
        if (validBlocks.length === 0) continue; // Skip if no blocks for this machine
        
        const blocks = validBlocks.map(row => ({
          block_name: row.block_name.trim(),
          material_type: row.material_type,
          slabs: parseFloat(row.slabs) || 0,
          sqft: parseFloat(row.sqft) || 0
        }));
        
        const total_slabs = blocks.reduce((sum, b) => sum + b.slabs, 0);
        const total_sqft = blocks.reduce((sum, b) => sum + b.sqft, 0);
        
        const payload = {
          date: formData.date,
          machine: `Machine-${i + 1}`,
          blocks,
          total_slabs,
          total_sqft
        };
        
        const response = await fetch('/api/multi-cutter-reports', {
          method: editingId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingId ? { ...payload, id: editingId } : payload)
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to save report');
        }
      }
      
      // Reset form and reload
      resetForm();
      setShowForm(false);
      setEditingId(null);
      await loadReports();
      
    } catch (error: any) {
      console.error('Error saving multi-cutter report:', error);
      alert(error.message || 'Failed to save report');
    }
  }

  function resetForm() {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      machine1: {
        blockRows: [{ id: crypto.randomUUID(), block_name: '', material_type: 'S/G', slabs: '', sqft: '' }]
      },
      machine2: {
        blockRows: [{ id: crypto.randomUUID(), block_name: '', material_type: 'S/G', slabs: '', sqft: '' }]
      },
      machine3: {
        blockRows: [{ id: crypto.randomUUID(), block_name: '', material_type: 'S/G', slabs: '', sqft: '' }]
      }
    });
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this report?')) return;
    
    try {
      const response = await fetch(`/api/multi-cutter-reports?id=${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete report');
      }
      
      await loadReports();
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('Failed to delete report');
    }
  }

  function handleEdit(report: MultiCutterReport) {
    setEditingId(report.id);
    
    // Populate form with existing data
    const machineNum = report.machine.split('-')[1];
    const machineKey = `machine${machineNum}` as 'machine1' | 'machine2' | 'machine3';
    
    setFormData({
      date: report.date,
      machine1: machineKey === 'machine1' ? {
        blockRows: report.blocks.map(b => ({
          id: crypto.randomUUID(),
          block_name: b.block_name,
          material_type: b.material_type,
          slabs: b.slabs.toString(),
          sqft: b.sqft.toString()
        }))
      } : {
        blockRows: [{ id: crypto.randomUUID(), block_name: '', material_type: 'S/G', slabs: '', sqft: '' }]
      },
      machine2: machineKey === 'machine2' ? {
        blockRows: report.blocks.map(b => ({
          id: crypto.randomUUID(),
          block_name: b.block_name,
          material_type: b.material_type,
          slabs: b.slabs.toString(),
          sqft: b.sqft.toString()
        }))
      } : {
        blockRows: [{ id: crypto.randomUUID(), block_name: '', material_type: 'S/G', slabs: '', sqft: '' }]
      },
      machine3: machineKey === 'machine3' ? {
        blockRows: report.blocks.map(b => ({
          id: crypto.randomUUID(),
          block_name: b.block_name,
          material_type: b.material_type,
          slabs: b.slabs.toString(),
          sqft: b.sqft.toString()
        }))
      } : {
        blockRows: [{ id: crypto.randomUUID(), block_name: '', material_type: 'S/G', slabs: '', sqft: '' }]
      }
    });
    
    setShowForm(true);
  }

  // Calculate grand totals
  const grandTotalSlabs = calculateMachineTotal('machine1').slabs + 
                          calculateMachineTotal('machine2').slabs + 
                          calculateMachineTotal('machine3').slabs;
  const grandTotalSqft = calculateMachineTotal('machine1').sqft + 
                         calculateMachineTotal('machine2').sqft + 
                         calculateMachineTotal('machine3').sqft;

  // Group reports by date
  const reportsByDate = reports.reduce((acc, report) => {
    if (!acc[report.date]) {
      acc[report.date] = [];
    }
    acc[report.date].push(report);
    return acc;
  }, {} as Record<string, MultiCutterReport[]>);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading multi-cutter reports...</div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen w-full bg-gray-50 p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Multi Cutter Production Data</h1>
            <p className="text-gray-600 mt-1">Track daily granite block cutting from 3 machines</p>
          </div>
          <Button 
            onClick={() => {
              resetForm();
              setEditingId(null);
              setShowForm(true);
            }}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Multi Cutter Report
          </Button>
        </div>

        {/* Summary Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Production</p>
                <p className="text-2xl font-bold text-gray-900">{fmt(totalSlabs)}</p>
                <p className="text-xs text-gray-500 mt-1">Slabs Cut</p>
              </div>
              <Layers className="w-8 h-8 text-purple-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Area</p>
                <p className="text-2xl font-bold text-gray-900">{fmt(totalSqft)}</p>
                <p className="text-xs text-gray-500 mt-1">Sq. Ft. Produced</p>
              </div>
              <BarChart3 className="w-8 h-8 text-orange-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today's Production</p>
                <p className="text-2xl font-bold text-gray-900">{fmt(todayProduction)}</p>
                <p className="text-xs text-gray-500 mt-1">Sq. Ft. Today</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Machines</p>
                <p className="text-2xl font-bold text-gray-900">3</p>
                <p className="text-xs text-gray-500 mt-1">Multi Cutters</p>
              </div>
              <Factory className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
        </div>

        {/* Machine Performance Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">Machine-1 Production</p>
                <p className="text-2xl font-bold text-blue-900">{fmt(machine1Total)}</p>
                <p className="text-xs text-blue-600 mt-1">Sq. Ft. Produced</p>
              </div>
              <Factory className="w-8 h-8 text-blue-600" />
            </div>
          </Card>

          <Card className="p-4 bg-green-50 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Machine-2 Production</p>
                <p className="text-2xl font-bold text-green-900">{fmt(machine2Total)}</p>
                <p className="text-xs text-green-600 mt-1">Sq. Ft. Produced</p>
              </div>
              <Factory className="w-8 h-8 text-green-600" />
            </div>
          </Card>

          <Card className="p-4 bg-purple-50 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 font-medium">Machine-3 Production</p>
                <p className="text-2xl font-bold text-purple-900">{fmt(machine3Total)}</p>
                <p className="text-xs text-purple-600 mt-1">Sq. Ft. Produced</p>
              </div>
              <Factory className="w-8 h-8 text-purple-600" />
            </div>
          </Card>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <Card className="p-6">
            <div className="bg-indigo-50 p-4 rounded-lg mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editingId ? 'Edit Multi Cutter Report' : 'Add Multi Cutter Report'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Date */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </div>
              </div>

              {/* Machine 1 */}
              <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-blue-900 flex items-center">
                    <Factory className="w-5 h-5 mr-2" />
                    Machine-1 Blocks
                  </h3>
                  <Button 
                    type="button"
                    onClick={() => addBlockRow('machine1')}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Block
                  </Button>
                </div>

                <div className="space-y-3">
                  {formData.machine1.blockRows.map((row, index) => (
                    <div key={row.id} className="grid grid-cols-12 gap-2 items-end bg-white p-3 rounded border border-blue-200">
                      <div className="col-span-4">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Block Name (e.g., AVG-16B)</label>
                        <Input
                          placeholder="AVG-16B"
                          value={row.block_name}
                          onChange={(e) => updateBlockRow('machine1', row.id, 'block_name', e.target.value)}
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Material Type</label>
                        <select
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={row.material_type}
                          onChange={(e) => updateBlockRow('machine1', row.id, 'material_type', e.target.value as MaterialType)}
                        >
                          <option value="S/G">S/G</option>
                          <option value="B/P">B/P</option>
                          <option value="Burgandy">Burgandy</option>
                          <option value="Others">Others</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Slabs</label>
                        <Input
                          type="number"
                          placeholder="26"
                          value={row.slabs}
                          onChange={(e) => updateBlockRow('machine1', row.id, 'slabs', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Sq. Ft.</label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="721"
                          value={row.sqft}
                          onChange={(e) => updateBlockRow('machine1', row.id, 'sqft', e.target.value)}
                        />
                      </div>
                      <div className="col-span-1 flex items-end">
                        {formData.machine1.blockRows.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => removeBlockRow('machine1', row.id)}
                            className="text-red-600 hover:bg-red-50 w-full"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <p className="text-sm font-bold text-blue-900">
                      Machine-1 Total: {calculateMachineTotal('machine1').slabs} Slabs | {fmt(calculateMachineTotal('machine1').sqft)} Sq. Ft.
                    </p>
                  </div>
                </div>
              </div>

              {/* Machine 2 */}
              <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-green-900 flex items-center">
                    <Factory className="w-5 h-5 mr-2" />
                    Machine-2 Blocks
                  </h3>
                  <Button 
                    type="button"
                    onClick={() => addBlockRow('machine2')}
                    className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Block
                  </Button>
                </div>

                <div className="space-y-3">
                  {formData.machine2.blockRows.map((row, index) => (
                    <div key={row.id} className="grid grid-cols-12 gap-2 items-end bg-white p-3 rounded border border-green-200">
                      <div className="col-span-4">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Block Name (e.g., AVG-17C)</label>
                        <Input
                          placeholder="AVG-17C"
                          value={row.block_name}
                          onChange={(e) => updateBlockRow('machine2', row.id, 'block_name', e.target.value)}
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Material Type</label>
                        <select
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                          value={row.material_type}
                          onChange={(e) => updateBlockRow('machine2', row.id, 'material_type', e.target.value as MaterialType)}
                        >
                          <option value="S/G">S/G</option>
                          <option value="B/P">B/P</option>
                          <option value="Burgandy">Burgandy</option>
                          <option value="Others">Others</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Slabs</label>
                        <Input
                          type="number"
                          placeholder="31"
                          value={row.slabs}
                          onChange={(e) => updateBlockRow('machine2', row.id, 'slabs', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Sq. Ft.</label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="767"
                          value={row.sqft}
                          onChange={(e) => updateBlockRow('machine2', row.id, 'sqft', e.target.value)}
                        />
                      </div>
                      <div className="col-span-1 flex items-end">
                        {formData.machine2.blockRows.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => removeBlockRow('machine2', row.id)}
                            className="text-red-600 hover:bg-red-50 w-full"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="bg-green-100 p-3 rounded-lg">
                    <p className="text-sm font-bold text-green-900">
                      Machine-2 Total: {calculateMachineTotal('machine2').slabs} Slabs | {fmt(calculateMachineTotal('machine2').sqft)} Sq. Ft.
                    </p>
                  </div>
                </div>
              </div>

              {/* Machine 3 */}
              <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-purple-900 flex items-center">
                    <Factory className="w-5 h-5 mr-2" />
                    Machine-3 Blocks
                  </h3>
                  <Button 
                    type="button"
                    onClick={() => addBlockRow('machine3')}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-3 py-1"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Block
                  </Button>
                </div>

                <div className="space-y-3">
                  {formData.machine3.blockRows.map((row, index) => (
                    <div key={row.id} className="grid grid-cols-12 gap-2 items-end bg-white p-3 rounded border border-purple-200">
                      <div className="col-span-4">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Block Name (e.g., AVG-16A)</label>
                        <Input
                          placeholder="AVG-16A"
                          value={row.block_name}
                          onChange={(e) => updateBlockRow('machine3', row.id, 'block_name', e.target.value)}
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Material Type</label>
                        <select
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          value={row.material_type}
                          onChange={(e) => updateBlockRow('machine3', row.id, 'material_type', e.target.value as MaterialType)}
                        >
                          <option value="S/G">S/G</option>
                          <option value="B/P">B/P</option>
                          <option value="Burgandy">Burgandy</option>
                          <option value="Others">Others</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Slabs</label>
                        <Input
                          type="number"
                          placeholder="28"
                          value={row.slabs}
                          onChange={(e) => updateBlockRow('machine3', row.id, 'slabs', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Sq. Ft.</label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="777"
                          value={row.sqft}
                          onChange={(e) => updateBlockRow('machine3', row.id, 'sqft', e.target.value)}
                        />
                      </div>
                      <div className="col-span-1 flex items-end">
                        {formData.machine3.blockRows.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => removeBlockRow('machine3', row.id)}
                            className="text-red-600 hover:bg-red-50 w-full"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <p className="text-sm font-bold text-purple-900">
                      Machine-3 Total: {calculateMachineTotal('machine3').slabs} Slabs | {fmt(calculateMachineTotal('machine3').sqft)} Sq. Ft.
                    </p>
                  </div>
                </div>
              </div>

              {/* Grand Total */}
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 rounded-lg text-white">
                <h3 className="text-lg font-bold mb-2">Total Production (All Machines)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm opacity-90">Total Slabs</p>
                    <p className="text-3xl font-bold">{grandTotalSlabs}</p>
                  </div>
                  <div>
                    <p className="text-sm opacity-90">Total Sq. Ft.</p>
                    <p className="text-3xl font-bold">{fmt(grandTotalSqft)}</p>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4">
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6">
                  {editingId ? 'Update Report' : 'Save Report'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <Button 
              variant="outline" 
              onClick={() => {
                setDateFrom("");
                setDateTo("");
              }}
            >
              Clear Filters
            </Button>
          </div>
        </Card>

        {/* Reports Table - Grouped by Date */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-blue-600" />
            Production Records
          </h2>
          
          {Object.keys(reportsByDate).length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No production records found</p>
              <p className="text-sm text-gray-400 mt-1">Start by adding a new multi-cutter report</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.keys(reportsByDate).sort((a, b) => b.localeCompare(a)).map(date => {
                const dayReports = reportsByDate[date];
                const dayTotal = dayReports.reduce((sum, r) => sum + (r.total_sqft || 0), 0);
                
                return (
                  <div key={date} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Date Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-lg font-bold">{formatDisplayDate(date)}</h3>
                          <p className="text-sm opacity-90">Total Day Production: {fmt(dayTotal)} Sq. Ft.</p>
                        </div>
                        <Box className="w-8 h-8 opacity-75" />
                      </div>
                    </div>

                    {/* Machines */}
                    <div className="p-4 space-y-4">
                      {dayReports.map(report => (
                        <div key={report.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center">
                              <Factory className="w-5 h-5 text-blue-600 mr-2" />
                              <h4 className="font-bold text-gray-900">{report.machine}</h4>
                              <span className="ml-3 text-sm text-gray-600">
                                Total: {report.total_slabs} Slabs | {fmt(report.total_sqft)} Sq. Ft.
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(report)}
                                className="text-blue-600 hover:bg-blue-50"
                              >
                                <Edit3 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(report.id)}
                                className="text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Blocks Table */}
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                              <thead>
                                <tr className="border-b border-gray-300 bg-gray-100">
                                  <th className="text-left py-2 px-3 font-semibold text-gray-700">Block Name</th>
                                  <th className="text-left py-2 px-3 font-semibold text-gray-700">Material</th>
                                  <th className="text-right py-2 px-3 font-semibold text-gray-700">Slabs</th>
                                  <th className="text-right py-2 px-3 font-semibold text-gray-700">Sq. Ft.</th>
                                </tr>
                              </thead>
                              <tbody>
                                {report.blocks.map((block, idx) => (
                                  <tr key={idx} className="border-b border-gray-200 hover:bg-white">
                                    <td className="py-2 px-3 font-medium text-gray-900">{block.block_name}</td>
                                    <td className="py-2 px-3 text-gray-700">{block.material_type}</td>
                                    <td className="py-2 px-3 text-right font-semibold text-gray-900">{block.slabs}</td>
                                    <td className="py-2 px-3 text-right font-semibold text-gray-900">{fmt(block.sqft)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
