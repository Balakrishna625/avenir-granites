'use client';

import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function MultiCutterDebugPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiResponse, setApiResponse] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    console.log('🔍 Debug page - fetching data...');
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/multi-cutter-reports');
      console.log('Response status:', response.status);
      
      const data = await response.json();
      console.log('Response data:', data);
      
      setApiResponse({
        status: response.status,
        ok: response.ok,
        dataType: Array.isArray(data) ? 'array' : typeof data,
        dataLength: Array.isArray(data) ? data.length : 'N/A',
        data: data
      });
      
      if (Array.isArray(data)) {
        setReports(data);
      } else {
        setError('Response is not an array');
      }
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="p-8">
          <h1 className="text-2xl font-bold mb-4">Multi-Cutter Debug Page</h1>
          <p>Loading...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Multi-Cutter Debug Page</h1>
          <Button onClick={loadData}>Refresh</Button>
        </div>

        {error && (
          <Card className="p-4 bg-red-50 border-red-200">
            <h2 className="text-lg font-semibold text-red-900 mb-2">Error</h2>
            <p className="text-red-700">{error}</p>
          </Card>
        )}

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">API Response Details</h2>
          <div className="space-y-2 text-sm font-mono">
            <div><strong>Status:</strong> {apiResponse?.status}</div>
            <div><strong>OK:</strong> {String(apiResponse?.ok)}</div>
            <div><strong>Data Type:</strong> {apiResponse?.dataType}</div>
            <div><strong>Data Length:</strong> {apiResponse?.dataLength}</div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Reports Data ({reports.length})</h2>
          
          {reports.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              <p className="text-lg mb-2">No reports found in database</p>
              <p className="text-sm">The multi_cutter_reports table exists but is empty.</p>
              <p className="text-sm mt-4">Try adding a report from the main multi-cutter page.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report, index) => (
                <Card key={report.id} className="p-4 bg-gray-50">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="font-semibold text-gray-600">ID</div>
                      <div className="font-mono text-xs">{report.id}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-600">Date</div>
                      <div>{report.date}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-600">Machine</div>
                      <div>{report.machine}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-600">Total Slabs</div>
                      <div className="text-lg font-bold">{report.total_slabs || 0}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-600">Total Sq Ft</div>
                      <div className="text-lg font-bold">{report.total_sqft || 0}</div>
                    </div>
                    <div className="col-span-3">
                      <div className="font-semibold text-gray-600">Blocks</div>
                      <div className="text-xs font-mono">
                        {Array.isArray(report.blocks) ? `${report.blocks.length} blocks` : 'N/A'}
                      </div>
                    </div>
                  </div>
                  
                  {Array.isArray(report.blocks) && report.blocks.length > 0 && (
                    <div className="mt-4 border-t pt-4">
                      <div className="font-semibold text-gray-600 mb-2">Block Details:</div>
                      {report.blocks.map((block: any, bIndex: number) => (
                        <div key={bIndex} className="text-xs bg-white p-2 rounded mb-1">
                          {block.block_name} - {block.material_type} - {block.slabs} slabs - {block.sqft} sqft
                          {block.notes && ` - ${block.notes}`}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Calculated Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-purple-50 rounded">
              <div className="text-sm text-gray-600">Total Slabs</div>
              <div className="text-3xl font-bold">
                {reports.reduce((sum, r) => sum + (Number(r.total_slabs) || 0), 0)}
              </div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded">
              <div className="text-sm text-gray-600">Total Sq Ft</div>
              <div className="text-3xl font-bold">
                {reports.reduce((sum, r) => sum + (Number(r.total_sqft) || 0), 0).toLocaleString()}
              </div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded">
              <div className="text-sm text-gray-600">Reports Count</div>
              <div className="text-3xl font-bold">{reports.length}</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded">
              <div className="text-sm text-gray-600">Machines Active</div>
              <div className="text-3xl font-bold">
                {new Set(reports.map(r => r.machine)).size}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-yellow-50">
          <h2 className="text-lg font-semibold mb-2">Next Steps</h2>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>If you see reports above, the database and API are working correctly</li>
            <li>If you see 0 reports, you need to add data from the main multi-cutter page</li>
            <li>Check the browser console (F12) for detailed logs</li>
            <li>Check the terminal/server console for server-side logs</li>
          </ul>
        </Card>
      </div>
    </AppLayout>
  );
}
