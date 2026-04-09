"use client"

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AppLayout } from '@/components/AppLayout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Package, TrendingUp, DollarSign, Layers, BarChart3, Target, Edit2, Save, X } from 'lucide-react'

interface BlockProduction {
  baseBlockName: string
  parts: Array<{
    partName: string
    slabs: number
    sqft: number
    materialType: string
    date?: string
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
    productionCostPerSqft: number
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
function getQuarryColor(quarryName: string): string {
  const colors: Record<string, string> = {
    'Gokanakonda': 'text-purple-700 bg-purple-100',
    'Sai lakshmi': 'text-blue-700 bg-blue-100',
    'Sambrajyam': 'text-emerald-700 bg-emerald-100',
    'Burgandy': 'text-rose-700 bg-rose-100',
    'Ummadivaram': 'text-orange-700 bg-orange-100'
  }
  return colors[quarryName] || 'text-gray-700 bg-gray-100'
}
function ConsignmentAnalyticsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const consignmentId = searchParams.get('id')

  const [analytics, setAnalytics] = useState<ConsignmentAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditingProductionCost, setIsEditingProductionCost] = useState(false)
  const [productionCostInput, setProductionCostInput] = useState<string>('')
  const [savingProductionCost, setSavingProductionCost] = useState(false)

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

