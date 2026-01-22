'use client';

import { useState, useEffect, useMemo } from 'react';
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

// Activity detail row for grouped entries
interface ActivityRow {
  id: string; // Temporary ID for React keys
  block_name: string; // Block name field
  activity: ActivityType;
  number_of_slabs: string;
  total_sqft: string;
  grade?: string; // Optional: Blackline, White line, Fresh, Patch, Variation
}

interface ShiftFormData {
  no_of_workers: string;
  no_of_hours: string;
  rate_per_hour: string;
  remarks: string;
  activityRows: ActivityRow[]; // Multiple activity rows
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
      ]
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
      ]
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
  }, []);

  useEffect(() => {
    // Fetch monthly balance and previous dues when month changes
    fetchMonthlyBalance();
    fetchPreviousDues();
  }, [selectedMonth]);

  // Auto-calculation is now handled in calculateShiftTotals function

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
    setFormData(prev => ({
      ...prev,
      [shift]: {
        ...prev[shift],
        activityRows: prev[shift].activityRows.filter(row => row.id !== rowId)
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
          activityRows: []
        },
        evening: {
          no_of_workers: '3',
          no_of_hours: '',
          rate_per_hour: '250',
          remarks: '',
          activityRows: []
        }
      };

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

            // Collect notes for this shift (if not empty and not already added)
            if (notes && notes.trim() && !notes.match(/^[-—]+$/) && !shiftNotes[currentShift].includes(notes.trim())) {
              shiftNotes[currentShift].push(notes.trim());
            }

            // Map material + process to ActivityType
            let activityType: ActivityType = 'S/G Polishing'; // default
            
            // Normalize material
            const normalizedMaterial = material.toUpperCase().replace(/\s+/g, '');
            const normalizedProcess = process.toLowerCase().trim();

            // Map to activity types
            if (normalizedMaterial === 'S/G' || normalizedMaterial === 'SG') {
              if (normalizedProcess.includes('polish') && normalizedProcess.includes('grind')) {
                activityType = 'S/G Polish Grinding';
              } else if (normalizedProcess.includes('laputra') && normalizedProcess.includes('grind')) {
                activityType = 'S/G Laputra Grinding';
              } else if (normalizedProcess.includes('polish')) {
                activityType = 'S/G Polishing';
              } else if (normalizedProcess.includes('laputra')) {
                activityType = 'S/G Laputra';
              } else if (normalizedProcess.includes('grind')) {
                activityType = 'S/G Grinding';
              }
            } else if (normalizedMaterial === 'B/P' || normalizedMaterial === 'BP') {
              if (normalizedProcess.includes('polish') && normalizedProcess.includes('grind')) {
                activityType = 'B/P Polish Grinding';
              } else if (normalizedProcess.includes('laputra') && normalizedProcess.includes('grind')) {
                activityType = 'B/P Laputra Grinding';
              } else if (normalizedProcess.includes('polish')) {
                activityType = 'B/P Polishing';
              } else if (normalizedProcess.includes('laputra')) {
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
              // Unknown material, default to S/G Polishing but warn
              warnings.push(`Unknown material type "${material}", defaulting to S/G Polishing`);
            }

            newFormData[currentShift].activityRows.push({
              id: crypto.randomUUID(),
              block_name: blockName,
              activity: activityType,
              number_of_slabs: qty,
              total_sqft: sft
            });

            lineProcessed = true;
          }
        }

        // Track unparsed lines (skip headers and formatting)
        if (!lineProcessed && line.length > 0 && 
            !line.match(/^[#*_\-=]+/) && // Skip markdown headers/formatting
            !line.match(/^📅|🟢|🌙/) // Skip emoji headers
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

      // Submit all entries (one or two shifts)
      let allSuccess = true;
      for (const entry of entries) {
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
      }

      if (allSuccess) {
        const freshFormData = initialFormData;
        setFormData(freshFormData);
        setInitialFormState(freshFormData);
        allowNavigation(); // Clear unsaved changes warning
        await fetchReports();
        
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

                  {/* Morning Activity Rows */}
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
                          {formData.morning.activityRows.map((row) => (
                            <tr key={row.id} className="hover:bg-amber-50">
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
                                <select
                                  value={row.grade || ''}
                                  onChange={(e) => handleActivityRowChange('morning', row.id, 'grade', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs h-7 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                                >
                                  <option value="">-- Select Grade --</option>
                                  <option value="Blackline">Blackline</option>
                                  <option value="White line">White line</option>
                                  <option value="Fresh">Fresh</option>
                                  <option value="Patch">Patch</option>
                                  <option value="Variation">Variation</option>
                                </select>
                              </td>
                              <td className="px-2 py-1 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeActivityRow('morning', row.id)}
                                  disabled={formData.morning.activityRows.length === 1}
                                  className="text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                                  title="Remove activity"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </td>
                            </tr>
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

                  {/* Evening Activity Rows */}
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
                          {formData.evening.activityRows.map((row) => (
                            <tr key={row.id} className="hover:bg-indigo-50">
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
                                <select
                                  value={row.grade || ''}
                                  onChange={(e) => handleActivityRowChange('evening', row.id, 'grade', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs h-7 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                >
                                  <option value="">-- Select Grade --</option>
                                  <option value="Blackline">Blackline</option>
                                  <option value="White line">White line</option>
                                  <option value="Fresh">Fresh</option>
                                  <option value="Patch">Patch</option>
                                  <option value="Variation">Variation</option>
                                </select>
                              </td>
                              <td className="px-2 py-1 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeActivityRow('evening', row.id)}
                                  disabled={formData.evening.activityRows.length === 1}
                                  className="text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                                  title="Remove activity"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </td>
                            </tr>
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

      </div>
    </AppLayout>
  );
}
