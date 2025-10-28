'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Package, Layers, TrendingUp, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface BlockPart {
  part: string;
  multi_cutter_sqft: number;
  multi_cutter_slabs: number;
  line_polish_sqft: number;
  line_polish_slabs: number;
  sources: string[];
  first_production_date: string;
  last_production_date: string;
  production_entries: number;
}

interface BlockDetail {
  block_no: string;
  block_id: string;
  multi_cutter_sqft: number;
  multi_cutter_slabs: number;
  line_polish_sqft: number;
  line_polish_slabs: number;
  number_of_parts: number;
  parts_list: string[];
  parts_details: BlockPart[];
  expected_sqft: number;
  efficiency_percentage: number;
}

interface ProductionSummary {
  consignment_id: string;
  consignment_number: string;
  supplier_id: string;
  arrival_date: string;
  total_blocks: number;
  blocks_with_production: number;
  consignment_multi_cutter_sqft: number;
  consignment_multi_cutter_slabs: number;
  consignment_line_polish_sqft: number;
  consignment_line_polish_slabs: number;
  consignment_expected_sqft: number;
  consignment_sqft_variance: number;
  avg_production_efficiency: number;
  blocks_details: BlockDetail[];
}

interface BlockProductionSummaryProps {
  consignmentId: string;
}

