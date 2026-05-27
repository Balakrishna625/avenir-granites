'use client';

import { useState, useEffect, useMemo, Fragment } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useTableSort } from '@/hooks/useTableSort';
import { SortButton } from '@/components/ui/SortButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Plus, Edit3, Trash2, Users, BarChart3, Layers, TrendingUp, DollarSign, CreditCard, AlertCircle, Clock } from 'lucide-react';
import { formatDisplayDate } from '@/lib/date-utils';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import { UnsavedChangesIndicator } from '@/components/ui/UnsavedChangesIndicator';
import { useSessionMonthString } from '@/hooks/useSessionMonth';
import { useToast } from '@/components/ui/toast';

type ActivityType = 
  | 'S/G Polishing'
  | 'S/G Laputra'
  | 'S/G Grinding'
  | 'S/G Polish Grinding'
  | 'S/G Laputra Grinding'
  | 'B/P Polishing'
  | 'B/P Laputra'
  | 'B/P Grinding'
  | 'B/P Polish Grinding'
  | 'B/P Laputra Grinding'
  | 'Burgandy Polishing'
  | 'Burgandy Grinding'
  | 'Burgandy Polish Grinding'
  | 'GRINDING'  // Keep for backward compatibility
  | 'POLISHING'; // Keep for backward compatibility

interface LinePolishReport {
  id: string;
  date: string;
  shift: 'MORNING' | 'NIGHT';
  activity: string; // Summary text: "S/G Polishing, B/P Grinding"
  activities?: Array<{
    block_name?: string;
    activity: ActivityType;
    slabs: number;
    sqft: number;
    grade?: string; // Optional: Blackline, White line, Fresh, Patch, Variation
  }>; // JSONB array of detailed activities
  no_of_workers: number;
  number_of_slabs: number; // Legacy - for old data
  total_slabs?: number; // New - total across all activities
  total_sqft: number; // Total across all activities
  no_of_hours: number; // Total hours for entire shift
  rate_per_hour: number;
  debit_amount: number; // Total amount for entire shift
  remarks?: string;
  created_at: string;
  updated_at: string;
  entry_group_id?: string; // No longer needed but kept for compatibility
}

interface LinePolishPayment {
  id: string;
  payment_date: string;
  amount: number;
  payment_method: 'CASH' | 'BANK_TRANSFER' | 'UPI' | 'CHEQUE';
  reference_number?: string;
  remarks?: string;
  created_at: string;
}

interface MonthlyBalance {
  id?: string;
  year: number;
  month: number;
  opening_balance: number;
  total_debit: number;
  total_credit: number;
  closing_balance: number;
  created_at?: string;
  updated_at?: string;
}

interface LinePolishPreviousDue {
  id: string;
  current_month: string; // Format: YYYY-MM
  previous_month: string; // Format: YYYY-MM
  amount: number;
  remarks?: string;
  created_at: string;
}

// Tool type → allowed grades mapping (outside component to avoid re-init)
const TOOL_GRADES: Record<string, string[]> = {
  resin_bond: ['100', '200', '400', '800', '1500', '3000', 'Final Lux', 'Apr 100', 'Apr 200'],
  lapotra: ['16', '24', '36', '46', '60', '120', '240', '500', '1000', '1200'],
  iron: ['60', '80', '150', '200'],
};

const TOOL_TYPE_LABELS: Record<string, string> = {
  resin_bond: 'Resin Bond (R/B)',
  lapotra: 'Lapotra',
  iron: 'Iron',
};

const DEFAULT_GRADES = ['Blackline', 'White line', 'Fresh', 'Patch', 'Variation'];

// Activity detail row for grouped entries
interface ActivityRow {
  id: string; // Temporary ID for React keys
  block_name: string; // Block name field
  activity: ActivityType;
  number_of_slabs: string;
  total_sqft: string;
  grade?: string; // Optional: Blackline, White line, Fresh, Patch, Variation
}

// Tool change row — one row per tool installed in a shift
interface ToolUsageRow {
  id: string;
  tool_type: 'resin_bond' | 'lapotra' | 'iron';
  grade: string;
  brand: string;
  notes: string;
  after_row_index: number; // -1 = start of shift, 0 = after row 0, etc.
}

// Fetched tool usage (from DB)
interface LinePolishToolUsage {
  id: string;
  report_id: string;
  shift: 'MORNING' | 'NIGHT';
  tool_type: 'resin_bond' | 'lapotra' | 'iron';
  grade: string;
  brand?: string;
  sqft_produced: number;
  notes?: string;
  created_at: string;
  after_row_index?: number;
  line_polish_reports?: { date: string; shift: string };
}

interface ShiftFormData {
  no_of_workers: string;
  no_of_hours: string;
  rate_per_hour: string;
  remarks: string;
  activityRows: ActivityRow[]; // Multiple activity rows
  toolUsageRows: ToolUsageRow[]; // Tool changes for this shift
}

interface FormData {
  date: string;
  morning: ShiftFormData;
  evening: ShiftFormData;
}