  useEffect(() => {
    if (consignmentId) {
      fetchAnalytics()
    } else {
      setError('No consignment ID provided')
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consignmentId])

  const handleEditProductionCost = () => {
    setProductionCostInput(analytics?.consignment.productionCostPerSqft?.toString() || '0')
    setIsEditingProductionCost(true)
  }

  const handleSaveProductionCost = async () => {
    const cost = parseFloat(productionCostInput)
    if (isNaN(cost) || cost < 0) {
      alert('Please enter a valid production cost')
      return
    }

    try {
      setSavingProductionCost(true)
      const response = await fetch(`/api/consignments-new/analytics?id=${consignmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productionCostPerSqft: cost })
      })

      if (!response.ok) {
        throw new Error('Failed to update production cost')
      }

      // Update local state
      if (analytics) {
        setAnalytics({
          ...analytics,
          consignment: {
            ...analytics.consignment,
            productionCostPerSqft: cost
          }
        })
      }

      setIsEditingProductionCost(false)
    } catch (err) {
      console.error('Error saving production cost:', err)
      alert('Failed to save production cost')
    } finally {
      setSavingProductionCost(false)
    }
  }

  const handleCancelEdit = () => {
    setIsEditingProductionCost(false)
    setProductionCostInput('')
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
            <p className="text-base sm:text-lg">
              <span className="text-gray-600">{consignment.consignmentNumber}</span>
              <span className="text-gray-400 mx-2">•</span>
              <span className={`font-bold px-4 py-1.5 rounded-full shadow-sm ${getQuarryColor(consignment.quarryName)}`}>
                {consignment.quarryName}
              </span>
            </p>
          </div>
        </div>

        {/* Summary Cards - Row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Investment */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-gray-600 mb-1.5 uppercase tracking-wide">Total Investment</p>
                <p className="text-xl font-bold text-gray-900">
                  ₹{formatIndianNumber(consignment.totalExpenditure)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </Card>

          {/* Total Blocks */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-gray-600 mb-1.5 uppercase tracking-wide">Total Blocks</p>
                <p className="text-xl font-bold text-gray-900">{consignment.totalBlocks}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatIndianNumber(consignment.totalGrossMeasurement)} m (Gross)
                </p>
                <p className="text-xs text-gray-500">
                  {formatIndianNumber(consignment.totalNetMeasurement)} m (Net)
                </p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </Card>

          {/* Total Production */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-gray-600 mb-1.5 uppercase tracking-wide">Total Production</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatIndianNumber(production.totalSqft)} sqft
                </p>
                <p className="text-xs text-gray-500 mt-1">{production.totalSlabs} slabs</p>
              </div>
              <Layers className="w-8 h-8 text-purple-500" />
            </div>
          </Card>

          {/* 5% Normalised Production */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-gray-600 mb-1.5 uppercase tracking-wide">5% Normalised</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatIndianNumber(production.totalSqft * 0.95)} sqft
                </p>
                <p className="text-xs text-gray-500 mt-1">After wastage adjustment</p>
              </div>
              <TrendingUp className="w-8 h-8 text-indigo-500" />
            </div>
          </Card>
        </div>

        {/* Summary Cards - Row 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Yield */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-gray-600 mb-1.5 uppercase tracking-wide">Total Yield</p>
                <p className="text-xl font-bold text-gray-900">
                  {hasProduction && consignment.totalGrossMeasurement > 0
                    ? formatIndianNumber((production.totalSqft * 0.95) / consignment.totalGrossMeasurement)
                    : 'N/A'}
                </p>
                <p className="text-xs text-gray-500 mt-1">sqft per meter (5% normalised)</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </Card>

          {/* Cost per Sqft */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-gray-600 mb-1.5 uppercase tracking-wide">Cost per Sqft</p>
                <p className="text-xl font-bold text-gray-900">
                  {hasProduction ? `₹${formatIndianNumber(Number((consignment.totalExpenditure / (production.totalSqft * 0.95)).toFixed(2)))}` : 'N/A'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Efficiency: {hasProduction ? `${production.processingEfficiency.toFixed(1)}%` : 'N/A'}
                </p>
              </div>
              <Target className="w-8 h-8 text-orange-500" />
            </div>
          </Card>

          {/* Production Cost */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-gray-600 mb-1.5 uppercase tracking-wide">Production Cost</p>
                {isEditingProductionCost ? (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                      <input
                        type="number"
                        value={productionCostInput}
                        onChange={(e) => setProductionCostInput(e.target.value)}
                        className="w-32 pl-7 pr-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        autoFocus
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={handleSaveProductionCost}
                      disabled={savingProductionCost}
                      className="bg-green-600 hover:bg-green-700 text-white h-8 px-3"
                    >
                      {savingProductionCost ? (
                        'Saving...'
                      ) : (
                        <>
                          <Save className="w-3 h-3 mr-1" />
                          Save
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelEdit}
                      disabled={savingProductionCost}
                      className="h-8 px-3"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <p className="text-xl font-bold text-gray-900">
                        {consignment.productionCostPerSqft > 0 ? `₹${formatIndianNumber(consignment.productionCostPerSqft)}` : 'N/A'}
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleEditProductionCost}
                        className="h-6 w-6 p-0 hover:bg-cyan-100"
                      >
                        <Edit2 className="w-3 h-3 text-cyan-600" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {consignment.productionCostPerSqft > 0 ? 'per sqft (processing)' : 'Click edit to set'}
                    </p>
                  </>
                )}
              </div>
              <BarChart3 className="w-8 h-8 text-cyan-500" />
            </div>
          </Card>

          {/* Effective per Sqft Price */}
          <Card className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-emerald-700 font-semibold mb-1.5 uppercase tracking-wide">Effective per Sqft</p>
                <p className="text-xl font-bold text-emerald-900">
                  {hasProduction ? (
                    consignment.productionCostPerSqft > 0
                      ? `₹${formatIndianNumber(Number((consignment.totalExpenditure / (production.totalSqft * 0.95) + consignment.productionCostPerSqft).toFixed(2)))}`
                      : `₹${formatIndianNumber(Number((consignment.totalExpenditure / (production.totalSqft * 0.95)).toFixed(2)))}`
                  ) : 'N/A'}
                </p>
                <p className="text-xs text-emerald-600 mt-1 font-medium">
                  {consignment.productionCostPerSqft > 0 ? 'Cost + Production' : 'Same as Cost/Sqft'}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-emerald-600" />
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
                const blockYield = block.originalMeasurement > 0
                  ? block.totalSqft / block.originalMeasurement
                  : 0

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
                        {hasData ? (
                          <>
                            <p className="text-xl font-bold text-blue-600">
                              {formatIndianNumber(block.totalSqft)} sqft
                            </p>
                            <p className="text-sm text-gray-600">{block.totalSlabs} slabs</p>
                            <p className="text-xs text-gray-500">
                              Gross: {formatIndianNumber(block.originalMeasurement)} m
                            </p>
                            {blockYield > 0 && (
                              <p className="text-xs text-green-600 font-medium mt-1">
                                Yield: {formatIndianNumber(blockYield)} sqft/m
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
                          {block.parts.map((part, idx) => {
                            // Check for duplicate entries (same name, same slabs, same sqft)
                            const isDuplicate = block.parts.some((otherPart, otherIdx) => 
                              otherIdx !== idx && 
                              otherPart.partName === part.partName && 
                              otherPart.slabs === part.slabs && 
                              otherPart.sqft === part.sqft
                            )
                            
                            return (
                              <div 
                                key={idx} 
                                className={`p-3 rounded border ${
                                  isDuplicate 
                                    ? 'bg-red-50 border-red-300 ring-2 ring-red-200' 
                                    : 'bg-white border-gray-200'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className={`font-mono font-semibold ${
                                    isDuplicate ? 'text-red-900' : 'text-gray-900'
                                  }`}>
                                    {part.partName}
                                  </span>
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    isDuplicate 
                                      ? 'bg-red-100 text-red-700' 
                                      : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    {part.materialType}
                                  </span>
                                </div>
                                <div className={`text-sm ${isDuplicate ? 'text-red-700' : 'text-gray-600'}`}>
                                  <span className="font-semibold">{formatIndianNumber(part.sqft)}</span> sqft
                                  <span className={isDuplicate ? 'text-red-400 mx-1' : 'text-gray-400 mx-1'}>•</span>
                                  <span>{part.slabs} slabs</span>
                                </div>
                                {part.date && (
                                  <div className="text-xs text-orange-600 font-medium mt-1">
                                    {new Date(part.date).toLocaleDateString('en-GB')}
                                  </div>
                                )}
                                {isDuplicate && (
                                  <div className="mt-2 text-xs text-red-600 font-semibold flex items-center gap-1">
                                    <span>⚠️</span>
                                    <span>Probable Duplication</span>
                                  </div>
                                )}
                              </div>
                            )
                          })}
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
