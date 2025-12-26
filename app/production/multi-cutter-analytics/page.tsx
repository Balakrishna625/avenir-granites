'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { useTableSort } from '@/hooks/useTableSort';
import { SortButton } from '@/components/ui/SortButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppLayout } from '@/components/AppLayout';
import { formatDisplayDate } from '@/lib/date-utils';
import { 
  BarChart3, 
  Factory, 
  Layers,
  TrendingUp,
  TrendingDown,
  Calendar,
  Plus,
  Zap,
  Target,
  AlertTriangle,
  Award,
  Activity,
  Box,
  Ruler
} from 'lucide-react';
import Link from 'next/link';

const fmt = (n: number) => (n || 0).toLocaleString('en-IN');

interface AnalyticsSummary {
  total_entries: number;
  total_days: number;
  active_machines: number;
  total_slabs: number;
  total_sqft: number;
  avg_slabs_per_entry: number;
  avg_sqft_per_entry: number;
}

interface MachineBreakdown {
  machine: string;
  entries: number;
  slabs: number;
  sqft: number;
  avg_slabs: number;
  avg_sqft: number;
  working_days: number;
}

interface DailyTrend {
  date: string;
  machines_active: number;
  slabs: number;
  sqft: number;
  notes?: string[]; // Array of notes from all blocks on this day
}

interface MaterialBreakdown {
  material_type: string;
  block_count: number;
  total_slabs: number;
  total_sqft: number;
}

interface TopBlock {
  block_name: string;
  material_type: string;
  times_processed: number;
  total_slabs: number;
  total_sqft: number;
}

interface MultiCutterAnalytics {
  summary: AnalyticsSummary;
  machine_breakdown: MachineBreakdown[];
  daily_trends: DailyTrend[];
  material_breakdown: MaterialBreakdown[];
  top_blocks: TopBlock[];
}

