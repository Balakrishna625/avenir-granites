'use client';

import { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Plus, Edit3, Trash2, Factory, BarChart3, Layers, TrendingUp, Box, Ruler, AlertCircle, Calendar } from 'lucide-react';
import { formatDisplayDate } from '@/lib/date-utils';
import { useTableSort } from '@/hooks/useTableSort';
import { SortButton } from '@/components/ui/SortButton';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import { UnsavedChangesIndicator } from '@/components/ui/UnsavedChangesIndicator';
import { useSessionMonthYear } from '@/hooks/useSessionMonth';

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
    notes?: string;
  }>;
  total_slabs: number;
  total_sqft: number;
  created_at: string;
  updated_at: string;
}

// Flattened data for sorting
interface FlattenedReport {
  id: string;
  date: string;
  machine: 'Machine-1' | 'Machine-2' | 'Machine-3';
  block_name: string;
  material_type: MaterialType;
  slabs: number;
  sqft: number;
  notes?: string;
  reportId: string;
  fullReport: MultiCutterReport;
}

// Block detail row for each machine
interface BlockRow {
  id: string; // Temporary ID for React keys
  block_name: string;
  material_type: MaterialType;
  slabs: string;
  sqft: string;
  notes: string;
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
  console.log('MultiCutterPage component mounted'); // Debug log
  
