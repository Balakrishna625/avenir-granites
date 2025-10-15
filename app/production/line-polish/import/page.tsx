'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet, Check, AlertCircle, Trash2 } from 'lucide-react';

interface ParsedReport {
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
}

interface ParsedPayment {
  payment_date: string;
  amount: number;
  payment_method: 'CASH' | 'BANK_TRANSFER' | 'UPI' | 'CHEQUE';
  remarks?: string;
}

interface OpeningBalance {
  month: string;
  amount: number;
  remarks: string;
}

export default function ImportDataPage() {
  const [pastedData, setPastedData] = useState('');
  const [parsedReports, setParsedReports] = useState<ParsedReport[]>([]);
  const [parsedPayments, setParsedPayments] = useState<ParsedPayment[]>([]);
  const [openingBalances, setOpeningBalances] = useState<OpeningBalance[]>([]);
  const [importing, setImporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError('');
      
      // Dynamically import xlsx library
      const XLSX = await import('xlsx');
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
          
          parseExcelRows(jsonData as any[][]);
        } catch (err: any) {
          setError('Error reading Excel file: ' + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err: any) {
      setError('Error processing file: ' + err.message);
    }
  };

  const parseExcelRows = (rows: any[][]) => {
    try {
      const reports: ParsedReport[] = [];
      const payments: ParsedPayment[] = [];
      const balances: OpeningBalance[] = [];
      
      let currentMonth = '';
      let previousShift: 'MORNING' | 'NIGHT' = 'MORNING';
      let lastDate = ''; // Track the last valid date for rows without dates

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        // Skip empty rows
        if (!row || row.length === 0 || !row.some(cell => cell)) continue;

        // Convert row to string to check for headers
        const rowStr = row.join(' ').toUpperCase();

        // Extract month from header
        if (rowStr.includes('LINE POLISH REPORT') || rowStr.includes('MONTH OF')) {
          const monthMatch = rowStr.match(/(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)-?(\d{2,4})/i);
          if (monthMatch) {
            const monthNames: { [key: string]: string } = {
              'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
              'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
              'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
            };
            const month = monthNames[monthMatch[1].toUpperCase()];
            let year = monthMatch[2];
            if (year.length === 2) year = '20' + year;
            currentMonth = `${year}-${month}`;
          }
          continue;
        }

        // Check for opening balance
        if (rowStr.includes('OPENING BALANCE')) {
          const amountMatch = rowStr.match(/(\d+)/);
          if (amountMatch && currentMonth) {
            balances.push({
              month: currentMonth,
              amount: parseFloat(amountMatch[0]),
              remarks: rowStr.includes('JUL') ? 'JUL-25 opening balance' : 
                       rowStr.includes('AUG') ? 'AUG-25 opening balance' : 
                       'Opening balance from import'
            });
          }
          continue;
        }

        // Skip header rows
        if (rowStr.includes('DATE') || rowStr.includes('SHIFT') || rowStr.includes('WORKERS')) {
          continue;
        }

        // Parse data rows
        const dateStr = row[0]?.toString().trim();
        const shiftRaw = row[1]?.toString().trim().toUpperCase();
        const workersStr = row[2]?.toString().trim();
        const slabsStr = row[3]?.toString().trim();
        const sqftStr = row[4]?.toString().trim();
        const hoursStr = row[5]?.toString().trim();
        const rateStr = row[6]?.toString().trim();
        const debitStr = row[7]?.toString().trim();
        const creditStr = row[8]?.toString().trim();
        const remarksStr = row[9]?.toString().trim();

        // Debug: Log the parsed row
        console.log(`Row ${i}:`, { dateStr, shiftRaw, workersStr, slabsStr, sqftStr, hoursStr, rateStr, debitStr });

        // Determine the date to use
        let fullDate = '';
        
        // If this row has a date, parse it and save it as lastDate
        if (dateStr && dateStr.includes('.')) {
          const dateParts = dateStr.split('.');
          if (dateParts.length === 3) {
            const day = dateParts[0].padStart(2, '0');
            const month = dateParts[1].padStart(2, '0');
            let year = dateParts[2];
            if (year.length === 2) year = '20' + year;
            fullDate = `${year}-${month}-${day}`;
            lastDate = fullDate; // Save for next row
          }
        } else if (lastDate && shiftRaw) {
          // No date but has shift data - use the last date (B shift rows)
          fullDate = lastDate;
        }

        // Skip if we still don't have a valid date
        if (!fullDate) continue;

        // Skip if no shift indicator
        if (!shiftRaw) continue;

        // Process the row with fullDate
        {

          // Determine shift and activity
          let shift: 'MORNING' | 'NIGHT' = 'MORNING';
          let activity: 'GRINDING' | 'POLISHING' = 'POLISHING';

          if (shiftRaw === 'A') {
            shift = 'MORNING';
            activity = 'POLISHING';
            previousShift = 'MORNING';
          } else if (shiftRaw === 'B') {
            shift = 'NIGHT';
            activity = 'POLISHING';
            previousShift = 'NIGHT';
          } else if (shiftRaw === 'G') {
            // G means GRINDING - use the previous shift to determine if morning or night
            shift = previousShift;
            activity = 'GRINDING';
          } else if (shiftRaw === '') {
            // Empty shift - might be a continuation, use previous shift
            shift = previousShift;
            activity = 'POLISHING';
          }

          const workers = parseInt(workersStr) || 3;
          const slabs = parseInt(slabsStr) || 0;
          const sqft = parseFloat(sqftStr) || 0;
          const hours = parseFloat(hoursStr) || 0;
          const rate = parseFloat(rateStr) || 250;
          const debit = parseFloat(debitStr) || (hours * rate);

          // Debug: Log what we determined
          console.log(`Parsed: Date=${fullDate}, ShiftRaw="${shiftRaw}", DeterminedShift=${shift}, Activity=${activity}, Hours=${hours}, Slabs=${slabs}`);

          // Only add if we have valid data
          if (hours > 0 || slabs > 0) {
            reports.push({
              date: fullDate,
              shift,
              activity,
              no_of_workers: workers,
              number_of_slabs: slabs,
              total_sqft: sqft,
              no_of_hours: hours,
              rate_per_hour: rate,
              debit_amount: debit,
              remarks: remarksStr || undefined
            });
            console.log(`✓ Added report: ${shift} ${activity} on ${fullDate}`);
          } else {
            console.log(`✗ Skipped (no hours/slabs): ${shift} ${activity} on ${fullDate}`);
          }

          // Check for credit (payment)
          if (creditStr && parseFloat(creditStr) > 0) {
            payments.push({
              payment_date: fullDate,
              amount: parseFloat(creditStr),
              payment_method: 'CASH',
              remarks: 'Payment from Excel import'
            });
          }
        } // End of processing block
      }

      console.log('========================================');
      console.log('PARSING COMPLETE');
      console.log('========================================');
      console.log('Total reports parsed:', reports.length);
      console.log('Reports by shift:', {
        morning: reports.filter(r => r.shift === 'MORNING').length,
        night: reports.filter(r => r.shift === 'NIGHT').length
      });
      console.log('Reports by activity:', {
        polishing: reports.filter(r => r.activity === 'POLISHING').length,
        grinding: reports.filter(r => r.activity === 'GRINDING').length
      });
      console.log('Total payments:', payments.length);
      console.log('Total opening balances:', balances.length);
      console.log('========================================');

      setParsedReports(reports);
      setParsedPayments(payments);
      setOpeningBalances(balances);
      setImportSuccess(false);
    } catch (err: any) {
      setError('Error parsing Excel data: ' + err.message);
    }
  };

  const handleClearAllData = async () => {
    if (!confirm('⚠️ WARNING: This will delete ALL line polish reports, payments, and monthly balances. This action cannot be undone. Are you sure?')) {
      return;
    }

    if (!confirm('Are you ABSOLUTELY sure? All data will be permanently deleted!')) {
      return;
    }

    try {
      setClearing(true);
      setError('');

      const response = await fetch('/api/line-polish-reports/clear-all', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clear data');
      }

      alert('All data cleared successfully!');
      setParsedReports([]);
      setParsedPayments([]);
      setOpeningBalances([]);
      
    } catch (err: any) {
      setError('Clear failed: ' + err.message);
    } finally {
      setClearing(false);
    }
  };

  const handleImport = async () => {
    try {
      setImporting(true);
      setError('');

      // 1. Import opening balances first
      if (openingBalances.length > 0) {
        for (const balance of openingBalances) {
          await fetch('/api/line-polish-monthly-balances', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              month: balance.month,
              opening_balance: balance.amount,
              total_work_amount: 0,
              total_payments: 0,
              closing_balance: balance.amount,
              notes: balance.remarks
            })
          });
        }
      }

      // 2. Import reports
      if (parsedReports.length > 0) {
        const reportsResponse = await fetch('/api/line-polish-reports/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reports: parsedReports })
        });

        if (!reportsResponse.ok) {
          const errorData = await reportsResponse.json();
          throw new Error(errorData.error || 'Failed to import reports');
        }
      }

      // 3. Import payments
      if (parsedPayments.length > 0) {
        const paymentsResponse = await fetch('/api/line-polish-payments/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payments: parsedPayments })
        });

        if (!paymentsResponse.ok) {
          const errorData = await paymentsResponse.json();
          throw new Error(errorData.error || 'Failed to import payments');
        }
      }

      setImportSuccess(true);
      setTimeout(() => {
        window.location.href = '/production/line-polish';
      }, 2000);

    } catch (err: any) {
      setError('Import failed: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="max-w-7xl mx-auto px-6 space-y-6">
          
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center gap-3 mb-4">
              <FileSpreadsheet className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Import Excel Data</h1>
                <p className="text-sm text-gray-600">Paste your Excel data below to import historical line polish reports</p>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-blue-900 mb-2">📋 How to Import:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                <li>Click "Choose Excel File" button below</li>
                <li>Select your Excel file (.xlsx or .xls)</li>
                <li>The system will automatically parse the data</li>
                <li>Review the parsed data in the preview tables</li>
                <li>Click "Import All Data" to import</li>
              </ol>
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-xs text-yellow-800">
                  <strong>Note:</strong> Shift "G" will be treated as GRINDING activity in MORNING shift. 
                  All "A" shifts = Morning Polishing, "B" shifts = Night Polishing.
                </p>
              </div>
            </div>

            {/* File Upload */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="excel-upload"
              />
              <label
                htmlFor="excel-upload"
                className="cursor-pointer inline-flex flex-col items-center"
              >
                <Upload className="w-12 h-12 text-gray-400 mb-3" />
                <span className="text-lg font-medium text-gray-700 mb-1">
                  Choose Excel File
                </span>
                <span className="text-sm text-gray-500">
                  Click to upload .xlsx or .xls file
                </span>
              </label>
            </div>

            <div className="flex gap-3 mt-4">
              <Button
                onClick={handleClearAllData}
                disabled={clearing}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {clearing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Clearing...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear All Data
                  </>
                )}
              </Button>

              {(parsedReports.length > 0 || parsedPayments.length > 0 || openingBalances.length > 0) && (
                <Button
                  onClick={handleImport}
                  disabled={importing || importSuccess}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {importing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Importing...
                    </>
                  ) : importSuccess ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Imported Successfully!
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Import All Data
                    </>
                  )}
                </Button>
              )}
            </div>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-800">{error}</div>
              </div>
            )}

            {importSuccess && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-2">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-800">
                  Data imported successfully! Redirecting to Line Polish page...
                </div>
              </div>
            )}
          </div>

          {/* Preview Opening Balances */}
          {openingBalances.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b bg-purple-50">
                <h3 className="text-lg font-semibold text-purple-900">
                  Opening Balances ({openingBalances.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Month</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Amount</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openingBalances.map((balance, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{balance.month}</td>
                        <td className="py-3 px-4 text-right font-semibold text-purple-600">
                          ₹{balance.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-gray-600">{balance.remarks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Preview Reports */}
          {parsedReports.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b bg-blue-50">
                <h3 className="text-lg font-semibold text-blue-900">
                  Parsed Reports ({parsedReports.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
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
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Rate</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedReports.slice(0, 10).map((report, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{new Date(report.date).toLocaleDateString('en-IN')}</td>
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
                        <td className="py-3 px-4 text-right">₹{report.rate_per_hour}</td>
                        <td className="py-3 px-4 text-right font-semibold">₹{report.debit_amount.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedReports.length > 10 && (
                  <div className="px-6 py-3 text-sm text-gray-600 text-center border-t">
                    Showing first 10 of {parsedReports.length} reports. All will be imported.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Preview Payments */}
          {parsedPayments.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b bg-green-50">
                <h3 className="text-lg font-semibold text-green-900">
                  Parsed Payments ({parsedPayments.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Amount</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Method</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedPayments.map((payment, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{new Date(payment.payment_date).toLocaleDateString('en-IN')}</td>
                        <td className="py-3 px-4 text-right font-semibold text-green-600">
                          ₹{payment.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {payment.payment_method}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{payment.remarks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </AppLayout>
  );
}