export default function MultiCutterAnalyticsPage() {
  const [analytics, setAnalytics] = useState<MultiCutterAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [blockLimit, setBlockLimit] = useState<number>(10); // Default to Top 10
  
  // Separate date range selector for Block Groups Visual Overview
  const currentDate = new Date();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  
  const [blockGroupsFromDate, setBlockGroupsFromDate] = useState(
    firstDayOfMonth.toISOString().split('T')[0]
  );
  const [blockGroupsToDate, setBlockGroupsToDate] = useState(
    lastDayOfMonth.toISOString().split('T')[0]
  );
  const [blockGroupsData, setBlockGroupsData] = useState<TopBlock[]>([]);

  // Extract data (use empty arrays while loading to prevent hook issues)
  const summary = analytics?.summary || {} as AnalyticsSummary;
  const machineBreakdown = analytics?.machine_breakdown || [];
  const dailyTrends = analytics?.daily_trends || [];
  const materialBreakdown = analytics?.material_breakdown || [];
  const topBlocks = analytics?.top_blocks || [];

  // Apply limit to top blocks first
  const limitedBlocks = blockLimit === 0 ? topBlocks : topBlocks.slice(0, blockLimit);

  // Custom sorting for blocks with grouped block names
  // Default to sorting by block_name in ascending order to group related blocks
  const [blockSortConfig, setBlockSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' | null }>({
    key: 'block_name',
    direction: 'asc'
  });

  // Function to parse block names for intelligent sorting
  const parseBlockName = (name: string) => {
    const match = name.match(/^([A-Za-z]+[-]?)(\d+)([A-Za-z]?)$/);
    if (match) {
      return {
        prefix: match[1],
        number: parseInt(match[2]),
        suffix: match[3] || '',
        original: name
      };
    }
    return { prefix: name, number: 0, suffix: '', original: name };
  };

  // Sort blocks with custom logic
  const sortedTopBlocks = useMemo(() => {
    let sorted = [...limitedBlocks];

    if (blockSortConfig.key && blockSortConfig.direction) {
      sorted.sort((a: any, b: any) => {
        let aValue = a[blockSortConfig.key!];
        let bValue = b[blockSortConfig.key!];

        // Special handling for block_name to group related blocks
        if (blockSortConfig.key === 'block_name') {
          const aParsed = parseBlockName(a.block_name);
          const bParsed = parseBlockName(b.block_name);

          // Sort by prefix first
          if (aParsed.prefix !== bParsed.prefix) {
            const cmp = aParsed.prefix.localeCompare(bParsed.prefix);
            return blockSortConfig.direction === 'asc' ? cmp : -cmp;
          }

          // Then by number
          if (aParsed.number !== bParsed.number) {
            return blockSortConfig.direction === 'asc' 
              ? aParsed.number - bParsed.number 
              : bParsed.number - aParsed.number;
          }

          // Finally by suffix
          const suffixCmp = aParsed.suffix.localeCompare(bParsed.suffix);
          return blockSortConfig.direction === 'asc' ? suffixCmp : -suffixCmp;
        }

        // Handle null/undefined
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return blockSortConfig.direction === 'asc' ? 1 : -1;
        if (bValue == null) return blockSortConfig.direction === 'asc' ? -1 : 1;

        // Handle numbers
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return blockSortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
        }

        // Handle strings
        const aString = String(aValue).toLowerCase();
        const bString = String(bValue).toLowerCase();
        if (aString < bString) return blockSortConfig.direction === 'asc' ? -1 : 1;
        if (aString > bString) return blockSortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return sorted;
  }, [limitedBlocks, blockSortConfig]);

  const requestTopBlocksSort = (key: string) => {
    let direction: 'asc' | 'desc' | null = 'asc';
    if (blockSortConfig.key === key) {
      if (blockSortConfig.direction === 'asc') {
        direction = 'desc';
      } else if (blockSortConfig.direction === 'desc') {
        direction = null;
      }
    }
    setBlockSortConfig({ key, direction });
  };

  const topBlocksSortConfig = blockSortConfig;

  // ⚠️ HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  // Add sorting for Material Breakdown table
  const { sortedData: sortedMaterialBreakdown, sortConfig: materialSortConfig, requestSort: requestMaterialSort } = useTableSort(materialBreakdown);

  // Group blocks by base name (removing suffix letter)
  const groupedBlocks = useMemo(() => {
    const groups = new Map<string, {
      base_name: string;
      material_type: string;
      block_count: number;
      total_slabs: number;
      total_sqft: number;
      times_processed: number;
      blocks: string[];
    }>();

    // Use blockGroupsData instead of topBlocks for the visual overview
    blockGroupsData.forEach(block => {
      // Skip running blocks - not specific blocks
      if (block.block_name.toLowerCase().includes('running')) {
        return;
      }

      // Remove the last character if it's a letter (A, B, C, etc.)
      let baseName = block.block_name;
      if (/[A-Za-z]$/.test(baseName)) {
        baseName = baseName.slice(0, -1);
      }

      const key = `${baseName}|${block.material_type}`;
      
      if (!groups.has(key)) {
        groups.set(key, {
          base_name: baseName,
          material_type: block.material_type,
          block_count: 0,
          total_slabs: 0,
          total_sqft: 0,
          times_processed: 0,
          blocks: []
        });
      }

      const group = groups.get(key)!;
      group.block_count++;
      group.total_slabs += block.total_slabs;
      group.total_sqft += block.total_sqft;
      group.times_processed += block.times_processed;
      group.blocks.push(block.block_name);
    });

    // Convert to array and sort by total_sqft descending
    return Array.from(groups.values())
      .sort((a, b) => b.total_sqft - a.total_sqft);
  }, [blockGroupsData]);

  // Group blocks by prefix (AVG-SL, AVG-SJ, AVG-GK, etc.) for visual display
  const blocksByPrefix = useMemo(() => {
    const prefixGroups = new Map<string, typeof groupedBlocks>();

    groupedBlocks.forEach(group => {
      // Extract prefix
      // For patterns like AVG-SL-1, AVG-SJ-43 → prefix is "AVG-SL", "AVG-SJ"
      // For patterns like AVG-1, AVG-2 → prefix is "AVG"
      let prefix = group.base_name;
      
      const matchWithSuffix = group.base_name.match(/^([A-Za-z]+-[A-Za-z]+)-/);
      if (matchWithSuffix) {
        // Has pattern like AVG-SL-1
        prefix = matchWithSuffix[1];
      } else {
        // Check if it's just AVG-number pattern
        const matchAVG = group.base_name.match(/^(AVG)-/);
        if (matchAVG) {
          prefix = 'AVG';
        }
      }

      if (!prefixGroups.has(prefix)) {
        prefixGroups.set(prefix, []);
      }
      prefixGroups.get(prefix)!.push(group);
    });

    // Natural sort helper
    const naturalSort = (a: string, b: string) => {
      const aParts = a.match(/(\d+|\D+)/g) || [];
      const bParts = b.match(/(\d+|\D+)/g) || [];
      
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aPart = aParts[i] || '';
        const bPart = bParts[i] || '';
        
        const aNum = parseInt(aPart);
        const bNum = parseInt(bPart);
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
          if (aNum !== bNum) return aNum - bNum;
        } else {
          if (aPart !== bPart) return aPart.localeCompare(bPart);
        }
      }
      return 0;
    };

    // Convert to array and sort blocks within each prefix by base_name ascending
    return Array.from(prefixGroups.entries()).map(([prefix, blocks]) => ({
      prefix,
      blocks: blocks.sort((a, b) => naturalSort(a.base_name, b.base_name)),
      material_type: blocks[0]?.material_type || '' // Get material type from first block
    })).sort((a, b) => {
      // Sort prefixes by total sqft
      const aTotal = a.blocks.reduce((sum, b) => sum + b.total_sqft, 0);
      const bTotal = b.blocks.reduce((sum, b) => sum + b.total_sqft, 0);
      return bTotal - aTotal;
    });
  }, [groupedBlocks]);

  useEffect(() => {
    loadAnalytics();
  }, [dateFrom, dateTo, selectedMonth, selectedYear]);

  useEffect(() => {
    loadBlockGroupsData();
  }, [blockGroupsFromDate, blockGroupsToDate]);

  async function loadBlockGroupsData() {
    try {
      const params = new URLSearchParams();
      if (blockGroupsFromDate) params.set('from', blockGroupsFromDate);
      if (blockGroupsToDate) params.set('to', blockGroupsToDate);
      
      const response = await fetch(`/api/multi-cutter-reports/analytics?${params.toString()}`);
      const data = await response.json();
      setBlockGroupsData(data.top_blocks || []);
    } catch (error) {
      console.error('Failed to load block groups data:', error);
    }
  }

  async function loadAnalytics() {
    try {
      const params = new URLSearchParams();
      
      if (selectedMonth && selectedYear) {
        params.set('month', selectedMonth);
        params.set('year', selectedYear);
      } else {
        if (dateFrom) params.set('from', dateFrom);
        if (dateTo) params.set('to', dateTo);
      }
      
      const response = await fetch(`/api/multi-cutter-reports/analytics?${params.toString()}`);
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load multi-cutter analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading multi-cutter analytics...</div>
      </div>
    );
  }

  // ============ BUSINESS ANALYTICS CALCULATIONS ============
  
  // 1. Production Efficiency Metrics
  const avgSlabsPerDay = summary.total_days > 0 ? summary.total_slabs / summary.total_days : 0;
  const avgSqftPerDay = summary.total_days > 0 ? summary.total_sqft / summary.total_days : 0;
  const avgSlabsPerMachine = summary.active_machines > 0 ? summary.total_slabs / (summary.total_days * summary.active_machines) : 0;
  const avgSqftPerMachine = summary.active_machines > 0 ? summary.total_sqft / (summary.total_days * summary.active_machines) : 0;
  
  // 2. Machine Utilization (assuming 24-hour operation)
  const targetDailyOutputPerMachine = 2000; // Sq ft target per machine per day
  const utilizationRate = avgSqftPerMachine > 0 ? (avgSqftPerMachine / targetDailyOutputPerMachine) * 100 : 0;
  
  // 3. Performance Trends (last 7 days vs previous 7 days)
  const last7Days = dailyTrends.slice(0, 7);
  const prev7Days = dailyTrends.slice(7, 14);
  
  const last7DaysAvgSqft = last7Days.length > 0 
    ? last7Days.reduce((sum, d) => sum + d.sqft, 0) / last7Days.length 
    : 0;
  const prev7DaysAvgSqft = prev7Days.length > 0 
    ? prev7Days.reduce((sum, d) => sum + d.sqft, 0) / prev7Days.length 
    : 0;
  const sqftTrend = prev7DaysAvgSqft > 0 
    ? ((last7DaysAvgSqft - prev7DaysAvgSqft) / prev7DaysAvgSqft) * 100 
    : 0;
    
  const last7DaysAvgSlabs = last7Days.length > 0 
    ? last7Days.reduce((sum, d) => sum + d.slabs, 0) / last7Days.length 
    : 0;
  const prev7DaysAvgSlabs = prev7Days.length > 0 
    ? prev7Days.reduce((sum, d) => sum + d.slabs, 0) / prev7Days.length 
    : 0;
  const slabsTrend = prev7DaysAvgSlabs > 0 
    ? ((last7DaysAvgSlabs - prev7DaysAvgSlabs) / prev7DaysAvgSlabs) * 100 
    : 0;
  
  // 4. Best & Worst Days
  const bestDay = dailyTrends.length > 0 
    ? dailyTrends.reduce((max, day) => day.sqft > max.sqft ? day : max, dailyTrends[0])
    : null;
  const worstDay = dailyTrends.length > 0 
    ? dailyTrends.reduce((min, day) => day.sqft < min.sqft ? day : min, dailyTrends[0])
    : null;

  // 5. Machine Performance Comparison
  const bestMachine = machineBreakdown.length > 0 
    ? machineBreakdown.reduce((max, m) => m.sqft > max.sqft ? m : max, machineBreakdown[0])
    : null;
  const worstMachine = machineBreakdown.length > 0 
    ? machineBreakdown.reduce((min, m) => m.sqft < min.sqft ? m : min, machineBreakdown[0])
    : null;

  // Generate month options
  const months = [
    { value: '', label: 'All Months' },
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

  // Generate dynamic years (3 years back, current year, 2 years forward)
  const years = Array.from({ length: 6 }, (_, i) => {
    const currentYear = new Date().getFullYear();
    return (currentYear - 3 + i).toString();
  }).reverse();

  return (
    <AppLayout>
      <div className="min-h-screen w-full bg-gray-50 p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Multi-Cutter Analytics</h1>
          <p className="text-gray-600 mt-1">Production Performance & Machine Efficiency Tracking</p>
        </div>
          
        {/* Filters Section */}
        <Card className="p-4 bg-white border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            {/* Left side: Date filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 flex-1">
              <div className="flex-1 min-w-[140px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full text-sm"
                  placeholder="Start date"
                />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full text-sm"
                  placeholder="End date"
                />
              </div>
              <Button 
                variant="outline" 
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                  setSelectedMonth("");
                  setSelectedYear(new Date().getFullYear().toString());
                }}
                className="whitespace-nowrap"
              >
                Clear Filters
              </Button>
            </div>
            
            {/* Right side: Month selector */}
            <div className="flex items-end gap-2">
              <div className="min-w-[100px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <select 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                >
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <div className="min-w-[140px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                <select 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  {months.map(month => (
                    <option key={month.value} value={month.value}>{month.label}</option>
                  ))}
                </select>
              </div>
              <Link href="/production/multi-cutter">
                <Button className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Report
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        {/* ========== MACHINE PERFORMANCE COMPARISON (TOP SECTION) ========== */}
        <Card className="p-6">
          <div className="flex items-center mb-6">
            <Factory className="w-6 h-6 text-blue-600 mr-2" />
            <h3 className="text-xl font-bold text-gray-900">Machine Performance Comparison</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {machineBreakdown.map((machine, index) => {
              const colors = [
                { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', badge: 'bg-blue-100 text-blue-800', progressColor: '#1e40af' },
                { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-900', badge: 'bg-green-100 text-green-800', progressColor: '#15803d' },
                { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-900', badge: 'bg-purple-100 text-purple-800', progressColor: '#7e22ce' }
              ];
              const color = colors[index % 3];
              
              // Monthly target: 40,000 sqft per machine
              const monthlyTarget = 40000;
              const progressPercentage = Math.min((machine.sqft / monthlyTarget) * 100, 100);
              const radius = 65;
              const circumference = 2 * Math.PI * radius;
              const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;
              
              return (
                <div key={machine.machine} className={`${color.bg} border-2 ${color.border} p-5 rounded-xl shadow-sm`}>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className={`font-bold text-lg ${color.text}`}>
                      {machine.machine}
                    </h4>
                    <span className={`text-xs ${color.badge} px-2.5 py-1 rounded-full font-semibold`}>
                      {machine.working_days} days
                    </span>
                  </div>
                  
                  {/* Circular Progress - Clean Design */}
                  <div className="flex justify-center mb-5">
                    <div className="relative">
                      <svg width="150" height="150" className="transform -rotate-90">
                        {/* Background circle */}
                        <circle
                          cx="75"
                          cy="75"
                          r={radius}
                          stroke="#e5e7eb"
                          strokeWidth="14"
                          fill="white"
                          className="drop-shadow-md"
                        />
                        {/* Progress circle */}
                        <circle
                          cx="75"
                          cy="75"
                          r={radius}
                          stroke={color.progressColor}
                          strokeWidth="14"
                          fill="none"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      {/* Center text */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className={`text-3xl font-bold ${color.text}`}>
                          {Math.round(progressPercentage)}%
                        </div>
                        <div className="text-xs text-gray-500 mt-1 font-medium">of target</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-200">
                      <span className="text-gray-600 font-medium">Production:</span>
                      <span className={`font-bold ${color.text}`}>{fmt(machine.sqft)} sqft</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-200">
                      <span className="text-gray-600 font-medium">Target:</span>
                      <span className="font-semibold text-gray-700">{fmt(monthlyTarget)} sqft</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-200">
                      <span className="text-gray-600 font-medium">Remaining:</span>
                      <span className={`font-semibold ${machine.sqft >= monthlyTarget ? 'text-green-600' : 'text-amber-600'}`}>
                        {fmt(Math.max(0, monthlyTarget - machine.sqft))} sqft
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-200">
                      <span className="text-gray-600 font-medium">Daily Avg:</span>
                      <span className={`font-bold ${color.text}`}>{fmt(machine.avg_sqft)} sqft/day</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-gray-600 font-medium">Entries:</span>
                      <span className={`font-bold ${color.text}`}>{machine.entries}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {machineBreakdown.length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-500">
                No machine data available
              </div>
            )}
          </div>
        </Card>

        {/* ========== KEY PRODUCTION METRICS (ROW 1) ========== */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Production</p>
                <p className="text-2xl font-bold text-gray-900">{fmt(summary.total_slabs || 0)}</p>
                <p className="text-xs text-gray-500 mt-1">Slabs Cut</p>
              </div>
              <Layers className="w-8 h-8 text-purple-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Area</p>
                <p className="text-2xl font-bold text-gray-900">{fmt(summary.total_sqft || 0)}</p>
                <p className="text-xs text-gray-500 mt-1">Sq. Ft. Produced</p>
              </div>
              <BarChart3 className="w-8 h-8 text-orange-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Working Days</p>
                <p className="text-2xl font-bold text-gray-900">{summary.total_days || 0}</p>
                <p className="text-xs text-gray-500 mt-1">Production Days</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Machines</p>
                <p className="text-2xl font-bold text-gray-900">{summary.active_machines || 0}</p>
                <p className="text-xs text-gray-500 mt-1">Multi Cutters</p>
              </div>
              <Factory className="w-8 h-8 text-indigo-500" />
            </div>
          </Card>
        </div>

        {/* ========== EFFICIENCY METRICS (ROW 2) ========== */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-green-50 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Daily Avg Output</p>
                <p className="text-2xl font-bold text-green-900">{fmt(avgSqftPerDay)}</p>
                <p className="text-xs text-green-600 mt-1">Sq. Ft. per Day</p>
              </div>
              <Zap className="w-8 h-8 text-green-600" />
            </div>
          </Card>
          
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">Slabs per Day</p>
                <p className="text-2xl font-bold text-blue-900">{fmt(avgSlabsPerDay)}</p>
                <p className="text-xs text-blue-600 mt-1">Daily Average</p>
              </div>
              <Target className="w-8 h-8 text-blue-600" />
            </div>
          </Card>
          
          <Card className="p-4 bg-purple-50 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 font-medium">Machine Efficiency</p>
                <p className="text-2xl font-bold text-purple-900">{fmt(avgSqftPerMachine)}</p>
                <p className="text-xs text-purple-600 mt-1">Sq. Ft. / Machine / Day</p>
              </div>
              <Activity className="w-8 h-8 text-purple-600" />
            </div>
          </Card>
          
          <Card className="p-4 bg-amber-50 border-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-700 font-medium">Utilization</p>
                <p className="text-2xl font-bold text-amber-900">{utilizationRate.toFixed(0)}%</p>
                <p className="text-xs text-amber-600 mt-1">Target: 2000 sqft/day</p>
              </div>
              <Award className="w-8 h-8 text-amber-600" />
            </div>
          </Card>
        </div>

        {/* ========== PERFORMANCE TRENDS (WEEK-OVER-WEEK) ========== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm text-gray-600">Slabs Trend (Last 7 days)</p>
                <p className="text-3xl font-bold text-gray-900">{fmt(last7DaysAvgSlabs)}</p>
                <p className="text-xs text-gray-500 mt-1">Avg slabs per day</p>
              </div>
              {slabsTrend >= 0 ? (
                <TrendingUp className="w-10 h-10 text-green-500" />
              ) : (
                <TrendingDown className="w-10 h-10 text-red-500" />
              )}
            </div>
            <div className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              slabsTrend >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {slabsTrend >= 0 ? '↑' : '↓'} {Math.abs(slabsTrend).toFixed(1)}% vs previous week
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm text-gray-600">SqFt Trend (Last 7 days)</p>
                <p className="text-3xl font-bold text-gray-900">{fmt(last7DaysAvgSqft)}</p>
                <p className="text-xs text-gray-500 mt-1">Avg sqft per day</p>
              </div>
              {sqftTrend >= 0 ? (
                <TrendingUp className="w-10 h-10 text-green-500" />
              ) : (
                <TrendingDown className="w-10 h-10 text-red-500" />
              )}
            </div>
            <div className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              sqftTrend >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {sqftTrend >= 0 ? '↑' : '↓'} {Math.abs(sqftTrend).toFixed(1)}% vs previous week
            </div>
          </Card>
        </div>

        {/* ========== BEST & WORST PERFORMANCE DAYS ========== */}
        {bestDay && worstDay && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4 bg-green-50 border-green-200">
              <div className="flex items-center mb-3">
                <Award className="w-5 h-5 text-green-600 mr-2" />
                <h3 className="text-sm font-semibold text-green-900">Best Performance Day</h3>
              </div>
              <div className="space-y-2">
                <p className="text-lg font-bold text-green-900">{formatDisplayDate(bestDay.date)}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-green-700">Slabs: <span className="font-bold">{bestDay.slabs}</span></p>
                  </div>
                  <div>
                    <p className="text-green-700">SqFt: <span className="font-bold">{fmt(bestDay.sqft)}</span></p>
                  </div>
                  <div>
                    <p className="text-green-700">Machines: <span className="font-bold">{bestDay.machines_active}</span></p>
                  </div>
                  <div>
                    <p className="text-green-700">Avg: <span className="font-bold">{fmt(bestDay.sqft / bestDay.machines_active)} sqft/machine</span></p>
                  </div>
                </div>
              </div>
            </Card>
            
            <Card className="p-4 bg-red-50 border-red-200">
              <div className="flex items-center mb-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                <h3 className="text-sm font-semibold text-red-900">Needs Improvement Day</h3>
              </div>
              <div className="space-y-2">
                <p className="text-lg font-bold text-red-900">{formatDisplayDate(worstDay.date)}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-red-700">Slabs: <span className="font-bold">{worstDay.slabs}</span></p>
                  </div>
                  <div>
                    <p className="text-red-700">SqFt: <span className="font-bold">{fmt(worstDay.sqft)}</span></p>
                  </div>
                  <div>
                    <p className="text-red-700">Machines: <span className="font-bold">{worstDay.machines_active}</span></p>
                  </div>
                  <div>
                    <p className="text-red-700">Avg: <span className="font-bold">{worstDay.machines_active > 0 ? fmt(worstDay.sqft / worstDay.machines_active) : 0} sqft/machine</span></p>
                  </div>
                </div>
                {/* Display notes if available */}
                {worstDay.notes && worstDay.notes.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-red-200">
                    <p className="text-xs font-semibold text-red-800 mb-1">Notes/Comments:</p>
                    <div className="space-y-1">
                      {worstDay.notes.map((note: string, idx: number) => (
                        <p key={idx} className="text-xs text-red-700 bg-white px-2 py-1 rounded">
                          • {note}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* ========== DAILY PERFORMANCE CHART ========== */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Activity className="w-5 h-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Daily Production Trend</h3>
            </div>
            <p className="text-sm text-gray-600">{dailyTrends.length} days of data</p>
          </div>
          
          {/* Visual Bar Chart - Chronological Order (oldest to newest) */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {[...dailyTrends].reverse().slice(0, 30).map((trend, index) => {
              const maxSqft = Math.max(...dailyTrends.map(d => d.sqft));
              const percentage = maxSqft > 0 ? (trend.sqft / maxSqft) * 100 : 0;
              
              return (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700 w-28">{formatDisplayDate(trend.date)}</span>
                    <div className="flex-1 mx-4">
                      <div className="w-full bg-gray-200 rounded-full h-9 relative overflow-hidden shadow-sm">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-purple-600 rounded-full flex items-center justify-end pr-3 transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        >
                          {percentage > 15 && (
                            <span className="text-xs font-bold text-white drop-shadow">{fmt(trend.sqft)} sqft</span>
                          )}
                        </div>
                        {percentage <= 15 && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-700">
                            {fmt(trend.sqft)} sqft
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right space-y-0.5 min-w-[80px]">
                      <p className="text-xs font-semibold text-gray-700">{trend.slabs} slabs</p>
                      <p className="text-xs text-gray-500">{trend.machines_active} machine{trend.machines_active !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </div>
              );
            })}
            {dailyTrends.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No production data available for the selected period
              </div>
            )}
          </div>
        </Card>

        {/* ========== MATERIAL TYPE BREAKDOWN ========== */}
        <Card className="p-6">
          <div className="flex items-center mb-4">
            <Box className="w-5 h-5 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Material Type Analysis</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b-2 border-gray-300 bg-gray-50">
                  <th className="py-3 px-4 text-sm">
                    <SortButton column="material_type" sortConfig={materialSortConfig} onSort={requestMaterialSort} label="Material Type" align="left" />
                  </th>
                  <th className="py-3 px-4 text-sm">
                    <SortButton column="block_count" sortConfig={materialSortConfig} onSort={requestMaterialSort} label="Blocks" align="right" />
                  </th>
                  <th className="py-3 px-4 text-sm">
                    <SortButton column="total_slabs" sortConfig={materialSortConfig} onSort={requestMaterialSort} label="Total Slabs" align="right" />
                  </th>
                  <th className="py-3 px-4 text-sm">
                    <SortButton column="total_sqft" sortConfig={materialSortConfig} onSort={requestMaterialSort} label="Total Sq. Ft." align="right" />
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">% of Total</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Avg Sqft/Block</th>
                </tr>
              </thead>
              <tbody>
                {sortedMaterialBreakdown.map((material, index) => {
                  const percentOfTotal = summary.total_sqft > 0 ? (material.total_sqft / summary.total_sqft) * 100 : 0;
                  return (
                    <tr key={index} className="border-b border-gray-100 hover:bg-green-50 transition-colors">
                      <td className="py-3 px-4 text-sm font-bold text-gray-900">{material.material_type}</td>
                      <td className="py-3 px-4 text-sm text-right font-semibold text-gray-700">{material.block_count}</td>
                      <td className="py-3 px-4 text-sm text-right font-semibold text-gray-900">{fmt(material.total_slabs)}</td>
                      <td className="py-3 px-4 text-sm text-right font-bold text-green-600">{fmt(material.total_sqft)}</td>
                      <td className="py-3 px-4 text-sm text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">
                          {percentOfTotal.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-gray-600 font-medium">
                        {fmt(material.total_sqft / material.block_count)}
                      </td>
                    </tr>
                  );
                })}
                {sortedMaterialBreakdown.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      No material data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ========== TOP PERFORMING BLOCKS ========== */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Award className="w-5 h-5 text-amber-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">
                {blockLimit === 0 ? 'All Blocks' : `Top ${blockLimit} Performing Blocks`}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 font-medium">Show:</label>
              <select
                value={blockLimit}
                onChange={(e) => setBlockLimit(Number(e.target.value))}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium bg-white hover:border-amber-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-colors"
              >
                <option value={10}>Top 10</option>
                <option value={20}>Top 20</option>
                <option value={50}>Top 50</option>
                <option value={0}>All Blocks</option>
              </select>
            </div>
          </div>
          {sortedTopBlocks.length > 0 && (
            <p className="text-sm text-gray-600 mb-3">
              Showing <span className="font-semibold text-gray-900">{sortedTopBlocks.length}</span> of <span className="font-semibold text-gray-900">{topBlocks.length}</span> total blocks
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b-2 border-gray-300 bg-gray-50">
                  <th className="text-center py-3 px-3 text-sm font-semibold text-gray-700">Rank</th>
                  <th className="py-3 px-4 text-sm">
                    <SortButton column="block_name" sortConfig={topBlocksSortConfig} onSort={requestTopBlocksSort} label="Block Name" align="left" />
                  </th>
                  <th className="py-3 px-4 text-sm">
                    <SortButton column="material_type" sortConfig={topBlocksSortConfig} onSort={requestTopBlocksSort} label="Material" align="left" />
                  </th>
                  <th className="py-3 px-4 text-sm">
                    <SortButton column="times_processed" sortConfig={topBlocksSortConfig} onSort={requestTopBlocksSort} label="Times Cut" align="right" />
                  </th>
                  <th className="py-3 px-4 text-sm">
                    <SortButton column="total_slabs" sortConfig={topBlocksSortConfig} onSort={requestTopBlocksSort} label="Total Slabs" align="right" />
                  </th>
                  <th className="py-3 px-4 text-sm">
                    <SortButton column="total_sqft" sortConfig={topBlocksSortConfig} onSort={requestTopBlocksSort} label="Total Sq. Ft." align="right" />
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Avg Sqft/Cut</th>
                </tr>
              </thead>
              <tbody>
                {sortedTopBlocks.map((block, index) => {
                  const rankColors = [
                    'bg-amber-100 text-amber-900 border-amber-300',
                    'bg-gray-200 text-gray-800 border-gray-400', 
                    'bg-orange-100 text-orange-900 border-orange-300'
                  ];
                  const rankColor = index < 3 ? rankColors[index] : 'bg-blue-50 text-blue-900 border-blue-200';
                  const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
                  
                  return (
                    <tr key={index} className="border-b border-gray-100 hover:bg-purple-50 transition-colors">
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold border-2 ${rankColor}`}>
                          {rankEmoji}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm font-bold text-gray-900">{block.block_name}</td>
                      <td className="py-3 px-4 text-sm">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                          {block.material_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-semibold text-blue-600">{block.times_processed}×</td>
                      <td className="py-3 px-4 text-sm text-right font-bold text-gray-900">{fmt(block.total_slabs)}</td>
                      <td className="py-3 px-4 text-sm text-right font-bold text-green-600">{fmt(block.total_sqft)}</td>
                      <td className="py-3 px-4 text-sm text-right text-gray-600 font-medium">
                        {fmt(block.total_sqft / block.times_processed)}
                      </td>
                    </tr>
                  );
                })}
                {sortedTopBlocks.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">
                      No block data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Visual Block Representation by Prefix */}
        <Card className="p-4 sm:p-5 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-lg">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Block Groups Visual Overview</h2>
                <p className="text-xs text-gray-600">All grouped blocks organized by prefix</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <input
                type="date"
                value={blockGroupsFromDate}
                onChange={(e) => setBlockGroupsFromDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <span className="text-gray-500 text-xs">to</span>
              <input
                type="date"
                value={blockGroupsToDate}
                onChange={(e) => setBlockGroupsToDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-5">
            {blocksByPrefix.map((prefixGroup, prefixIndex) => {
              // Assign colors to each prefix
              const colorSchemes = [
                { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-900', header: 'bg-blue-600', sqft: 'text-blue-700' },
                { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-900', header: 'bg-purple-600', sqft: 'text-purple-700' },
                { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-900', header: 'bg-green-600', sqft: 'text-green-700' },
                { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-900', header: 'bg-orange-600', sqft: 'text-orange-700' },
                { bg: 'bg-pink-50', border: 'border-pink-300', text: 'text-pink-900', header: 'bg-pink-600', sqft: 'text-pink-700' },
                { bg: 'bg-teal-50', border: 'border-teal-300', text: 'text-teal-900', header: 'bg-teal-600', sqft: 'text-teal-700' },
                { bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-900', header: 'bg-indigo-600', sqft: 'text-indigo-700' },
                { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-900', header: 'bg-red-600', sqft: 'text-red-700' },
              ];
              const colors = colorSchemes[prefixIndex % colorSchemes.length];
              const totalSqft = prefixGroup.blocks.reduce((sum, b) => sum + b.total_sqft, 0);

              return (
                <div key={prefixGroup.prefix} className={`${colors.bg} rounded-lg p-3.5 border-2 ${colors.border}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`${colors.header} px-3 py-1.5 rounded-md flex items-center gap-2`}>
                        <h3 className="text-base font-bold text-white">{prefixGroup.prefix}</h3>
                        {prefixGroup.material_type && (
                          <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white font-medium">
                            {prefixGroup.material_type}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600">
                        <span className="font-semibold">{prefixGroup.blocks.length}</span> block groups
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-gray-600 uppercase tracking-wide">Total Production</div>
                      <div className={`text-lg font-bold ${colors.sqft}`}>{fmt(totalSqft)} sq.ft</div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    {prefixGroup.blocks.map((block) => (
                      <div 
                        key={`${block.base_name}-${block.material_type}`} 
                        className="flex flex-col items-center"
                      >
                        <div className={`w-24 h-16 ${colors.bg} border-2 ${colors.border} rounded-md flex items-center justify-center shadow-sm hover:shadow-md transition-shadow`}>
                          <div className="text-center px-1.5">
                            <div className={`text-[11px] font-bold ${colors.text} truncate`}>
                              {block.base_name}
                            </div>
                            <div className="text-[9px] text-gray-500 mt-0.5">
                              {block.block_count} variant{block.block_count > 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                        <div className={`mt-1.5 text-center font-bold ${colors.sqft} text-xs`}>
                          {fmt(block.total_sqft)}
                        </div>
                        <div className="text-[9px] text-gray-500 uppercase tracking-wide">
                          sq.ft
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {blocksByPrefix.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No block data available
              </div>
            )}
          </div>
        </Card>

        {/* Grouped Blocks by Base Name */}
        <Card className="p-4 sm:p-6 bg-gradient-to-br from-slate-50 to-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-slate-600 p-2.5 rounded-lg">
              <Box className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Grouped Block Production</h2>
              <p className="text-sm text-slate-600">Combined output by base block number</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b-2 border-slate-300 bg-slate-50">
                  <th className="text-center py-3 px-3 text-sm font-semibold text-slate-700">Rank</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-slate-700">Base Block</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-slate-700">Material</th>
                  <th className="py-3 px-4 text-center text-sm font-semibold text-slate-700">Variants</th>
                  <th className="py-3 px-4 text-right text-sm font-semibold text-slate-700">Total Slabs</th>
                  <th className="py-3 px-4 text-right text-sm font-semibold text-slate-700">Total Sq. Ft.</th>
                  <th className="py-3 px-4 text-right text-sm font-semibold text-slate-700">Times Cut</th>
                  <th className="py-3 px-4 text-right text-sm font-semibold text-slate-700">Avg Sqft/Variant</th>
                </tr>
              </thead>
              <tbody>
                {groupedBlocks.map((group, index) => {
                  const rankColors = [
                    'bg-yellow-100 text-yellow-900 border-yellow-400',
                    'bg-gray-300 text-gray-800 border-gray-500', 
                    'bg-orange-200 text-orange-900 border-orange-400'
                  ];
                  const rankColor = index < 3 ? rankColors[index] : 'bg-slate-100 text-slate-900 border-slate-300';
                  const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
                  
                  return (
                    <tr key={`${group.base_name}-${group.material_type}`} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold border-2 ${rankColor}`}>
                          {rankEmoji}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-base">{group.base_name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {group.blocks.sort().join(', ')}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                          {group.material_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 text-slate-800 font-bold text-sm">
                          {group.block_count}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 text-base">{fmt(group.total_slabs)}</td>
                      <td className="py-3 px-4 text-right font-bold text-green-600 text-base">{fmt(group.total_sqft)}</td>
                      <td className="py-3 px-4 text-right font-semibold text-blue-600">{group.times_processed}×</td>
                      <td className="py-3 px-4 text-right text-slate-600 font-medium">
                        {fmt(Math.round(group.total_sqft / group.block_count))}
                      </td>
                    </tr>
                  );
                })}
                {groupedBlocks.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      No grouped block data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
