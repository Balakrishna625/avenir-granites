"use client";
import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';

interface BlockRowPart { slabs: number; sqft: number; }
interface BlockRow {
  block_id: string;
  block_no: string;
  gross: number;
  net: number;
  marker_measurement: number; // same as net billed measurement
  parts: { A: BlockRowPart; B: BlockRowPart; CD: BlockRowPart };
  totalSlabs: number;
  totalSqft: number;
}

export default function ProductionTablePage() {
  const [consignments, setConsignments] = useState<any[]>([]);
  const [selectedConsignment, setSelectedConsignment] = useState<string>('');
  const [rows, setRows] = useState<BlockRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchConsignments(); }, []);
  useEffect(() => { if (selectedConsignment) fetchBlocks(selectedConsignment); }, [selectedConsignment]);

  const fetchConsignments = async () => {
    const res = await fetch('/api/granite-consignments');
    if (res.ok) setConsignments(await res.json());
  };

  const fetchBlocks = async (consignmentId: string) => {
    const res = await fetch(`/api/granite-blocks?consignment_id=${consignmentId}`);
    if (res.ok) {
      const data = await res.json();
      // Initialize rows from blocks
      const initial: BlockRow[] = data.map((b: any) => ({
        block_id: b.id,
        block_no: b.block_no,
        gross: b.gross_measurement || 0,
        net: b.net_measurement || 0,
        marker_measurement: b.net_measurement || 0,
        parts: { A: { slabs: 0, sqft: 0 }, B: { slabs: 0, sqft: 0 }, CD: { slabs: 0, sqft: 0 } },
        totalSlabs: 0,
        totalSqft: 0
      }));

      // Fetch existing parts for all blocks sequentially (can optimize later)
      for (const row of initial) {
        const partRes = await fetch(`/api/granite-block-parts?block_id=${row.block_id}`);
        if (partRes.ok) {
          const parts = await partRes.json();
          for (const p of parts) {
            if (p.part_name === 'A') row.parts.A = { slabs: p.slabs_count || 0, sqft: p.sqft || 0 };
            else if (p.part_name === 'B') row.parts.B = { slabs: p.slabs_count || 0, sqft: p.sqft || 0 };
            else if (p.part_name === 'C' || p.part_name === 'C+D') row.parts.CD = { slabs: p.slabs_count || 0, sqft: p.sqft || 0 };
          }
          row.totalSlabs = row.parts.A.slabs + row.parts.B.slabs + row.parts.CD.slabs;
          row.totalSqft = row.parts.A.sqft + row.parts.B.sqft + row.parts.CD.sqft;
        }
      }
      setRows(initial);
    }
  };

  const updateCell = (index: number, section: 'A'|'B'|'CD', field: 'slabs'|'sqft', value: number) => {
    setRows(prev => prev.map((r,i) => {
      if (i !== index) return r;
      const updated = { ...r, parts: { ...r.parts, [section]: { ...r.parts[section], [field]: value } } };
      updated.totalSlabs = updated.parts.A.slabs + updated.parts.B.slabs + updated.parts.CD.slabs;
      updated.totalSqft = updated.parts.A.sqft + updated.parts.B.sqft + updated.parts.CD.sqft;
      return updated;
    }));
  };

  const totals = rows.reduce((acc, r) => {
    acc.slabsA += r.parts.A.slabs; acc.slabsB += r.parts.B.slabs; acc.slabsCD += r.parts.CD.slabs;
    acc.sqftA += r.parts.A.sqft; acc.sqftB += r.parts.B.sqft; acc.sqftCD += r.parts.CD.sqft;
    acc.totalSlabs += r.totalSlabs; acc.totalSqft += r.totalSqft;
    acc.marker += r.marker_measurement; acc.net += r.net; acc.gross += r.gross;
    return acc;
  }, { slabsA:0, slabsB:0, slabsCD:0, sqftA:0, sqftB:0, sqftCD:0, totalSlabs:0, totalSqft:0, marker:0, net:0, gross:0 });

  const saveAll = async () => {
    setSaving(true);
    try {
      const payload = rows.map(r => ({
        block_id: r.block_id,
        parts: [
          { part_name: 'A', slabs_count: r.parts.A.slabs, sqft: r.parts.A.sqft },
          { part_name: 'B', slabs_count: r.parts.B.slabs, sqft: r.parts.B.sqft },
          { part_name: 'C+D', slabs_count: r.parts.CD.slabs, sqft: r.parts.CD.sqft }
        ]
      }));
      const res = await fetch('/api/granite-block-parts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const e = await res.json();
        alert(e.error || 'Failed to save');
      } else {
        alert('Saved');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="min-h-screen w-full bg-gray-50 p-6 space-y-6">
        <div className="flex items-center space-x-3">
          <Link href="/granite/manufacturing"><Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-2"/>Back</Button></Link>
          <h1 className="text-2xl font-semibold">Production Table</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Select Consignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <select
              value={selectedConsignment}
              onChange={(e) => setSelectedConsignment(e.target.value)}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2"
            >
              <option value="">Choose consignment</option>
              {consignments.map(c => (
                <option key={c.id} value={c.id}>{c.consignment_number}</option>
              ))}
            </select>
          </CardContent>
        </Card>

        {rows.length > 0 && (
          <Card className="overflow-x-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Blocks Production</CardTitle>
              <Button onClick={saveAll} disabled={saving}>{saving ? 'Saving...' : 'Save All'}</Button>
            </CardHeader>
            <CardContent>
              <table className="min-w-full border text-xs md:text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th rowSpan={2} className="border p-2">Block No</th>
                    <th rowSpan={2} className="border p-2">Gross (m³)</th>
                    <th rowSpan={2} className="border p-2">Marker (Net) (m³)</th>
                    <th colSpan={2} className="border p-2">Part A</th>
                    <th colSpan={2} className="border p-2">Part B</th>
                    <th colSpan={2} className="border p-2">Part C+D</th>
                    <th colSpan={2} className="border p-2">Totals</th>
                  </tr>
                  <tr className="bg-gray-50">
                    <th className="border p-1">Slabs</th>
                    <th className="border p-1">Sq.Ft</th>
                    <th className="border p-1">Slabs</th>
                    <th className="border p-1">Sq.Ft</th>
                    <th className="border p-1">Slabs</th>
                    <th className="border p-1">Sq.Ft</th>
                    <th className="border p-1">Slabs</th>
                    <th className="border p-1">Sq.Ft</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={r.block_id} className="hover:bg-gray-50">
                      <td className="border p-1 font-medium">{r.block_no}</td>
                      <td className="border p-1 text-right">{r.gross.toFixed(3)}</td>
                      <td className="border p-1 text-right">{r.marker_measurement.toFixed(3)}</td>
                      {(['A','B','CD'] as const).map(section => (
                        <>
                          <td className="border p-0 w-16">
                            <Input
                              type="number"
                              value={r.parts[section === 'CD' ? 'CD' : section].slabs}
                              onChange={(e) => updateCell(idx, section as any, 'slabs', parseInt(e.target.value) || 0)}
                              className="h-7 text-xs text-right"
                              min={0}
                            />
                          </td>
                          <td className="border p-0 w-20">
                            <Input
                              type="number"
                              value={r.parts[section === 'CD' ? 'CD' : section].sqft}
                              onChange={(e) => updateCell(idx, section as any, 'sqft', parseFloat(e.target.value) || 0)}
                              className="h-7 text-xs text-right"
                              min={0}
                              step={0.01}
                            />
                          </td>
                        </>
                      ))}
                      <td className="border p-1 text-right font-semibold bg-gray-50">{r.totalSlabs}</td>
                      <td className="border p-1 text-right font-semibold bg-gray-50">{r.totalSqft}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-blue-50 font-semibold">
                    <td className="border p-1">Totals</td>
                    <td className="border p-1 text-right">{totals.gross.toFixed(3)}</td>
                    <td className="border p-1 text-right">{totals.marker.toFixed(3)}</td>
                    <td className="border p-1 text-right">{totals.slabsA}</td>
                    <td className="border p-1 text-right">{totals.sqftA}</td>
                    <td className="border p-1 text-right">{totals.slabsB}</td>
                    <td className="border p-1 text-right">{totals.sqftB}</td>
                    <td className="border p-1 text-right">{totals.slabsCD}</td>
                    <td className="border p-1 text-right">{totals.sqftCD}</td>
                    <td className="border p-1 text-right">{totals.totalSlabs}</td>
                    <td className="border p-1 text-right">{totals.totalSqft}</td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}