  const [reports, setReports] = useState<MultiCutterReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedMachineTab, setSelectedMachineTab] = useState<'Machine-1' | 'Machine-2' | 'Machine-3' | 'All'>('Machine-1');
  
  // Month selector state - persists in session, resets to current month on new session
  const { selectedMonth, selectedYear, setSelectedMonth, setSelectedYear } = useSessionMonthYear('multi-cutter')
  
  // Summary stats
  const [totalSlabs, setTotalSlabs] = useState(0);
  const [totalSqft, setTotalSqft] = useState(0);
  const [machine1Total, setMachine1Total] = useState(0);
  const [machine2Total, setMachine2Total] = useState(0);
  const [machine3Total, setMachine3Total] = useState(0);
  const [yesterdayProduction, setYesterdayProduction] = useState(0);

  // Create initial form state once using useMemo to prevent regenerating UUIDs on every render
  const initialFormState: FormData = useMemo(() => ({
    date: new Date().toISOString().split('T')[0],
    machine1: {
      blockRows: [{ id: crypto.randomUUID(), block_name: 'AVG-', material_type: 'S/G', slabs: '', sqft: '', notes: '' }]
    },
    machine2: {
      blockRows: [{ id: crypto.randomUUID(), block_name: 'AVG-', material_type: 'S/G', slabs: '', sqft: '', notes: '' }]
    },
    machine3: {
      blockRows: [{ id: crypto.randomUUID(), block_name: 'AVG-', material_type: 'S/G', slabs: '', sqft: '', notes: '' }]
    }
  }), []); // Empty dependency array - only create once

  // Form state
  const [formData, setFormData] = useState<FormData>(initialFormState);
  const [initialFormData, setInitialFormData] = useState<FormData>(initialFormState);

  // Track if form has unsaved changes (only when form is shown)
  const hasUnsavedChanges = showForm && JSON.stringify(formData) !== JSON.stringify(initialFormData);
  
  // Warn before navigating away with unsaved changes
  const { allowNavigation } = useUnsavedChangesWarning(hasUnsavedChanges);

  // Removed old date filter states - using month selector instead
  
  // Month navigation functions
  const goToPreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const getMonthName = (month: number) => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    return monthNames[month - 1];
  };

  // Flatten data for sorting (Single Machine View)
  const flattenedReports = useMemo<FlattenedReport[]>(() => {
    if (selectedMachineTab === 'All') return [];
    
    // Filter by selected machine (month filtering happens in API)
    const filteredReports = reports.filter(report => report.machine === selectedMachineTab);
    
    return filteredReports.flatMap(report => 
      report.blocks.map<FlattenedReport>(block => ({
        id: report.id,
        date: report.date,
        machine: report.machine,
        block_name: block.block_name,
        material_type: block.material_type,
        slabs: block.slabs,
        sqft: block.sqft,
        notes: block.notes,
        reportId: report.id,
        fullReport: report // Keep reference for edit/delete
      }))
    );
  }, [selectedMachineTab, reports]);

  const { sortedData: sortedReports, sortConfig, requestSort } = useTableSort<FlattenedReport>(flattenedReports);

  useEffect(() => {
    console.log('useEffect triggered - loading reports');
    loadReports();
  }, [selectedMonth, selectedYear]);

  async function loadReports() {
    console.log('loadReports() called with month/year:', { selectedMonth, selectedYear });
    setLoading(true);
    
    try {
      const params = new URLSearchParams();
      params.set('month', selectedMonth.toString());
      params.set('year', selectedYear.toString());
      
      const url = `/api/multi-cutter-reports?${params.toString()}`;
      console.log('Fetching from URL:', url);
      
      const response = await fetch(url);
      console.log('Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ API Response - Total reports:', data?.length || 0);
      console.log('📊 Full data received:', data);
      
      if (!Array.isArray(data)) {
        console.error('❌ Data is not an array:', data);
        setReports([]);
        calculateSummary([]);
        return;
      }
      
      setReports(data);
      calculateSummary(data);
    } catch (error) {
      console.error('❌ Failed to load multi-cutter reports:', error);
      setReports([]);
      calculateSummary([]);
    } finally {
      setLoading(false);
    }
  }

  function calculateSummary(data: MultiCutterReport[]) {
    console.log('🧮 calculateSummary() called with', data.length, 'reports');
    
    if (!Array.isArray(data) || data.length === 0) {
      console.log('⚠️ No data to calculate summary');
      setTotalSlabs(0);
      setTotalSqft(0);
      setMachine1Total(0);
      setMachine2Total(0);
      setMachine3Total(0);
      setYesterdayProduction(0);
      return;
    }
    
    // Log each report for debugging
    data.forEach((r, index) => {
      console.log(`Report ${index + 1}:`, {
        id: r.id,
        date: r.date,
        machine: r.machine,
        total_slabs: r.total_slabs,
        total_sqft: r.total_sqft,
        blocks_count: r.blocks?.length || 0
      });
    });
    
    const totSlabs = data.reduce((sum, r) => sum + (Number(r.total_slabs) || 0), 0);
    const totSqft = data.reduce((sum, r) => sum + (Number(r.total_sqft) || 0), 0);
    
    const m1 = data.filter(r => r.machine === 'Machine-1').reduce((sum, r) => sum + (Number(r.total_sqft) || 0), 0);
    const m2 = data.filter(r => r.machine === 'Machine-2').reduce((sum, r) => sum + (Number(r.total_sqft) || 0), 0);
    const m3 = data.filter(r => r.machine === 'Machine-3').reduce((sum, r) => sum + (Number(r.total_sqft) || 0), 0);
    
    // Calculate yesterday's production
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = yesterday.toISOString().split('T')[0];
    const yesterdayProd = data.filter(r => r.date === yesterdayDate).reduce((sum, r) => sum + (Number(r.total_sqft) || 0), 0);
    
    console.log('✅ Summary calculated:', {
      totalSlabs: totSlabs,
      totalSqft: totSqft,
      machine1: m1,
      machine2: m2,
      machine3: m3,
      yesterdayProduction: yesterdayProd,
      yesterdayDate: yesterdayDate
    });
    
    setTotalSlabs(totSlabs);
    setTotalSqft(totSqft);
    setMachine1Total(m1);
    setMachine2Total(m2);
    setMachine3Total(m3);
    setYesterdayProduction(yesterdayProd);
  }

  // Add block row to a specific machine
  function addBlockRow(machine: 'machine1' | 'machine2' | 'machine3') {
    setFormData(prev => ({
      ...prev,
      [machine]: {
        blockRows: [...prev[machine].blockRows, { 
          id: crypto.randomUUID(), 
          block_name: 'AVG-', 
          material_type: 'S/G', 
          slabs: '', 
          sqft: '',
          notes: ''
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
          sqft: parseFloat(row.sqft) || 0,
          notes: row.notes.trim()
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
      allowNavigation(); // Allow navigation after successful save
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
    const freshFormData: FormData = {
      date: new Date().toISOString().split('T')[0],
      machine1: {
        blockRows: [{ id: crypto.randomUUID(), block_name: 'AVG-', material_type: 'S/G', slabs: '', sqft: '', notes: '' }]
      },
      machine2: {
        blockRows: [{ id: crypto.randomUUID(), block_name: 'AVG-', material_type: 'S/G', slabs: '', sqft: '', notes: '' }]
      },
      machine3: {
        blockRows: [{ id: crypto.randomUUID(), block_name: 'AVG-', material_type: 'S/G', slabs: '', sqft: '', notes: '' }]
      }
    };
    setFormData(freshFormData);
    setInitialFormData(freshFormData); // Reset initial state too
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
    
    const editFormData: FormData = {
      date: report.date,
      machine1: machineKey === 'machine1' ? {
        blockRows: report.blocks.map(b => ({
          id: crypto.randomUUID(),
          block_name: b.block_name,
          material_type: b.material_type,
          slabs: b.slabs.toString(),
          sqft: b.sqft.toString(),
          notes: b.notes || ''
        }))
      } : {
        blockRows: [{ id: crypto.randomUUID(), block_name: 'AVG-', material_type: 'S/G', slabs: '', sqft: '', notes: '' }]
      },
      machine2: machineKey === 'machine2' ? {
        blockRows: report.blocks.map(b => ({
          id: crypto.randomUUID(),
          block_name: b.block_name,
          material_type: b.material_type,
          slabs: b.slabs.toString(),
          sqft: b.sqft.toString(),
          notes: b.notes || ''
        }))
      } : {
        blockRows: [{ id: crypto.randomUUID(), block_name: 'AVG-', material_type: 'S/G', slabs: '', sqft: '', notes: '' }]
      },
      machine3: machineKey === 'machine3' ? {
        blockRows: report.blocks.map(b => ({
          id: crypto.randomUUID(),
          block_name: b.block_name,
          material_type: b.material_type,
          slabs: b.slabs.toString(),
          sqft: b.sqft.toString(),
          notes: b.notes || ''
        }))
      } : {
        blockRows: [{ id: crypto.randomUUID(), block_name: 'AVG-', material_type: 'S/G', slabs: '', sqft: '', notes: '' }]
      }
    };
    
    setFormData(editFormData);
    setInitialFormData(editFormData); // Set as initial state for edit mode
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
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Multi Cutter Production Data</h1>
          <p className="text-gray-600 mt-1">Track daily granite block cutting from 3 machines</p>
        </div>

        {/* Month Selector Section */}
        <Card className="p-4 bg-white border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Viewing Month:</span>
            </div>
            
            {/* Month Navigation */}
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm">
              <Button 
                onClick={goToPreviousMonth}
                variant="outline"
                size="sm"
                className="h-8"
              >
                ←
              </Button>
              <div className="text-center min-w-[140px]">
                <div className="font-semibold text-gray-900">{getMonthName(selectedMonth)}</div>
                <div className="text-xs text-gray-500">{selectedYear}</div>
              </div>
              <Button 
                onClick={goToNextMonth}
                variant="outline"
                size="sm"
                className="h-8"
              >
                →
              </Button>
            </div>
            
            <div className="hidden md:block">
              <select
                value={`${selectedYear}-${String(selectedMonth).padStart(2, '0')}`}
                onChange={(e) => {
                  const [year, month] = e.target.value.split('-');
                  setSelectedYear(parseInt(year));
                  setSelectedMonth(parseInt(month));
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                {Array.from({ length: 12 }, (_, i) => {
                  const year = new Date().getFullYear();
                  const currentMonth = new Date().getMonth();
                  const monthIndex = (currentMonth - i + 12) % 12;
                  const displayYear = currentMonth - i < 0 ? year - 1 : year;
                  const date = new Date(displayYear, monthIndex, 1);
                  const value = `${displayYear}-${String(monthIndex + 1).padStart(2, '0')}`;
                  const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                  return (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </Card>

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
                <p className="text-sm text-gray-600">Yesterday's Production</p>
                <p className="text-2xl font-bold text-gray-900">{fmt(yesterdayProduction)}</p>
                <p className="text-xs text-gray-500 mt-1">Sq. Ft. Yesterday</p>
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

        {/* Add Report Button */}
        <div className="flex justify-center">
          <Button 
            onClick={() => {
              resetForm();
              setEditingId(null);
              setShowForm(true);
            }}
            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-md hover:shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Multi Cutter Report
          </Button>
        </div>

        {/* Add/Edit Form - Balanced Design */}
        {showForm && (
          <Card className="p-6">
            {/* Unsaved Changes Indicator */}
            {hasUnsavedChanges && (
              <div className="mb-4">
                <UnsavedChangesIndicator hasUnsavedChanges={hasUnsavedChanges} />
              </div>
            )}
            
            <div className="mb-6 pb-5 border-b border-gray-200">
              <div className="flex items-center gap-2 mb-6">
                <label className="text-sm font-medium text-gray-700">Date:</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  required
                  className="w-44 h-10"
                />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900">
                {editingId ? 'Edit Multi Cutter Report' : 'Add Multi Cutter Report'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Machine 1 - Balanced */}
              <div className="border border-blue-200 rounded-lg overflow-hidden">
                <div className="bg-blue-50 px-5 py-3 flex items-center justify-between border-b border-blue-200">
                  <h3 className="text-lg font-semibold text-blue-900 flex items-center">
                    <Factory className="w-5 h-5 mr-2" />
                    Machine-1
                  </h3>
                  <Button 
                    type="button"
                    onClick={() => addBlockRow('machine1')}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1.5"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Block
                  </Button>
                </div>

                <div className="p-4 space-y-3 bg-white">
                  {formData.machine1.blockRows.map((row, index) => (
                    <div key={row.id} className="border border-gray-200 rounded-md p-4 space-y-2">
                      <div className="grid grid-cols-12 gap-2.5 items-end">
                        <div className="col-span-3">
                          <label className="text-xs font-medium text-gray-700 mb-1 block">Block Name</label>
                          <Input
                            placeholder="AVG-16B"
                            value={row.block_name}
                            onChange={(e) => updateBlockRow('machine1', row.id, 'block_name', e.target.value)}
                            className="h-10 text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs font-medium text-gray-700 mb-1 block">Material</label>
                          <select
                            className="w-full h-10 px-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                          <label className="text-xs font-medium text-gray-700 mb-1 block">Slabs</label>
                          <Input
                            type="number"
                            placeholder="26"
                            value={row.slabs}
                            onChange={(e) => updateBlockRow('machine1', row.id, 'slabs', e.target.value)}
                            className="h-10 text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs font-medium text-gray-700 mb-1 block">Sq Ft</label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="721"
                            value={row.sqft}
                            onChange={(e) => updateBlockRow('machine1', row.id, 'sqft', e.target.value)}
                            className="h-10 text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs font-medium text-gray-700 mb-1 block">Notes</label>
                          <Input
                            placeholder="Optional notes"
                            value={row.notes}
                            onChange={(e) => updateBlockRow('machine1', row.id, 'notes', e.target.value)}
                            className="h-10 text-sm"
                          />
                        </div>
                        {formData.machine1.blockRows.length > 1 && (
                          <div className="col-span-1 flex items-end justify-center pb-1">
                            <button
                              type="button"
                              onClick={() => removeBlockRow('machine1', row.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="bg-blue-50 px-4 py-3 rounded-md text-base font-semibold text-blue-900">
                    Total: {calculateMachineTotal('machine1').slabs} Slabs | {fmt(calculateMachineTotal('machine1').sqft)} Sq Ft
                  </div>
                </div>
              </div>

              {/* Machine 2 - Balanced */}
              <div className="border border-green-200 rounded-lg overflow-hidden">
                <div className="bg-green-50 px-5 py-3 flex items-center justify-between border-b border-green-200">
                  <h3 className="text-lg font-semibold text-green-900 flex items-center">
                    <Factory className="w-5 h-5 mr-2" />
                    Machine-2
                  </h3>
                  <Button 
                    type="button"
                    onClick={() => addBlockRow('machine2')}
                    className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1.5"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Block
                  </Button>
                </div>

                <div className="p-4 space-y-3 bg-white">
                  {formData.machine2.blockRows.map((row, index) => (
                    <div key={row.id} className="border border-gray-200 rounded-md p-4 space-y-2">
                      <div className="grid grid-cols-12 gap-2.5 items-end">
                        <div className="col-span-3">
                          <label className="text-xs font-medium text-gray-700 mb-1 block">Block Name</label>
                          <Input
                            placeholder="AVG-17C"
                            value={row.block_name}
                            onChange={(e) => updateBlockRow('machine2', row.id, 'block_name', e.target.value)}
                            className="h-10 text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs font-medium text-gray-700 mb-1 block">Material</label>
                          <select
                            className="w-full h-10 px-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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
                          <label className="text-xs font-medium text-gray-700 mb-1 block">Slabs</label>
                          <Input
                            type="number"
                            placeholder="31"
                            value={row.slabs}
                            onChange={(e) => updateBlockRow('machine2', row.id, 'slabs', e.target.value)}
                            className="h-10 text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs font-medium text-gray-700 mb-1 block">Sq Ft</label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="767"
                            value={row.sqft}
                            onChange={(e) => updateBlockRow('machine2', row.id, 'sqft', e.target.value)}
                            className="h-10 text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs font-medium text-gray-700 mb-1 block">Notes</label>
                          <Input
                            placeholder="Optional notes"
                            value={row.notes}
                            onChange={(e) => updateBlockRow('machine2', row.id, 'notes', e.target.value)}
                            className="h-10 text-sm"
                          />
                        </div>
                        {formData.machine2.blockRows.length > 1 && (
                          <div className="col-span-1 flex items-end justify-center pb-1">
                            <button
                              type="button"
                              onClick={() => removeBlockRow('machine2', row.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="bg-green-50 px-4 py-3 rounded-md text-base font-semibold text-green-900">
                    Total: {calculateMachineTotal('machine2').slabs} Slabs | {fmt(calculateMachineTotal('machine2').sqft)} Sq Ft
                  </div>
                </div>
              </div>

              {/* Machine 3 - Balanced */}
              <div className="border border-purple-200 rounded-lg overflow-hidden">
                <div className="bg-purple-50 px-5 py-3 flex items-center justify-between border-b border-purple-200">
                  <h3 className="text-lg font-semibold text-purple-900 flex items-center">
                    <Factory className="w-5 h-5 mr-2" />
                    Machine-3
                  </h3>
                  <Button 
                    type="button"
                    onClick={() => addBlockRow('machine3')}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-3 py-1.5"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Block
                  </Button>
                </div>

                <div className="p-4 space-y-3 bg-white">
                  {formData.machine3.blockRows.map((row, index) => (
                    <div key={row.id} className="border border-gray-200 rounded-md p-4 space-y-2">
                      <div className="grid grid-cols-12 gap-2.5 items-end">
                        <div className="col-span-3">
                          <label className="text-xs font-medium text-gray-700 mb-1 block">Block Name</label>
                          <Input
                            placeholder="AVG-16A"
                            value={row.block_name}
                            onChange={(e) => updateBlockRow('machine3', row.id, 'block_name', e.target.value)}
                            className="h-10 text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs font-medium text-gray-700 mb-1 block">Material</label>
                          <select
                            className="w-full h-10 px-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                          <label className="text-xs font-medium text-gray-700 mb-1 block">Slabs</label>
                          <Input
                            type="number"
                            placeholder="28"
                            value={row.slabs}
                            onChange={(e) => updateBlockRow('machine3', row.id, 'slabs', e.target.value)}
                            className="h-10 text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs font-medium text-gray-700 mb-1 block">Sq Ft</label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="777"
                            value={row.sqft}
                            onChange={(e) => updateBlockRow('machine3', row.id, 'sqft', e.target.value)}
                            className="h-10 text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs font-medium text-gray-700 mb-1 block">Notes</label>
                          <Input
                            placeholder="Optional notes"
                            value={row.notes}
                            onChange={(e) => updateBlockRow('machine3', row.id, 'notes', e.target.value)}
                            className="h-10 text-sm"
                          />
                        </div>
                        {formData.machine3.blockRows.length > 1 && (
                          <div className="col-span-1 flex items-end justify-center pb-1">
                            <button
                              type="button"
                              onClick={() => removeBlockRow('machine3', row.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="bg-purple-50 px-4 py-3 rounded-md text-base font-semibold text-purple-900">
                    Total: {calculateMachineTotal('machine3').slabs} Slabs | {fmt(calculateMachineTotal('machine3').sqft)} Sq Ft
                  </div>
                </div>
              </div>

              {/* Grand Total - Balanced */}
              <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-6 py-5 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-gray-200">Total Production (All Machines)</span>
                  <div className="flex gap-10 text-white">
                    <div>
                      <span className="text-base text-gray-300">Slabs: </span>
                      <span className="text-2xl font-bold">{grandTotalSlabs}</span>
                    </div>
                    <div>
                      <span className="text-base text-gray-300">Sq Ft: </span>
                      <span className="text-2xl font-bold">{fmt(grandTotalSqft)}</span>
                    </div>
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
                    if (hasUnsavedChanges) {
                      if (window.confirm('You have unsaved changes. Are you sure you want to cancel?')) {
                        allowNavigation();
                        setShowForm(false);
                        setEditingId(null);
                        resetForm();
                      }
                    } else {
                      setShowForm(false);
                      setEditingId(null);
                      resetForm();
                    }
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Reports Table - Clean Format with Machine Tabs */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-blue-600" />
            Production Records
          </h2>

          {/* Machine Tabs - Minimal Design */}
          <div className="flex gap-1 mb-6 border-b border-gray-200">
            <button
              onClick={() => setSelectedMachineTab('Machine-1')}
              className={`px-4 py-2.5 text-sm font-medium transition-all relative ${
                selectedMachineTab === 'Machine-1'
                  ? 'text-gray-900 bg-gray-50 border-b-2 border-gray-900'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Machine 1
            </button>
            <button
              onClick={() => setSelectedMachineTab('Machine-2')}
              className={`px-4 py-2.5 text-sm font-medium transition-all relative ${
                selectedMachineTab === 'Machine-2'
                  ? 'text-gray-900 bg-gray-50 border-b-2 border-gray-900'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Machine 2
            </button>
            <button
              onClick={() => setSelectedMachineTab('Machine-3')}
              className={`px-4 py-2.5 text-sm font-medium transition-all relative ${
                selectedMachineTab === 'Machine-3'
                  ? 'text-gray-900 bg-gray-50 border-b-2 border-gray-900'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Machine 3
            </button>
            <button
              onClick={() => setSelectedMachineTab('All')}
              className={`px-4 py-2.5 text-sm font-medium transition-all relative ${
                selectedMachineTab === 'All'
                  ? 'text-gray-900 bg-gray-50 border-b-2 border-gray-900'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              All
            </button>
          </div>
          
          {Object.keys(reportsByDate).length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No production records found</p>
              <p className="text-sm text-gray-400 mt-1">Start by adding a new multi-cutter report</p>
            </div>
          ) : selectedMachineTab === 'All' ? (
            // All Machines View - Side by Side Tables
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {['Machine-1', 'Machine-2', 'Machine-3'].map((machine) => {
                const machineReports = Object.keys(reportsByDate)
                  .sort((a, b) => b.localeCompare(a))
                  .flatMap(date => reportsByDate[date].filter(r => r.machine === machine));

                const headerColor = 
                  machine === 'Machine-1' ? 'bg-blue-50 border-blue-200' :
                  machine === 'Machine-2' ? 'bg-green-50 border-green-200' :
                  'bg-purple-50 border-purple-200';
                
                const headerTextColor = 
                  machine === 'Machine-1' ? 'text-blue-900' :
                  machine === 'Machine-2' ? 'text-green-900' :
                  'text-purple-900';

                return (
                  <div key={machine} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className={`${headerColor} border-b px-4 py-2.5`}>
                      <h3 className={`font-semibold ${headerTextColor} text-sm`}>{machine}</h3>
                    </div>
                    <div className="overflow-x-auto">
                      {machineReports.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-xs">
                          No records
                        </div>
                      ) : (
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b bg-gray-50">
                              <th className="text-left py-2 px-2 font-medium text-gray-600">Date</th>
                              <th className="text-left py-2 px-2 font-medium text-gray-600">Block</th>
                              <th className="text-left py-2 px-2 font-medium text-gray-600">Mat.</th>
                              <th className="text-right py-2 px-2 font-medium text-gray-600">Slabs</th>
                              <th className="text-right py-2 px-2 font-medium text-gray-600">Sq Ft</th>
                            </tr>
                          </thead>
                          <tbody>
                            {machineReports.flatMap((report) =>
                              report.blocks.map((block, blockIdx) => (
                                <tr key={`${report.id}-${blockIdx}`} className="border-b hover:bg-gray-50">
                                  {blockIdx === 0 && (
                                    <td className="py-2 px-2 text-gray-600 align-middle" rowSpan={report.blocks.length}>
                                      {formatDisplayDate(report.date).split(',')[0]}
                                    </td>
                                  )}
                                  <td className="py-2 px-2 text-gray-900">{block.block_name}</td>
                                  <td className="py-2 px-2 text-gray-700">{block.material_type}</td>
                                  <td className="py-2 px-2 text-right text-gray-900">{block.slabs}</td>
                                  <td className="py-2 px-2 text-right text-gray-900">{fmt(block.sqft)}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Single Machine View
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${
                    selectedMachineTab === 'Machine-1' ? 'bg-blue-50' :
                    selectedMachineTab === 'Machine-2' ? 'bg-green-50' :
                    'bg-purple-50'
                  }`}>
                    <th className="py-3 px-4">
                      <SortButton column="date" sortConfig={sortConfig} onSort={requestSort} label="Date" align="left" />
                    </th>
                    <th className="py-3 px-4">
                      <SortButton column="block_name" sortConfig={sortConfig} onSort={requestSort} label="Block Name" align="left" />
                    </th>
                    <th className="py-3 px-4">
                      <SortButton column="material_type" sortConfig={sortConfig} onSort={requestSort} label="Material" align="left" />
                    </th>
                    <th className="py-3 px-4">
                      <SortButton column="slabs" sortConfig={sortConfig} onSort={requestSort} label="Slabs" align="right" />
                    </th>
                    <th className="py-3 px-4">
                      <SortButton column="sqft" sortConfig={sortConfig} onSort={requestSort} label="Sq Ft" align="right" />
                    </th>
                    <th className="py-3 px-4">
                      <SortButton column="notes" sortConfig={sortConfig} onSort={requestSort} label="Notes" align="left" />
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedReports.map((block, index) => (
                    <tr key={`${block.id}-${index}`} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {formatDisplayDate(block.date)}
                      </td>
                      <td className="py-3 px-4">{block.block_name}</td>
                      <td className="py-3 px-4">{block.material_type}</td>
                      <td className="py-3 px-4 text-right">{block.slabs}</td>
                      <td className="py-3 px-4 text-right">{fmt(block.sqft)}</td>
                      <td className="py-3 px-4 text-gray-600 text-sm">{block.notes || '-'}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center space-x-2">
                          <Button
                            onClick={() => handleEdit(block.fullReport)}
                            size="sm"
                            variant="outline"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleDelete(block.id)}
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
