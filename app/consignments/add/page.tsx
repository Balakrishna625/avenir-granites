"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, Package, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { AppLayout } from '@/components/AppLayout'
import { useToast } from '@/components/ui/toast'

interface Supplier {
  id: string
  name: string
  contact_person: string
}

interface Block {
  tempId: string
  block_no: string
  grade: string
  gross_measurement: number
  net_measurement: number
}

export default function AddConsignmentPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  
  const [formData, setFormData] = useState({
    consignment_number: '',
    supplier_id: '',
    arrival_date: new Date().toISOString().split('T')[0],
    payment_cash: '',
    payment_upi: '',
    transport_cost: '',
    notes: ''
  })

  const [blocks, setBlocks] = useState<Block[]>([
    {
      tempId: '1',
      block_no: '',
      grade: 'S/G',
      gross_measurement: 0,
      net_measurement: 0
    }
  ])

  useEffect(() => {
    loadSuppliers()
    generateConsignmentNumber()
  }, [])

  const loadSuppliers = async () => {
    try {
      const response = await fetch('/api/granite-suppliers')
      if (response.ok) {
        const data = await response.json()
        setSuppliers(data)
      }
    } catch (error) {
      console.error('Error loading suppliers:', error)
    }
  }

  const generateConsignmentNumber = () => {
    const today = new Date()
    const dateStr = today.toISOString().slice(2, 10).replace(/-/g, '')
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    setFormData(prev => ({ ...prev, consignment_number: `CON-${dateStr}-${random}` }))
  }

  const addBlock = () => {
    setBlocks([
      ...blocks,
      {
        tempId: Date.now().toString(),
        block_no: '',
        grade: 'S/G',
        gross_measurement: 0,
        net_measurement: 0
      }
    ])
  }

  const removeBlock = (tempId: string) => {
    if (blocks.length > 1) {
      setBlocks(blocks.filter(b => b.tempId !== tempId))
    }
  }

  const updateBlock = (tempId: string, field: keyof Block, value: any) => {
    setBlocks(blocks.map(b => 
      b.tempId === tempId ? { ...b, [field]: value } : b
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.consignment_number || !formData.supplier_id) {
      showToast('error', 'Please fill consignment number and select supplier')
      return
    }

    if (blocks.length === 0 || blocks.some(b => !b.block_no)) {
      showToast('error', 'Please add at least one block with a block number')
      return
    }

    try {
      setLoading(true)

      // Create consignment
      const consignmentData = {
        consignment_number: formData.consignment_number,
        supplier_id: formData.supplier_id,
        arrival_date: formData.arrival_date,
        payment_cash: parseFloat(formData.payment_cash) || 0,
        payment_upi: parseFloat(formData.payment_upi) || 0,
        transport_cost: parseFloat(formData.transport_cost) || 0,
        notes: formData.notes
      }

      const consignmentResponse = await fetch('/api/granite-consignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(consignmentData)
      })

      if (!consignmentResponse.ok) {
        const error = await consignmentResponse.json()
        throw new Error(error.error || 'Failed to create consignment')
      }

      const consignment = await consignmentResponse.json()

      // Add blocks
      const blocksData = blocks.map(block => ({
        consignment_id: consignment.id,
        block_no: block.block_no,
        grade: block.grade,
        gross_measurement: parseFloat(block.gross_measurement.toString()) || 0,
        net_measurement: parseFloat(block.net_measurement.toString()) || 0,
        status: 'AVAILABLE'
      }))

      const blocksResponse = await fetch('/api/granite-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks: blocksData })
      })

      if (!blocksResponse.ok) {
        throw new Error('Failed to add blocks')
      }

      showToast('success', 'Consignment created successfully!')
      router.push('/consignments')
    } catch (error: any) {
      console.error('Error creating consignment:', error)
      showToast('error', error.message || 'Failed to create consignment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout>
      <div className="min-h-screen w-full bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/consignments">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Add New Consignment</h1>
                <p className="text-sm text-gray-600 mt-1">Create a consignment with multiple blocks</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Consignment Details */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                Consignment Details
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Consignment Number *</label>
                  <Input
                    value={formData.consignment_number}
                    onChange={(e) => setFormData({ ...formData, consignment_number: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Supplier *</label>
                  <select
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Arrival Date *</label>
                  <Input
                    type="date"
                    value={formData.arrival_date}
                    onChange={(e) => setFormData({ ...formData, arrival_date: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Payment Cash</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.payment_cash}
                    onChange={(e) => setFormData({ ...formData, payment_cash: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Payment UPI</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.payment_upi}
                    onChange={(e) => setFormData({ ...formData, payment_upi: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Transport Cost</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.transport_cost}
                    onChange={(e) => setFormData({ ...formData, transport_cost: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={2}
                    placeholder="Optional notes..."
                  />
                </div>
              </div>
            </Card>

            {/* Blocks */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Package className="w-5 h-5 text-purple-600" />
                  Blocks ({blocks.length})
                </h2>
                <Button type="button" onClick={addBlock} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Block
                </Button>
              </div>

              <div className="space-y-4">
                {blocks.map((block, index) => (
                  <div key={block.tempId} className="p-4 border rounded-lg bg-gray-50">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">Block {index + 1}</span>
                      {blocks.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeBlock(block.tempId)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Block No *</label>
                        <Input
                          value={block.block_no}
                          onChange={(e) => updateBlock(block.tempId, 'block_no', e.target.value)}
                          placeholder="e.g., AVG-1"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Grade</label>
                        <select
                          value={block.grade}
                          onChange={(e) => updateBlock(block.tempId, 'grade', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        >
                          <option value="S/G">S/G</option>
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Gross (tons)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={block.gross_measurement || ''}
                          onChange={(e) => updateBlock(block.tempId, 'gross_measurement', e.target.value)}
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Net (tons)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={block.net_measurement || ''}
                          onChange={(e) => updateBlock(block.tempId, 'net_measurement', e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                <p className="text-blue-900 font-medium">💡 Block Naming Convention:</p>
                <p className="text-blue-700 mt-1">
                  Use simple names like <strong>AVG-1, AVG-2, AVG-3</strong>. When you cut these blocks into parts in 
                  Multi-Cutter, you'll name them as <strong>AVG-1A, AVG-1B, AVG-2A</strong>, etc.
                </p>
              </div>
            </Card>

            {/* Submit */}
            <div className="flex gap-3">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Creating...' : 'Create Consignment'}
              </Button>
              <Link href="/consignments">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  )
}
