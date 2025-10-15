'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Save, Edit3, Trash2, BarChart3, FileText } from 'lucide-react';

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
  credit_amount: number;
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
  credit_amount: string;
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
    activity: 'GRINDING',
    no_of_workers: '',
    number_of_slabs: '',
    total_sqft: '',
    no_of_hours: '',
    rate_per_hour: '',
    debit_amount: '',
    credit_amount: '',
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
      const response = await fetch('/api/slab-processing');
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
        credit_amount: parseFloat(formData.credit_amount) || 0,
        remarks: formData.remarks.trim() || null
      };

      const url = isEditing && editingId ? `/api/slab-processing/${editingId}` : '/api/slab-processing';
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
      credit_amount: report.credit_amount.toString(),
      remarks: report.remarks || ''
    });
    setIsEditing(true);
    setEditingId(report.id);
    document.querySelector('form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;

    try {
      const response = await fetch(`/api/slab-processing/${id}`, {
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
        <div className="max-w-6xl mx-auto px-4 space-y-6">
          {/* Compact Form Card */}
          <Card className="bg-white shadow-md border-0 rounded-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
              <h2 className="text-lg font-bold text-white flex items-center">
                {isEditing ? (
                  <>
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit Report
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Quick Add Report
                  </>
                )}
              </h2>
            </div>
            
            <div className="p-4">
              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Row 1: Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => handleInputChange('date', e.target.value)}
                      className="h-8 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Shift</label>
                    <select
                      value={formData.shift}
                      onChange={(e) => handleInputChange('shift', e.target.value)}
                      className="w-full h-8 px-2 border border-gray-300 rounded text-sm focus:border-blue-500 focus:ring-blue-500 bg-white"
                      required
                    >
                      <option value="MORNING">🌅 Morning</option>
                      <option value="NIGHT">🌙 Night</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Activity</label>
                    <select
                      value={formData.activity}
                      onChange={(e) => handleInputChange('activity', e.target.value)}
                      className="w-full h-8 px-2 border border-gray-300 rounded text-sm focus:border-blue-500 focus:ring-blue-500 bg-white"
                      required
                    >
                      <option value="GRINDING">⚙️ Grinding</option>
                      <option value="POLISHING">✨ Polishing</option>
                    </select>
                  </div>
                </div>

                {/* Row 2: Production & Payment */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Workers</label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Count"
                      value={formData.no_of_workers}
                      onChange={(e) => handleInputChange('no_of_workers', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Slabs</label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Count"
                      value={formData.number_of_slabs}
                      onChange={(e) => handleInputChange('number_of_slabs', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Sq Ft</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Area"
                      value={formData.total_sqft}
                      onChange={(e) => handleInputChange('total_sqft', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Hours</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="Time"
                      value={formData.no_of_hours}
                      onChange={(e) => handleInputChange('no_of_hours', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Rate/Hr</label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="Rate"
                      value={formData.rate_per_hour}
                      onChange={(e) => handleInputChange('rate_per_hour', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Paid</label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="Amount"
                      value={formData.credit_amount}
                      onChange={(e) => handleInputChange('credit_amount', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                {/* Row 3: Due Amount, Remarks & Submit */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Total Due</label>
                    <div className="h-8 px-2 bg-blue-50 border border-blue-200 rounded flex items-center text-sm font-semibold text-blue-800">
                      {fmt(formData.debit_amount)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Remarks</label>
                    <Input
                      type="text"
                      placeholder="Optional notes"
                      value={formData.remarks}
                      onChange={(e) => handleInputChange('remarks', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="flex space-x-2">
                    {isEditing && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setFormData(initialFormData);
                          setIsEditing(false);
                          setEditingId(null);
                        }}
                        className="h-8 px-3 text-sm"
                      >
                        Cancel
                      </Button>
                    )}
                    <Button 
                      type="submit" 
                      disabled={loading}
                      className="h-8 px-4 text-sm bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                    >
                      {loading ? (
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <Save className="w-3 h-3 mr-1" />
                          {isEditing ? 'Update' : 'Save'}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </Card>

          {/* Compact Reports Table */}
          <Card className="bg-white shadow-md border-0 rounded-lg overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Recent Reports ({reports.length})
                </h3>
                <div className="text-emerald-100 text-xs">Latest entries</div>
              </div>
            </div>
            
            <div className="p-4">
              {reportsLoading ? (
                <div className="text-center py-6">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-gray-600 text-sm">Loading reports...</p>
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center py-6">
                  <FileText className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 text-sm">No reports yet. Add your first report above.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-left py-2 px-2 font-medium text-gray-700">Date</th>
                        <th className="text-left py-2 px-2 font-medium text-gray-700">Shift</th>
                        <th className="text-left py-2 px-2 font-medium text-gray-700">Activity</th>
                        <th className="text-right py-2 px-2 font-medium text-gray-700">Workers</th>
                        <th className="text-right py-2 px-2 font-medium text-gray-700">Slabs</th>
                        <th className="text-right py-2 px-2 font-medium text-gray-700">Sq Ft</th>
                        <th className="text-right py-2 px-2 font-medium text-gray-700">Hours</th>
                        <th className="text-right py-2 px-2 font-medium text-gray-700">Due</th>
                        <th className="text-right py-2 px-2 font-medium text-gray-700">Paid</th>
                        <th className="text-center py-2 px-2 font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.slice(0, 20).map((report) => (
                        <tr key={report.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-2 text-gray-900">
                            {new Date(report.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </td>
                          <td className="py-2 px-2">
                            <span className={`px-1 py-0.5 rounded text-xs font-medium ${
                              report.shift === 'MORNING' 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {report.shift === 'MORNING' ? '🌅' : '🌙'}
                            </span>
                          </td>
                          <td className="py-2 px-2">
                            <span className={`px-1 py-0.5 rounded text-xs font-medium ${
                              report.activity === 'GRINDING' 
                                ? 'bg-orange-100 text-orange-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {report.activity === 'GRINDING' ? '⚙️' : '✨'}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-right text-gray-900">{report.no_of_workers}</td>
                          <td className="py-2 px-2 text-right text-gray-900">{report.number_of_slabs}</td>
                          <td className="py-2 px-2 text-right text-gray-900">{report.total_sqft}</td>
                          <td className="py-2 px-2 text-right text-gray-900">{report.no_of_hours}</td>
                          <td className="py-2 px-2 text-right font-medium text-red-600">{fmt(report.debit_amount)}</td>
                          <td className="py-2 px-2 text-right font-medium text-green-600">{fmt(report.credit_amount)}</td>
                          <td className="py-2 px-2">
                            <div className="flex items-center justify-center space-x-1">
                              <Button
                                onClick={() => handleEdit(report)}
                                size="sm"
                                variant="outline"
                                className="h-6 w-6 p-0"
                              >
                                <Edit3 className="w-3 h-3" />
                              </Button>
                              <Button
                                onClick={() => handleDelete(report.id)}
                                size="sm"
                                variant="outline"
                                className="h-6 w-6 p-0 hover:bg-red-50 hover:border-red-200"
                              >
                                <Trash2 className="w-3 h-3 text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}