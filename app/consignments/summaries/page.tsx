"use client"

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Package, Layers, TrendingUp, BarChart3, AlertCircle, CheckCircle2 } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'

interface ConsignmentSummary {
  consignment_id: string
  consignment_number: string
  supplier_id: string
  arrival_date: string
  total_blocks: number
  blocks_with_production: number
  consignment_multi_cutter_sqft: number
  consignment_multi_cutter_slabs: number
  consignment_line_polish_sqft: number
  consignment_line_polish_slabs: number
  consignment_expected_sqft: number
  consignment_sqft_variance: number
  avg_production_efficiency: number
  blocks_details: Array<{
    block_no: string
    block_id: string
    multi_cutter_sqft: number
    multi_cutter_slabs: number
    line_polish_sqft: number
    line_polish_slabs: number
    number_of_parts: number
    parts_list: string[]
    efficiency_percentage: number
    expected_sqft: number
  }>
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num)
}

export default function ConsignmentSummariesPage() {
  const [summaries, setSummaries] = useState<ConsignmentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7))
  const [expandedConsignment, setExpandedConsignment] = useState<string | null>(null)

  useEffect(() => {
    fetchSummaries()
  }, [])

  const fetchSummaries = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/consignments/production-summaries')
      if (response.ok) {
        const data = await response.json()
        setSummaries(data)
      }
    } catch (error) {
      console.error('Error fetching consignment summaries:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter by selected month
  const filteredSummaries = summaries.filter(summary => {
    const summaryMonth = summary.arrival_date.substring(0, 7)
    return summaryMonth === selectedMonth
  })

  // Calculate overall analytics
  const totalConsignments = filteredSummaries.length
  const totalBlocks = filteredSummaries.reduce((sum, s) => sum + s.total_blocks, 0)
  const blocksWithProduction = filteredSummaries.reduce((sum, s) => sum + s.blocks_with_production, 0)
  const totalMultiCutterSqft = filteredSummaries.reduce((sum, s) => sum + s.consignment_multi_cutter_sqft, 0)
  const totalLinePolishSqft = filteredSummaries.reduce((sum, s) => sum + s.consignment_line_polish_sqft, 0)
  const totalExpectedSqft = filteredSummaries.reduce((sum, s) => sum + s.consignment_expected_sqft, 0)
  const avgEfficiency = filteredSummaries.length > 0 
    ? filteredSummaries.reduce((sum, s) => sum + s.avg_production_efficiency, 0) / filteredSummaries.length 
    : 0

  const toggleConsignment = (id: string) => {
    setExpandedConsignment(expandedConsignment === id ? null : id)
  }

  return (
    <AppLayout>
      <div className="min-h-screen w-full bg-gray-50 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Consignment Production Summaries</h1>
            <p className="text-gray-600 text-sm mt-1">Track production data from multi-cutter and line-polish stages</p>
          </div>
          <div>
            <label className="text-sm font-medium mr-2">Month:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading summaries...</div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Consignments</p>
                    <p className="text-2xl font-bold mt-1">{totalConsignments}</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Blocks</p>
                    <p className="text-2xl font-bold mt-1">{totalBlocks}</p>
                    <p className="text-xs text-gray-500 mt-1">{blocksWithProduction} with production</p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <Layers className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg Efficiency</p>
                    <p className="text-2xl font-bold mt-1">{avgEfficiency.toFixed(1)}%</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Expected SqFt</p>
                    <p className="text-xl font-bold mt-1">{formatNumber(totalExpectedSqft)}</p>
                  </div>
                  <div className="bg-amber-100 p-3 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Production Stage Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <div className="text-sm font-medium text-orange-900 mb-2 flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  MULTI-CUTTER STAGE (Cut)
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-orange-700">Total Slabs Cut:</span>
                    <span className="font-bold text-orange-900">
                      {filteredSummaries.reduce((sum, s) => sum + s.consignment_multi_cutter_slabs, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-orange-300">
                    <span className="text-orange-700">Total Sq.Ft Produced:</span>
                    <span className="font-bold text-orange-900 text-lg">{formatNumber(totalMultiCutterSqft)}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <div className="text-sm font-medium text-purple-900 mb-2 flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  LINE-POLISH STAGE (Polish)
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-purple-700">Total Slabs Polished:</span>
                    <span className="font-bold text-purple-900">
                      {filteredSummaries.reduce((sum, s) => sum + s.consignment_line_polish_slabs, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-purple-300">
                    <span className="text-purple-700">Total Sq.Ft Produced:</span>
                    <span className="font-bold text-purple-900 text-lg">{formatNumber(totalLinePolishSqft)}</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Production Flow Indicator */}
            <Card className="p-3 bg-gradient-to-r from-orange-50 via-purple-50 to-green-50">
              <div className="flex items-center justify-center gap-4 text-sm font-medium">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span className="text-orange-900">Multi-Cutter (Cut)</span>
                </div>
                <span className="text-gray-400">→</span>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-purple-900">Line-Polish (Polish)</span>
                </div>
                <span className="text-gray-400">→</span>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-green-900">Final Product</span>
                </div>
              </div>
            </Card>

            {/* Consignments List */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Consignment Details</h2>
              {filteredSummaries.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No consignments found for selected month</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredSummaries.map((summary) => (
                    <div key={summary.consignment_id} className="border rounded-lg overflow-hidden">
                      {/* Consignment Header */}
                      <div 
                        className="p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
                        onClick={() => toggleConsignment(summary.consignment_id)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="bg-blue-100 p-2 rounded-lg">
                            <Package className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{summary.consignment_number}</h3>
                            <p className="text-sm text-gray-600">
                              Arrival: {new Date(summary.arrival_date).toLocaleDateString('en-IN')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-center">
                            <p className="text-gray-600">Blocks</p>
                            <p className="font-bold">{summary.total_blocks}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-gray-600">With Production</p>
                            <p className="font-bold text-green-600">{summary.blocks_with_production}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-gray-600">Efficiency</p>
                            <p className="font-bold text-blue-600">{summary.avg_production_efficiency.toFixed(1)}%</p>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {expandedConsignment === summary.consignment_id && (
                        <div className="p-4 border-t">
                          {/* Stage Summary */}
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                <span className="text-xs font-medium text-orange-900">MULTI-CUTTER</span>
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="text-orange-700">Slabs:</span>
                                  <span className="font-bold text-orange-900">{summary.consignment_multi_cutter_slabs}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-orange-700">Sq.Ft:</span>
                                  <span className="font-bold text-orange-900">{formatNumber(summary.consignment_multi_cutter_sqft)}</span>
                                </div>
                              </div>
                            </div>

                            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                <span className="text-xs font-medium text-purple-900">LINE-POLISH</span>
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="text-purple-700">Slabs:</span>
                                  <span className="font-bold text-purple-900">{summary.consignment_line_polish_slabs}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-purple-700">Sq.Ft:</span>
                                  <span className="font-bold text-purple-900">{formatNumber(summary.consignment_line_polish_sqft)}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Blocks Table */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-3 py-2 text-left font-medium">Block No</th>
                                  <th className="px-3 py-2 text-left font-medium">Parts</th>
                                  <th className="px-3 py-2 text-right font-medium bg-orange-50 text-orange-900">MC Slabs</th>
                                  <th className="px-3 py-2 text-right font-medium bg-orange-50 text-orange-900">MC SqFt</th>
                                  <th className="px-3 py-2 text-right font-medium bg-purple-50 text-purple-900">LP Slabs</th>
                                  <th className="px-3 py-2 text-right font-medium bg-purple-50 text-purple-900">LP SqFt</th>
                                  <th className="px-3 py-2 text-right font-medium">Expected</th>
                                  <th className="px-3 py-2 text-right font-medium">Efficiency</th>
                                </tr>
                              </thead>
                              <tbody>
                                {summary.blocks_details.map((block) => (
                                  <tr key={block.block_id} className="border-t hover:bg-gray-50">
                                    <td className="px-3 py-2 font-medium">{block.block_no}</td>
                                    <td className="px-3 py-2">
                                      <div className="flex gap-1">
                                        {block.parts_list?.map(part => (
                                          <span key={part} className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                                            {part}
                                          </span>
                                        ))}
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 text-right text-orange-900 bg-orange-50">
                                      {block.multi_cutter_slabs || '-'}
                                    </td>
                                    <td className="px-3 py-2 text-right font-semibold text-orange-900 bg-orange-50">
                                      {block.multi_cutter_sqft > 0 ? formatNumber(block.multi_cutter_sqft) : '-'}
                                    </td>
                                    <td className="px-3 py-2 text-right text-purple-900 bg-purple-50">
                                      {block.line_polish_slabs || '-'}
                                    </td>
                                    <td className="px-3 py-2 text-right font-semibold text-purple-900 bg-purple-50">
                                      {block.line_polish_sqft > 0 ? formatNumber(block.line_polish_sqft) : '-'}
                                    </td>
                                    <td className="px-3 py-2 text-right text-gray-600">
                                      {formatNumber(block.expected_sqft)}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                      <span className={`font-semibold ${
                                        block.efficiency_percentage >= 95 ? 'text-green-600' :
                                        block.efficiency_percentage >= 85 ? 'text-blue-600' :
                                        block.efficiency_percentage >= 75 ? 'text-amber-600' :
                                        'text-red-600'
                                      }`}>
                                        {block.efficiency_percentage > 0 ? `${block.efficiency_percentage.toFixed(1)}%` : '-'}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  )
}
