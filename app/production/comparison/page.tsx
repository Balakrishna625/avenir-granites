'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { AppLayout } from '@/components/AppLayout';
import { 
  BarChart3, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp,
  TrendingDown,
  Minus,
  Package
} from 'lucide-react';

const INR = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const fmt = (n: number) => INR.format(n || 0);

interface MultiCutterReport {
  id: string;
  date: string;
  machine: string;
  blocks: Array<{
    block_name: string;
    slabs: number;
    sqft: number;
  }>;
  total_slabs: number;
  total_sqft: number;
}

interface LinePolishReport {
  id: string;
  date: string;
  shift: string;
  activity: string;
  activities: Array<{
    block_name: string;
    activity: string;
    slabs: number;
    sqft: number;
  }>;
  total_slabs?: number;
  total_sqft: number;
}

interface BlockComparison {
  blockName: string;
  blockGroup: string;
  blockParts: string[];
  sortKey: string;
  multiCutterSlabs: number;
  multiCutterSqft: number;
  linePolishSlabs: number;
  linePolishSqft: number;
  slabsDiff: number;
  sqftDiff: number;
  slabsVariance: number;
  sqftVariance: number;
  status: 'match' | 'minor-diff' | 'major-diff' | 'missing-mc' | 'missing-lp';
}

