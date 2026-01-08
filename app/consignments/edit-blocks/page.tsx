"use client"

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Save, ArrowLeft, Package, CheckCircle2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { AppLayout } from '@/components/AppLayout'
import { toast, Toaster } from 'sonner'

interface Block {
  id: string
  block_no: string | null
  gross_measurement: number | null
  arrival_status: 'pending' | 'received'
  consignment_id: string
}

export default function EditBlockPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const consignmentId = searchParams.get('consignment_id')
  const [blocks, setBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [consignmentNumber, setConsignmentNumber] = useState('')

  useEffect(() => {
    if (consignmentId) {
      fetchBlocks()
    }
  }, [consignmentId])

  const fetchBlocks = async () => {
    try {
      // Fetch consignment details
      const consignmentRes = await fetch(`/api/consignments-new?id=${consignmentId}`)
      const consignmentData = await consignmentRes.json()
      setConsignmentNumber(consignmentData[0]?.consignment_number || '')

      // Fetch blocks
      const blocksRes = await fetch(`/api/granite-blocks?consignment_id=${consignmentId}`)
      const blocksData = await blocksRes.json()
      setBlocks(blocksData || [])
    } catch (error) {
      console.error('Error fetching blocks:', error)
      toast.error('Failed to load blocks')
    } finally {
      setLoading(false)
    }
  }

  const handleBlockChange = (blockId: string, field: 'block_no' | 'gross_measurement', value: string) => {
    setBlocks(blocks.map(block =>
      block.id === blockId ? { ...block, [field]: value } : block
    ))
  }

  const handleSaveBlock = async (block: Block) => {
    if (!block.block_no || !block.gross_measurement) {
      toast.error('Please fill both block number and gross measurement')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/granite-blocks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: block.id,
          block_no: block.block_no.toUpperCase(),
          gross_measurement: parseFloat(block.gross_measurement.toString())
          // arrival_status will be auto-updated to 'received' by API when both fields filled
        })
      })

      if (response.ok) {
        toast.success('Block updated successfully!')
        fetchBlocks() // Refresh to get updated status
      } else {
        const error = await response.json()
        toast.error(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error saving block:', error)
      toast.error('Failed to save block')
    } finally {
      setSaving(false)
    }
  }

  const pendingBlocks = blocks.filter(b => b.arrival_status === 'pending')
  const receivedBlocks = blocks.filter(b => b.arrival_status === 'received')

  return (
    <AppLayout>
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.back()}
              variant="outline"
              size="sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Manage Blocks</h1>
              <p className="text-sm text-gray-500">Consignment: {consignmentNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="font-semibold text-gray-700">Progress:</span>
              <span className="ml-2 text-green-600 font-bold">
                {receivedBlocks.length}/{blocks.length}
              </span>
            </div>
          </div>
        </div>

        {loading ? (
          <Card className="p-8">
            <div className="text-center text-gray-500">Loading blocks...</div>
          </Card>
        ) : (
          <>
            {/* Pending Blocks */}
            {pendingBlocks.length > 0 && (
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  <h2 className="text-lg font-semibold">Pending Arrival ({pendingBlocks.length})</h2>
                </div>
                <div className="space-y-4">
                  {pendingBlocks.map((block, index) => (
                    <div key={block.id} className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-200">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Block Number <span className="text-red-500">*</span>
                          </label>
                          <Input
                            value={block.block_no || ''}
                            onChange={(e) => handleBlockChange(block.id, 'block_no', e.target.value.toUpperCase())}
                            placeholder="AVG-001"
                            className="font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Gross Measurement (m) <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            value={block.gross_measurement || ''}
                            onChange={(e) => handleBlockChange(block.id, 'gross_measurement', e.target.value)}
                            onWheel={(e) => e.currentTarget.blur()}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Button
                            onClick={() => handleSaveBlock(block)}
                            disabled={saving || !block.block_no || !block.gross_measurement}
                            className="w-full"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            Mark as Received
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Received Blocks */}
            {receivedBlocks.length > 0 && (
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <h2 className="text-lg font-semibold">Received ({receivedBlocks.length})</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {receivedBlocks.map((block) => (
                    <div key={block.id} className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-green-700 uppercase">Received</span>
                        <Package className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-mono font-bold text-gray-900">{block.block_no}</p>
                        <p className="text-sm text-gray-600">
                          Gross: <span className="font-semibold">{block.gross_measurement} m</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Empty State */}
            {blocks.length === 0 && (
              <Card className="p-8">
                <div className="text-center text-gray-500">
                  No blocks found for this consignment
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
}