export function BlockProductionSummary({ consignmentId }: BlockProductionSummaryProps) {
  const [data, setData] = useState<ProductionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadProductionData();
  }, [consignmentId]);

  const loadProductionData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/granite-consignments/${consignmentId}/production-summary`);
      
      if (!response.ok) {
        throw new Error('Failed to load production data');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error loading production data:', err);
      setError('Failed to load production data');
    } finally {
      setLoading(false);
    }
  };

  const toggleBlock = (blockNo: string) => {
    setExpandedBlocks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(blockNo)) {
        newSet.delete(blockNo);
      } else {
        newSet.add(blockNo);
      }
      return newSet;
    });
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 95) return 'text-green-600';
    if (efficiency >= 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getEfficiencyBadge = (efficiency: number) => {
    if (efficiency >= 95) return 'bg-green-100 text-green-800';
    if (efficiency >= 85) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 border-red-200 bg-red-50">
        <div className="flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const hasProduction = data.consignment_multi_cutter_sqft > 0 || data.consignment_line_polish_sqft > 0;

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          Production Summary
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600">Total Blocks</p>
            <p className="text-2xl font-bold text-blue-700">{data.total_blocks}</p>
          </div>
          
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600">With Production</p>
            <p className="text-2xl font-bold text-green-700">{data.blocks_with_production}</p>
          </div>
          
          <div className="p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
            <p className="text-sm text-gray-600 font-medium">Multi-Cutter SqFt</p>
            <p className="text-2xl font-bold text-orange-700">{formatNumber(data.consignment_multi_cutter_sqft)}</p>
            <p className="text-xs text-gray-500 mt-1">Cut stage</p>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
            <p className="text-sm text-gray-600 font-medium">Line-Polish SqFt</p>
            <p className="text-2xl font-bold text-purple-700">{formatNumber(data.consignment_line_polish_sqft)}</p>
            <p className="text-xs text-gray-500 mt-1">Polish stage</p>
          </div>
          
          <div className="p-4 bg-indigo-50 rounded-lg">
            <p className="text-sm text-gray-600">Avg Efficiency</p>
            <p className={`text-2xl font-bold ${getEfficiencyColor(data.avg_production_efficiency)}`}>
              {data.avg_production_efficiency.toFixed(1)}%
            </p>
          </div>
        </div>

        {!hasProduction && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm">
                No production data found for this consignment. Production data will appear here once blocks are processed in Multi-Cutter or Line-Polish.
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Block-level Details */}
      {hasProduction && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Block-wise Production Details
          </h3>

          <div className="space-y-2">
            {data.blocks_details.map((block) => {
              const isExpanded = expandedBlocks.has(block.block_no);
              const hasParts = block.number_of_parts > 0;

              return (
                <div key={block.block_no} className="border rounded-lg overflow-hidden">
                  {/* Block Header */}
                  <div 
                    className={`flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      hasParts ? '' : 'bg-gray-100'
                    }`}
                    onClick={() => hasParts && toggleBlock(block.block_no)}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center gap-2">
                        {hasParts ? (
                          isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />
                        ) : (
                          <div className="h-5 w-5" />
                        )}
                        <Layers className="h-5 w-5 text-blue-600" />
                        <span className="font-semibold text-lg">{block.block_no}</span>
                      </div>

                      <div className="flex items-center gap-6 flex-1">
                        <div>
                          <p className="text-sm text-gray-600">Parts</p>
                          <p className="font-semibold">{block.number_of_parts}</p>
                        </div>
                        
                        <div className="border-l-2 border-orange-200 pl-4">
                          <p className="text-sm text-orange-600 font-medium">Multi-Cutter</p>
                          <p className="font-semibold text-orange-700">{formatNumber(block.multi_cutter_sqft)} SqFt</p>
                          <p className="text-xs text-gray-500">{block.multi_cutter_slabs} slabs</p>
                        </div>

                        <div className="border-l-2 border-purple-200 pl-4">
                          <p className="text-sm text-purple-600 font-medium">Line-Polish</p>
                          <p className="font-semibold text-purple-700">{formatNumber(block.line_polish_sqft)} SqFt</p>
                          <p className="text-xs text-gray-500">{block.line_polish_slabs} slabs</p>
                        </div>
                        
                        <div className="border-l-2 border-gray-200 pl-4">
                          <p className="text-sm text-gray-600">Expected SqFt</p>
                          <p className="font-semibold text-gray-500">{formatNumber(block.expected_sqft)}</p>
                        </div>

                        <div>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getEfficiencyBadge(block.efficiency_percentage)}`}>
                            {block.efficiency_percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Parts Details (Expandable) */}
                  {isExpanded && hasParts && (
                    <div className="p-4 bg-gray-50 border-t">
                      <div className="mb-3 flex items-center gap-2 text-sm text-gray-600">
                        <span className="font-medium">Production Flow:</span>
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded">Multi-Cutter (Cut)</span>
                        <span>→</span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">Line-Polish (Polish)</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-4 font-semibold text-sm text-gray-700">Part</th>
                              <th colSpan={2} className="text-center py-2 px-4 font-semibold text-sm text-orange-700 bg-orange-50">Multi-Cutter</th>
                              <th colSpan={2} className="text-center py-2 px-4 font-semibold text-sm text-purple-700 bg-purple-50">Line-Polish</th>
                              <th className="text-left py-2 px-4 font-semibold text-sm text-gray-700">Source</th>
                              <th className="text-left py-2 px-4 font-semibold text-sm text-gray-700">Production Dates</th>
                            </tr>
                            <tr className="border-b text-xs">
                              <th className="py-2 px-4"></th>
                              <th className="text-right py-2 px-2 text-gray-600 bg-orange-50">SqFt</th>
                              <th className="text-right py-2 px-2 text-gray-600 bg-orange-50">Slabs</th>
                              <th className="text-right py-2 px-2 text-gray-600 bg-purple-50">SqFt</th>
                              <th className="text-right py-2 px-2 text-gray-600 bg-purple-50">Slabs</th>
                              <th className="py-2 px-4"></th>
                              <th className="py-2 px-4"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {block.parts_details.map((part, idx) => (
                              <tr key={idx} className="border-b last:border-b-0 hover:bg-white transition-colors">
                                <td className="py-3 px-4">
                                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold">
                                    {part.part}
                                  </span>
                                </td>
                                {/* Multi-Cutter Data */}
                                <td className="py-3 px-2 text-right font-semibold text-orange-700 bg-orange-50">
                                  {part.multi_cutter_sqft > 0 ? formatNumber(part.multi_cutter_sqft) : '-'}
                                </td>
                                <td className="py-3 px-2 text-right font-medium text-orange-600 bg-orange-50">
                                  {part.multi_cutter_slabs > 0 ? part.multi_cutter_slabs : '-'}
                                </td>
                                {/* Line-Polish Data */}
                                <td className="py-3 px-2 text-right font-semibold text-purple-700 bg-purple-50">
                                  {part.line_polish_sqft > 0 ? formatNumber(part.line_polish_sqft) : '-'}
                                </td>
                                <td className="py-3 px-2 text-right font-medium text-purple-600 bg-purple-50">
                                  {part.line_polish_slabs > 0 ? part.line_polish_slabs : '-'}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex gap-1">
                                    {part.sources.map((source, idx) => (
                                      <span
                                        key={idx}
                                        className={`px-2 py-1 rounded text-xs font-medium ${
                                          source === 'multi_cutter' 
                                            ? 'bg-orange-100 text-orange-700' 
                                            : 'bg-purple-100 text-purple-700'
                                        }`}
                                      >
                                        {source.replace('_', '-')}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-600">
                                  {part.first_production_date === part.last_production_date
                                    ? new Date(part.first_production_date).toLocaleDateString()
                                    : `${new Date(part.first_production_date).toLocaleDateString()} - ${new Date(part.last_production_date).toLocaleDateString()}`
                                  }
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-gray-100 font-semibold border-t-2">
                              <td className="py-3 px-4">Total</td>
                              <td className="py-3 px-2 text-right text-orange-700 bg-orange-100">{formatNumber(block.multi_cutter_sqft)}</td>
                              <td className="py-3 px-2 text-right text-orange-600 bg-orange-100">{block.multi_cutter_slabs}</td>
                              <td className="py-3 px-2 text-right text-purple-700 bg-purple-100">{formatNumber(block.line_polish_sqft)}</td>
                              <td className="py-3 px-2 text-right text-purple-600 bg-purple-100">{block.line_polish_slabs}</td>
                              <td colSpan={2} className="py-3 px-4"></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                  {!hasParts && (
                    <div className="p-4 bg-gray-100 border-t text-center text-sm text-gray-600">
                      No production data yet for this block
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