export default function ComparisonPage() {
  const [multiCutterReports, setMultiCutterReports] = useState<MultiCutterReport[]>([]);
  const [linePolishReports, setLinePolishReports] = useState<LinePolishReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear]);

  async function loadData() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (selectedMonth && selectedYear) {
        params.set('month', selectedMonth);
        params.set('year', selectedYear);
      }
      
      const [mcResponse, lpResponse] = await Promise.all([
        fetch(`/api/multi-cutter-reports?${params.toString()}`),
        fetch(`/api/line-polish-reports?${params.toString()}`)
      ]);
      
      const mcData = await mcResponse.json();
      const lpData = await lpResponse.json();
      
      setMultiCutterReports(Array.isArray(mcData) ? mcData : []);
      setLinePolishReports(Array.isArray(lpData) ? lpData : []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  // Helper function to normalize block names and extract block group
  const normalizeBlockName = (blockName: string): { normalized: string; blockGroup: string; sortKey: string } => {
    if (!blockName) return { normalized: '', blockGroup: '', sortKey: '' };
    
    let normalized = blockName.toUpperCase().trim();
    normalized = normalized.replace(/\s+/g, '');
    normalized = normalized.replace(/--+/g, '-');
    
    const match = normalized.match(/^([A-Z]+)-?(\d+)([A-Z]*)$/);
    if (match) {
      const prefix = match[1];
      const numberWithoutLeadingZeros = parseInt(match[2], 10).toString();
      const suffix = match[3];
      normalized = `${prefix}-${numberWithoutLeadingZeros}${suffix}`;
      
      // Block group excludes suffix (AVG-1A, AVG-1B -> AVG-1)
      const blockGroup = `${prefix}-${numberWithoutLeadingZeros}`;
      const sortKey = `${prefix}-${numberWithoutLeadingZeros.padStart(5, '0')}`;
      
      return { normalized, blockGroup, sortKey };
    }
    
    return { normalized, blockGroup: normalized, sortKey: normalized };
  };

  // Process and compare data
  const compareData = (): BlockComparison[] => {
    const blockData: Record<string, {
      blockParts: Set<string>;
      sortKey: string;
      multiCutterSlabs: number;
      multiCutterSqft: number;
      linePolishSlabs: number;
      linePolishSqft: number;
    }> = {};

    // Process Multi Cutter data
    multiCutterReports.forEach(report => {
      if (report.blocks && Array.isArray(report.blocks)) {
        report.blocks.forEach(block => {
          const { normalized, blockGroup, sortKey } = normalizeBlockName(block.block_name);
          if (!normalized) return;

          if (!blockData[blockGroup]) {
            blockData[blockGroup] = {
              blockParts: new Set(),
              sortKey,
              multiCutterSlabs: 0,
              multiCutterSqft: 0,
              linePolishSlabs: 0,
              linePolishSqft: 0
            };
          }

          blockData[blockGroup].blockParts.add(normalized);
          blockData[blockGroup].multiCutterSlabs += block.slabs || 0;
          blockData[blockGroup].multiCutterSqft += block.sqft || 0;
        });
      }
    });

    // Process Line Polish data
    linePolishReports.forEach(report => {
      if (report.activities && Array.isArray(report.activities)) {
        report.activities.forEach(activity => {
          const { normalized, blockGroup, sortKey } = normalizeBlockName(activity.block_name);
          if (!normalized) return;

          if (!blockData[blockGroup]) {
            blockData[blockGroup] = {
              blockParts: new Set(),
              sortKey,
              multiCutterSlabs: 0,
              multiCutterSqft: 0,
              linePolishSlabs: 0,
              linePolishSqft: 0
            };
          }

          blockData[blockGroup].blockParts.add(normalized);
          blockData[blockGroup].linePolishSlabs += activity.slabs || 0;
          blockData[blockGroup].linePolishSqft += activity.sqft || 0;
        });
      }
    });

    // Calculate comparisons
    const comparisons: BlockComparison[] = Object.entries(blockData).map(([blockGroup, block]) => {
      const slabsDiff = block.linePolishSlabs - block.multiCutterSlabs;
      const sqftDiff = block.linePolishSqft - block.multiCutterSqft;
      
      const slabsVariance = block.multiCutterSlabs > 0 
        ? (slabsDiff / block.multiCutterSlabs) * 100 
        : 0;
      const sqftVariance = block.multiCutterSqft > 0 
        ? (sqftDiff / block.multiCutterSqft) * 100 
        : 0;

      let status: BlockComparison['status'] = 'match';
      
      if (block.multiCutterSlabs === 0 && block.linePolishSlabs > 0) {
        status = 'missing-mc';
      } else if (block.linePolishSlabs === 0 && block.multiCutterSlabs > 0) {
        status = 'missing-lp';
      } else if (Math.abs(slabsVariance) > 15 || Math.abs(sqftVariance) > 15) {
        status = 'major-diff';
      } else if (Math.abs(slabsVariance) > 5 || Math.abs(sqftVariance) > 5) {
        status = 'minor-diff';
      }

      return {
        blockName: blockGroup,
        blockGroup: blockGroup,
        blockParts: Array.from(block.blockParts).sort(),
        sortKey: block.sortKey,
        multiCutterSlabs: block.multiCutterSlabs,
        multiCutterSqft: block.multiCutterSqft,
        linePolishSlabs: block.linePolishSlabs,
        linePolishSqft: block.linePolishSqft,
        slabsDiff,
        sqftDiff,
        slabsVariance,
        sqftVariance,
        status
      };
    });

    return comparisons.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  };

  const comparisons = compareData();

  // Calculate summary statistics
  const totalBlocks = comparisons.length;
  const matchingBlocks = comparisons.filter(c => c.status === 'match').length;
  const minorDiffBlocks = comparisons.filter(c => c.status === 'minor-diff').length;
  const majorDiffBlocks = comparisons.filter(c => c.status === 'major-diff').length;
  const missingMC = comparisons.filter(c => c.status === 'missing-mc').length;
  const missingLP = comparisons.filter(c => c.status === 'missing-lp').length;

  const totalMCSlabs = comparisons.reduce((sum, c) => sum + c.multiCutterSlabs, 0);
  const totalMCSqft = comparisons.reduce((sum, c) => sum + c.multiCutterSqft, 0);
  const totalLPSlabs = comparisons.reduce((sum, c) => sum + c.linePolishSlabs, 0);
  const totalLPSqft = comparisons.reduce((sum, c) => sum + c.linePolishSqft, 0);

  const overallSlabsVariance = totalMCSlabs > 0 
    ? ((totalLPSlabs - totalMCSlabs) / totalMCSlabs) * 100 
    : 0;
  const overallSqftVariance = totalMCSqft > 0 
    ? ((totalLPSqft - totalMCSqft) / totalMCSqft) * 100 
    : 0;

  // Generate month options
  const months = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  const years = Array.from({ length: 6 }, (_, i) => {
    const currentYear = new Date().getFullYear();
    return (currentYear - 3 + i).toString();
  }).reverse();

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
          <div className="text-lg text-gray-600">Loading comparison data...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen w-full bg-gray-50 p-6 space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Multi Cutter vs Line Polish Comparison</h1>
              <p className="text-gray-600 mt-2">
                Compare block data between Multi Cutter (cutting) and Line Polish (polishing) stages
              </p>
            </div>
          </div>

          {/* Date Filters */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Month:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Year:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-900">Matching Blocks</h3>
            </div>
            <p className="text-3xl font-bold text-green-700">{matchingBlocks}</p>
            <p className="text-sm text-green-600 mt-1">
              {totalBlocks > 0 ? ((matchingBlocks / totalBlocks) * 100).toFixed(1) : 0}% accuracy
            </p>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <div className="flex items-center gap-2 mb-2">
              <Minus className="w-5 h-5 text-yellow-600" />
              <h3 className="font-semibold text-yellow-900">Minor Differences</h3>
            </div>
            <p className="text-3xl font-bold text-yellow-700">{minorDiffBlocks}</p>
            <p className="text-sm text-yellow-600 mt-1">5-15% variance</p>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <h3 className="font-semibold text-orange-900">Major Differences</h3>
            </div>
            <p className="text-3xl font-bold text-orange-700">{majorDiffBlocks}</p>
            <p className="text-sm text-orange-600 mt-1">&gt;15% variance</p>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-5 h-5 text-red-600" />
              <h3 className="font-semibold text-red-900">Missing Data</h3>
            </div>
            <p className="text-3xl font-bold text-red-700">{missingMC + missingLP}</p>
            <p className="text-sm text-red-600 mt-1">MC: {missingMC} | LP: {missingLP}</p>
          </Card>
        </div>

        {/* Overall Variance Summary */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Production Variance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700">Slabs Comparison</h4>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Multi Cutter:</span>
                <span className="font-bold text-orange-700">{fmt(totalMCSlabs)} slabs</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Line Polish:</span>
                <span className="font-bold text-blue-700">{fmt(totalLPSlabs)} slabs</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm font-medium text-gray-700">Variance:</span>
                <div className="flex items-center gap-2">
                  {overallSlabsVariance > 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : overallSlabsVariance < 0 ? (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  ) : null}
                  <span className={`font-bold ${
                    Math.abs(overallSlabsVariance) > 15 ? 'text-red-600' :
                    Math.abs(overallSlabsVariance) > 5 ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {overallSlabsVariance > 0 ? '+' : ''}{overallSlabsVariance.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-700">Square Feet Comparison</h4>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Multi Cutter:</span>
                <span className="font-bold text-orange-700">{fmt(totalMCSqft)} sqft</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Line Polish:</span>
                <span className="font-bold text-blue-700">{fmt(totalLPSqft)} sqft</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm font-medium text-gray-700">Variance:</span>
                <div className="flex items-center gap-2">
                  {overallSqftVariance > 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : overallSqftVariance < 0 ? (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  ) : null}
                  <span className={`font-bold ${
                    Math.abs(overallSqftVariance) > 15 ? 'text-red-600' :
                    Math.abs(overallSqftVariance) > 5 ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {overallSqftVariance > 0 ? '+' : ''}{overallSqftVariance.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Detailed Comparison Table */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Block-wise Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300 bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Block Group</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 text-xs">Parts Included</th>
                  <th className="text-right py-3 px-4 font-medium text-orange-700">MC Slabs</th>
                  <th className="text-right py-3 px-4 font-medium text-orange-700">MC SqFt</th>
                  <th className="text-right py-3 px-4 font-medium text-blue-700">LP Slabs</th>
                  <th className="text-right py-3 px-4 font-medium text-blue-700">LP SqFt</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Slabs Var %</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">SqFt Var %</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((comp, index) => (
                  <tr 
                    key={index} 
                    className={`border-b hover:bg-gray-50 transition-colors ${
                      comp.status === 'major-diff' ? 'bg-red-50' :
                      comp.status === 'minor-diff' ? 'bg-yellow-50' :
                      comp.status === 'missing-mc' || comp.status === 'missing-lp' ? 'bg-orange-50' :
                      ''
                    }`}
                  >
                    <td className="py-3 px-4 font-semibold text-gray-900">{comp.blockName}</td>
                    <td className="py-3 px-4">
                      <span className="text-xs text-gray-600">
                        {comp.blockParts.join(', ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-orange-700">{fmt(comp.multiCutterSlabs)}</td>
                    <td className="py-3 px-4 text-right text-orange-700">{fmt(comp.multiCutterSqft)}</td>
                    <td className="py-3 px-4 text-right text-blue-700">{fmt(comp.linePolishSlabs)}</td>
                    <td className="py-3 px-4 text-right text-blue-700">{fmt(comp.linePolishSqft)}</td>
                    <td className={`py-3 px-4 text-right font-semibold ${
                      Math.abs(comp.slabsVariance) > 15 ? 'text-red-600' :
                      Math.abs(comp.slabsVariance) > 5 ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {comp.slabsVariance > 0 ? '+' : ''}{comp.slabsVariance.toFixed(1)}%
                    </td>
                    <td className={`py-3 px-4 text-right font-semibold ${
                      Math.abs(comp.sqftVariance) > 15 ? 'text-red-600' :
                      Math.abs(comp.sqftVariance) > 5 ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {comp.sqftVariance > 0 ? '+' : ''}{comp.sqftVariance.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-center">
                      {comp.status === 'match' && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                          <CheckCircle2 className="w-3 h-3" /> Match
                        </span>
                      )}
                      {comp.status === 'minor-diff' && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                          <Minus className="w-3 h-3" /> Minor
                        </span>
                      )}
                      {comp.status === 'major-diff' && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                          <AlertTriangle className="w-3 h-3" /> Major
                        </span>
                      )}
                      {comp.status === 'missing-mc' && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                          No MC
                        </span>
                      )}
                      {comp.status === 'missing-lp' && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                          No LP
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {comparisons.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-gray-500">
                      No comparison data available for the selected period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Insights Section */}
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Business Insights</h3>
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              <strong>Understanding the Data:</strong> This comparison tracks blocks from the Multi Cutter (cutting stage) 
              through to Line Polish (polishing stage). Ideally, all blocks cut should be polished with similar quantities.
            </p>
            <p>
              <strong>Variance Interpretation:</strong>
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li><span className="text-green-600 font-semibold">Match (&lt;5% variance):</span> Excellent data consistency - cutting and polishing data align well</li>
              <li><span className="text-yellow-600 font-semibold">Minor Difference (5-15% variance):</span> Acceptable approximation differences by workers</li>
              <li><span className="text-red-600 font-semibold">Major Difference (&gt;15% variance):</span> Significant discrepancy - may need investigation</li>
              <li><span className="text-orange-600 font-semibold">Missing MC Data:</span> Block appears in Line Polish but not in Multi Cutter - possible data entry gap</li>
              <li><span className="text-purple-600 font-semibold">Missing LP Data:</span> Block was cut but not yet polished - work in progress</li>
            </ul>
            <p>
              <strong>Positive Variance (+%):</strong> Line Polish shows higher numbers than Multi Cutter - could indicate 
              measurement differences or additional material processed.
            </p>
            <p>
              <strong>Negative Variance (−%):</strong> Multi Cutter shows higher numbers - could indicate breakage, 
              quality rejection, or blocks still waiting to be polished.
            </p>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
