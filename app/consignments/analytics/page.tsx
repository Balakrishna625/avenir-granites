"use client"

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AppLayout } from '@/components/AppLayout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Package, TrendingUp, DollarSign, Layers, BarChart3, Target } from 'lucide-react'

interface BlockProduction {
  baseBlockName: string
  parts: Array<{
    partName: string
    slabs: number
    sqft: number
    materialType: string
  }>
  totalSlabs: number
  totalSqft: number
  originalMeasurement: number
}

interface ConsignmentAnalytics {
  consignment: {
    id: string
    consignmentNumber: string
    quarryName: string
    purchaseDate: string
    totalBlocks: number
    totalNetMeasurement: number
    totalGrossMeasurement: number
    totalExpenditure: number
    costBreakdown: {
      purchaseCost: number
      transportCost: number
      loadingCost: number
      quarryCommission: number
      otherCharges: number
    }
  }
  production: {
    totalSlabs: number
    totalSqft: number
    blockDetails: BlockProduction[]
    costPerSqft: number
    processingEfficiency: number
  }
}

const formatIndianNumber = (num: number): string => {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(num)
}

function ConsignmentAnalyticsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const consignmentId = searchParams.get('id')

  const [analytics, setAnalytics] = useState<ConsignmentAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (consignmentId) {
      fetchAnalytics()
    } else {
      setError('No consignment ID provided')
      setLoading(false)
    }
  }, [consignmentId])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/consignments-new/analytics?id=${consignmentId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }

      const data = await response.json()
      setAnalytics(data)
    } catch (err) {
      console.error('Error fetching analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="p-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading analytics...</div>
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
              <p className="text-red-600 mb-4">{error || 'Failed to load analytics'}</p>
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

  const { consignment, production } = analytics
  const hasProduction = production.totalSqft > 0

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
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Consignment Analytics</h1>
            </div>
            <p className="text-base sm:text-lg text-gray-600">
              {consignment.consignmentNumber} • {consignment.quarryName}
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Investment */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Investment</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₹{formatIndianNumber(consignment.totalExpenditure)}
                </p>
              </div>
              <DollarSign className="w-10 h-10 text-green-500" />
            </div>
          </Card>

          {/* Total Blocks */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Blocks</p>
                <p className="text-2xl font-bold text-gray-900">{consignment.totalBlocks}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatIndianNumber(consignment.totalNetMeasurement)} m (Net)
                </p>
              </div>
              <Package className="w-10 h-10 text-blue-500" />
            </div>
          </Card>

          {/* Total Production */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Production</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatIndianNumber(production.totalSqft)} sqft
                </p>
                <p className="text-xs text-gray-500 mt-1">{production.totalSlabs} slabs</p>
              </div>
              <Layers className="w-10 h-10 text-purple-500" />
            </div>
          </Card>

          {/* Cost per Sqft */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Cost per Sqft</p>
                <p className="text-2xl font-bold text-gray-900">
                  {hasProduction ? `₹${formatIndianNumber(production.costPerSqft)}` : 'N/A'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Efficiency: {hasProduction ? `${production.processingEfficiency.toFixed(1)}%` : 'N/A'}
                </p>
              </div>
              <Target className="w-10 h-10 text-orange-500" />
            </div>
          </Card>
        </div>

        {/* Cost Breakdown */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Cost Breakdown
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Purchase Cost</p>
              <p className="text-lg font-semibold text-gray-900">
                ₹{formatIndianNumber(consignment.costBreakdown.purchaseCost)}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Transport Cost</p>
              <p className="text-lg font-semibold text-gray-900">
                ₹{formatIndianNumber(consignment.costBreakdown.transportCost)}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Loading Cost</p>
              <p className="text-lg font-semibold text-gray-900">
                ₹{formatIndianNumber(consignment.costBreakdown.loadingCost)}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Quarry Commission</p>
              <p className="text-lg font-semibold text-gray-900">
                ₹{formatIndianNumber(consignment.costBreakdown.quarryCommission)}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Other Charges</p>
              <p className="text-lg font-semibold text-gray-900">
                ₹{formatIndianNumber(consignment.costBreakdown.otherCharges)}
              </p>
            </div>
          </div>
        </Card>

        {/* Production Status */}
        {!hasProduction && (
          <Card className="p-6 bg-yellow-50 border-yellow-200">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-yellow-600" />
              <div>
                <h3 className="font-semibold text-yellow-900">No Production Data Yet</h3>
                <p className="text-sm text-yellow-700">
                  This consignment hasn't been processed in the Multi Cutter yet. Production data will appear here once blocks are processed.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Block-wise Production Details */}
        {hasProduction && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Block-wise Production Details
            </h2>

            <div className="space-y-6">
              {production.blockDetails.map((block) => {
                const hasData = block.parts.length > 0
                const yieldPercentage = block.originalMeasurement > 0
                  ? (block.totalSqft / (block.originalMeasurement * 10.764)) * 100
                  : 0

                return (
                  <div key={block.baseBlockName} className="border rounded-lg p-5 bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{block.baseBlockName}</h3>
                        <p className="text-sm text-gray-600">
                          Original: {formatIndianNumber(block.originalMeasurement)} m (Net)
                        </p>
                      </div>
                      <div className="text-right">
                        {hasData ? (
                          <>
                            <p className="text-xl font-bold text-blue-600">
                              {formatIndianNumber(block.totalSqft)} sqft
                            </p>
                            <p className="text-sm text-gray-600">{block.totalSlabs} slabs</p>
                            {yieldPercentage > 0 && (
                              <p className="text-xs text-green-600 font-medium mt-1">
                                Yield: {yieldPercentage.toFixed(1)}%
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-gray-500 italic">Not processed yet</p>
                        )}
                      </div>
                    </div>

                    {hasData && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-600 uppercase">Parts Processed:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {block.parts.map((part, idx) => (
                            <div key={idx} className="bg-white p-3 rounded border">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-mono font-semibold text-gray-900">
                                  {part.partName}
                                </span>
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                  {part.materialType}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600">
                                <span className="font-semibold">{formatIndianNumber(part.sqft)}</span> sqft
                                <span className="text-gray-400 mx-1">•</span>
                                <span>{part.slabs} slabs</span>
                              </div>
                            </div>
                          ))}
                        </div>
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

export default function ConsignmentAnalyticsPage() {
  return (
    <Suspense fallback={
      <AppLayout>
        <div className="p-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading analytics...</div>
          </div>
        </div>
      </AppLayout>
    }>
      <ConsignmentAnalyticsContent />
    </Suspense>
  )
}
