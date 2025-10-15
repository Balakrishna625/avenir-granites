'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit3, Trash2 } from 'lucide-react';

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
  month: string; // Format: YYYY-MM
  opening_balance: number;
  total_work_amount: number;
  total_payments: number;
  closing_balance: number;
  notes?: string;
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
  const [monthlyBalance, setMonthlyBalance] = useState<MonthlyBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Month/Year filter states
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // Format: YYYY-MM
  const [showAllRecords, setShowAllRecords] = useState(false);

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

  useEffect(() => {
    fetchReports();
    fetchPayments();
  }, []);

  useEffect(() => {
    // Fetch monthly balance when month changes
    fetchMonthlyBalance();
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
        setReports(data.sort((a: LinePolishReport, b: LinePolishReport) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        ));
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

  // Filter reports by selected month
  const filterReportsByMonth = (reportsToFilter: LinePolishReport[]) => {
    if (showAllRecords) return reportsToFilter;
    
    return reportsToFilter.filter(report => {
      const reportMonth = report.date.slice(0, 7); // Get YYYY-MM from date
      return reportMonth === selectedMonth;
    });
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

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="w-full max-w-none mx-auto px-6 space-y-6">
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

          {/* Monthly Balance Summary */}
          {!showAllRecords && monthlyBalance && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg shadow-sm border border-purple-200">
              <div className="px-6 py-4 border-b border-purple-200 bg-white/50">
                <h2 className="text-lg font-semibold text-purple-900">
                  Monthly Balance - {new Date(selectedMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                </h2>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="text-sm text-gray-600 mb-1">Opening Balance</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {fmt(monthlyBalance.opening_balance)}
                    </div>
                    {monthlyBalance.opening_balance > 0 && (
                      <div className="text-xs text-gray-500 mt-1">Carried from previous month</div>
                    )}
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="text-sm text-gray-600 mb-1">Work Done (Debit)</div>
                    <div className="text-2xl font-bold text-red-600">
                      +{fmt(monthlyBalance.total_work_amount)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Amount to be paid</div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="text-sm text-gray-600 mb-1">Payments Made (Credit)</div>
                    <div className="text-2xl font-bold text-green-600">
                      -{fmt(monthlyBalance.total_payments)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Amount paid</div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border-2 border-purple-300">
                    <div className="text-sm text-gray-600 mb-1">Closing Balance</div>
                    <div className={`text-2xl font-bold ${monthlyBalance.closing_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {fmt(Math.abs(monthlyBalance.closing_balance))}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {monthlyBalance.closing_balance > 0 ? 'Due to pay' : monthlyBalance.closing_balance < 0 ? 'Advance paid' : 'Settled'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Reference (Optional)</label>
                    <Input
                      type="text"
                      value={paymentForm.reference_number}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, reference_number: e.target.value }))}
                      placeholder="Reference number"
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

          {/* Polish Reports Table */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b bg-blue-50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-blue-900">
                  Polishing Reports
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
              <p className="text-sm text-blue-700">
                {showAllRecords ? 'All Time' : new Date(selectedMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} Total: ₹{filterReportsByMonth(reports.filter(r => r.activity === 'POLISHING')).reduce((sum, r) => sum + parseFloat(r.debit_amount.toString()), 0).toLocaleString('en-IN')} ({filterReportsByMonth(reports.filter(r => r.activity === 'POLISHING')).length} transactions)
              </p>
            </div>
            
            <div className="overflow-x-auto">
              {reportsLoading ? (
                <div className="text-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-gray-600">Loading reports...</p>
                </div>
              ) : filterReportsByMonth(reports.filter(r => r.activity === 'POLISHING')).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No polishing reports for {showAllRecords ? 'this period' : new Date(selectedMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}.</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Shift</th>
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
                    {filterReportsByMonth(reports.filter(r => r.activity === 'POLISHING')).map((report) => (
                      <tr key={report.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{new Date(report.date).toLocaleDateString('en-IN')}</td>
                        <td className="py-3 px-4">{report.shift === 'MORNING' ? 'A (Morning)' : 'B (Night)'}</td>
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

          {/* Grinding Reports Table */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b bg-green-50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-green-900">
                  Grinding Reports
                </h3>
              </div>
              <p className="text-sm text-green-700">
                {showAllRecords ? 'All Time' : new Date(selectedMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} Total: ₹{filterReportsByMonth(reports.filter(r => r.activity === 'GRINDING')).reduce((sum, r) => sum + parseFloat(r.debit_amount.toString()), 0).toLocaleString('en-IN')} ({filterReportsByMonth(reports.filter(r => r.activity === 'GRINDING')).length} transactions)
              </p>
            </div>
            
            <div className="overflow-x-auto">
              {filterReportsByMonth(reports.filter(r => r.activity === 'GRINDING')).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No grinding reports for {showAllRecords ? 'this period' : new Date(selectedMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}.</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Shift</th>
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
                    {filterReportsByMonth(reports.filter(r => r.activity === 'GRINDING')).map((report) => (
                      <tr key={report.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{new Date(report.date).toLocaleDateString('en-IN')}</td>
                        <td className="py-3 px-4">{report.shift === 'MORNING' ? 'A (Morning)' : 'B (Night)'}</td>
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
                  Payment History
                </h3>
              </div>
              <p className="text-sm text-emerald-700">
                {showAllRecords ? 'All Time' : new Date(selectedMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} Total Paid: ₹{payments.filter(p => showAllRecords || p.payment_date.slice(0, 7) === selectedMonth).reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0).toLocaleString('en-IN')} ({payments.filter(p => showAllRecords || p.payment_date.slice(0, 7) === selectedMonth).length} payments)
              </p>
            </div>
            
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
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Reference</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.filter(p => showAllRecords || p.payment_date.slice(0, 7) === selectedMonth).map((payment) => (
                      <tr key={payment.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{new Date(payment.payment_date).toLocaleDateString('en-IN')}</td>
                        <td className="py-3 px-4 text-right font-semibold text-green-600">₹{parseFloat(payment.amount.toString()).toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {payment.payment_method.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4">{payment.reference_number || '-'}</td>
                        <td className="py-3 px-4">{payment.remarks || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}