const fmt = (value: string | number): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? '₹0' : `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

export default function LinePolishPage() {
  const { showToast } = useToast();
  const [reports, setReports] = useState<LinePolishReport[]>([]);
  const [toolUsages, setToolUsages] = useState<LinePolishToolUsage[]>([]);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [addingBrandFor, setAddingBrandFor] = useState<string | null>(null);
  const [newBrandText, setNewBrandText] = useState('');

  const [availableGrades, setAvailableGrades] = useState<string[]>(DEFAULT_GRADES);
  const [showAddGrade, setShowAddGrade] = useState(false);
  const [newGradeName, setNewGradeName] = useState('');

  // ── Retroactive tool-change modal state ──
  const [toolModalReport, setToolModalReport] = useState<LinePolishReport | null>(null);
  const [toolModalRows, setToolModalRows] = useState<ToolUsageRow[]>([]);
  const [toolModalSaving, setToolModalSaving] = useState(false);
  const [toolModalAddingBrandFor, setToolModalAddingBrandFor] = useState<string | null>(null);
  const [toolModalNewBrand, setToolModalNewBrand] = useState('');
  const [payments, setPayments] = useState<LinePolishPayment[]>([]);
  const [previousDues, setPreviousDues] = useState<LinePolishPreviousDue[]>([]);
  const [monthlyBalance, setMonthlyBalance] = useState<MonthlyBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Month/Year filter states - persists in session, resets to current month on new session
  const { selectedMonth, setSelectedMonth } = useSessionMonthString('line-polish')
  const [showAllRecords, setShowAllRecords] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityType | 'ALL'>('ALL');
  
  // Previous due management
  const [showPreviousDueForm, setShowPreviousDueForm] = useState(false);
  const [previousDueForm, setPreviousDueForm] = useState({
    previous_month: '',
    amount: '',
    remarks: ''
  });
  const [savingPreviousDue, setSavingPreviousDue] = useState(false);

  // Create initial form state once using useMemo to prevent regenerating UUIDs on every render
  const initialFormData: FormData = useMemo(() => ({
    date: new Date().toISOString().split('T')[0],
    morning: {
      no_of_workers: '3', // Prefilled with 3
      no_of_hours: '',
      rate_per_hour: '250', // Prefilled with 250
      remarks: '',
      activityRows: [
        {
          id: crypto.randomUUID(),
          block_name: 'AVG-',
          activity: 'S/G Polishing',
          number_of_slabs: '',
          total_sqft: ''
        }
      ],
      toolUsageRows: []
    },
    evening: {
      no_of_workers: '3', // Prefilled with 3
      no_of_hours: '',
      rate_per_hour: '250', // Prefilled with 250
      remarks: '',
      activityRows: [
        {
          id: crypto.randomUUID(),
          block_name: 'AVG-',
          activity: 'S/G Polishing',
          number_of_slabs: '',
          total_sqft: ''
        }
      ],
      toolUsageRows: []
    }
  }), []); // Empty dependency array - only create once

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [initialFormState, setInitialFormState] = useState<FormData>(initialFormData);

  // Unsaved changes tracking
  const hasUnsavedChanges = JSON.stringify(formData) !== JSON.stringify(initialFormState);
  const { allowNavigation } = useUnsavedChangesWarning(hasUnsavedChanges);

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount: '',
    payment_method: 'CASH' as 'CASH' | 'BANK_TRANSFER' | 'UPI' | 'CHEQUE',
    reference_number: '',
    remarks: ''
  });
  
  // Inline remarks editing
  const [editingRemarksId, setEditingRemarksId] = useState<string | null>(null);
  const [editingRemarksText, setEditingRemarksText] = useState<string>('');

  useEffect(() => {
    fetchReports();
    fetchPayments();
    fetchToolUsages();
    fetchGrades();
  }, []);

  useEffect(() => {
    // Fetch monthly balance and previous dues when month changes
    fetchMonthlyBalance();
    fetchPreviousDues();
  }, [selectedMonth]);

  // Auto-calculation is now handled in calculateShiftTotals function

  const fetchGrades = async () => {
    try {
      const res = await fetch('/api/slab-grades');
      if (res.ok) {
        const custom: string[] = await res.json();
        setAvailableGrades(prev => {
          const merged = [...prev];
          custom.forEach(g => { if (!merged.includes(g)) merged.push(g); });
          return merged;
        });
      }
    } catch { /* keep defaults */ }
  };

  const handleAddGrade = async () => {
    const name = newGradeName.trim();
    if (!name) return;
    if (availableGrades.includes(name)) {
      setNewGradeName('');
      setShowAddGrade(false);
      return;
    }
    const res = await fetch('/api/slab-grades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok || res.status === 409) {
      setAvailableGrades(prev => prev.includes(name) ? prev : [...prev, name]);
    }
    setNewGradeName('');
    setShowAddGrade(false);
  };

  const fetchReports = async () => {
    try {
      setReportsLoading(true);
      const response = await fetch('/api/line-polish-reports');
      if (response.ok) {
        const data = await response.json();
        // Sort by date ascending (1-30), then by shift (MORNING before NIGHT)
        setReports(data.sort((a: LinePolishReport, b: LinePolishReport) => {
          const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
          if (dateCompare !== 0) return dateCompare;
          // If same date, MORNING before NIGHT
          return a.shift === 'MORNING' ? -1 : 1;
        }));
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setReportsLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const response = await fetch('/api/line-polish-payments');
      if (response.ok) {
        const data = await response.json();
        setPayments(data.sort((a: LinePolishPayment, b: LinePolishPayment) => 
          new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
        ));
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const fetchToolUsages = async () => {
    try {
      const response = await fetch('/api/line-polish-tool-usage');
      if (response.ok) {
        const data = await response.json();
        setToolUsages(data);
        const brands = [...new Set(
          data.filter((t: LinePolishToolUsage) => t.brand)
              .map((t: LinePolishToolUsage) => t.brand as string)
        )] as string[];
        setAvailableBrands(prev => [...new Set([...prev, ...brands])]);
      }
    } catch (error) {
      console.error('Error fetching tool usages:', error);
    }
  };

  const fetchPreviousDues = async () => {
    try {
      const response = await fetch(`/api/line-polish-previous-dues?current_month=${selectedMonth}`);
      if (response.ok) {
        const data = await response.json();
        setPreviousDues(data);
      }
    } catch (error) {
      console.error('Error fetching previous dues:', error);
    }
  };

  const fetchMonthlyBalance = async () => {
    try {
      const response = await fetch(`/api/line-polish-monthly-balances?month=${selectedMonth}`);
      if (response.ok) {
        const data = await response.json();
        setMonthlyBalance(data[0] || null);
      }
    } catch (error) {
      console.error('Error fetching monthly balance:', error);
    }
  };

  const updateMonthlyBalance = async (month: string) => {
    try {
      const response = await fetch('/api/line-polish-monthly-balances', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month })
      });
      if (response.ok) {
        await fetchMonthlyBalance();
      }
    } catch (error) {
      console.error('Error updating monthly balance:', error);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleShiftInputChange = (shift: 'morning' | 'evening', field: keyof ShiftFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [shift]: { ...prev[shift], [field]: value }
    }));
  };

  const handleActivityRowChange = (shift: 'morning' | 'evening', rowId: string, field: keyof ActivityRow, value: string) => {
    setFormData(prev => ({
      ...prev,
      [shift]: {
        ...prev[shift],
        activityRows: prev[shift].activityRows.map(row =>
          row.id === rowId ? { ...row, [field]: value } : row
        )
      }
    }));
  };

  const addActivityRow = (shift: 'morning' | 'evening') => {
    setFormData(prev => ({
      ...prev,
      [shift]: {
        ...prev[shift],
        activityRows: [
          ...prev[shift].activityRows,
          {
            id: crypto.randomUUID(),
            block_name: 'AVG-',
            activity: 'S/G Polishing',
            number_of_slabs: '',
            total_sqft: ''
          }
        ]
      }
    }));
  };

  const removeActivityRow = (shift: 'morning' | 'evening', rowId: string) => {
    if (formData[shift].activityRows.length <= 1) {
      alert('At least one activity is required');
      return;
    }
    const removedIdx = formData[shift].activityRows.findIndex(r => r.id === rowId);
    setFormData(prev => ({
      ...prev,
      [shift]: {
        ...prev[shift],
        activityRows: prev[shift].activityRows.filter(row => row.id !== rowId),
        // Shift tool change positions when a row is deleted
        toolUsageRows: prev[shift].toolUsageRows.map(tc => ({
          ...tc,
          after_row_index: tc.after_row_index >= removedIdx
            ? Math.max(tc.after_row_index - 1, -1)
            : tc.after_row_index
        }))
      }
    }));
  };

  const addToolUsageRow = (shift: 'morning' | 'evening', afterRowIndex: number = -1) => {
    setFormData(prev => ({
      ...prev,
      [shift]: {
        ...prev[shift],
        toolUsageRows: [
          ...prev[shift].toolUsageRows,
          {
            id: crypto.randomUUID(),
            tool_type: 'resin_bond',
            grade: '',
            brand: '',
            notes: '',
            after_row_index: afterRowIndex
          }
        ]
      }
    }));
  };

  const removeToolUsageRow = (shift: 'morning' | 'evening', rowId: string) => {
    setFormData(prev => ({
      ...prev,
      [shift]: {
        ...prev[shift],
        toolUsageRows: prev[shift].toolUsageRows.filter(row => row.id !== rowId)
      }
    }));
  };

  const handleToolUsageRowChange = (
    shift: 'morning' | 'evening',
    rowId: string,
    field: keyof ToolUsageRow,
    value: string
  ) => {
    setFormData(prev => ({
      ...prev,
      [shift]: {
        ...prev[shift],
        toolUsageRows: prev[shift].toolUsageRows.map(row =>
          row.id === rowId
            ? {
                ...row,
                [field]: value,
                // Reset grade when tool type changes
                ...(field === 'tool_type' ? { grade: '' } : {})
              }
            : row
        )
      }
    }));
  };

  const calculateShiftTotals = (shift: 'morning' | 'evening') => {
    const shiftData = formData[shift];
    const totalSlabs = shiftData.activityRows.reduce(
      (sum, row) => sum + (parseInt(row.number_of_slabs) || 0), 
      0
    );
    const totalSqft = shiftData.activityRows.reduce(
      (sum, row) => sum + (parseFloat(row.total_sqft) || 0), 
      0
    );
    const totalAmount = (parseFloat(shiftData.no_of_hours) || 0) * (parseFloat(shiftData.rate_per_hour) || 0);
    
    return { totalSlabs, totalSqft, totalAmount };
  };

  // Render inline tool-change <tr> rows at a given position within an activity table
  const renderInlineToolRows = (shift: 'morning' | 'evening', afterIdx: number) => {
    const toolsHere = formData[shift].toolUsageRows.filter(tc => tc.after_row_index === afterIdx);
    if (toolsHere.length === 0) return null;
    return (
      <>
        {toolsHere.map(tc => (
          <tr key={tc.id} className="bg-orange-50">
            <td colSpan={6} className="p-0">
              <div className="flex items-center gap-1.5 px-3 py-1 border-l-4 border-orange-400 text-xs flex-wrap">
                <span className="text-orange-500 font-semibold shrink-0">🔧 New tool:</span>
                <select
                  value={tc.tool_type}
                  onChange={(e) => handleToolUsageRowChange(shift, tc.id, 'tool_type', e.target.value)}
                  className="px-1 py-0.5 border border-orange-300 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-orange-400"
                >
                  <option value="resin_bond">Resin Bond (R/B)</option>
                  <option value="lapotra">Lapotra</option>
                  <option value="iron">Iron</option>
                </select>
                <select
                  value={tc.grade}
                  onChange={(e) => handleToolUsageRowChange(shift, tc.id, 'grade', e.target.value)}
                  className="px-1 py-0.5 border border-orange-300 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-orange-400"
                >
                  <option value="">Grade</option>
                  {(TOOL_GRADES[tc.tool_type] || []).map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                {addingBrandFor === tc.id ? (
                  <>
                    <input
                      autoFocus
                      type="text"
                      value={newBrandText}
                      onChange={(e) => setNewBrandText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const b = newBrandText.trim();
                          if (b) { setAvailableBrands(prev => [...new Set([...prev, b])]); handleToolUsageRowChange(shift, tc.id, 'brand', b); }
                          setAddingBrandFor(null); setNewBrandText('');
                        } else if (e.key === 'Escape') { setAddingBrandFor(null); setNewBrandText(''); }
                      }}
                      placeholder="Brand name"
                      className="w-24 px-1 py-0.5 border border-orange-400 rounded text-xs focus:outline-none"
                    />
                    <button type="button" onClick={() => {
                      const b = newBrandText.trim();
                      if (b) { setAvailableBrands(prev => [...new Set([...prev, b])]); handleToolUsageRowChange(shift, tc.id, 'brand', b); }
                      setAddingBrandFor(null); setNewBrandText('');
                    }} className="text-green-600 hover:text-green-800 font-bold text-xs">✓</button>
                    <button type="button" onClick={() => { setAddingBrandFor(null); setNewBrandText(''); }} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
                  </>
                ) : (
                  <>
                    <select
                      value={tc.brand}
                      onChange={(e) => handleToolUsageRowChange(shift, tc.id, 'brand', e.target.value)}
                      className="px-1 py-0.5 border border-orange-300 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-orange-400"
                    >
                      <option value="">Brand</option>
                      {availableBrands.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                    <button
                      type="button"
                      onClick={() => { setAddingBrandFor(tc.id); setNewBrandText(''); }}
                      className="w-5 h-5 rounded-full bg-orange-200 hover:bg-orange-300 text-orange-700 font-bold text-xs flex items-center justify-center shrink-0"
                      title="Add new brand"
                    >+</button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => removeToolUsageRow(shift, tc.id)}
                  className="ml-auto text-red-400 hover:text-red-600 font-bold text-xs shrink-0"
                  title="Remove tool change"
                >✕</button>
              </div>
            </td>
          </tr>
        ))}
      </>
    );
  };

  // Parse markdown message and auto-fill form
  function parseMarkdownMessage(message: string) {
    try {
      const lines = message.split('\n').map(line => line.trim()).filter(Boolean);
      const unparsedLines: string[] = [];
      const warnings: string[] = [];

      // Extract date from header: ### 📅 Date: **04-11-2025**
      const dateMatch = message.match(/Date:\s*\*?\*?(\d{2})-(\d{2})-(\d{4})\*?\*?/i);
      let parsedDate = new Date().toISOString().split('T')[0];
      if (dateMatch) {
        const [_, day, month, year] = dateMatch;
        parsedDate = `${year}-${month}-${day}`;
      } else {
        warnings.push('Date not found in expected format, using today\'s date');
      }

      const newFormData: FormData = {
        date: parsedDate,
        morning: {
          no_of_workers: '3',
          no_of_hours: '',
          rate_per_hour: '250',
          remarks: '',
          activityRows: [],
          toolUsageRows: []
        },
        evening: {
          no_of_workers: '3',
          no_of_hours: '',
          rate_per_hour: '250',
          remarks: '',
          activityRows: [],
          toolUsageRows: []
        }
      };

      // ── Helper: parse a tool-change bullet like "* 400 Cherukuru R/B → …" ──
      function parseToolBullet(bulletLine: string): { tool_type: 'resin_bond'|'lapotra'|'iron'; grade: string; brand: string } | null {
        // Strip bullet marker and everything from → onwards
        let t = bulletLine.replace(/^[\*\-\•]\s*/, '').replace(/\s*→.*$/, '').trim();

        // Detect tool type and strip keyword from remaining text
        let tool_type: 'resin_bond'|'lapotra'|'iron'|null = null;
        if (/R\/B|Resin\s*Bond|Resin/i.test(t)) {
          tool_type = 'resin_bond';
          t = t.replace(/R\/B|Resin\s*Bond|Resin/gi, '').trim();
        } else if (/Lapotra|Laputra/i.test(t)) {
          tool_type = 'lapotra';
          t = t.replace(/Lapotra|Laputra/gi, '').trim();
        } else if (/\bIron\b/i.test(t)) {
          tool_type = 'iron';
          t = t.replace(/\bIron\b/gi, '').trim();
        }
        if (!tool_type) return null;

        // Match grade from known TOOL_GRADES (longest first to handle multi-word grades)
        const knownGrades = TOOL_GRADES[tool_type];
        let matchedGrade = '';
        const sortedGrades = [...knownGrades].sort((a, b) => b.length - a.length);
        for (const g of sortedGrades) {
          const escaped = g.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
          const rx = new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`, 'i');
          if (rx.test(t)) {
            matchedGrade = g;
            t = t.replace(new RegExp(escaped, 'i'), '').trim();
            break;
          }
        }
        // Fallback: any 2-4 digit number as grade
        if (!matchedGrade) {
          const numMatch = t.match(/\b(\d{2,4})\b/);
          if (numMatch) {
            matchedGrade = numMatch[1];
            t = t.replace(numMatch[0], '').trim();
          }
        }

        // Remaining text (cleaned) is the brand
        const brand = t.replace(/^[,\s]+|[,\s]+$/g, '').trim();
        return { tool_type, grade: matchedGrade, brand };
      }

      let currentShift: 'morning' | 'evening' | null = null;
      let inTableSection = false;
      let inNotesSection = false;
      const shiftNotes: { morning: string[], evening: string[] } = { morning: [], evening: [] };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let lineProcessed = false;

        // Detect shift sections and extract hours
        // Pattern: Day Shift (12 Hours) or 🟢 Day Shift (12 Hours) or Day Shift - 12 Hours
        const dayShiftMatch = line.match(/(?:🟢.*)?Day\s+Shift.*?[\(\-\:]?\s*(\d+)\s*Hours?\)?/i);
        if (dayShiftMatch || line.match(/Day\s+Shift/i) || line.match(/🟢.*Day.*Shift/i)) {
          currentShift = 'morning';
          inTableSection = false;
          inNotesSection = false;
          if (dayShiftMatch && dayShiftMatch[1]) {
            newFormData.morning.no_of_hours = dayShiftMatch[1];
          }
          lineProcessed = true;
        } 
        // Pattern: Night Shift (12 Hours) or 🌙 Night Shift (12 Hours) or Night Shift - 12 Hours
        const nightShiftMatch = line.match(/(?:🌙.*)?Night\s+Shift.*?[\(\-\:]?\s*(\d+)\s*Hours?\)?/i);
        if (nightShiftMatch || line.match(/Night\s+Shift/i) || line.match(/🌙.*Night.*Shift/i)) {
          currentShift = 'evening';
          inTableSection = false;
          inNotesSection = false;
          if (nightShiftMatch && nightShiftMatch[1]) {
            newFormData.evening.no_of_hours = nightShiftMatch[1];
          }
          lineProcessed = true;
        }
        // Detect notes section: **Day Shift Notes:** or **Night Shift Notes:**
        else if (line.match(/\*\*.*Day\s+Shift\s+Notes.*:\*\*/i) || line.match(/Day\s+Shift\s+Notes:/i)) {
          currentShift = 'morning';
          inNotesSection = true;
          inTableSection = false;
          lineProcessed = true;
        }
        else if (line.match(/\*\*.*Night\s+Shift\s+Notes.*:\*\*/i) || line.match(/Night\s+Shift\s+Notes:/i)) {
          currentShift = 'evening';
          inNotesSection = true;
          inTableSection = false;
          lineProcessed = true;
        }
        // Skip markdown table header separators (|---|---|---|)
        else if (line.match(/^\|[\s\-:|]+\|$/)) {
          inTableSection = true;
          lineProcessed = true;
        }
        // Skip table headers (| Block Name | Material | Process | Qty | SFT |)
        else if (line.match(/Block\s+Name.*Material.*Process.*Qty.*SFT/i)) {
          lineProcessed = true;
        }
        // Skip total lines
        else if (line.match(/Total\s+SFT/i) || line.match(/Shift\s+Total/i)) {
          lineProcessed = true;
        }
        // Skip horizontal separators (but exit notes section)
        else if (line.match(/^[-=*_]{3,}$/)) {
          inNotesSection = false;
          lineProcessed = true;
        }
        // Skip tool-change section headers (### 🔄 Tool Change / Tracking)
        else if (line.match(/###.*(?:Tool\s*Change|Tracking|🔄)/i)) {
          lineProcessed = true;
        }
        // Parse tool-change bullet points: "* 400 Cherukuru R/B → …"
        else if (currentShift && line.match(/^[\*\-\•]\s+/) &&
                 /R\/B|Resin\s*Bond|Resin|Lapotra|Laputra|\bIron\b/i.test(line)) {
          const parsed = parseToolBullet(line);
          if (parsed && parsed.grade) {
            newFormData[currentShift].toolUsageRows.push({
              id: crypto.randomUUID(),
              tool_type: parsed.tool_type,
              grade: parsed.grade,
              brand: parsed.brand,
              notes: '',
              after_row_index: -1
            });
          }
          lineProcessed = true;
        }
        // Collect notes if in notes section
        else if (inNotesSection && currentShift && line.trim().length > 0) {
          // Skip lines that are just markdown formatting or headers
          if (!line.match(/^\*\*.*\*\*$/) && !line.match(/^[#]+\s/)) {
            shiftNotes[currentShift].push(line.trim());
          }
          lineProcessed = true;
        }
        // Parse table row data: | AVG-696A | S/G | Grinding | 65 | 1852.50 | Notes |
        else if (currentShift && line.startsWith('|')) {
          const parts = line.split('|').map(p => p.trim()).filter(Boolean);
          
          // Expected format: [Block Name, Material, Process, Qty, SFT, Notes (optional)]
          if (parts.length >= 5) {
            let blockName = parts[0];
            const material = parts[1];
            const process = parts[2];
            const qty = parts[3];
            const sft = parts[4];
            const notes = parts.length >= 6 ? parts[5] : '';
            
            // Normalize block name: Remove hyphen before final letter (AVG-SG-40-B → AVG-SG-40B)
            blockName = blockName.replace(/-([A-Z])$/, '$1');

            // Skip "NO RUNNING" rows or rows with dash material/process
            if (blockName.toUpperCase().includes('NO RUNNING') || 
                material === '—' || material === '-' || material === '--' ||
                process === '—' || process === '-' || process === '--') {
              lineProcessed = true;
              continue;
            }

            // Detect tool change from the remarks column (e.g. "800 - Cherukuru R/B")
            // Must contain a tool-type keyword AND a 2-4 digit grade number
            let toolChangeFromRemark: { tool_type: 'resin_bond'|'lapotra'|'iron'; grade: string; brand: string } | null = null;
            if (notes && notes.trim()) {
              const s = notes.trim();
              if (/R\/B|Resin\s*Bond|Resin|\bLapotra\b|\bLaputra\b|\bIron\b/i.test(s) && /\d{2,4}/.test(s)) {
                // Reuse parseToolBullet by prepending a bullet marker
                const parsed = parseToolBullet('* ' + s);
                if (parsed && parsed.grade) toolChangeFromRemark = parsed;
              }
            }

            // If a tool change was found, insert it BEFORE the current row
            if (toolChangeFromRemark) {
              const afterIdx = newFormData[currentShift].activityRows.length - 1; // -1 before row 0, N before row N+1
              newFormData[currentShift].toolUsageRows.push({
                id: crypto.randomUUID(),
                tool_type: toolChangeFromRemark.tool_type,
                grade: toolChangeFromRemark.grade,
                brand: toolChangeFromRemark.brand,
                notes: '',
                after_row_index: afterIdx
              });
            }

            // Collect notes for this shift — but skip tool-change remarks (already captured above)
            if (notes && notes.trim() && !notes.match(/^[-—]+$/) && !toolChangeFromRemark && !shiftNotes[currentShift].includes(notes.trim())) {
              shiftNotes[currentShift].push(notes.trim());
            }

            // Map material + process to ActivityType
            let activityType: ActivityType = 'S/G Polishing'; // default
            
            // Auto-detect material from block name if needed
            const detectMaterialFromBlockName = (blockName: string): string => {
              const normalized = blockName.toUpperCase().trim();
              
              // SJ, SL, VR, AVG → S/G
              if (normalized.startsWith('SJ') || normalized.startsWith('SL') || 
                  normalized.startsWith('VR') || normalized.startsWith('AVG')) {
                return 'S/G';
              }
              
              // GK → B/P
              if (normalized.startsWith('GK')) {
                return 'B/P';
              }
              
              // BG → Burgandy
              if (normalized.startsWith('BG')) {
                return 'BURG';
              }
              
              // Default to S/G
              return 'S/G';
            };
            
            // Normalize material - use detected material if original is unclear
            let normalizedMaterial = material.toUpperCase().replace(/\s+/g, '');
            
            // If material column is unclear or missing, detect from block name
            if (!normalizedMaterial || normalizedMaterial === '—' || 
                normalizedMaterial === '-' || normalizedMaterial === '--') {
              normalizedMaterial = detectMaterialFromBlockName(blockName);
            }
            
            const normalizedProcess = process.toLowerCase().trim();

            // Helper: matches both spellings — "lapotra" (report spelling) and "laputra" (legacy)
            const isLapotra = (s: string) => s.includes('lapotra') || s.includes('laputra');

            // Map to activity types
            if (normalizedMaterial === 'S/G' || normalizedMaterial === 'SG') {
              if (normalizedProcess.includes('polish') && normalizedProcess.includes('grind')) {
                activityType = 'S/G Polish Grinding';
              } else if (isLapotra(normalizedProcess) && normalizedProcess.includes('grind')) {
                activityType = 'S/G Laputra Grinding';
              } else if (normalizedProcess.includes('polish')) {
                activityType = 'S/G Polishing';
              } else if (isLapotra(normalizedProcess)) {
                activityType = 'S/G Laputra';
              } else if (normalizedProcess.includes('grind')) {
                activityType = 'S/G Grinding';
              }
            } else if (normalizedMaterial === 'B/P' || normalizedMaterial === 'BP') {
              if (normalizedProcess.includes('polish') && normalizedProcess.includes('grind')) {
                activityType = 'B/P Polish Grinding';
              } else if (isLapotra(normalizedProcess) && normalizedProcess.includes('grind')) {
                activityType = 'B/P Laputra Grinding';
              } else if (normalizedProcess.includes('polish')) {
                activityType = 'B/P Polishing';
              } else if (isLapotra(normalizedProcess)) {
                activityType = 'B/P Laputra';
              } else if (normalizedProcess.includes('grind')) {
                activityType = 'B/P Grinding';
              }
            } else if (normalizedMaterial.includes('BURG') || normalizedMaterial === 'B/G' || normalizedMaterial === 'BG') {
              if (normalizedProcess.includes('polish') && normalizedProcess.includes('grind')) {
                activityType = 'Burgandy Polish Grinding';
              } else if (normalizedProcess.includes('polish')) {
                activityType = 'Burgandy Polishing';
              } else if (normalizedProcess.includes('grind')) {
                activityType = 'Burgandy Grinding';
              }
            } else {
              // Material not recognized, already auto-detected from block name
              // Default to S/G with appropriate process
              if (normalizedProcess.includes('polish')) {
                activityType = 'S/G Polishing';
              } else if (normalizedProcess.includes('grind')) {
                activityType = 'S/G Grinding';
              }
            }

            // Parse grade from remarks (only for polishing activities)
            let grade: string | undefined = undefined;
            if (activityType.includes('Polishing') && notes && notes.trim()) {
              const normalizedNotes = notes.trim().toLowerCase();
              
              // Map remarks to grade values
              if (normalizedNotes.includes('black') || normalizedNotes.includes('blackline')) {
                grade = 'Blackline';
              } else if (normalizedNotes.includes('white') || normalizedNotes.includes('whiteline')) {
                grade = 'White line';
              } else if (normalizedNotes.includes('fresh')) {
                grade = 'Fresh';
              } else if (normalizedNotes.includes('patch')) {
                grade = 'Patch';
              } else if (normalizedNotes.includes('variation')) {
                grade = 'Variation';
              }
            }

            newFormData[currentShift].activityRows.push({
              id: crypto.randomUUID(),
              block_name: blockName,
              activity: activityType,
              number_of_slabs: qty,
              total_sqft: sft,
              ...(grade && { grade }) // Only include grade if it was parsed from remarks
            });

            lineProcessed = true;
          }
        }

        // Track unparsed lines (skip headers and formatting)
        if (!lineProcessed && line.length > 0 && 
            !line.match(/^[#*_\-=]+/) && // Skip markdown headers/formatting
            !line.match(/^📅|🟢|🌙/) && // Skip emoji headers
            !line.match(/^Notes?\s*:/i) && // Skip bare "Notes:" labels
            !line.match(/^Total\s+SFT/i) && // Skip total SFT lines
            !line.match(/^\|\s*[-:]+/) // Skip table separator rows
           ) {
          unparsedLines.push(line);
        }
      }

      // Apply collected notes to shift remarks
      if (shiftNotes.morning.length > 0) {
        newFormData.morning.remarks = shiftNotes.morning.join('\n');
      }
      if (shiftNotes.evening.length > 0) {
        newFormData.evening.remarks = shiftNotes.evening.join('\n');
      }

      // Ensure each shift has at least one row
      if (newFormData.morning.activityRows.length === 0) {
        newFormData.morning.activityRows.push({
          id: crypto.randomUUID(),
          block_name: 'AVG-',
          activity: 'S/G Polishing',
          number_of_slabs: '',
          total_sqft: ''
        });
      }

      if (newFormData.evening.activityRows.length === 0) {
        newFormData.evening.activityRows.push({
          id: crypto.randomUUID(),
          block_name: 'AVG-',
          activity: 'S/G Polishing',
          number_of_slabs: '',
          total_sqft: ''
        });
      }

      // Count parsed activities
      const morningCount = newFormData.morning.activityRows.filter(r => r.number_of_slabs).length;
      const eveningCount = newFormData.evening.activityRows.filter(r => r.number_of_slabs).length;
      const totalActivities = morningCount + eveningCount;

      setFormData(newFormData);
      setInitialFormState(newFormData);

      // Build success/error message details
      const morningHours = newFormData.morning.no_of_hours || '0';
      const eveningHours = newFormData.evening.no_of_hours || '0';
      const hoursInfo = `Morning: ${morningCount} activities (${morningHours}h), Evening: ${eveningCount} activities (${eveningHours}h)`;

      // Show appropriate toast
      if (unparsedLines.length > 0 || warnings.length > 0) {
        const errorMsg = [
          unparsedLines.length > 0 ? `Could not parse ${unparsedLines.length} line(s):` : '',
          ...unparsedLines.slice(0, 3).map(l => `  "${l}"`),
          unparsedLines.length > 3 ? `  ...and ${unparsedLines.length - 3} more` : '',
          ...warnings
        ].filter(Boolean).join('\n');
        
        showToast('error', `Parsed ${totalActivities} activities with issues.\n${hoursInfo}\n\n${errorMsg}`);
      } else {
        showToast('success', `Successfully parsed ${totalActivities} activities!\n${hoursInfo}\nPlease review and submit.`);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
      showToast('error', `Failed to parse message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // If editing, use the old single-shift logic
      if (isEditing) {
        // Old editing logic remains unchanged for backward compatibility
        showToast('error', 'Edit mode is not yet updated for dual-shift. Please delete and re-add.');
        setLoading(false);
        return;
      }

      // Check if at least one shift has data
      const morningHasData = formData.morning.activityRows.some(row => 
        row.number_of_slabs || row.total_sqft || formData.morning.no_of_hours
      );
      const eveningHasData = formData.evening.activityRows.some(row => 
        row.number_of_slabs || row.total_sqft || formData.evening.no_of_hours
      );

      if (!morningHasData && !eveningHasData) {
        showToast('error', 'Please fill in data for at least one shift (morning or evening)');
        setLoading(false);
        return;
      }

      const entries = [];

      // Process Morning Shift if it has data
      if (morningHasData) {
        const morningTotals = calculateShiftTotals('morning');
        const morningActivities = formData.morning.activityRows.map(row => ({
          block_name: row.block_name || '',
          activity: row.activity,
          slabs: parseInt(row.number_of_slabs) || 0,
          sqft: parseFloat(row.total_sqft) || 0,
          ...(row.grade && { grade: row.grade }) // Only include grade if it's selected
        }));
        const morningActivitySummary = formData.morning.activityRows
          .map(row => row.activity)
          .join(', ');

        entries.push({
          date: formData.date,
          shift: 'MORNING',
          activity: morningActivitySummary,
          activities: morningActivities,
          no_of_workers: parseInt(formData.morning.no_of_workers) || 3,
          total_slabs: morningTotals.totalSlabs,
          total_sqft: morningTotals.totalSqft,
          no_of_hours: parseFloat(formData.morning.no_of_hours) || 0,
          rate_per_hour: parseFloat(formData.morning.rate_per_hour) || 0,
          debit_amount: morningTotals.totalAmount,
          remarks: formData.morning.remarks.trim() || null
        });
      }

      // Process Evening Shift if it has data
      if (eveningHasData) {
        const eveningTotals = calculateShiftTotals('evening');
        const eveningActivities = formData.evening.activityRows.map(row => ({
          block_name: row.block_name || '',
          activity: row.activity,
          slabs: parseInt(row.number_of_slabs) || 0,
          sqft: parseFloat(row.total_sqft) || 0,
          ...(row.grade && { grade: row.grade }) // Only include grade if it's selected
        }));
        const eveningActivitySummary = formData.evening.activityRows
          .map(row => row.activity)
          .join(', ');

        entries.push({
          date: formData.date,
          shift: 'NIGHT',
          activity: eveningActivitySummary,
          activities: eveningActivities,
          no_of_workers: parseInt(formData.evening.no_of_workers) || 3,
          total_slabs: eveningTotals.totalSlabs,
          total_sqft: eveningTotals.totalSqft,
          no_of_hours: parseFloat(formData.evening.no_of_hours) || 0,
          rate_per_hour: parseFloat(formData.evening.rate_per_hour) || 0,
          debit_amount: eveningTotals.totalAmount,
          remarks: formData.evening.remarks.trim() || null
        });
      }

      // Submit all entries (one or two shifts) and their tool usages
      let allSuccess = true;
      for (const entry of entries) {
        const shiftKey = entry.shift === 'MORNING' ? 'morning' : 'evening';
        const response = await fetch('/api/line-polish-reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry)
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('Failed to save report:', error);
          showToast('error', `Failed to save ${entry.shift} shift: ${error.error || 'Unknown error'}`);
          allSuccess = false;
          break;
        }

        // Save tool usages for this shift (if any)
        const savedReport = await response.json();
        const toolRows = formData[shiftKey].toolUsageRows.filter(
          r => r.tool_type && r.grade
        );
        if (toolRows.length > 0) {
          await fetch('/api/line-polish-tool-usage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              report_id: savedReport.id,
              shift: entry.shift,
              usages: toolRows.map(r => ({
                tool_type: r.tool_type,
                grade: r.grade,
                brand: r.brand,
                sqft_produced: 0,
                notes: r.notes,
                after_row_index: r.after_row_index ?? -1,
              }))
            })
          });
        }
      }

      if (allSuccess) {
        const freshFormData = initialFormData;
        setFormData(freshFormData);
        setInitialFormState(freshFormData);
        allowNavigation(); // Clear unsaved changes warning
        await fetchReports();
        await fetchToolUsages();
        
        // Update monthly balance for the report's month
        const reportMonth = formData.date.slice(0, 7);
        await updateMonthlyBalance(reportMonth);
        
        showToast('success', `Successfully saved ${entries.length} shift${entries.length > 1 ? 's' : ''}!`);
      }
    } catch (error) {
      console.error('Error saving report:', error);
      showToast('error', 'Error saving report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (report: LinePolishReport) => {
    showToast('error', 'Edit feature is temporarily disabled in dual-shift mode. Please delete the entry and create a new one.');
    // TODO: Implement edit for dual-shift form
    return;
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;

    try {
      // Find the report to get its date before deleting
      const report = reports.find(r => r.id === id);
      
      const response = await fetch(`/api/line-polish-reports/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchReports();
        
        // Update monthly balance for the deleted report's month
        if (report) {
          const reportMonth = report.date.slice(0, 7);
          await updateMonthlyBalance(reportMonth);
        }
      }
    } catch (error) {
      console.error('Error deleting report:', error);
    }
  };

  // ── Retroactive tool-change modal handlers ────────────────────────────────
  const openToolModal = async (report: LinePolishReport) => {
    setToolModalReport(report);
    setToolModalRows([]);
    setToolModalSaving(false);
    // Load existing tool usages for this report
    try {
      const res = await fetch(`/api/line-polish-tool-usage?report_id=${report.id}`);
      if (res.ok) {
        const data: LinePolishToolUsage[] = await res.json();
        if (data.length > 0) {
          setToolModalRows(data.map(tu => ({
            id: tu.id,
            tool_type: tu.tool_type,
            grade: tu.grade,
            brand: tu.brand || '',
            notes: tu.notes || '',
            after_row_index: tu.after_row_index ?? -1,
          })));
        }
      }
    } catch { /* start with empty rows */ }
  };

  const closeToolModal = () => {
    setToolModalReport(null);
    setToolModalRows([]);
    setToolModalAddingBrandFor(null);
    setToolModalNewBrand('');
  };

  const saveToolModal = async () => {
    if (!toolModalReport) return;
    const validRows = toolModalRows.filter(r => r.tool_type && r.grade);
    setToolModalSaving(true);
    try {
      // Delete existing then re-insert (idempotent replace)
      await fetch(`/api/line-polish-tool-usage?report_id=${toolModalReport.id}`, { method: 'DELETE' });
      if (validRows.length > 0) {
        const res = await fetch('/api/line-polish-tool-usage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            report_id: toolModalReport.id,
            shift: toolModalReport.shift,
            usages: validRows.map(r => ({
              tool_type: r.tool_type,
              grade: r.grade,
              brand: r.brand || null,
              sqft_produced: 0,
              notes: r.notes || null,
              after_row_index: r.after_row_index ?? -1,
            }))
          })
        });
        if (!res.ok) throw new Error('Save failed');
      }
      await fetchToolUsages();
      showToast('success', `Tool changes saved for ${formatDisplayDate(toolModalReport.date)} ${toolModalReport.shift === 'MORNING' ? 'Morning' : 'Night'}`);
      closeToolModal();
    } catch {
      showToast('error', 'Failed to save tool changes');
    } finally {
      setToolModalSaving(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentLoading(true);

    try {
      const submitData = {
        payment_date: paymentForm.payment_date,
        amount: parseFloat(paymentForm.amount) || 0,
        payment_method: paymentForm.payment_method,
        reference_number: paymentForm.reference_number.trim() || null,
        remarks: paymentForm.remarks.trim() || null
      };

      const response = await fetch('/api/line-polish-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });

      if (response.ok) {
        setPaymentForm({
          payment_date: new Date().toISOString().split('T')[0],
          amount: '',
          payment_method: 'CASH',
          reference_number: '',
          remarks: ''
        });
        await fetchPayments();
        
        // Update monthly balance for the payment's month
        const paymentMonth = submitData.payment_date.slice(0, 7);
        await updateMonthlyBalance(paymentMonth);
      } else {
        console.error('Failed to record payment');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleStartEditRemarks = (payment: LinePolishPayment) => {
    setEditingRemarksId(payment.id);
    setEditingRemarksText(payment.remarks || '');
  };

  const handleCancelEditRemarks = () => {
    setEditingRemarksId(null);
    setEditingRemarksText('');
  };

  const handleSaveRemarks = async (paymentId: string) => {
    try {
      const payment = payments.find(p => p.id === paymentId);
      if (!payment) return;

      const response = await fetch(`/api/line-polish-payments/${paymentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_date: payment.payment_date,
          amount: payment.amount,
          payment_method: payment.payment_method,
          reference_number: payment.reference_number,
          remarks: editingRemarksText.trim() || null
        })
      });

      if (response.ok) {
        await fetchPayments();
        setEditingRemarksId(null);
        setEditingRemarksText('');
      } else {
        alert('Failed to update notes');
      }
    } catch (error) {
      console.error('Error updating notes:', error);
      alert('Error updating notes');
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment?')) {
      return;
    }

    try {
      const payment = payments.find(p => p.id === id);
      
      const response = await fetch(`/api/line-polish-payments/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchPayments();
        
        // Update monthly balance for the deleted payment's month
        if (payment) {
          const paymentMonth = payment.payment_date.slice(0, 7);
          await updateMonthlyBalance(paymentMonth);
        }
      }
    } catch (error) {
      console.error('Error deleting payment:', error);
    }
  };

  // Filter reports by selected month and activity
  const filterReportsByMonth = (reportsToFilter: LinePolishReport[]) => {
    let filtered = reportsToFilter;
    
    // Filter by month
    if (!showAllRecords) {
      filtered = filtered.filter(report => {
        const reportMonth = report.date.slice(0, 7); // Get YYYY-MM from date
        return reportMonth === selectedMonth;
      });
    }
    
    // Filter by activity
    if (selectedActivity !== 'ALL') {
      filtered = filtered.filter(report => report.activity === selectedActivity);
    }
    
    return filtered;
  };

  // Memoize filtered reports for sorting
  const filteredReports = useMemo(() => filterReportsByMonth(reports), [reports, selectedMonth, showAllRecords, selectedActivity]);
  
  // Add sorting for reports table
  const { sortedData: sortedReports, sortConfig: reportsSortConfig, requestSort: requestReportsSort } = useTableSort(filteredReports);

  // Detect missing dates in the selected month
  const getMissingDates = () => {
    if (showAllRecords) return [];
    
    const today = new Date();
    const [year, month] = selectedMonth.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, 1);
    
    // If selected month is in the future, no missing dates
    if (selectedDate.getFullYear() > today.getFullYear() || 
        (selectedDate.getFullYear() === today.getFullYear() && selectedDate.getMonth() > today.getMonth())) {
      return [];
    }
    
    // Get the last day to check (yesterday if current month, last day of month if past month)
    let lastDayToCheck;
    if (selectedDate.getFullYear() === today.getFullYear() && selectedDate.getMonth() === today.getMonth()) {
      // Current month - check up to yesterday
      lastDayToCheck = today.getDate() - 1;
    } else {
      // Past month - check entire month
      lastDayToCheck = new Date(year, month, 0).getDate();
    }
    
    if (lastDayToCheck < 1) return []; // If today is the 1st, no dates to check yet
    
    // Get all dates that have reports in the selected month
    const reportDates = new Set(
      reports
        .filter(report => report.date.slice(0, 7) === selectedMonth)
        .map(report => report.date)
    );
    
    // Find missing dates
    const missingDates = [];
    for (let day = 1; day <= lastDayToCheck; day++) {
      const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
      if (!reportDates.has(dateStr)) {
        missingDates.push(day);
      }
    }
    
    return missingDates;
  };

  const missingDates = getMissingDates();

  // Memoize filtered payments for sorting
  const filteredPayments = useMemo(() => 
    payments.filter(p => showAllRecords || p.payment_date.slice(0, 7) === selectedMonth),
    [payments, selectedMonth, showAllRecords]
  );
  
  // Add sorting for payments table
  const { sortedData: sortedPayments, sortConfig: paymentsSortConfig, requestSort: requestPaymentsSort } = useTableSort(filteredPayments);

  // Get unique months from all reports for the dropdown
  const getAvailableMonths = () => {
    const months = new Set<string>();
    reports.forEach(report => {
      const month = report.date.slice(0, 7);
      months.add(month);
    });
    return Array.from(months).sort().reverse(); // Most recent first
  };

  // Get last 6 months for previous due dropdown
  const getLastSixMonths = () => {
    const months: string[] = [];
    const today = new Date();
    
    for (let i = 0; i < 6; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.push(yearMonth);
    }
    
    return months;
  };

  // Generate dynamic months for dropdown (12 months back, current month, 3 months forward)
  const getDynamicMonths = () => {
    const months: string[] = [];
    const today = new Date();
    
    // 12 months back
    for (let i = 12; i >= 1; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.push(yearMonth);
    }
    
    // Current month
    const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    months.push(currentYearMonth);
    
    // 3 months forward
    for (let i = 1; i <= 3; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.push(yearMonth);
    }
    
    return months;
  };

  // Generate dynamic years (3 years back, current year, 2 years forward)
  const getDynamicYears = () => {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    
    for (let i = 3; i >= -2; i--) {
      years.push(currentYear - i);
    }
    
    return years;
  };

  // Calculate metrics for the selected month
  const calculateMetrics = () => {
    // Filter reports for selected month only (not by activity for totals)
    const monthReports = reports.filter(report => {
      if (showAllRecords) return true;
      const reportMonth = report.date.slice(0, 7);
      return reportMonth === selectedMonth;
    });
    
    // Filter by activity type - support both old and new activity names
    const polishingReports = monthReports.filter(r => 
      r.activity === 'POLISHING' || 
      r.activity?.includes('Polishing')
    );
    const grindingReports = monthReports.filter(r => 
      r.activity === 'GRINDING' || 
      r.activity?.includes('Grinding')
    );
    
    // Calculate total sqft from ALL reports (not just polishing/grinding)
    const totalSqft = monthReports.reduce((sum, r) => sum + (r.total_sqft || 0), 0);
    
    // Calculate payments for selected month
    const monthPayments = payments.filter(p => {
      if (showAllRecords) return true;
      return p.payment_date.slice(0, 7) === selectedMonth;
    });
    const totalPaid = monthPayments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
    
    // Calculate total work amount
    const totalAmount = monthReports.reduce((sum, r) => sum + parseFloat(r.debit_amount.toString()), 0);
    
    // Sum all previous dues for the selected month
    const totalPreviousDues = previousDues.reduce((sum, due) => sum + parseFloat(due.amount.toString()), 0);
    
    // Pending = Total Amount + Total Previous Dues - Paid This Month
    const pending = totalAmount + totalPreviousDues - totalPaid;
    
    return {
      totalHours: monthReports.reduce((sum, r) => sum + r.no_of_hours, 0),
      totalSqft: totalSqft, // Total from ALL activities
      polishingSqft: polishingReports.reduce((sum, r) => sum + (r.total_sqft || 0), 0),
      grindingSqft: grindingReports.reduce((sum, r) => sum + (r.total_sqft || 0), 0),
      totalAmount,
      totalPaid,
      pending,
      totalPreviousDues,
    };
  };

  const metrics = calculateMetrics();

  // Calculate filtered month reports for display
  const monthReports = reports.filter(report => {
    if (showAllRecords) return true;
    const reportMonth = report.date.slice(0, 7);
    return reportMonth === selectedMonth;
  });

  return (
    <AppLayout>
      <div className="min-h-screen w-full bg-gray-50 p-4 sm:p-6 space-y-4">
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold">Line Polish Reports</h1>
              <p className="text-gray-600">Manage line polish records and payments</p>
            </div>
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              ← Back to Dashboard
            </button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <select
                value={selectedMonth ? new Date(selectedMonth + '-01').getFullYear() : new Date().getFullYear()}
                onChange={(e) => {
                  // If "All Months" is selected, keep current month when changing year
                  const currentMonth = selectedMonth 
                    ? new Date(selectedMonth + '-01').getMonth() 
                    : new Date().getMonth();
                  setSelectedMonth(`${e.target.value}-${String(currentMonth + 1).padStart(2, '0')}`);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {getDynamicYears().map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">All Months</option>
                {getDynamicMonths().map(month => {
                  const date = new Date(month + '-01');
                  const monthName = date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
                  return (
                    <option key={month} value={month}>{monthName}</option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <Input
                type="date"
                placeholder="dd/mm/yyyy"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <Input
                type="date"
                placeholder="dd/mm/yyyy"
                className="w-full"
              />
            </div>

            <Button
              variant="outline"
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>
          
          {/* Month Selector - Top Right */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Line Polish Reports</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowPreviousDueForm(!showPreviousDueForm)}
                  className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                >
                  + Add Previous Month Due
                </button>
              </div>
            </div>

            {/* Previous Due Form */}
            {showPreviousDueForm && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-300 rounded-lg">
                <h3 className="text-sm font-semibold text-amber-900 mb-3">
                  Add Previous Month Due to {new Date(selectedMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                </h3>
                <p className="text-xs text-amber-700 mb-3">
                  Carry forward dues from previous months to the current month ({new Date(selectedMonth + '-01').toLocaleDateString('en-IN', { month: 'short' })})
                </p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">From Which Month?</label>
                    <select
                      value={previousDueForm.previous_month}
                      onChange={(e) => setPreviousDueForm(prev => ({ ...prev, previous_month: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                    >
                      <option value="">Select month...</option>
                      {getLastSixMonths().slice(1).map(month => {
                        const date = new Date(month + '-01');
                        const monthName = date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
                        return (
                          <option key={month} value={month}>{monthName}</option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Amount (₹)</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={previousDueForm.amount}
                      onChange={(e) => setPreviousDueForm(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="Enter amount"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Remarks (Optional)</label>
                    <Input
                      type="text"
                      value={previousDueForm.remarks}
                      onChange={(e) => setPreviousDueForm(prev => ({ ...prev, remarks: e.target.value }))}
                      placeholder="Add note"
                      className="text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={async () => {
                        if (!previousDueForm.previous_month || !previousDueForm.amount) {
                          alert('Please select month and enter amount');
                          return;
                        }
                        setSavingPreviousDue(true);
                        try {
                          const response = await fetch('/api/line-polish-previous-dues', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              current_month: selectedMonth,
                              previous_month: previousDueForm.previous_month,
                              amount: parseFloat(previousDueForm.amount),
                              remarks: previousDueForm.remarks.trim() || null
                            })
                          });
                          if (response.ok) {
                            alert('Previous due added successfully!');
                            setPreviousDueForm({ previous_month: '', amount: '', remarks: '' });
                            await fetchPreviousDues();
                          } else {
                            alert('Failed to add previous due');
                          }
                        } catch (error) {
                          console.error('Error adding previous due:', error);
                          alert('Error adding previous due');
                        } finally {
                          setSavingPreviousDue(false);
                        }
                      }}
                      disabled={savingPreviousDue}
                      className="bg-amber-600 hover:bg-amber-700 text-white flex-1"
                    >
                      {savingPreviousDue ? 'Adding...' : 'Add Due'}
                    </Button>
                    <Button
                      onClick={() => setShowPreviousDueForm(false)}
                      variant="outline"
                      className="text-gray-600"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Metrics Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Workers</p>
                  <p className="text-2xl font-bold text-gray-900">3</p>
                </div>
                <Users className="w-8 h-8 text-green-500" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Slabs</p>
                  <p className="text-2xl font-bold text-gray-900">{monthReports.reduce((sum, r) => sum + (r.total_slabs || r.number_of_slabs || 0), 0).toLocaleString('en-IN')}</p>
                </div>
                <Layers className="w-8 h-8 text-indigo-500" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total SqFt</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.totalSqft.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-orange-500" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Hours</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.totalHours.toLocaleString('en-IN')}</p>
                </div>
                <Clock className="w-8 h-8 text-blue-500" />
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600">Total Debit</p>
                  <p className="text-2xl font-bold text-red-900">{fmt(metrics.totalAmount)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-red-500" />
              </div>
            </Card>

            <Card className="p-4 bg-purple-50 border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-700">Previous Due</p>
                  <p className="text-2xl font-bold text-purple-900">{fmt(metrics.totalPreviousDues)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </Card>

            <Card className="p-4 bg-green-50 border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700">Total Credit</p>
                  <p className="text-2xl font-bold text-green-900">{fmt(metrics.totalPaid)}</p>
                </div>
                <CreditCard className="w-8 h-8 text-green-600" />
              </div>
            </Card>

            <Card className="p-4 bg-amber-50 border-amber-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-700">Final Balance Due</p>
                  <p className="text-2xl font-bold text-amber-900">{fmt(metrics.pending)}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-amber-600" />
              </div>
            </Card>
          </div>

          {/* Add Polish Report - Dual Shift Form */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b bg-indigo-50">
              <h2 className="text-lg font-semibold text-indigo-900">Add Line Polish Report</h2>
              <p className="text-sm text-indigo-600 mt-1">Enter data for both shifts and submit together</p>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Unsaved Changes Warning Banner */}
                {hasUnsavedChanges && (
                  <UnsavedChangesIndicator hasUnsavedChanges={hasUnsavedChanges} />
                )}

                {/* Markdown Message Parser */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Quick Fill from Markdown Table
                  </h3>
                  <textarea
                    placeholder="Paste your markdown table here (with Day Shift and Night Shift sections) and click 'Auto Fill'..."
                    className="w-full p-3 border border-blue-300 rounded-lg text-sm font-mono resize-y min-h-[160px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    id="markdown-message"
                  />
                  <div className="flex gap-3 mt-3">
                    <Button
                      type="button"
                      onClick={() => {
                        const textarea = document.getElementById('markdown-message') as HTMLTextAreaElement;
                        if (textarea.value.trim()) {
                          parseMarkdownMessage(textarea.value);
                          textarea.value = '';
                        } else {
                          showToast('error', 'Please paste markdown data first');
                        }
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      Auto Fill from Markdown
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        const freshFormData = initialFormData;
                        setFormData(freshFormData);
                        setInitialFormState(freshFormData);
                        const textarea = document.getElementById('markdown-message') as HTMLTextAreaElement;
                        if (textarea) textarea.value = '';
                        showToast('success', 'Form cleared successfully');
                      }}
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                    >
                      Clear Form
                    </Button>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Paste the markdown table with Day Shift and Night Shift sections (including hours). The parser will extract block names, materials, processes, quantities, hours, and sqft automatically.
                  </p>
                </div>

                {/* Common Date Field */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="max-w-xs">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => handleInputChange('date', e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* MORNING SHIFT SECTION */}
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold">A</div>
                    <h3 className="text-sm font-semibold text-amber-900">Morning Shift</h3>
                  </div>

                  {/* Morning Shift Details */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Workers</label>
                      <Input
                        type="number"
                        min="1"
                        value={formData.morning.no_of_workers}
                        onChange={(e) => handleShiftInputChange('morning', 'no_of_workers', e.target.value)}
                        className="text-sm h-8"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Total Hours</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="145"
                        value={formData.morning.no_of_hours}
                        onChange={(e) => handleShiftInputChange('morning', 'no_of_hours', e.target.value)}
                        className="text-sm h-8"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Rate/Hr (₹)</label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.morning.rate_per_hour}
                        onChange={(e) => handleShiftInputChange('morning', 'rate_per_hour', e.target.value)}
                        className="text-sm h-8"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Remarks</label>
                      <Input
                        type="text"
                        placeholder="Optional notes"
                        value={formData.morning.remarks}
                        onChange={(e) => handleShiftInputChange('morning', 'remarks', e.target.value)}
                        className="text-sm h-8"
                      />
                    </div>
                  </div>

                  {/* Morning Activity Rows with Inline Tool Changes */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-900">Activity Details</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addActivityRow('morning')}
                        className="text-amber-700 border-amber-600 hover:bg-amber-100"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Activity
                      </Button>
                    </div>

                    <div className="border border-amber-200 rounded-lg overflow-hidden bg-white">
                      <table className="w-full">
                        <thead className="bg-amber-100">
                          <tr>
                            <th className="px-2 py-1 text-left text-xs font-medium text-gray-700">Block Name</th>
                            <th className="px-2 py-1 text-left text-xs font-medium text-gray-700">Activity Type</th>
                            <th className="px-2 py-1 text-left text-xs font-medium text-gray-700">Slabs</th>
                            <th className="px-2 py-1 text-left text-xs font-medium text-gray-700">Sq Ft</th>
                            <th className="px-2 py-1 text-left text-xs font-medium text-gray-700">Grade (Optional)</th>
                            <th className="px-2 py-1 text-center text-xs font-medium text-gray-700 w-16">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {/* Tools installed at start of shift (before any activity row) */}
                          {renderInlineToolRows('morning', -1)}
                          {formData.morning.activityRows.map((row, idx) => (
                            <Fragment key={row.id}>
                              <tr className="hover:bg-amber-50">
                                <td className="px-2 py-1">
                                  <Input
                                    type="text"
                                    placeholder="e.g., AVG-1A"
                                    value={row.block_name}
                                    onChange={(e) => handleActivityRowChange('morning', row.id, 'block_name', e.target.value)}
                                    className="text-xs h-7"
                                  />
                                </td>
                                <td className="px-2 py-1">
                                  <select
                                    value={row.activity}
                                    onChange={(e) => handleActivityRowChange('morning', row.id, 'activity', e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs h-7 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                                  >
                                    <optgroup label="S/G (Steel Grey)">
                                      <option value="S/G Polishing">S/G Polishing</option>
                                      <option value="S/G Laputra">S/G Laputra</option>
                                      <option value="S/G Grinding">S/G Grinding</option>
                                      <option value="S/G Polish Grinding">S/G Polish Grinding</option>
                                      <option value="S/G Laputra Grinding">S/G Laputra Grinding</option>
                                    </optgroup>
                                    <optgroup label="B/P (Black Pearl)">
                                      <option value="B/P Polishing">B/P Polishing</option>
                                      <option value="B/P Laputra">B/P Laputra</option>
                                      <option value="B/P Grinding">B/P Grinding</option>
                                      <option value="B/P Polish Grinding">B/P Polish Grinding</option>
                                      <option value="B/P Laputra Grinding">B/P Laputra Grinding</option>
                                    </optgroup>
                                    <optgroup label="Burgandy">
                                      <option value="Burgandy Polishing">Burgandy Polishing</option>
                                      <option value="Burgandy Grinding">Burgandy Grinding</option>
                                      <option value="Burgandy Polish Grinding">Burgandy Polish Grinding</option>
                                    </optgroup>
                                  </select>
                                </td>
                                <td className="px-2 py-1">
                                  <Input
                                    type="number"
                                    min="0"
                                    placeholder="14"
                                    value={row.number_of_slabs}
                                    onChange={(e) => handleActivityRowChange('morning', row.id, 'number_of_slabs', e.target.value)}
                                    className="text-xs h-7"
                                  />
                                </td>
                                <td className="px-2 py-1">
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="1234.50"
                                    value={row.total_sqft}
                                    onChange={(e) => handleActivityRowChange('morning', row.id, 'total_sqft', e.target.value)}
                                    className="text-xs h-7"
                                  />
                                </td>
                                <td className="px-2 py-1">
                                  <div className="flex items-center gap-1">
                                    <select
                                      value={row.grade || ''}
                                      onChange={(e) => handleActivityRowChange('morning', row.id, 'grade', e.target.value)}
                                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs h-7 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                                    >
                                      <option value="">-- Select Grade --</option>
                                      {availableGrades.map(g => (
                                        <option key={g} value={g}>{g}</option>
                                      ))}
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() => setShowAddGrade(true)}
                                      className="text-green-600 hover:text-green-800 flex-shrink-0"
                                      title="Add new grade"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>
                                <td className="px-2 py-1 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => removeActivityRow('morning', row.id)}
                                      disabled={formData.morning.activityRows.length === 1}
                                      className="text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                                      title="Remove activity"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => addToolUsageRow('morning', idx)}
                                      className="text-orange-500 hover:text-orange-700"
                                      title="Add tool change after this row"
                                    >🔧</button>
                                  </div>
                                </td>
                              </tr>
                              {/* Inline tool change rows after this activity row */}
                              {renderInlineToolRows('morning', idx)}
                            </Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Morning Totals */}
                    <div className="bg-amber-100 border border-amber-300 rounded-lg p-2">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-gray-600">Total Slabs:</span>
                          <span className="ml-2 font-semibold text-gray-900">{calculateShiftTotals('morning').totalSlabs}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Total Sq Ft:</span>
                          <span className="ml-2 font-semibold text-gray-900">{calculateShiftTotals('morning').totalSqft.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Total Amount:</span>
                          <span className="ml-2 font-semibold text-amber-700">{fmt(calculateShiftTotals('morning').totalAmount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* EVENING SHIFT SECTION */}
                <div className="bg-indigo-50 border border-indigo-300 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 text-xs bg-indigo-500 text-white rounded-full flex items-center justify-center font-bold">B</div>
                    <h3 className="text-sm font-semibold text-indigo-900">Evening Shift</h3>
                  </div>

                  {/* Evening Shift Details */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Workers</label>
                      <Input
                        type="number"
                        min="1"
                        value={formData.evening.no_of_workers}
                        onChange={(e) => handleShiftInputChange('evening', 'no_of_workers', e.target.value)}
                        className="text-sm h-8"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Total Hours</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="145"
                        value={formData.evening.no_of_hours}
                        onChange={(e) => handleShiftInputChange('evening', 'no_of_hours', e.target.value)}
                        className="text-sm h-8"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Rate/Hr (₹)</label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.evening.rate_per_hour}
                        onChange={(e) => handleShiftInputChange('evening', 'rate_per_hour', e.target.value)}
                        className="text-sm h-8"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Remarks</label>
                      <Input
                        type="text"
                        placeholder="Optional notes"
                        value={formData.evening.remarks}
                        onChange={(e) => handleShiftInputChange('evening', 'remarks', e.target.value)}
                        className="text-sm h-8"
                      />
                    </div>
                  </div>

                  {/* Evening Activity Rows with Inline Tool Changes */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-900">Activity Details</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addActivityRow('evening')}
                        className="text-indigo-700 border-indigo-600 hover:bg-indigo-100"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Activity
                      </Button>
                    </div>

                    <div className="border border-indigo-200 rounded-lg overflow-hidden bg-white">
                      <table className="w-full">
                        <thead className="bg-indigo-100">
                          <tr>
                            <th className="px-2 py-1 text-left text-xs font-medium text-gray-700">Block Name</th>
                            <th className="px-2 py-1 text-left text-xs font-medium text-gray-700">Activity Type</th>
                            <th className="px-2 py-1 text-left text-xs font-medium text-gray-700">Slabs</th>
                            <th className="px-2 py-1 text-left text-xs font-medium text-gray-700">Sq Ft</th>
                            <th className="px-2 py-1 text-left text-xs font-medium text-gray-700">Grade (Optional)</th>
                            <th className="px-2 py-1 text-center text-xs font-medium text-gray-700 w-16">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {/* Tools installed at start of shift (before any activity row) */}
                          {renderInlineToolRows('evening', -1)}
                          {formData.evening.activityRows.map((row, idx) => (
                            <Fragment key={row.id}>
                              <tr className="hover:bg-indigo-50">
                                <td className="px-2 py-1">
                                  <Input
                                    type="text"
                                    placeholder="e.g., AVG-1A"
                                    value={row.block_name}
                                    onChange={(e) => handleActivityRowChange('evening', row.id, 'block_name', e.target.value)}
                                    className="text-xs h-7"
                                  />
                                </td>
                                <td className="px-2 py-1">
                                  <select
                                    value={row.activity}
                                    onChange={(e) => handleActivityRowChange('evening', row.id, 'activity', e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs h-7 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                  >
                                    <optgroup label="S/G (Steel Grey)">
                                      <option value="S/G Polishing">S/G Polishing</option>
                                      <option value="S/G Laputra">S/G Laputra</option>
                                      <option value="S/G Grinding">S/G Grinding</option>
                                      <option value="S/G Polish Grinding">S/G Polish Grinding</option>
                                      <option value="S/G Laputra Grinding">S/G Laputra Grinding</option>
                                    </optgroup>
                                    <optgroup label="B/P (Black Pearl)">
                                      <option value="B/P Polishing">B/P Polishing</option>
                                      <option value="B/P Laputra">B/P Laputra</option>
                                      <option value="B/P Grinding">B/P Grinding</option>
                                      <option value="B/P Polish Grinding">B/P Polish Grinding</option>
                                      <option value="B/P Laputra Grinding">B/P Laputra Grinding</option>
                                    </optgroup>
                                    <optgroup label="Burgandy">
                                      <option value="Burgandy Polishing">Burgandy Polishing</option>
                                      <option value="Burgandy Grinding">Burgandy Grinding</option>
                                      <option value="Burgandy Polish Grinding">Burgandy Polish Grinding</option>
                                    </optgroup>
                                  </select>
                                </td>
                                <td className="px-2 py-1">
                                  <Input
                                    type="number"
                                    min="0"
                                    placeholder="14"
                                    value={row.number_of_slabs}
                                    onChange={(e) => handleActivityRowChange('evening', row.id, 'number_of_slabs', e.target.value)}
                                    className="text-xs h-7"
                                  />
                                </td>
                                <td className="px-2 py-1">
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="1234.50"
                                    value={row.total_sqft}
                                    onChange={(e) => handleActivityRowChange('evening', row.id, 'total_sqft', e.target.value)}
                                    className="text-xs h-7"
                                  />
                                </td>
                                <td className="px-2 py-1">
                                  <div className="flex items-center gap-1">
                                    <select
                                      value={row.grade || ''}
                                      onChange={(e) => handleActivityRowChange('evening', row.id, 'grade', e.target.value)}
                                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs h-7 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                    >
                                      <option value="">-- Select Grade --</option>
                                      {availableGrades.map(g => (
                                        <option key={g} value={g}>{g}</option>
                                      ))}
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() => setShowAddGrade(true)}
                                      className="text-green-600 hover:text-green-800 flex-shrink-0"
                                      title="Add new grade"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>
                                <td className="px-2 py-1 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => removeActivityRow('evening', row.id)}
                                      disabled={formData.evening.activityRows.length === 1}
                                      className="text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                                      title="Remove activity"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => addToolUsageRow('evening', idx)}
                                      className="text-orange-500 hover:text-orange-700"
                                      title="Add tool change after this row"
                                    >🔧</button>
                                  </div>
                                </td>
                              </tr>
                              {/* Inline tool change rows after this activity row */}
                              {renderInlineToolRows('evening', idx)}
                            </Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Evening Totals */}
                    <div className="bg-indigo-100 border border-indigo-300 rounded-lg p-2">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-gray-600">Total Slabs:</span>
                          <span className="ml-2 font-semibold text-gray-900">{calculateShiftTotals('evening').totalSlabs}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Total Sq Ft:</span>
                          <span className="ml-2 font-semibold text-gray-900">{calculateShiftTotals('evening').totalSqft.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Total Amount:</span>
                          <span className="ml-2 font-semibold text-indigo-700">{fmt(calculateShiftTotals('evening').totalAmount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* COMBINED TOTAL (Morning + Evening) */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">∑</div>
                    <h3 className="text-sm font-bold text-purple-900">Total (Morning + Evening)</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-white rounded-lg p-2 border border-purple-200">
                      <div className="text-xs text-gray-600 mb-1">Total Slabs</div>
                      <div className="text-lg font-bold text-gray-900">
                        {calculateShiftTotals('morning').totalSlabs + calculateShiftTotals('evening').totalSlabs}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Morning: {calculateShiftTotals('morning').totalSlabs} + Evening: {calculateShiftTotals('evening').totalSlabs}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-2 border border-purple-200">
                      <div className="text-xs text-gray-600 mb-1">Total Sq Ft</div>
                      <div className="text-lg font-bold text-gray-900">
                        {(calculateShiftTotals('morning').totalSqft + calculateShiftTotals('evening').totalSqft).toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Morning: {calculateShiftTotals('morning').totalSqft.toFixed(2)} + Evening: {calculateShiftTotals('evening').totalSqft.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-2 border border-purple-200">
                      <div className="text-xs text-gray-600 mb-1">Total Amount</div>
                      <div className="text-lg font-bold text-purple-700">
                        {fmt(calculateShiftTotals('morning').totalAmount + calculateShiftTotals('evening').totalAmount)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Morning: {fmt(calculateShiftTotals('morning').totalAmount)} + Evening: {fmt(calculateShiftTotals('evening').totalAmount)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Button - ONE for both shifts */}
                <div className="flex items-center justify-center pt-2 border-t">
                  <Button 
                    type="submit" 
                    disabled={loading}
                    size="sm"
                    className="bg-gradient-to-r from-amber-600 to-indigo-600 text-white hover:from-amber-700 hover:to-indigo-700 flex items-center shadow-lg"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                        Saving Both Shifts...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-1" />
                        Submit Both Shifts
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Payment Recording Section */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b bg-green-50">
              <h2 className="text-lg font-semibold text-green-900">Record Payment</h2>
            </div>
            
            <div className="p-6">
              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Date</label>
                    <Input
                      type="date"
                      value={paymentForm.payment_date}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, payment_date: e.target.value }))}
                      placeholder="dd/mm/yyyy"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount (₹)</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="Enter amount paid"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                    <select 
                      value={paymentForm.payment_method}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, payment_method: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                      required
                    >
                      <option value="CASH">Cash</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="UPI">UPI</option>
                      <option value="CHEQUE">Cheque</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                    <Input
                      type="text"
                      value={paymentForm.remarks}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, remarks: e.target.value }))}
                      placeholder="Add notes"
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <Button 
                      type="submit"
                      disabled={paymentLoading}
                      className="bg-green-600 text-white hover:bg-green-700 flex items-center w-full"
                    >
                      {paymentLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      ) : (
                        <Plus className="w-4 h-4 mr-2" />
                      )}
                      Record Payment
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Reports Table with Filters */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-green-50">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Line Polish Reports
                  </h3>
                  
                  {/* Month Filter */}
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={showAllRecords}
                        onChange={(e) => setShowAllRecords(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <span className="font-medium">Show All</span>
                    </label>
                    
                    {!showAllRecords && (
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                      >
                      {getAvailableMonths().map(month => {
                        const date = new Date(month + '-01');
                        const monthName = date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
                        return (
                          <option key={month} value={month}>{monthName}</option>
                        );
                      })}
                    </select>
                  )}
                  </div>
                </div>
                
                {/* Activity Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Filter by Activity:</span>
                  <select
                    value={selectedActivity}
                    onChange={(e) => setSelectedActivity(e.target.value as ActivityType | 'ALL')}
                    className="px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                  >
                    <option value="ALL">All Activities</option>
                    <optgroup label="S/G (Steel Grey)">
                      <option value="S/G Polishing">S/G Polishing</option>
                      <option value="S/G Laputra">S/G Laputra</option>
                      <option value="S/G Grinding">S/G Grinding</option>
                      <option value="S/G Polish Grinding">S/G Polish Grinding</option>
                      <option value="S/G Laputra Grinding">S/G Laputra Grinding</option>
                    </optgroup>
                    <optgroup label="B/P (Black Pearl)">
                      <option value="B/P Polishing">B/P Polishing</option>
                      <option value="B/P Laputra">B/P Laputra</option>
                      <option value="B/P Grinding">B/P Grinding</option>
                      <option value="B/P Polish Grinding">B/P Polish Grinding</option>
                      <option value="B/P Laputra Grinding">B/P Laputra Grinding</option>
                    </optgroup>
                    <optgroup label="Burgandy">
                      <option value="Burgandy Polishing">Burgandy Polishing</option>
                      <option value="Burgandy Grinding">Burgandy Grinding</option>
                      <option value="Burgandy Polish Grinding">Burgandy Polish Grinding</option>
                    </optgroup>
                    <optgroup label="Legacy (Old Data)">
                      <option value="POLISHING">Polishing (Old)</option>
                      <option value="GRINDING">Grinding (Old)</option>
                    </optgroup>
                  </select>
                </div>
              </div>
              
              <p className="text-sm text-gray-700 mt-2">
                {showAllRecords ? 'All Time' : new Date(selectedMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} Total: ₹{filteredReports.reduce((sum, r) => sum + parseFloat(r.debit_amount.toString()), 0).toLocaleString('en-IN')} ({filteredReports.length} transactions)
              </p>
            </div>
            
            {/* Missing Dates Warning */}
            {!showAllRecords && missingDates.length > 0 && (
              <div className="px-6 py-4 bg-amber-50 border-b border-amber-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-amber-900 mb-1">
                      Missing Dates Detected
                    </h4>
                    <p className="text-sm text-amber-800 mb-2">
                      The following dates are missing reports for {new Date(selectedMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {missingDates.map(day => {
                        const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
                        const dateObj = new Date(dateStr);
                        return (
                          <span 
                            key={day}
                            className="inline-flex items-center px-2 py-1 bg-white border border-amber-300 rounded text-xs font-medium text-amber-900"
                          >
                            {dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        );
                      })}
                    </div>
                    <p className="text-xs text-amber-700 mt-2">
                      💡 Tip: Make sure to add reports for all working dates to maintain complete records.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="overflow-x-auto">
              {reportsLoading ? (
                <div className="text-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-gray-600">Loading reports...</p>
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No reports found for the selected filters.</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="py-3 px-4">
                        <SortButton column="date" sortConfig={reportsSortConfig} onSort={requestReportsSort} label="Date" align="left" />
                      </th>
                      <th className="py-3 px-4">
                        <SortButton column="shift" sortConfig={reportsSortConfig} onSort={requestReportsSort} label="Shift" align="left" />
                      </th>
                      <th className="py-3 px-4">
                        <SortButton column="activity" sortConfig={reportsSortConfig} onSort={requestReportsSort} label="Activity" align="left" />
                      </th>
                      <th className="py-3 px-4">
                        <SortButton column="no_of_workers" sortConfig={reportsSortConfig} onSort={requestReportsSort} label="Workers" align="left" />
                      </th>
                      <th className="py-3 px-4">
                        <SortButton column="total_slabs" sortConfig={reportsSortConfig} onSort={requestReportsSort} label="Slabs" align="right" />
                      </th>
                      <th className="py-3 px-4">
                        <SortButton column="total_sqft" sortConfig={reportsSortConfig} onSort={requestReportsSort} label="Sq Ft" align="right" />
                      </th>
                      <th className="py-3 px-4">
                        <SortButton column="no_of_hours" sortConfig={reportsSortConfig} onSort={requestReportsSort} label="Hours" align="right" />
                      </th>
                      <th className="py-3 px-4">
                        <SortButton column="debit_amount" sortConfig={reportsSortConfig} onSort={requestReportsSort} label="Amount (₹)" align="right" />
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Note</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedReports.map((report) => (
                      <tr key={report.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{formatDisplayDate(report.date)}</td>
                        <td className="py-3 px-4">{report.shift === 'MORNING' ? 'A (Morning)' : 'B (Night)'}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            report.activity === 'POLISHING' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {report.activity}
                          </span>
                        </td>
                        <td className="py-3 px-4">{report.no_of_workers}</td>
                        <td className="py-3 px-4 text-right">{report.total_slabs || report.number_of_slabs || 0}</td>
                        <td className="py-3 px-4 text-right">{report.total_sqft}</td>
                        <td className="py-3 px-4 text-right">{report.no_of_hours}</td>
                        <td className="py-3 px-4 text-right">₹{parseFloat(report.debit_amount.toString()).toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4">{report.remarks || '-'}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center space-x-2">
                            <Button
                              onClick={() => handleEdit(report)}
                              size="sm"
                              variant="outline"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => openToolModal(report)}
                              size="sm"
                              variant="outline"
                              className="text-orange-600 hover:text-orange-800"
                              title="Add / edit tool changes"
                            >
                              🔧
                            </Button>
                            <Button
                              onClick={() => handleDelete(report.id)}
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
              )}
            </div>
          </div>

          {/* Payments History Table */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b bg-emerald-50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-emerald-900">
                  Payment History & Previous Dues
                </h3>
              </div>
              <div className="flex gap-4 text-sm">
                <p className="text-emerald-700">
                  <span className="font-semibold">Paid:</span> ₹{filteredPayments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0).toLocaleString('en-IN')} ({filteredPayments.length} payments)
                </p>
                {!showAllRecords && previousDues.length > 0 && (
                  <p className="text-amber-700">
                    <span className="font-semibold">Previous Dues:</span> ₹{previousDues.reduce((sum, d) => sum + parseFloat(d.amount.toString()), 0).toLocaleString('en-IN')} ({previousDues.length} entries)
                  </p>
                )}
              </div>
            </div>
            
            {/* Previous Dues Section */}
            {!showAllRecords && previousDues.length > 0 && (
              <div className="p-4 bg-amber-25 border-b">
                <h4 className="text-sm font-semibold text-amber-900 mb-3">Previous Month Dues Carried Forward</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-amber-50">
                        <th className="text-left py-2 px-3 font-medium text-amber-800">From Month</th>
                        <th className="text-right py-2 px-3 font-medium text-amber-800">Amount (₹)</th>
                        <th className="text-left py-2 px-3 font-medium text-amber-800">Remarks</th>
                        <th className="text-center py-2 px-3 font-medium text-amber-800">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previousDues.map((due) => (
                        <tr key={due.id} className="border-b hover:bg-amber-50">
                          <td className="py-2 px-3">
                            {new Date(due.previous_month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-amber-700">
                            ₹{parseFloat(due.amount.toString()).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 px-3 text-gray-600">{due.remarks || '-'}</td>
                          <td className="py-2 px-3">
                            <div className="flex justify-center">
                              <button
                                onClick={async () => {
                                  if (!confirm('Remove this previous due entry?')) return;
                                  try {
                                    const response = await fetch(`/api/line-polish-previous-dues/${due.id}`, {
                                      method: 'DELETE'
                                    });
                                    if (response.ok) {
                                      await fetchPreviousDues();
                                    }
                                  } catch (error) {
                                    console.error('Error deleting previous due:', error);
                                  }
                                }}
                                className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded transition-colors"
                                title="Remove"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            <div className="overflow-x-auto">
              {filteredPayments.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No payments recorded for {showAllRecords ? 'this period' : new Date(selectedMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}.</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="py-3 px-4">
                        <SortButton column="payment_date" sortConfig={paymentsSortConfig} onSort={requestPaymentsSort} label="Date" align="left" />
                      </th>
                      <th className="py-3 px-4">
                        <SortButton column="amount" sortConfig={paymentsSortConfig} onSort={requestPaymentsSort} label="Amount (₹)" align="right" />
                      </th>
                      <th className="py-3 px-4">
                        <SortButton column="payment_method" sortConfig={paymentsSortConfig} onSort={requestPaymentsSort} label="Method" align="left" />
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Notes</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPayments.map((payment) => (
                      <tr key={payment.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{formatDisplayDate(payment.payment_date)}</td>
                        <td className="py-3 px-4 text-right font-semibold text-green-600">₹{parseFloat(payment.amount.toString()).toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {payment.payment_method.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {editingRemarksId === payment.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="text"
                                value={editingRemarksText}
                                onChange={(e) => setEditingRemarksText(e.target.value)}
                                placeholder="Add notes"
                                className="text-sm"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveRemarks(payment.id)}
                                className="text-green-600 hover:text-green-800 p-1 hover:bg-green-50 rounded transition-colors"
                                title="Save"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                onClick={handleCancelEditRemarks}
                                className="text-gray-600 hover:text-gray-800 p-1 hover:bg-gray-100 rounded transition-colors"
                                title="Cancel"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <span>{payment.remarks || '-'}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleStartEditRemarks(payment)}
                              className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition-colors"
                              title="Edit notes"
                              disabled={editingRemarksId === payment.id}
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePayment(payment.id)}
                              className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded transition-colors"
                              title="Delete payment"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Material-wise Activity Summary */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b bg-indigo-50">
              <h3 className="text-lg font-semibold text-indigo-900">
                Activity Summary for {new Date(selectedMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              </h3>
              <p className="text-sm text-indigo-600 mt-1">Material-wise breakdown of polished/ground slabs</p>
            </div>
            
            <div className="overflow-x-auto">
              {(() => {
                // Calculate activity summary from JSONB activities
                const activitySummary: Record<string, { slabs: number; sqft: number; count: number }> = {};
                
                monthReports.forEach(report => {
                  if (report.activities && Array.isArray(report.activities)) {
                    // New format: Parse JSONB activities array
                    report.activities.forEach((act: any) => {
                      const activityName = act.activity;
                      if (!activitySummary[activityName]) {
                        activitySummary[activityName] = { slabs: 0, sqft: 0, count: 0 };
                      }
                      activitySummary[activityName].slabs += act.slabs || 0;
                      activitySummary[activityName].sqft += act.sqft || 0;
                      activitySummary[activityName].count += 1;
                    });
                  } else if (report.activity) {
                    // Fallback for old format: Use activity field
                    const activityName = report.activity;
                    if (!activitySummary[activityName]) {
                      activitySummary[activityName] = { slabs: 0, sqft: 0, count: 0 };
                    }
                    activitySummary[activityName].slabs += report.number_of_slabs || 0;
                    activitySummary[activityName].sqft += report.total_sqft || 0;
                    activitySummary[activityName].count += 1;
                  }
                });

                // Sort by total slabs descending
                const sortedActivities = Object.entries(activitySummary)
                  .sort(([, a], [, b]) => b.slabs - a.slabs);

                // Group by granite type for summary cards
                const graniteTypeSummary: Record<string, { slabs: number; sqft: number }> = {
                  'S/G (Sadarahalli)': { slabs: 0, sqft: 0 },
                  'B/P (Black Pearl)': { slabs: 0, sqft: 0 },
                  'Burgandy': { slabs: 0, sqft: 0 },
                  'Other': { slabs: 0, sqft: 0 }
                };

                sortedActivities.forEach(([activity, stats]) => {
                  if (activity.startsWith('S/G')) {
                    graniteTypeSummary['S/G (Sadarahalli)'].slabs += stats.slabs;
                    graniteTypeSummary['S/G (Sadarahalli)'].sqft += stats.sqft;
                  } else if (activity.startsWith('B/P')) {
                    graniteTypeSummary['B/P (Black Pearl)'].slabs += stats.slabs;
                    graniteTypeSummary['B/P (Black Pearl)'].sqft += stats.sqft;
                  } else if (activity.startsWith('Burgandy')) {
                    graniteTypeSummary['Burgandy'].slabs += stats.slabs;
                    graniteTypeSummary['Burgandy'].sqft += stats.sqft;
                  } else {
                    graniteTypeSummary['Other'].slabs += stats.slabs;
                    graniteTypeSummary['Other'].sqft += stats.sqft;
                  }
                });

                return (
                  <>
                    {/* Granite Type Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 border-b">
                      {Object.entries(graniteTypeSummary).map(([type, stats]) => (
                        stats.slabs > 0 && (
                          <Card key={type} className="p-3">
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">{type}</h4>
                            <div className="space-y-1">
                              <p className="text-xs text-gray-600">
                                Slabs: <span className="font-bold text-indigo-600">{stats.slabs.toLocaleString('en-IN')}</span>
                              </p>
                              <p className="text-xs text-gray-600">
                                Sqft: <span className="font-bold text-indigo-600">{stats.sqft.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                              </p>
                            </div>
                          </Card>
                        )
                      ))}
                    </div>

                    {/* Detailed Activity Table */}
                    {sortedActivities.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-600">No activity data for this month.</p>
                      </div>
                    ) : (
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="text-left py-3 px-4 font-medium text-gray-700">Activity Type</th>
                            <th className="text-right py-3 px-4 font-medium text-gray-700">Total Slabs</th>
                            <th className="text-right py-3 px-4 font-medium text-gray-700">Total Sqft</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedActivities.map(([activity, stats]) => (
                            <tr key={activity} className="border-b hover:bg-indigo-50">
                              <td className="py-3 px-4">
                                <span className="font-medium text-gray-900">{activity}</span>
                              </td>
                              <td className="py-3 px-4 text-right font-semibold text-indigo-600 text-lg">
                                {stats.slabs.toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 text-right font-semibold text-indigo-600 text-lg">
                                {stats.sqft.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                          {/* Total Row */}
                          <tr className="border-t-2 bg-indigo-50 font-bold">
                            <td className="py-3 px-4 text-gray-900 text-lg">TOTAL</td>
                            <td className="py-3 px-4 text-right text-indigo-700 text-lg">
                              {sortedActivities.reduce((sum, [, stats]) => sum + stats.slabs, 0).toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-4 text-right text-indigo-700 text-lg">
                              {sortedActivities.reduce((sum, [, stats]) => sum + stats.sqft, 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* ─── Tool Usage Analytics ─── */}
          {(() => {
            if (toolUsages.length === 0) return null;

            // ── Compute lifetime SFT for each tool_usage record ──────────────
            // Logic:
            // 1. Build a sequential list of all activity rows across all reports
            // 2. For each tool_usage, use after_row_index to find which activities
            //    happen AFTER that tool was installed
            // 3. Sum only activities matching the tool's production category
            // 4. Continue summing until the next tool of same type is installed

            // Helper: Categorize activity by production type
            const getActivityCategory = (activity: ActivityType): 'polishing' | 'laputra' | 'iron' | null => {
              const lower = activity.toLowerCase();
              if (lower.includes('polishing')) return 'polishing';
              if (lower.includes('laputra')) return 'laputra';
              // Everything else (grinding) is considered iron production
              if (lower.includes('grinding') || activity === 'GRINDING') return 'iron';
              return null;
            };

            // Helper: Check if an activity matches a tool's production category
            const activityMatchesTool = (activity: ActivityType, toolType: string): boolean => {
              const cat = getActivityCategory(activity);
              if (toolType === 'resin_bond') return cat === 'polishing';
              if (toolType === 'lapotra') return cat === 'laputra';
              // Iron can produce both iron (grinding) and laputra activities
              if (toolType === 'iron') return cat === 'iron' || cat === 'laputra';
              return false;
            };

            // Build a sequential list of all activity rows with their position
            interface ActivityRowWithPos {
              reportId: string;
              reportDate: string;
              shift: 'MORNING' | 'NIGHT';
              rowIndex: number; // Sequential position across all reports
              activity: ActivityType;
              sqft: number;
            }

            const allActivityRows: ActivityRowWithPos[] = [];
            let globalRowIndex = 0;

            // Sort reports by date and shift
            const sortedReports = [...reports].sort((a, b) => {
              const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
              if (dateCompare !== 0) return dateCompare;
              return a.shift === 'MORNING' ? -1 : 1;
            });

            sortedReports.forEach(report => {
              const activities = report.activities || [];
              activities.forEach((actItem: any, idx: number) => {
                allActivityRows.push({
                  reportId: report.id,
                  reportDate: report.date,
                  shift: report.shift,
                  rowIndex: globalRowIndex,
                  activity: actItem.activity,
                  sqft: Number(actItem.sqft) || 0
                });
                globalRowIndex++;
              });
            });

            // Build a map: (report_id, shift) → { report: ..., toolUsages: [...], afterRowIndexMap: {...} }
            type TuWithDate = LinePolishToolUsage & { _date: string; _lifetimeSqft: number; _rowIndex: number };

            const withDates: TuWithDate[] = toolUsages.map(tu => {
              const report = reports.find(r => r.id === tu.report_id);
              const _date = report?.date || '';
              
              // Calculate the global row index for this tool installation
              // after_row_index = -1 means start of shift (before all activities)
              // after_row_index = 0 means after activity 0 (so from activity 1 onwards)
              let _rowIndex = 0;
              if (report && tu.after_row_index !== undefined) {
                // Count rows from previous reports and this report
                const reportsUpToThis = sortedReports.filter(r => 
                  new Date(r.date).getTime() < new Date(_date).getTime() ||
                  (r.date === _date && (
                    (r.shift === 'MORNING' && tu.shift === 'MORNING') ||
                    (r.shift === 'NIGHT' && (tu.shift === 'NIGHT' || tu.shift === 'MORNING'))
                  ))
                );
                
                let rowsBeforeThisReport = 0;
                reportsUpToThis.forEach(r => {
                  const activities = r.activities || [];
                  rowsBeforeThisReport += activities.length;
                });
                
                // If same report, add the after_row_index offset
                if (reportsUpToThis[reportsUpToThis.length - 1]?.id === report.id) {
                  _rowIndex = rowsBeforeThisReport + tu.after_row_index + 1; // +1 because after means from next row
                } else {
                  _rowIndex = rowsBeforeThisReport;
                }
              }
              
              return { ...tu, _date, _lifetimeSqft: 0, _rowIndex };
            })
            .filter(tu => tu._date !== '');

            // For each tool_type, sort and compute lifetime sqft
            const toolTypes: Array<'resin_bond' | 'lapotra' | 'iron'> = ['resin_bond', 'lapotra', 'iron'];
            toolTypes.forEach(tt => {
              const group = withDates
                .filter(tu => tu.tool_type === tt)
                .sort((a, b) => {
                  const dateCompare = a._date.localeCompare(b._date);
                  if (dateCompare !== 0) return dateCompare;
                  return a._rowIndex - b._rowIndex;
                });

              group.forEach((tu, i) => {
                const fromRowIndex = tu._rowIndex;
                const toRowIndex = i + 1 < group.length ? group[i + 1]._rowIndex : Infinity;

                tu._lifetimeSqft = allActivityRows.reduce((sum, row) => {
                  // Include this row if it's at or after fromRowIndex and before toRowIndex,
                  // AND the activity matches this tool's production category
                  if (row.rowIndex >= fromRowIndex && row.rowIndex < toRowIndex && 
                      activityMatchesTool(row.activity, tu.tool_type)) {
                    return sum + row.sqft;
                  }
                  return sum;
                }, 0);
              });
            });

            // Filter for display: respect selectedMonth / showAllRecords
            const displayUsages = showAllRecords
              ? withDates
              : withDates.filter(tu => tu._date.slice(0, 7) === selectedMonth);

            if (displayUsages.length === 0) return null;

            // Per tool-type summary
            const typeSummary: Record<string, { totalSqft: number; count: number }> = {};
            displayUsages.forEach(tu => {
              if (!typeSummary[tu.tool_type]) typeSummary[tu.tool_type] = { totalSqft: 0, count: 0 };
              typeSummary[tu.tool_type].totalSqft += tu._lifetimeSqft;
              typeSummary[tu.tool_type].count += 1;
            });

            // Per grade breakdown
            type GradeStat = { tool_type: string; grade: string; brands: string[]; count: number; totalSqft: number };
            const gradeMap: Record<string, GradeStat> = {};
            displayUsages.forEach(tu => {
              const key = `${tu.tool_type}|${tu.grade}`;
              if (!gradeMap[key]) gradeMap[key] = { tool_type: tu.tool_type, grade: tu.grade, brands: [], count: 0, totalSqft: 0 };
              gradeMap[key].count += 1;
              gradeMap[key].totalSqft += tu._lifetimeSqft;
              if (tu.brand && !gradeMap[key].brands.includes(tu.brand)) gradeMap[key].brands.push(tu.brand);
            });
            const gradeStats = Object.values(gradeMap).sort((a, b) => b.totalSqft - a.totalSqft);

            const best = gradeStats.length > 0
              ? gradeStats.reduce((top, s) =>
                  (s.count > 0 && s.totalSqft / s.count) > (top.count > 0 ? top.totalSqft / top.count : 0) ? s : top
                )
              : null;

            return (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="px-6 py-4 border-b bg-orange-50">
                  <h3 className="text-lg font-semibold text-orange-900">🔧 Tool Usage Analytics</h3>
                  <p className="text-sm text-orange-600 mt-1">
                    SFT produced per tool lifetime — {showAllRecords ? 'All time' : new Date(selectedMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                  </p>
                </div>

                <div className="p-4 space-y-4">
                  {/* Summary cards per tool type */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {([
                      { key: 'resin_bond', label: 'Resin Bond (R/B)', colorCard: 'bg-blue-50 border-blue-200', colorText: 'text-blue-800', colorVal: 'text-blue-700', colorSub: 'text-blue-600' },
                      { key: 'lapotra',    label: 'Lapotra',           colorCard: 'bg-green-50 border-green-200', colorText: 'text-green-800', colorVal: 'text-green-700', colorSub: 'text-green-600' },
                      { key: 'iron',       label: 'Iron Segments',     colorCard: 'bg-gray-50 border-gray-200', colorText: 'text-gray-800', colorVal: 'text-gray-700', colorSub: 'text-gray-600' },
                    ] as const).map(({ key, label, colorCard, colorText, colorVal, colorSub }) => {
                      const s = typeSummary[key];
                      if (!s || s.count === 0) return null;
                      return (
                        <div key={key} className={`rounded-lg border p-4 ${colorCard}`}>
                          <p className={`text-sm font-semibold ${colorText}`}>{label}</p>
                          <p className={`text-2xl font-bold ${colorVal} mt-1`}>
                            {s.totalSqft.toLocaleString('en-IN', { maximumFractionDigits: 2 })} SFT
                          </p>
                          <p className={`text-xs ${colorSub} mt-1`}>
                            {s.count} change{s.count !== 1 ? 's' : ''} · avg {(s.totalSqft / s.count).toFixed(0)} SFT/tool
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {best && best.count > 0 && (
                    <div className="bg-yellow-50 border border-yellow-300 rounded-lg px-4 py-2 text-sm text-yellow-900">
                      🏆 <strong>Best performing:</strong> {TOOL_TYPE_LABELS[best.tool_type]} Grade <strong>{best.grade}</strong>
                      {best.brands.length > 0 && <> ({best.brands.join(', ')})</>}
                      {' '}— avg <strong>{(best.totalSqft / best.count).toFixed(0)} SFT/tool lifetime</strong>
                    </div>
                  )}

                  {/* Grade breakdown table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-orange-50">
                          <th className="text-left py-2 px-3 font-medium text-gray-700">Tool Type</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-700">Grade</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-700">Brand(s)</th>
                          <th className="text-right py-2 px-3 font-medium text-gray-700">Times Used</th>
                          <th className="text-right py-2 px-3 font-medium text-gray-700">Total Lifetime SFT</th>
                          <th className="text-right py-2 px-3 font-medium text-gray-700">Avg SFT / Tool</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gradeStats.map(stat => (
                          <tr key={`${stat.tool_type}|${stat.grade}`} className="border-b hover:bg-orange-50">
                            <td className="py-2 px-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                stat.tool_type === 'resin_bond' ? 'bg-blue-100 text-blue-800' :
                                stat.tool_type === 'lapotra'    ? 'bg-green-100 text-green-800' :
                                                                   'bg-gray-100 text-gray-800'
                              }`}>
                                {TOOL_TYPE_LABELS[stat.tool_type]}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-semibold text-gray-900">{stat.grade}</td>
                            <td className="py-2 px-3 text-gray-600">{stat.brands.join(', ') || '—'}</td>
                            <td className="py-2 px-3 text-right text-gray-700">{stat.count}</td>
                            <td className="py-2 px-3 text-right font-bold text-orange-700">
                              {stat.totalSqft.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-2 px-3 text-right text-gray-700">
                              {stat.count > 0 ? (stat.totalSqft / stat.count).toFixed(0) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Per-use history */}
                  <details className="group">
                    <summary className="cursor-pointer text-sm font-medium text-orange-700 hover:text-orange-900 select-none">
                      ▶ Show individual tool change history ({displayUsages.length})
                    </summary>
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="text-left py-2 px-3 font-medium text-gray-600">Date Installed</th>
                            <th className="text-left py-2 px-3 font-medium text-gray-600">Shift</th>
                            <th className="text-left py-2 px-3 font-medium text-gray-600">Tool</th>
                            <th className="text-left py-2 px-3 font-medium text-gray-600">Grade</th>
                            <th className="text-left py-2 px-3 font-medium text-gray-600">Brand</th>
                            <th className="text-right py-2 px-3 font-medium text-gray-600">Lifetime SFT</th>
                            <th className="text-right py-2 px-3 font-medium text-gray-600">Active Until</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...displayUsages]
                            .sort((a, b) => b._date.localeCompare(a._date))
                            .map(tu => {
                              // Find next tool of same type for "active until"
                              const sameType = withDates
                                .filter(x => x.tool_type === tu.tool_type && x._date > tu._date)
                                .sort((a, b) => a._date.localeCompare(b._date));
                              const nextDate = sameType[0]?._date;
                              return (
                                <tr key={tu.id} className="border-b hover:bg-orange-50">
                                  <td className="py-1.5 px-3">{formatDisplayDate(tu._date)}</td>
                                  <td className="py-1.5 px-3">{tu.shift === 'MORNING' ? 'Morning' : 'Night'}</td>
                                  <td className="py-1.5 px-3">{TOOL_TYPE_LABELS[tu.tool_type]}</td>
                                  <td className="py-1.5 px-3 font-medium">{tu.grade}</td>
                                  <td className="py-1.5 px-3 text-gray-600">{tu.brand || '—'}</td>
                                  <td className="py-1.5 px-3 text-right font-semibold text-orange-700">
                                    {tu._lifetimeSqft.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-1.5 px-3 text-right text-gray-500">
                                    {nextDate ? formatDisplayDate(nextDate) : <span className="text-green-600">Active</span>}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </div>
              </div>
            );
          })()}

      </div>

      {/* ── Retroactive Tool Changes Modal ─────────────────────────────── */}
      {toolModalReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b bg-orange-50 rounded-t-xl flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-orange-900">🔧 Tool Changes</h3>
                <p className="text-sm text-orange-600 mt-0.5">
                  {formatDisplayDate(toolModalReport.date)} · {toolModalReport.shift === 'MORNING' ? 'Morning Shift' : 'Night Shift'}
                </p>
              </div>
              <button onClick={closeToolModal} className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none">✕</button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              {toolModalRows.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No tool changes recorded. Click "+ Add Tool Change" below.</p>
              )}
              {toolModalRows.map((row, idx) => (
                <div key={row.id} className="grid grid-cols-12 gap-2 items-center">
                  <span className="col-span-1 text-xs text-gray-400 text-center">{idx + 1}</span>
                  {/* Tool Type */}
                  <select
                    className="col-span-3 text-sm border rounded px-2 py-1.5"
                    value={row.tool_type}
                    onChange={e => {
                      const tt = e.target.value as ToolUsageRow['tool_type'];
                      setToolModalRows(prev => prev.map(r => r.id === row.id ? { ...r, tool_type: tt, grade: '' } : r));
                    }}
                  >
                    <option value="resin_bond">Resin Bond (R/B)</option>
                    <option value="lapotra">Lapotra</option>
                    <option value="iron">Iron</option>
                  </select>
                  {/* Grade */}
                  <select
                    className="col-span-3 text-sm border rounded px-2 py-1.5"
                    value={row.grade}
                    onChange={e => setToolModalRows(prev => prev.map(r => r.id === row.id ? { ...r, grade: e.target.value } : r))}
                  >
                    <option value="">Grade</option>
                    {(TOOL_GRADES[row.tool_type] || []).map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                  {/* Brand */}
                  <div className="col-span-4 flex items-center gap-1">
                    {toolModalAddingBrandFor === row.id ? (
                      <>
                        <input
                          autoFocus
                          type="text"
                          className="flex-1 text-sm border rounded px-2 py-1.5"
                          placeholder="Brand name"
                          value={toolModalNewBrand}
                          onChange={e => setToolModalNewBrand(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              const b = toolModalNewBrand.trim();
                              if (b) {
                                setAvailableBrands(prev => prev.includes(b) ? prev : [...prev, b]);
                                setToolModalRows(prev => prev.map(r => r.id === row.id ? { ...r, brand: b } : r));
                              }
                              setToolModalAddingBrandFor(null); setToolModalNewBrand('');
                            } else if (e.key === 'Escape') {
                              setToolModalAddingBrandFor(null); setToolModalNewBrand('');
                            }
                          }}
                        />
                        <button onClick={() => {
                          const b = toolModalNewBrand.trim();
                          if (b) {
                            setAvailableBrands(prev => prev.includes(b) ? prev : [...prev, b]);
                            setToolModalRows(prev => prev.map(r => r.id === row.id ? { ...r, brand: b } : r));
                          }
                          setToolModalAddingBrandFor(null); setToolModalNewBrand('');
                        }} className="text-green-600 hover:text-green-800 font-bold text-base">✓</button>
                        <button onClick={() => { setToolModalAddingBrandFor(null); setToolModalNewBrand(''); }} className="text-red-400 hover:text-red-600 font-bold text-base">✕</button>
                      </>
                    ) : (
                      <>
                        <select
                          className="flex-1 text-sm border rounded px-2 py-1.5"
                          value={row.brand}
                          onChange={e => setToolModalRows(prev => prev.map(r => r.id === row.id ? { ...r, brand: e.target.value } : r))}
                        >
                          <option value="">Brand (opt)</option>
                          {availableBrands.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                        <button
                          onClick={() => { setToolModalAddingBrandFor(row.id); setToolModalNewBrand(''); }}
                          className="w-7 h-7 rounded-full bg-orange-100 hover:bg-orange-200 text-orange-700 font-bold text-sm flex items-center justify-center"
                          title="Add new brand"
                        >+</button>
                      </>
                    )}
                  </div>
                  {/* Delete row */}
                  <button
                    onClick={() => setToolModalRows(prev => prev.filter(r => r.id !== row.id))}
                    className="col-span-1 text-red-400 hover:text-red-600 text-center"
                  >✕</button>
                </div>
              ))}

              <button
                onClick={() => setToolModalRows(prev => [...prev, { id: crypto.randomUUID(), tool_type: 'resin_bond', grade: '', brand: '', notes: '', after_row_index: -1 }])}
                className="w-full mt-2 py-2 text-sm text-orange-700 border border-dashed border-orange-300 rounded-lg hover:bg-orange-50"
              >
                + Add Tool Change
              </button>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button onClick={closeToolModal} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border rounded-lg">Cancel</button>
              <button
                onClick={saveToolModal}
                disabled={toolModalSaving}
                className="px-5 py-2 text-sm font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-lg disabled:opacity-50"
              >
                {toolModalSaving ? 'Saving…' : 'Save Tool Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Grade Modal */}
      {showAddGrade && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Add New Grade</h3>
            <input
              autoFocus
              type="text"
              value={newGradeName}
              onChange={e => setNewGradeName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddGrade();
                if (e.key === 'Escape') { setShowAddGrade(false); setNewGradeName(''); }
              }}
              placeholder="e.g. Premium, Export..."
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setShowAddGrade(false); setNewGradeName(''); }}
                className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddGrade}
                disabled={!newGradeName.trim()}
                className="px-3 py-1.5 text-sm text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Grade
              </button>
            </div>
          </div>
        </div>
      )}

    </AppLayout>
  );
}
