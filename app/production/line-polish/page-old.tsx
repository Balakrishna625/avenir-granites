'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppLayout } from '@/components/AppLayout';
import { 
  ArrowLeft,
  Save,
  Plus,
  Edit3,
  Trash2,
  Users,
  Layers,
  BarChart3,
  Clock,
  DollarSign,
  FileText,
  Factory,
  Wrench,
  Calendar
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/toast';

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const fmt = (n: number) => INR.format(n || 0);

interface LinePolishReport {
  id?: string;
  date: string;
  shift: 'MORNING' | 'NIGHT';
  activity: 'GRINDING' | 'POLISHING';
  no_of_workers: number | string;
  number_of_slabs: number | string;
  total_sqft: number | string;
  no_of_hours: number | string;
  rate_per_hour: number | string;
  debit_amount: number;
  credit_amount: number | string;
  remarks: string;
}

const initialFormData: LinePolishReport = {
  date: new Date().toISOString().split('T')[0],
  shift: 'MORNING',
  activity: 'POLISHING',
  no_of_workers: '',
  number_of_slabs: '',
  total_sqft: '',
  no_of_hours: '',
  rate_per_hour: '',
  debit_amount: 0,
  credit_amount: '',
  remarks: ''
};

export default function LinePolishReportsPage() {
  const [reports, setReports] = useState<LinePolishReport[]>([]);
  const [formData, setFormData] = useState<LinePolishReport>(initialFormData);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportsLoading, setReportsLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    loadReports();
  }, []);

  // Auto-calculate debit amount when hours or rate changes
  useEffect(() => {
    const hours = typeof formData.no_of_hours === 'string' ? parseFloat(formData.no_of_hours) || 0 : formData.no_of_hours || 0;
    const rate = typeof formData.rate_per_hour === 'string' ? parseFloat(formData.rate_per_hour) || 0 : formData.rate_per_hour || 0;
    const debitAmount = hours * rate;
    setFormData(prev => ({ ...prev, debit_amount: debitAmount }));
  }, [formData.no_of_hours, formData.rate_per_hour]);

  async function loadReports() {
    try {
      const response = await fetch('/api/line-polish-reports');
      const data = await response.json();
      setReports(data);
    } catch (error) {
      console.error('Failed to load reports:', error);
      showToast('error', 'Failed to load reports');
    } finally {
      setReportsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // Convert string values to numbers for API submission
      const submitData = {
        ...formData,
        no_of_workers: typeof formData.no_of_workers === 'string' ? parseFloat(formData.no_of_workers) || 0 : formData.no_of_workers,
        number_of_slabs: typeof formData.number_of_slabs === 'string' ? parseFloat(formData.number_of_slabs) || 0 : formData.number_of_slabs,
        total_sqft: typeof formData.total_sqft === 'string' ? parseFloat(formData.total_sqft) || 0 : formData.total_sqft,
        no_of_hours: typeof formData.no_of_hours === 'string' ? parseFloat(formData.no_of_hours) || 0 : formData.no_of_hours,
        rate_per_hour: typeof formData.rate_per_hour === 'string' ? parseFloat(formData.rate_per_hour) || 0 : formData.rate_per_hour,
        credit_amount: typeof formData.credit_amount === 'string' ? parseFloat(formData.credit_amount) || 0 : formData.credit_amount,
      };
      
      const url = '/api/line-polish-reports';
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save report');
      }

      showToast(
        'success',
        isEditing ? 'Report updated successfully' : 'Report created successfully'
      );
      
      setFormData(initialFormData);
      setIsEditing(false);
      loadReports();
    } catch (error: any) {
      showToast('error', error.message || 'Failed to save report');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this report?')) return;

    try {
      const response = await fetch('/api/line-polish-reports', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });

      if (!response.ok) throw new Error('Failed to delete report');

      showToast('success', 'Report deleted successfully');
      loadReports();
    } catch (error) {
      showToast('error', 'Failed to delete report');
    }
  }

  function handleEdit(report: LinePolishReport) {
    setFormData(report);
    setIsEditing(true);
  }

  function handleCancel() {
    setFormData(initialFormData);
    setIsEditing(false);
  }

  function handleInputChange(field: keyof LinePolishReport, value: any) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  const groupedReports = reports.reduce((acc, report) => {
    const date = report.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(report);
    return acc;
  }, {} as Record<string, LinePolishReport[]>);

  return (
    <AppLayout>
      <div className="min-h-screen w-full bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/production">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Production
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Line Polish Reports</h1>
                <p className="text-sm text-gray-600">Add and manage daily production reports</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
          {/* Compact Form Card */}
          <Card className="bg-white shadow-lg border-0 rounded-xl overflow-hidden">
            {/* Compact Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center">
                  {isEditing ? (
                    <>
                      <Edit3 className="w-5 h-5 mr-2" />
                      Edit Report
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 mr-2" />
                      Quick Add Report
                    </>
                  )}
                </h2>
                <span className="text-blue-100 text-sm">Fast entry for daily reports</span>
              </div>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Row 1: Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date
                    </label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => handleInputChange('date', e.target.value)}
                      className="h-10"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Shift
                    </label>
                    <select
                      value={formData.shift}
                      onChange={(e) => handleInputChange('shift', e.target.value)}
                      className="w-full h-10 px-3 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500 bg-white text-sm"
                      required
                    >
                      <option value="MORNING">🌅 Morning</option>
                      <option value="NIGHT">🌙 Night</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Activity
                    </label>
                    <select
                      value={formData.activity}
                      onChange={(e) => handleInputChange('activity', e.target.value)}
                      className="w-full h-10 px-3 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500 bg-white text-sm"
                      required
                    >
                      <option value="GRINDING">⚙️ Grinding</option>
                      <option value="POLISHING">✨ Polishing</option>
                    </select>
                  </div>
                </div>

                {/* Row 2: Production Numbers */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Workers
                    </label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Count"
                      value={formData.no_of_workers}
                      onChange={(e) => handleInputChange('no_of_workers', e.target.value)}
                      className="h-10"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Slabs
                    </label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Count"
                      value={formData.number_of_slabs}
                      onChange={(e) => handleInputChange('number_of_slabs', e.target.value)}
                      className="h-10"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sq Ft
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Area"
                      value={formData.total_sqft}
                      onChange={(e) => handleInputChange('total_sqft', e.target.value)}
                      className="h-10"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hours
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="Time"
                      value={formData.no_of_hours}
                      onChange={(e) => handleInputChange('no_of_hours', e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>

                {/* Row 3: Payment & Submit */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rate/Hour (₹)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="Rate"
                      value={formData.rate_per_hour}
                      onChange={(e) => handleInputChange('rate_per_hour', e.target.value)}
                      className="h-10"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Due
                    </label>
                    <div className="h-10 px-3 bg-blue-50 border border-blue-200 rounded-md flex items-center text-sm font-semibold text-blue-800">
                      {fmt(formData.debit_amount)}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Paid (₹)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="Amount"
                      value={formData.credit_amount}
                      onChange={(e) => handleInputChange('credit_amount', e.target.value)}
                      className="h-10"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Remarks
                    </label>
                    <Input
                      type="text"
                      placeholder="Optional notes"
                      value={formData.remarks}
                      onChange={(e) => handleInputChange('remarks', e.target.value)}
                      className="h-10"
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
                        }}
                        className="h-10 px-4"
                      >
                        Cancel
                      </Button>
                    )}
                    <Button 
                      type="submit" 
                      disabled={loading}
                      className="h-10 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-1" />
                          {isEditing ? 'Update' : 'Save'}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </Card>

          {/* Reports List */}
          <Card className="bg-white shadow-lg border-0 rounded-xl overflow-hidden">
            {/* Compact Reports Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Recent Reports ({reports.length})
                </h3>
                <div className="text-emerald-100 text-xs">
                  Latest entries
                </div>
              </div>
            </div>
            
            <div className="p-4">
              {reportsLoading ? (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                    <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <p className="text-lg text-gray-600">Loading production reports...</p>
                </div>
              ) : Object.keys(groupedReports).length === 0 ? (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Reports Yet</h3>
                  <p className="text-gray-600 mb-6">Start by adding your first production report using the form above</p>
                  <Button 
                    onClick={() => document.querySelector('form')?.scrollIntoView({ behavior: 'smooth' })}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Report
                  </Button>
                </div>
              ) : (
                <div className="space-y-8">
                  {Object.entries(groupedReports)
                    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                    .slice(0, 10)
                    .map(([date, dateReports]) => (
                      <div key={date} className="border border-gray-200 rounded-xl overflow-hidden">
                        {/* Date Header */}
                        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                          <h3 className="text-lg font-bold text-gray-900 flex items-center">
                            <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                            {new Date(date).toLocaleDateString('en-IN', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                            <span className="ml-auto text-sm font-medium text-gray-600">
                              {dateReports.length} report{dateReports.length !== 1 ? 's' : ''}
                            </span>
                          </h3>
                        </div>
                        
                        <div className="p-6">
                          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                            {dateReports.map((report) => (
                              <div key={report.id} className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200">
                                {/* Report Header */}
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center space-x-3">
                                    <div className={`w-3 h-3 rounded-full ${report.shift === 'MORNING' ? 'bg-yellow-400' : 'bg-blue-500'}`}></div>
                                    <span className="font-semibold text-gray-900">
                                      {report.shift === 'MORNING' ? '🌅 Morning' : '🌙 Night'} Shift
                                    </span>
                                  </div>
                                  <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                                    report.activity === 'GRINDING' 
                                      ? 'bg-orange-100 text-orange-800' 
                                      : 'bg-purple-100 text-purple-800'
                                  }`}>
                                    {report.activity === 'GRINDING' ? '⚙️ Grinding' : '✨ Polishing'}
                                  </span>
                                </div>

                                {/* Production Metrics */}
                                <div className="space-y-3 mb-4">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600 flex items-center">
                                      <Users className="w-4 h-4 mr-1" />
                                      Workers:
                                    </span>
                                    <span className="font-semibold text-gray-900">{report.no_of_workers}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600 flex items-center">
                                      <Layers className="w-4 h-4 mr-1" />
                                      Slabs:
                                    </span>
                                    <span className="font-semibold text-gray-900">{report.number_of_slabs}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600 flex items-center">
                                      <BarChart3 className="w-4 h-4 mr-1" />
                                      Sq Ft:
                                    </span>
                                    <span className="font-semibold text-gray-900">{report.total_sqft}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600 flex items-center">
                                      <Clock className="w-4 h-4 mr-1" />
                                      Hours:
                                    </span>
                                    <span className="font-semibold text-gray-900">{report.no_of_hours}h</span>
                                  </div>
                                </div>

                                {/* Financial Summary */}
                                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-600">Rate/Hour:</span>
                                    <span className="font-medium text-gray-900">{fmt(typeof report.rate_per_hour === 'string' ? parseFloat(report.rate_per_hour) || 0 : report.rate_per_hour)}/hr</span>
                                  </div>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-600">Total Due:</span>
                                    <span className="font-semibold text-blue-600">{fmt(report.debit_amount)}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Paid:</span>
                                    <span className="font-semibold text-green-600">{fmt(typeof report.credit_amount === 'string' ? parseFloat(report.credit_amount) || 0 : report.credit_amount)}</span>
                                  </div>
                                </div>

                                {/* Remarks */}
                                {report.remarks && (
                                  <div className="mb-4">
                                    <p className="text-xs text-gray-500 mb-1">Remarks:</p>
                                    <p className="text-sm text-gray-700 italic bg-blue-50 p-2 rounded border-l-2 border-blue-300">
                                      "{report.remarks}"
                                    </p>
                                  </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex items-center space-x-2 pt-3 border-t border-gray-200">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEdit(report)}
                                    className="flex-1 h-9 text-xs font-medium border-blue-300 text-blue-700 hover:bg-blue-50"
                                  >
                                    <Edit3 className="w-3 h-3 mr-1" />
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDelete(report.id!)}
                                    className="flex-1 h-9 text-xs font-medium border-red-300 text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-3 h-3 mr-1" />
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}