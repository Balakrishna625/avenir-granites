"use client";
import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';

interface ProductionForm {
  block_no: string;
  part_name: 'A' | 'B' | 'C' | 'C+D' | '';
  slabs_count: number;
  sqft: number;
  thickness: number;
}

export default function ProductionEntryPage() {
  const [form, setForm] = useState<ProductionForm>({
    block_no: '',
    part_name: '',
    slabs_count: 0,
    sqft: 0,
    thickness: 20
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (field: keyof ProductionForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.block_no || !form.part_name) {
      alert('Block number and part are required');
      return;
    }
    if (form.slabs_count <= 0 || form.sqft <= 0) {
      alert('Enter positive slabs count and sqft');
      return;
    }

    try {
      setLoading(true);
      // Resolve block id by block number
      const blockRes = await fetch(`/api/granite-blocks?block_no=${encodeURIComponent(form.block_no)}`);
      let blockId: string | null = null;
      if (blockRes.ok) {
        const blocks = await blockRes.json();
        const match = blocks.find((b: any) => b.block_no === form.block_no);
        if (match) blockId = match.id;
      }
      if (!blockId) {
        alert('Block not found. Make sure the block exists in a consignment.');
        return;
      }

      const response = await fetch('/api/granite-block-parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          block_id: blockId,
          part_name: form.part_name,
          slabs_count: form.slabs_count,
          sqft: form.sqft,
          thickness: form.thickness,
          is_available: true
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to record production');
      }

      alert('Production recorded');
      setForm({ block_no: '', part_name: '', slabs_count: 0, sqft: 0, thickness: 20 });
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="min-h-screen w-full bg-gray-50 p-6 space-y-6">
        <div className="flex items-center space-x-3">
          <Link href="/granite/manufacturing">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold">Production Entry</h1>
        </div>

        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Record Block Part Production</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Block Number</label>
              <Input value={form.block_no} onChange={(e) => handleChange('block_no', e.target.value)} placeholder="AVG-33" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Block Part (A/B/C)</label>
              <select
                value={form.part_name}
                onChange={(e) => handleChange('part_name', e.target.value as any)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm p-2"
              >
                <option value="">Select Part</option>
                <option value="A">Part A</option>
                <option value="B">Part B</option>
                <option value="C">Part C</option>
                <option value="C+D">Part C+D</option>
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Slabs Count</label>
                <Input type="number" value={form.slabs_count} onChange={(e) => handleChange('slabs_count', parseInt(e.target.value) || 0)} min={0} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Total Sq.Ft</label>
                <Input type="number" value={form.sqft} onChange={(e) => handleChange('sqft', parseFloat(e.target.value) || 0)} min={0} step="0.01" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Thickness (mm)</label>
                <Input type="number" value={form.thickness} onChange={(e) => handleChange('thickness', parseInt(e.target.value) || 20)} min={10} max={50} />
              </div>
            </div>
            <div className="pt-4">
              <Button onClick={handleSubmit} disabled={loading || !form.part_name} className="w-full">
                <Save className="w-4 h-4 mr-2" /> {loading ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}