'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Plus, Edit3, Trash2, Users, BarChart3, Layers, TrendingUp, DollarSign, CreditCard, AlertCircle, Clock } from 'lucide-react';
import { formatDisplayDate } from '@/lib/date-utils';

interface LinePolishReport {
  id: string;
  date: string;
  shift: 'MORNING' | 'NIGHT';
  activity: 'GRINDING' | 'POLISHING';
  no_of_workers: number;
  number_of_slabs: number;
  total_sqft: number;
  no_of_hours: number;
  rate_per_hour: number;
  debit_amount: number;
  remarks?: string;
  created_at: string;
  updated_at: string;
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

interface FormData {
  date: string;
  shift: 'MORNING' | 'NIGHT';
  activity: 'GRINDING' | 'POLISHING';
  no_of_workers: string;
  number_of_slabs: string;
  total_sqft: string;
  no_of_hours: string;
  rate_per_hour: string;
  debit_amount: string;
  remarks: string;
}

const fmt = (value: string | number): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? '₹0' : `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

export default function LinePolishPage() {
  const [reports, setReports] = useState<LinePolishReport[]>([]);
  const [payments, setPayments] = useState<LinePolishPayment[]>([]);
  const [previousDues, setPreviousDues] = useState<LinePolishPreviousDue[]>([]);
  const [monthlyBalance, setMonthlyBalance] = useState<MonthlyBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Month/Year filter states
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // Format: YYYY-MM
  const [showAllRecords, setShowAllRecords] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<'ALL' | 'POLISHING' | 'GRINDING'>('ALL');
  
  // Previous due management
  const [showPreviousDueForm, setShowPreviousDueForm] = useState(false);
  const [previousDueForm, setPreviousDueForm] = useState({
    previous_month: '',
    amount: '',
    remarks: ''
  });
  const [savingPreviousDue, setSavingPreviousDue] = useState(false);

  const initialFormData: FormData = {
    date: new Date().toISOString().split('T')[0],
    shift: 'MORNING',
    activity: 'POLISHING', // Default to POLISHING
    no_of_workers: '3', // Prefilled with 3
    number_of_slabs: '',
    total_sqft: '',
    no_of_hours: '',
    rate_per_hour: '250', // Prefilled with 250
    debit_amount: '',
    remarks: ''
  };

  const [formData, setFormData] = useState<FormData>(initialFormData);

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

  useEffect(() => {
    // Auto-calculate total amount based on hours * rate
    const hours = parseFloat(formData.no_of_hours) || 0;
    const rate = parseFloat(formData.rate_per_hour) || 0;
    const calculatedAmount = hours * rate;
    setFormData(prev => ({
      ...prev,
      debit_amount: calculatedAmount.toString()
    }));
  }, [formData.no_of_hours, formData.rate_per_hour]);

  useEffect(() => {
    // Auto-calculate debit amount
    const hours = parseFloat(formData.no_of_hours) || 0;
    const rate = parseFloat(formData.rate_per_hour) || 0;
    const calculatedAmount = hours * rate;
    setFormData(prev => ({
      ...prev,
      debit_amount: calculatedAmount.toString()
    }));
  }, [formData.no_of_hours, formData.rate_per_hour]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        date: formData.date,
        shift: formData.shift,
        activity: formData.activity,
        no_of_workers: parseInt(formData.no_of_workers) || 0,
        number_of_slabs: parseInt(formData.number_of_slabs) || 0,
        total_sqft: parseFloat(formData.total_sqft) || 0,
        no_of_hours: parseFloat(formData.no_of_hours) || 0,
        rate_per_hour: parseFloat(formData.rate_per_hour) || 0,
        debit_amount: parseFloat(formData.debit_amount) || 0,
        remarks: formData.remarks.trim() || null
      };

      const url = isEditing && editingId ? `/api/line-polish-reports/${editingId}` : '/api/line-polish-reports';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });

      if (response.ok) {
        setFormData(initialFormData);
        setIsEditing(false);
        setEditingId(null);
        await fetchReports();
        
        // Update monthly balance for the report's month
        const reportMonth = submitData.date.slice(0, 7);
        await updateMonthlyBalance(reportMonth);
      } else {
        console.error('Failed to save report');
      }
    } catch (error) {
      console.error('Error saving report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (report: LinePolishReport) => {
    setFormData({
      date: report.date,
      shift: report.shift,
      activity: report.activity,
      no_of_workers: report.no_of_workers.toString(),
      number_of_slabs: report.number_of_slabs.toString(),
      total_sqft: report.total_sqft.toString(),
      no_of_hours: report.no_of_hours.toString(),
      rate_per_hour: report.rate_per_hour.toString(),
      debit_amount: report.debit_amount.toString(),
      remarks: report.remarks || ''
    });
    setIsEditing(true);
    setEditingId(report.id);
    document.querySelector('form')?.scrollIntoView({ behavior: 'smooth' });
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

  // Calculate metrics for the selected month
  const calculateMetrics = () => {
    // Filter reports for selected month only (not by activity for totals)
    const monthReports = reports.filter(report => {
      if (showAllRecords) return true;
      const reportMonth = report.date.slice(0, 7);
      return reportMonth === selectedMonth;
    });
    
    const polishingReports = monthReports.filter(r => r.activity === 'POLISHING');
    const grindingReports = monthReports.filter(r => r.activity === 'GRINDING');
    
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
      polishingSqft: polishingReports.reduce((sum, r) => sum + r.total_sqft, 0),
      grindingSqft: grindingReports.reduce((sum, r) => sum + r.total_sqft, 0),
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
      <div className="min-h-screen w-full bg-gray-50 p-6 space-y-6">
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold">Production Management</h1>
              <p className="text-gray-600">Line polish reports and analytics</p>
              <p className="text-xs text-green-600 font-bold">✅ UPDATED VERSION - New Design Applied</p>
            </div>
            <a 
              href="/"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              ← Back to Dashboard
            </a>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <select
                value={new Date(selectedMonth + '-01').getFullYear()}
                onChange={(e) => {
                  const currentMonth = new Date(selectedMonth + '-01').getMonth();
                  setSelectedMonth(`${e.target.value}-${String(currentMonth + 1).padStart(2, '0')}`);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
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
                {getAvailableMonths().map(month => {
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Entries</p>
                  <p className="text-2xl font-bold text-gray-900">{monthReports.length}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-500" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Workers</p>
                  <p className="text-2xl font-bold text-gray-900">{monthReports.reduce((sum, r) => sum + r.no_of_workers, 0)}</p>
                </div>
                <Users className="w-8 h-8 text-green-500" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Slabs</p>
                  <p className="text-2xl font-bold text-gray-900">{monthReports.reduce((sum, r) => sum + r.number_of_slabs, 0).toLocaleString('en-IN')}</p>
                </div>
                <Layers className="w-8 h-8 text-indigo-500" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total SqFt</p>
                  <p className="text-2xl font-bold text-gray-900">{(metrics.polishingSqft + metrics.grindingSqft).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-orange-500" />
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Hours</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.totalHours.toLocaleString('en-IN')}</p>
                </div>
                <Clock className="w-8 h-8 text-blue-500" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600">Total Debit</p>
                  <p className="text-2xl font-bold text-red-900">{fmt(metrics.totalAmount)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-red-500" />
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
                  <p className="text-sm text-amber-700">Balance Due</p>
                  <p className="text-2xl font-bold text-amber-900">{fmt(metrics.pending)}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-amber-600" />
              </div>
            </Card>
          </div>
        </div>

          {/* Add Polish Report */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                {isEditing ? 'Edit Line Polish Report' : 'Line Polish Reports'}
              </h2>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => handleInputChange('date', e.target.value)}
                      placeholder="dd/mm/yyyy"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Shift</label>
                    <select
                      value={formData.shift}
                      onChange={(e) => handleInputChange('shift', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      required
                    >
                      <option value="MORNING">A (Morning)</option>
                      <option value="NIGHT">B (Night)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Activity</label>
                    <select
                      value={formData.activity}
                      onChange={(e) => handleInputChange('activity', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      required
                    >
                      <option value="POLISHING">Polishing</option>
                      <option value="GRINDING">Grinding</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Workers</label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Enter workers count"
                      value={formData.no_of_workers}
                      onChange={(e) => handleInputChange('no_of_workers', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Slabs</label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Enter slabs count"
                      value={formData.number_of_slabs}
                      onChange={(e) => handleInputChange('number_of_slabs', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sq Ft</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Enter area"
                      value={formData.total_sqft}
                      onChange={(e) => handleInputChange('total_sqft', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hours</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="Enter hours"
                      value={formData.no_of_hours}
                      onChange={(e) => handleInputChange('no_of_hours', e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rate/Hr (₹)</label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="Enter rate per hour"
                      value={formData.rate_per_hour}
                      onChange={(e) => handleInputChange('rate_per_hour', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Total Amount (₹)</label>
                    <Input
                      type="text"
                      value={fmt(formData.debit_amount)}
                      className="bg-gray-50 font-semibold text-blue-700"
                      readOnly
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Remarks (Optional)</label>
                    <Input
                      type="text"
                      placeholder="Enter any remarks"
                      value={formData.remarks}
                      onChange={(e) => handleInputChange('remarks', e.target.value)}
                    />
                  </div>
                  
                  <div className="flex items-end">
                    {isEditing && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setFormData(initialFormData);
                          setIsEditing(false);
                          setEditingId(null);
                        }}
                        className="mr-2"
                      >
                        Cancel
                      </Button>
                    )}
                    <Button 
                      type="submit" 
                      disabled={loading}
                      className="bg-black text-white hover:bg-gray-800 flex items-center"
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      ) : (
                        <Plus className="w-4 h-4 mr-2" />
                      )}
                      {isEditing ? 'Update Report' : 'Add Report'}
                    </Button>
                  </div>
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
                  <span className="text-sm font-medium text-gray-700">Activity:</span>
                  <div className="inline-flex rounded-md shadow-sm" role="group">
                    <button
                      type="button"
                      onClick={() => setSelectedActivity('ALL')}
                      className={`px-4 py-2 text-sm font-medium border ${
                        selectedActivity === 'ALL'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      } rounded-l-lg`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedActivity('POLISHING')}
                      className={`px-4 py-2 text-sm font-medium border-t border-b ${
                        selectedActivity === 'POLISHING'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Polishing
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedActivity('GRINDING')}
                      className={`px-4 py-2 text-sm font-medium border ${
                        selectedActivity === 'GRINDING'
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      } rounded-r-lg`}
                    >
                      Grinding
                    </button>
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-gray-700 mt-2">
                {showAllRecords ? 'All Time' : new Date(selectedMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} Total: ₹{filterReportsByMonth(reports).reduce((sum, r) => sum + parseFloat(r.debit_amount.toString()), 0).toLocaleString('en-IN')} ({filterReportsByMonth(reports).length} transactions)
              </p>
            </div>
            
            <div className="overflow-x-auto">
              {reportsLoading ? (
                <div className="text-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-gray-600">Loading reports...</p>
                </div>
              ) : filterReportsByMonth(reports).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No reports found for the selected filters.</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Shift</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Activity</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Workers</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Slabs</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Sq Ft</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Hours</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Amount (₹)</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Note</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filterReportsByMonth(reports).map((report) => (
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
                        <td className="py-3 px-4 text-right">{report.number_of_slabs}</td>
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
                  <span className="font-semibold">Paid:</span> ₹{payments.filter(p => showAllRecords || p.payment_date.slice(0, 7) === selectedMonth).reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0).toLocaleString('en-IN')} ({payments.filter(p => showAllRecords || p.payment_date.slice(0, 7) === selectedMonth).length} payments)
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
              {payments.filter(p => showAllRecords || p.payment_date.slice(0, 7) === selectedMonth).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No payments recorded for {showAllRecords ? 'this period' : new Date(selectedMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}.</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Amount (₹)</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Method</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Notes</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.filter(p => showAllRecords || p.payment_date.slice(0, 7) === selectedMonth).map((payment) => (
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
    </AppLayout>
  );
}