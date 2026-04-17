"use client"

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AppLayout } from '@/components/AppLayout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Package, Sparkles, Layers, CircleDot, CheckCircle2 } from 'lucide-react'

interface PolishPart {
  partName: string
  slabs: number
  sqft: number
  polishType: 'polished' | 'laputra'
  activityDetail: string
  date?: string
  grade?: string // Add grade field
}

interface BlockPolishDetail {
  baseBlockName: string
  parts: PolishPart[]
  totalSlabs: number
  totalSqft: number
  polishedSlabs: number
  polishedSqft: number
  laputraSlabs: number
  laputraSqft: number
  originalMeasurement: number
}

interface PolishAnalytics {
  consignment: {
    id: string
    consignmentNumber: string
    quarryName: string
    purchaseDate: string
    totalBlocks: number
    totalNetMeasurement: number
    totalGrossMeasurement: number
  }
  polishData: {
    totalSlabs: number
    totalSqft: number
    polishedSlabs: number
    polishedSqft: number
    laputraSlabs: number
    laputraSqft: number
    blockDetails: BlockPolishDetail[]
  }
}

const formatIndianNumber = (num: number): string => {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(num)
}

function getQuarryColor(quarryName: string): string {
  const colors: Record<string, string> = {
    'Sai lakshmi': 'bg-blue-100 text-blue-800',
    'Sambrajyam': 'bg-purple-100 text-purple-800',
    'Burgandy': 'bg-red-100 text-red-800',
    'Gokanakonda': 'bg-green-100 text-green-800',
    'Ummadivaram': 'bg-yellow-100 text-yellow-800'
  }
  return colors[quarryName] || 'bg-gray-100 text-gray-800'
}

function PolishAnalyticsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const consignmentId = searchParams.get('id')
  const blockName = searchParams.get('blockName') // Get optional block filter

  const [analytics, setAnalytics] = useState<PolishAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      let url = `/api/consignments-new/polish-analytics?id=${consignmentId}`
      if (blockName) {
        url += `&blockName=${encodeURIComponent(blockName)}`
      }
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Failed to fetch polish analytics')
      }

      const data = await response.json()
      setAnalytics(data)
    } catch (err) {
      console.error('Error fetching polish analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load polish analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (consignmentId) {
      fetchAnalytics()
    } else {
      setError('No consignment ID provided')
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consignmentId])

  if (loading) {
    return (
      <AppLayout>
        <div className="p-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading polish analytics...</div>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (error || !analytics) {
    return (
      <AppLayout>
        <div className="p-8">
          <Card className="p-6">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error || 'Failed to load polish analytics'}</p>
              <Button onClick={() => router.push('/consignments/details')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Consignments
              </Button>
            </div>
          </Card>
        </div>
      </AppLayout>
    )
  }

  const { consignment, polishData } = analytics
  const hasPolishData = polishData.totalSqft > 0

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/consignments/details')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Polish Analytics{blockName ? ` - ${blockName}` : ''}
              </h1>
            </div>
            <p className="text-base sm:text-lg">
              <span className="text-gray-600">{consignment.consignmentNumber}</span>
              <span className="text-gray-400 mx-2">•</span>
              <span className={`font-bold px-4 py-1.5 rounded-full shadow-sm ${getQuarryColor(consignment.quarryName)}`}>
                {consignment.quarryName}
              </span>
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Blocks */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-gray-600 mb-1.5 uppercase tracking-wide">Total Blocks</p>
                <p className="text-xl font-bold text-gray-900">{consignment.totalBlocks}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatIndianNumber(consignment.totalGrossMeasurement)} m (Gross)
                </p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </Card>

          {/* Total Polished */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-gray-600 mb-1.5 uppercase tracking-wide">Total Polished</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatIndianNumber(polishData.totalSqft)} sqft
                </p>
                <p className="text-xs text-gray-500 mt-1">{polishData.totalSlabs} slabs</p>
              </div>
              <Sparkles className="w-8 h-8 text-purple-500" />
            </div>
          </Card>

          {/* Regular Polish */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-gray-600 mb-1.5 uppercase tracking-wide">Regular Polish</p>
                <p className="text-xl font-bold text-emerald-600">
                  {formatIndianNumber(polishData.polishedSqft)} sqft
                </p>
                <p className="text-xs text-gray-500 mt-1">{polishData.polishedSlabs} slabs</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
          </Card>

          {/* Laputra Polish */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-gray-600 mb-1.5 uppercase tracking-wide">Laputra Polish</p>
                <p className="text-xl font-bold text-amber-600">
                  {formatIndianNumber(polishData.laputraSqft)} sqft
                </p>
                <p className="text-xs text-gray-500 mt-1">{polishData.laputraSlabs} slabs</p>
              </div>
              <CircleDot className="w-8 h-8 text-amber-500" />
            </div>
          </Card>
        </div>

        {/* Polish Breakdown Chart */}
        {hasPolishData && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              Polish Type Breakdown
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Polish Type Chart */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Regular Polish</span>
                    <span className="text-sm font-semibold text-emerald-600">
                      {polishData.polishedSlabs} slabs ({formatIndianNumber(polishData.polishedSqft)} sqft)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-emerald-500 h-3 rounded-full transition-all"
                      style={{ width: `${polishData.totalSlabs > 0 ? (polishData.polishedSlabs / polishData.totalSlabs) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {polishData.totalSlabs > 0 ? ((polishData.polishedSlabs / polishData.totalSlabs) * 100).toFixed(1) : 0}% of total
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Laputra Polish</span>
                    <span className="text-sm font-semibold text-amber-600">
                      {polishData.laputraSlabs} slabs ({formatIndianNumber(polishData.laputraSqft)} sqft)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-amber-500 h-3 rounded-full transition-all"
                      style={{ width: `${polishData.totalSlabs > 0 ? (polishData.laputraSlabs / polishData.totalSlabs) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {polishData.totalSlabs > 0 ? ((polishData.laputraSlabs / polishData.totalSlabs) * 100).toFixed(1) : 0}% of total
                  </p>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Slabs Polished:</span>
                    <span className="text-lg font-bold text-gray-900">{polishData.totalSlabs}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Sqft Polished:</span>
                    <span className="text-lg font-bold text-gray-900">{formatIndianNumber(polishData.totalSqft)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-indigo-200">
                    <span className="text-sm text-gray-600">Blocks with Polish Data:</span>
                    <span className="text-lg font-bold text-indigo-600">{polishData.blockDetails.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* No Polish Data Message */}
        {!hasPolishData && (
          <Card className="p-6 bg-yellow-50 border-yellow-200">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-yellow-600" />
              <div>
                <h3 className="font-semibold text-yellow-900">No Polish Data Yet</h3>
                <p className="text-sm text-yellow-700">
                  This consignment hasn't been processed in Line Polish yet. Polish data will appear here once blocks are polished.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Block-wise Polish Details */}
        {hasPolishData && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Block-wise Polish Details
            </h2>

            <div className="space-y-6">
              {polishData.blockDetails.map((block) => {
                const hasData = block.parts.length > 0

                return (
                  <div key={block.baseBlockName} className="border rounded-lg p-5 bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{block.baseBlockName}</h3>
                        <p className="text-sm text-gray-600">
                          Original: {formatIndianNumber(block.originalMeasurement)} m (Gross)
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-indigo-600">
                          {formatIndianNumber(block.totalSqft)} sqft
                        </p>
                        <p className="text-sm text-gray-600">{block.totalSlabs} slabs total</p>
                      </div>
                    </div>

                    {/* Polish Type Summary for Block */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                        <p className="text-xs text-emerald-700 font-medium">Regular Polish</p>
                        <p className="text-lg font-bold text-emerald-600">{block.polishedSlabs} slabs</p>
                        <p className="text-xs text-emerald-600">{formatIndianNumber(block.polishedSqft)} sqft</p>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                        <p className="text-xs text-amber-700 font-medium">Laputra Polish</p>
                        <p className="text-lg font-bold text-amber-600">{block.laputraSlabs} slabs</p>
                        <p className="text-xs text-amber-600">{formatIndianNumber(block.laputraSqft)} sqft</p>
                      </div>
                    </div>

                    {/* Parts Detail Table */}
                    {hasData && (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-white border-b-2 border-gray-300">
                            <tr>
                              <th className="text-left py-2 px-3 font-semibold text-gray-700">Part Name</th>
                              <th className="text-left py-2 px-3 font-semibold text-gray-700">Polish Type</th>
                              <th className="text-left py-2 px-3 font-semibold text-gray-700">Grade</th>
                              <th className="text-right py-2 px-3 font-semibold text-gray-700">Slabs</th>
                              <th className="text-right py-2 px-3 font-semibold text-gray-700">Sq Ft</th>
                              <th className="text-left py-2 px-3 font-semibold text-gray-700">Activity</th>
                            </tr>
                          </thead>
                          <tbody>
                            {block.parts.map((part, idx) => (
                              <tr key={`${part.partName}-${idx}`} className="border-b border-gray-200 hover:bg-white">
                                <td className="py-2 px-3 font-medium text-gray-900">{part.partName}</td>
                                <td className="py-2 px-3">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    part.polishType === 'polished' 
                                      ? 'bg-emerald-100 text-emerald-800' 
                                      : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {part.polishType === 'polished' ? 'Polished' : 'Laputra'}
                                  </span>
                                </td>
                                <td className="py-2 px-3">
                                  {part.grade ? (
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                      part.grade === 'Blackline' ? 'bg-gray-800 text-white' :
                                      part.grade === 'White line' ? 'bg-gray-200 text-gray-800' :
                                      part.grade === 'Fresh' ? 'bg-green-100 text-green-800' :
                                      part.grade === 'Patch' ? 'bg-yellow-100 text-yellow-800' :
                                      part.grade === 'Variation' ? 'bg-purple-100 text-purple-800' :
                                      'bg-blue-100 text-blue-800'
                                    }`}>
                                      {part.grade}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 text-xs">-</span>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-right font-semibold text-gray-900">{part.slabs}</td>
                                <td className="py-2 px-3 text-right font-semibold text-gray-900">{formatIndianNumber(part.sqft)}</td>
                                <td className="py-2 px-3 text-gray-600 text-xs">{part.activityDetail}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gray-100 font-semibold">
                            <tr>
                              <td className="py-2 px-3 text-gray-700">Total</td>
                              <td className="py-2 px-3"></td>
                              <td className="py-2 px-3"></td>
                              <td className="py-2 px-3 text-right text-indigo-600">{block.totalSlabs}</td>
                              <td className="py-2 px-3 text-right text-indigo-600">{formatIndianNumber(block.totalSqft)}</td>
                              <td className="py-2 px-3"></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}

export default function PolishAnalyticsPage() {
  return (
    <Suspense fallback={
      <AppLayout>
        <div className="p-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading polish analytics...</div>
          </div>
        </div>
      </AppLayout>
    }>
      <PolishAnalyticsContent />
    </Suspense>
  )
}
