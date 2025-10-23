'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppLayout } from '@/components/AppLayout';
import { Upload, FileText, TrendingUp, TrendingDown, Zap, DollarSign, Activity, AlertCircle } from 'lucide-react';
import { formatCurrency, formatMonthName } from '@/lib/formatters';

interface ElectricityBill {
  id: string;
  bill_number: string;
  bill_month: string;
  bill_date: string;
  due_date: string;
  kwh_consumption: number;
  total_amount_payable: number;
  power_factor: number;
  maximum_demand_kva: number;
  cost_per_kwh: number;
  arrears_amount: number;
}

export default function ElectricityBillsPage() {
  const [bills, setBills] = useState<ElectricityBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBills();
  }, []);

  async function loadBills() {
    try {
      const response = await fetch('/api/electricity-bills?limit=24'); // Get last 24 months
      const data = await response.json();
      setBills(data.bills || []);
    } catch (error) {
      console.error('Error loading bills:', error);
    } finally {
      setLoading(false);
    }
  }

  // Group bills by month
  const billsByMonth = bills.reduce((groups: Record<string, ElectricityBill[]>, bill) => {
    const month = bill.bill_month;
    if (!groups[month]) {
      groups[month] = [];
    }
    groups[month].push(bill);
    return groups;
  }, {});

  const months = Object.keys(billsByMonth).sort((a, b) => {
    // Sort by date descending
    const dateA = new Date(billsByMonth[a][0].bill_date);
    const dateB = new Date(billsByMonth[b][0].bill_date);
    return dateB.getTime() - dateA.getTime();
  });

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setError(null);
    setParseResult(null);
  }

  async function parseBill() {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/electricity-bills/parse', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to parse bill');
        if (data.parsedData) {
          setParseResult(data.parsedData);
        }
        return;
      }

      setParseResult(data);
      loadBills(); // Refresh the list
      setSelectedFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('bill-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error: any) {
      console.error('Error parsing bill:', error);
      setError(error.message || 'Failed to upload bill');
    } finally {
      setUploading(false);
    }
  }

  // Calculate summary statistics
  const summary = {
    totalConsumption: bills.reduce((sum, bill) => sum + (bill.kwh_consumption || 0), 0),
    totalCost: bills.reduce((sum, bill) => sum + (bill.total_amount_payable || 0), 0),
    avgPowerFactor: bills.length > 0 
      ? bills.reduce((sum, bill) => sum + (bill.power_factor || 0), 0) / bills.length 
      : 0,
    totalArrears: bills.reduce((sum, bill) => sum + (bill.arrears_amount || 0), 0),
    avgCostPerKWH: bills.length > 0 
      ? bills.reduce((sum, bill) => sum + (bill.cost_per_kwh || 0), 0) / bills.length 
      : 0
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading electricity bills...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Zap className="text-yellow-500" />
            Electricity Bills Management
          </h1>
          <p className="text-gray-600 mt-2">
            Upload and track power consumption, costs, and efficiency metrics
          </p>
        </div>

        {/* Upload Section */}
        <Card className="p-6 mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Electricity Bill PDF
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                The system will automatically extract bill details, consumption data, and charges
              </p>
              
              <div className="flex gap-3">
                <Input
                  id="bill-upload"
                  type="file"
                  accept=".pdf,.txt"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="flex-1 bg-white"
                />
                <Button
                  onClick={parseBill}
                  disabled={!selectedFile || uploading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Parsing...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Parse Bill
                    </>
                  )}
                </Button>
              </div>

              {selectedFile && (
                <p className="text-sm text-gray-600 mt-2">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">Error</p>
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                </div>
              )}

              {parseResult && parseResult.success && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-800">✓ Success!</p>
                  <p className="text-sm text-green-600">
                    Bill #{parseResult.bill.bill_number} for {parseResult.bill.bill_month} has been saved
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Consumption</p>
                <p className="text-2xl font-bold text-gray-900">
                  {summary.totalConsumption.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">KWH</p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Cost</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(summary.totalCost)}
                </p>
                <p className="text-xs text-gray-500">Last {bills.length} bills</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Cost/KWH</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₹{summary.avgCostPerKWH.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">Per unit</p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Power Factor</p>
                <p className="text-2xl font-bold text-gray-900">
                  {summary.avgPowerFactor.toFixed(3)}
                </p>
                <p className="text-xs text-gray-500">
                  {summary.avgPowerFactor < 0.95 ? 'Can improve' : 'Good'}
                </p>
              </div>
              <Zap className={`w-8 h-8 ${summary.avgPowerFactor < 0.95 ? 'text-yellow-500' : 'text-green-500'}`} />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Arrears</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(summary.totalArrears)}
                </p>
                <p className="text-xs text-gray-500">Outstanding</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </Card>
        </div>

        {/* Bills Grouped by Month */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Bills by Month</h2>
          
          {bills.length === 0 ? (
            <Card className="p-12">
              <div className="text-center">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">No bills uploaded yet</p>
                <p className="text-sm text-gray-500">Upload your first electricity bill to get started</p>
              </div>
            </Card>
          ) : (
            months.map((month) => {
              const monthBills = billsByMonth[month];
              const monthTotal = monthBills.reduce((sum, b) => sum + (b.total_amount_payable || 0), 0);
              const monthConsumption = monthBills.reduce((sum, b) => sum + (b.kwh_consumption || 0), 0);
              const avgPF = monthBills.reduce((sum, b) => sum + (b.power_factor || 0), 0) / monthBills.length;
              const maxDemand = Math.max(...monthBills.map(b => b.maximum_demand_kva || 0));
              const avgCostPerKWH = monthConsumption > 0 ? monthTotal / monthConsumption : 0;
              
              return (
                <Card key={month} className="p-6 border-l-4 border-blue-500">
                  <div className="mb-4">
                    <h3 className="text-2xl font-bold text-gray-900">{formatMonthName(month)}</h3>
                    <p className="text-sm text-gray-600">{monthBills.length} bill(s) • {new Date(monthBills[0].bill_date).toLocaleDateString()}</p>
                  </div>
                  
                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Consumption</p>
                      <p className="text-xl font-bold text-blue-700">
                        {monthConsumption.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">KWH</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Total Cost</p>
                      <p className="text-xl font-bold text-green-700">
                        {formatCurrency(monthTotal)}
                      </p>
                      <p className="text-xs text-gray-500">Per month</p>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Cost/KWH</p>
                      <p className="text-xl font-bold text-orange-700">
                        ₹{avgCostPerKWH.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">Per unit</p>
                    </div>
                    <div className={`${avgPF < 0.95 ? 'bg-yellow-50' : 'bg-green-50'} p-3 rounded-lg`}>
                      <p className="text-xs text-gray-600 mb-1">Power Factor</p>
                      <p className={`text-xl font-bold ${avgPF < 0.95 ? 'text-yellow-700' : 'text-green-700'}`}>
                        {avgPF.toFixed(3)}
                      </p>
                      <p className="text-xs text-gray-500">{avgPF < 0.95 ? 'Needs improvement' : 'Good'}</p>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Peak Demand</p>
                      <p className="text-xl font-bold text-red-700">
                        {maxDemand.toFixed(1)}
                      </p>
                      <p className="text-xs text-gray-500">KVA max</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Bill No</th>
                          <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Date</th>
                          <th className="text-right py-2 px-3 text-sm font-semibold text-gray-700">KWH</th>
                          <th className="text-right py-2 px-3 text-sm font-semibold text-gray-700">KVA</th>
                          <th className="text-right py-2 px-3 text-sm font-semibold text-gray-700">PF</th>
                          <th className="text-right py-2 px-3 text-sm font-semibold text-gray-700">₹/KWH</th>
                          <th className="text-right py-2 px-3 text-sm font-semibold text-gray-700">Amount</th>
                          <th className="text-center py-2 px-3 text-sm font-semibold text-gray-700">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthBills.map((bill) => {
                          const dueDate = new Date(bill.due_date);
                          const isOverdue = dueDate < new Date() && bill.arrears_amount > 0;
                          
                          return (
                            <tr key={bill.id} className="border-b hover:bg-gray-50">
                              <td className="py-2 px-3 font-medium text-sm">{bill.bill_number}</td>
                              <td className="py-2 px-3 text-sm text-gray-600">
                                {new Date(bill.bill_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                              </td>
                              <td className="py-2 px-3 text-right text-sm font-medium">
                                {bill.kwh_consumption?.toLocaleString() || 0}
                              </td>
                              <td className="py-2 px-3 text-right text-sm">
                                {bill.maximum_demand_kva?.toFixed(1) || 0}
                              </td>
                              <td className="py-2 px-3 text-right text-sm">
                                <span className={`font-medium ${bill.power_factor < 0.95 ? 'text-yellow-600' : 'text-green-600'}`}>
                                  {bill.power_factor?.toFixed(3) || '0.000'}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right text-sm">
                                ₹{bill.cost_per_kwh?.toFixed(2) || '0.00'}
                              </td>
                              <td className="py-2 px-3 text-right text-sm font-semibold text-green-700">
                                {formatCurrency(bill.total_amount_payable)}
                              </td>
                              <td className="py-2 px-3 text-center">
                                {isOverdue ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    Overdue
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Paid
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}
