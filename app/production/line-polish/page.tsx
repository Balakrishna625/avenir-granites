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
  const [loading, setLoading] = useState(false);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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

  useEffect(() => {
    fetchReports();
  }, []);

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
      const response = await fetch(`/api/line-polish-reports/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchReports();
      }
    } catch (error) {
      console.error('Error deleting report:', error);
    }
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="max-w-7xl mx-auto px-4 space-y-6">
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
                      <option value="MORNING">Morning</option>
                      <option value="NIGHT">Night</option>
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
                      className="bg-gray-50"
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

          {/* Polish Reports Table */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b bg-blue-50">
              <h3 className="text-lg font-semibold text-blue-900">
                Polishing Reports
              </h3>
              <p className="text-sm text-blue-700">Total: ₹{reports.filter(r => r.activity === 'POLISHING').reduce((sum, r) => sum + parseFloat(r.debit_amount.toString()), 0).toLocaleString('en-IN')} ({reports.filter(r => r.activity === 'POLISHING').length} transactions)</p>
            </div>
            
            <div className="overflow-x-auto">
              {reportsLoading ? (
                <div className="text-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-gray-600">Loading reports...</p>
                </div>
              ) : reports.filter(r => r.activity === 'POLISHING').length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No polishing reports yet.</p>
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
                    {reports.filter(r => r.activity === 'POLISHING').map((report) => (
                      <tr key={report.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{new Date(report.date).toLocaleDateString('en-IN')}</td>
                        <td className="py-3 px-4">{report.shift}</td>
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
              <h3 className="text-lg font-semibold text-green-900">
                Grinding Reports
              </h3>
              <p className="text-sm text-green-700">Total: ₹{reports.filter(r => r.activity === 'GRINDING').reduce((sum, r) => sum + parseFloat(r.debit_amount.toString()), 0).toLocaleString('en-IN')} ({reports.filter(r => r.activity === 'GRINDING').length} transactions)</p>
            </div>
            
            <div className="overflow-x-auto">
              {reports.filter(r => r.activity === 'GRINDING').length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No grinding reports yet.</p>
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
                    {reports.filter(r => r.activity === 'GRINDING').map((report) => (
                      <tr key={report.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{new Date(report.date).toLocaleDateString('en-IN')}</td>
                        <td className="py-3 px-4">{report.shift}</td>
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
        </div>
      </div>
    </AppLayout>
  );
}