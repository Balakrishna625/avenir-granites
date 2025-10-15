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
  Wrench
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
  no_of_workers: number;
  number_of_slabs: number;
  total_sqft: number;
  no_of_hours: number;
  rate_per_hour: number;
  debit_amount: number;
  credit_amount: number;
  remarks: string;
}

const initialFormData: LinePolishReport = {
  date: new Date().toISOString().split('T')[0],
  shift: 'MORNING',
  activity: 'POLISHING',
  no_of_workers: 0,
  number_of_slabs: 0,
  total_sqft: 0,
  no_of_hours: 0,
  rate_per_hour: 250,
  debit_amount: 0,
  credit_amount: 0,
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
    const debitAmount = (formData.no_of_hours || 0) * (formData.rate_per_hour || 0);
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
      const url = '/api/line-polish-reports';
      const method = isEditing ? 'PUT' : 'POST';
      const body = isEditing ? formData : { ...formData };
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
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
      const response = await fetch(`/api/line-polish-reports?id=${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete report');
      }

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
        {/* Form Card */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            {isEditing ? (
              <>
                <Edit3 className="w-5 h-5 mr-2 text-blue-500" />
                Edit Line Polish Report
              </>
            ) : (
              <>
                <Plus className="w-5 h-5 mr-2 text-green-500" />
                Add New Line Polish Report
              </>
            )}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shift *
                </label>
                <select
                  value={formData.shift}
                  onChange={(e) => handleInputChange('shift', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="MORNING">Morning Shift (A)</option>
                  <option value="NIGHT">Night Shift (B)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Activity *
                </label>
                <select
                  value={formData.activity}
                  onChange={(e) => handleInputChange('activity', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="GRINDING">Grinding</option>
                  <option value="POLISHING">Polishing</option>
                </select>
              </div>
            </div>

            {/* Production Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Users className="w-4 h-4 inline mr-1" />
                  No. of Workers
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.no_of_workers}
                  onChange={(e) => handleInputChange('no_of_workers', parseInt(e.target.value) || 0)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Layers className="w-4 h-4 inline mr-1" />
                  Number of Slabs
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.number_of_slabs}
                  onChange={(e) => handleInputChange('number_of_slabs', parseInt(e.target.value) || 0)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <BarChart3 className="w-4 h-4 inline mr-1" />
                  Total SqFt
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.total_sqft}
                  onChange={(e) => handleInputChange('total_sqft', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            {/* Payment Details */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Clock className="w-4 h-4 inline mr-1" />
                  No. of Hours
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.no_of_hours}
                  onChange={(e) => handleInputChange('no_of_hours', parseFloat(e.target.value) || 0)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Rate/Hour (₹)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.rate_per_hour}
                  onChange={(e) => handleInputChange('rate_per_hour', parseFloat(e.target.value) || 0)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Debit Amount (₹)
                </label>
                <Input
                  type="number"
                  value={formData.debit_amount}
                  disabled
                  className="bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-calculated</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Credit Amount (₹)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.credit_amount}
                  onChange={(e) => handleInputChange('credit_amount', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FileText className="w-4 h-4 inline mr-1" />
                Remarks
              </label>
              <textarea
                value={formData.remarks}
                onChange={(e) => handleInputChange('remarks', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                rows={3}
                placeholder="Any additional notes..."
              />
            </div>

            {/* Form Actions */}
            <div className="flex items-center space-x-4">
              <Button type="submit" disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Saving...' : isEditing ? 'Update Report' : 'Add Report'}
              </Button>
              
              {isEditing && (
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Card>

        {/* Reports List */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Factory className="w-5 h-5 mr-2 text-blue-500" />
            Recent Reports
          </h2>
          
          {reportsLoading ? (
            <div className="text-center py-8 text-gray-500">Loading reports...</div>
          ) : Object.keys(groupedReports).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No reports found. Add your first report above.
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedReports)
                .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                .slice(0, 10)
                .map(([date, dateReports]) => (
                  <div key={date} className="border-l-4 border-blue-500 pl-4">
                    <h3 className="font-semibold text-gray-900 mb-3">
                      {new Date(date).toLocaleDateString('en-IN', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {dateReports.map((report) => (
                        <div key={report.id} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-blue-600">
                                {report.shift === 'MORNING' ? 'Morning' : 'Night'}
                              </span>
                              <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                                {report.activity}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(report)}
                              >
                                <Edit3 className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(report.id!)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-gray-600">Workers:</span>
                              <span className="font-medium ml-1">{report.no_of_workers}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Slabs:</span>
                              <span className="font-medium ml-1">{report.number_of_slabs}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">SqFt:</span>
                              <span className="font-medium ml-1">{report.total_sqft}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Hours:</span>
                              <span className="font-medium ml-1">{report.no_of_hours}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Rate:</span>
                              <span className="font-medium ml-1">{fmt(report.rate_per_hour)}/hr</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Amount:</span>
                              <span className="font-medium ml-1 text-red-600">{fmt(report.debit_amount)}</span>
                            </div>
                          </div>
                          
                          {report.remarks && (
                            <p className="text-xs text-gray-600 mt-2 italic">
                              {report.remarks}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </Card>
      </div>
    </div>
    </AppLayout>
  );
}