"use client"

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { BarChart3, TrendingUp, Package, DollarSign, Users, Layers, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronUp } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { useSessionMonthString } from '@/hooks/useSessionMonth'

interface Sale {
  id: string
  sale_number: string
  customer_id: string
  sale_date: string
  total_slabs: number
  total_sqft: number
  subtotal_amount: number
  tax_amount: number
  mining_amount: number
  loading_amount: number
  gross_total: number
  rtgs_expected: number
  cash_expected: number
  remarks?: string
  official_bill_items?: Array<{
    material_name: string
    square_feet: number
    rate_per_sqft: number
    total_amount: number
  }>
  official_tax?: number
  official_total?: number
  customers?: { name: string }
  sale_items?: Array<{
    material_name: string
    slabs_count: number
    square_feet: number
    tons?: number
    is_tonnage_material?: boolean
    total_amount: number
    rate_per_sqft?: number
    rate_per_ton?: number
    remarks?: string
  }>
}

function formatIndianNumber(num: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num)
}

export default function SalesAnalyticsPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const { selectedMonth, setSelectedMonth } = useSessionMonthString('sales-analytics')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc') // desc = newest first (default)
  const [filterCustomerId, setFilterCustomerId] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'actual' | 'official'>('actual')
  const [expandedSales, setExpandedSales] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchSales()
    fetchCustomers()
  }, [])

  const fetchSales = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/sales')
      if (response.ok) {
        const data = await response.json()
        setSales(data)
      }
    } catch (error) {
      console.error('Error fetching sales:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers')
      if (response.ok) {
        const data = await response.json()
        setCustomers(data)
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
    }
  }

  // Filter and sort sales by selected month, customer, and view mode
  const filteredSales = sales
    .filter(sale => {
      const saleMonth = sale.sale_date.substring(0, 7)
      const matchesMonth = saleMonth === selectedMonth
      
      // Filter by customer if not 'all'
      const matchesCustomer = filterCustomerId === 'all' || sale.customer_id === filterCustomerId
      
      // Filter by official bill view - only show sales with non-zero official bill sq.ft
      let matchesViewMode = true
      if (viewMode === 'official') {
        const officialBillItems = sale.official_bill_items || []
        const officialSqft = officialBillItems.reduce((sum: number, item: any) => sum + (Number(item.square_feet) || 0), 0)
        matchesViewMode = officialSqft > 0
      }
      
      return matchesMonth && matchesCustomer && matchesViewMode
    })
    .sort((a, b) => {
      const dateA = new Date(a.sale_date).getTime()
      const dateB = new Date(b.sale_date).getTime()
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA
    })

  // Toggle sort order function
  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
  }

  // Calculate analytics
  const totalSales = filteredSales.length
  const totalSlabs = filteredSales.reduce((sum, sale) => sum + sale.total_slabs, 0)
  const totalSqft = filteredSales.reduce((sum, sale) => sum + sale.total_sqft, 0)
  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.gross_total, 0)
  const totalRTGS = filteredSales.reduce((sum, sale) => sum + sale.rtgs_expected, 0)
  const totalCash = filteredSales.reduce((sum, sale) => sum + sale.cash_expected, 0)

  // Calculate tonnage metrics
  const totalTons = filteredSales.reduce((sum, sale) => {
    const tonsSold = sale.sale_items?.reduce((itemSum, item) => {
      return itemSum + (item.is_tonnage_material ? (item.tons || 0) : 0)
    }, 0) || 0
    return sum + tonsSold
  }, 0)

  const totalSqftFromTons = filteredSales.reduce((sum, sale) => {
    const sqftFromTons = sale.sale_items?.reduce((itemSum, item) => {
      return itemSum + (item.is_tonnage_material ? (item.square_feet || 0) : 0)
    }, 0) || 0
    return sum + sqftFromTons
  }, 0)

  // Calculate official bill metrics
  const totalOfficialSqft = filteredSales.reduce((sum, sale) => {
    const officialItems = sale.official_bill_items || []
    return sum + officialItems.reduce((itemSum, item) => itemSum + (item.square_feet || 0), 0)
  }, 0)
  
  const totalOfficialAmount = filteredSales.reduce((sum, sale) => sum + (sale.official_total || 0), 0)
  
  // Calculate difference metrics
  const sqftDifference = totalSqft - totalOfficialSqft
  const amountDifference = totalRevenue - totalOfficialAmount

  // Customer-wise analytics
  const customerStats = filteredSales.reduce((acc, sale) => {
    const customerName = sale.customers?.name || 'Unknown'
    if (!acc[customerName]) {
      acc[customerName] = {
        sales: 0,
        slabs: 0,
        sqft: 0,
        revenue: 0
      }
    }
    acc[customerName].sales += 1
    acc[customerName].slabs += sale.total_slabs
    acc[customerName].sqft += sale.total_sqft
    acc[customerName].revenue += sale.gross_total
    return acc
  }, {} as Record<string, { sales: number; slabs: number; sqft: number; revenue: number }>)

  const topCustomers = Object.entries(customerStats)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5)

  // Material-wise analytics (actual sales)
  const materialStats = filteredSales.reduce((acc, sale) => {
    sale.sale_items?.forEach(item => {
      if (!acc[item.material_name]) {
        acc[item.material_name] = {
          slabs: 0,
          sqft: 0,
          tons: 0,
          revenue: 0,
          count: 0 // for average calculation
        }
      }
      acc[item.material_name].slabs += item.slabs_count
      acc[item.material_name].sqft += item.square_feet
      acc[item.material_name].tons += item.is_tonnage_material ? (item.tons || 0) : 0
      acc[item.material_name].revenue += item.total_amount
      acc[item.material_name].count += 1
    })
    return acc
  }, {} as Record<string, { slabs: number; sqft: number; tons: number; revenue: number; count: number }>)

  // Calculate average price per material
  const materialsWithAvgPrice = Object.entries(materialStats).map(([material, stats]) => ({
    material,
    ...stats,
    avgPrice: stats.sqft > 0 ? stats.revenue / stats.sqft : 0
  }))

  const topMaterialsBySqft = materialsWithAvgPrice
    .sort((a, b) => b.sqft - a.sqft)
    .slice(0, 10)

  const materialsByAvgPrice = materialsWithAvgPrice
    .sort((a, b) => b.avgPrice - a.avgPrice)
    .slice(0, 10)

  return (
    <AppLayout>
      <div className="min-h-screen w-full bg-gray-50 p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Sales Analytics</h1>
          <p className="text-gray-600 text-sm mt-1">Analyze sales performance and trends</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Month:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading analytics...</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Sales</p>
                  <p className="text-2xl font-bold mt-1">{totalSales}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Rate We Sold Overall This Month</p>
                  <p className="text-2xl font-bold mt-1">₹{totalSqft > 0 ? (totalRevenue / totalSqft).toFixed(2) : '0.00'}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Sq. Ft.</p>
                  <p className="text-2xl font-bold mt-1">{totalSqft.toFixed(2)}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </Card>
          </div>

          {/* Tonnage Metrics */}
          {totalTons > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Tons Sold</p>
                    <p className="text-2xl font-bold mt-1 text-orange-700">{totalTons.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-1">Tonnage materials only</p>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <Package className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Sq.Ft from Tons</p>
                    <p className="text-2xl font-bold mt-1 text-teal-700">{totalSqftFromTons.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-1">Square feet portion</p>
                  </div>
                  <div className="bg-teal-100 p-3 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-teal-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg Sq.Ft per Ton</p>
                    <p className="text-2xl font-bold mt-1 text-indigo-700">
                      {totalTons > 0 ? (totalSqftFromTons / totalTons).toFixed(2) : '0.00'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Conversion ratio</p>
                  </div>
                  <div className="bg-indigo-100 p-3 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-indigo-600" />
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Revenue Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-xl font-bold mt-1 text-green-700">₹{formatIndianNumber(totalRevenue)}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">RTGS Expected</p>
                  <p className="text-xl font-bold mt-1 text-blue-700">₹{formatIndianNumber(totalRTGS)}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Cash Expected</p>
                  <p className="text-xl font-bold mt-1 text-amber-700">₹{formatIndianNumber(totalCash)}</p>
                </div>
                <div className="bg-amber-100 p-3 rounded-lg">
                  <DollarSign className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </Card>
          </div>

          {/* Top Customers & Materials */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Top Materials by Sq.Ft Sold */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Layers className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold">Top Materials Sold (Sq.Ft)</h2>
              </div>
              {topMaterialsBySqft.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No material data available</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">#</th>
                        <th className="px-3 py-2 text-left font-medium">Material</th>
                        <th className="px-3 py-2 text-right font-medium">Sq.Ft</th>
                        <th className="px-3 py-2 text-right font-medium">Slabs</th>
                        <th className="px-3 py-2 text-right font-medium">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topMaterialsBySqft.map((item, index) => (
                        <tr key={item.material} className="border-t hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <div className="bg-purple-100 text-purple-700 font-bold w-6 h-6 rounded-full flex items-center justify-center text-xs">
                              {index + 1}
                            </div>
                          </td>
                          <td className="px-3 py-2 font-medium">{item.material}</td>
                          <td className="px-3 py-2 text-right font-semibold">{item.sqft.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{item.slabs}</td>
                          <td className="px-3 py-2 text-right text-green-700">₹{formatIndianNumber(item.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Average Price per Material */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold">Avg Price per Sq.Ft by Material</h2>
              </div>
              {materialsByAvgPrice.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No material data available</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">#</th>
                        <th className="px-3 py-2 text-left font-medium">Material</th>
                        <th className="px-3 py-2 text-right font-medium">Avg Price</th>
                        <th className="px-3 py-2 text-right font-medium">Sq.Ft Sold</th>
                        <th className="px-3 py-2 text-right font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materialsByAvgPrice.map((item, index) => (
                        <tr key={item.material} className="border-t hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <div className="bg-green-100 text-green-700 font-bold w-6 h-6 rounded-full flex items-center justify-center text-xs">
                              {index + 1}
                            </div>
                          </td>
                          <td className="px-3 py-2 font-medium">{item.material}</td>
                          <td className="px-3 py-2 text-right font-bold text-green-700">₹{item.avgPrice.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{item.sqft.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right">₹{formatIndianNumber(item.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          {/* Actual vs Official Material Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <div className="text-xs text-gray-600 mb-1">ACTUAL MATERIAL SOLD</div>
              <div className="text-2xl font-bold text-blue-900">
                {totalSqft.toFixed(2)} <span className="text-sm text-gray-500">sq.ft</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">{totalSlabs} slabs</div>
            </Card>

            <Card className="p-4">
              <div className="text-xs text-gray-600 mb-1">OFFICIAL MATERIAL SOLD</div>
              <div className="text-2xl font-bold text-purple-900">
                {totalOfficialSqft.toFixed(2)} <span className="text-sm text-gray-500">sq.ft</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">As per official bills</div>
            </Card>

            <Card className="p-4">
              <div className="text-xs text-gray-600 mb-1">MATERIAL DIFFERENCE</div>
              <div className={`text-2xl font-bold ${sqftDifference >= 0 ? 'text-orange-600' : 'text-red-600'}`}>
                {sqftDifference >= 0 ? '+' : ''}{sqftDifference.toFixed(2)} <span className="text-sm text-gray-500">sq.ft</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {((sqftDifference / totalSqft) * 100).toFixed(1)}% {sqftDifference >= 0 ? 'more' : 'less'} than official
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-xs text-gray-600 mb-1">AMOUNT DIFFERENCE</div>
              <div className={`text-2xl font-bold ${amountDifference >= 0 ? 'text-orange-600' : 'text-red-600'}`}>
                ₹{formatIndianNumber(Math.abs(amountDifference))}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {((amountDifference / totalRevenue) * 100).toFixed(1)}% {amountDifference >= 0 ? 'more' : 'less'} than official
              </div>
            </Card>
          </div>

          {/* Official Bill Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <div className="text-sm font-medium text-blue-900 mb-2">ACTUAL SALE METRICS</div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700">Total Slabs:</span>
                  <span className="font-bold text-blue-900">{totalSlabs}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700">Total Sq.Ft:</span>
                  <span className="font-bold text-blue-900">{totalSqft.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700">Avg Rate/Sq.Ft:</span>
                  <span className="font-bold text-blue-900">₹{totalSqft > 0 ? (totalRevenue / totalSqft).toFixed(2) : '0.00'}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-blue-300">
                  <span className="text-blue-700">Total Amount:</span>
                  <span className="font-bold text-blue-900 text-base">₹{formatIndianNumber(totalRevenue)}</span>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <div className="text-sm font-medium text-purple-900 mb-2">OFFICIAL BILL METRICS</div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-purple-700">Total Slabs:</span>
                  <span className="font-bold text-purple-900">N/A</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-purple-700">Total Sq.Ft:</span>
                  <span className="font-bold text-purple-900">{totalOfficialSqft.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-purple-700">Avg Rate/Sq.Ft:</span>
                  <span className="font-bold text-purple-900">₹{totalOfficialSqft > 0 ? (totalOfficialAmount / totalOfficialSqft).toFixed(2) : '0.00'}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-purple-300">
                  <span className="text-purple-700">Total Amount:</span>
                  <span className="font-bold text-purple-900 text-base">₹{formatIndianNumber(totalOfficialAmount)}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Detailed Sales Table */}
          <Card className="p-4 sm:p-6">
            <div className="flex flex-col gap-3 mb-4">
              <h2 className="text-lg font-semibold">
                Sales Details
                {filterCustomerId !== 'all' && (
                  <span className="ml-2 text-sm font-normal text-blue-600">
                    ({filteredSales.length} filtered)
                  </span>
                )}
              </h2>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Customer:</label>
                  <select
                    value={filterCustomerId}
                    onChange={(e) => setFilterCustomerId(e.target.value)}
                    className="flex-1 sm:flex-none border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Customers</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={toggleSortOrder}
                  className="flex items-center justify-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  title={sortOrder === 'asc' ? 'Oldest first (click for newest)' : 'Newest first (click for oldest)'}
                >
                  {sortOrder === 'asc' ? (
                    <>
                      <ArrowUp className="w-4 h-4" />
                      <span>Oldest First</span>
                    </>
                  ) : (
                    <>
                      <ArrowDown className="w-4 h-4" />
                      <span>Newest First</span>
                    </>
                  )}
                </button>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">View:</label>
                  <select
                    value={viewMode}
                    onChange={(e) => setViewMode(e.target.value as 'actual' | 'official')}
                    className="flex-1 sm:flex-none border rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="actual">Actual Sale</option>
                    <option value="official">Official Bill</option>
                  </select>
                </div>
              </div>
            </div>
            {filteredSales.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No sales for selected month</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium w-12">S.No</th>
                      <th className="px-3 py-2 text-center font-medium w-10"></th>
                      <th className="px-3 py-2 text-left font-medium">Date</th>
                      <th className="px-3 py-2 text-left font-medium">Sale #</th>
                      <th className="px-3 py-2 text-left font-medium">Customer</th>
                      {viewMode === 'actual' ? (
                        <>
                          <th className="px-3 py-2 text-right font-medium">Slabs</th>
                          <th className="px-3 py-2 text-right font-medium">Sq. Ft.</th>
                          <th className="px-3 py-2 text-right font-medium">Tons</th>
                          <th className="px-3 py-2 text-right font-medium">Subtotal</th>
                          <th className="px-3 py-2 text-right font-medium">Charges</th>
                          <th className="px-3 py-2 text-right font-medium">Gross Total</th>
                        </>
                      ) : (
                        <>
                          <th className="px-3 py-2 text-left font-medium">Items</th>
                          <th className="px-3 py-2 text-right font-medium">Sq. Ft.</th>
                          <th className="px-3 py-2 text-right font-medium">Official Total</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.map((sale, index) => {
                      const saleTons = sale.sale_items?.reduce((sum, item) => 
                        sum + (item.is_tonnage_material ? (item.tons || 0) : 0), 0) || 0
                      
                      const officialBillItems = sale.official_bill_items || []
                      const officialSqft = officialBillItems.reduce((sum: number, item: any) => sum + (Number(item.square_feet) || 0), 0)
                      const isExpanded = expandedSales.has(sale.id)
                      
                      return (
                      <>
                      <tr key={sale.id} className="border-t hover:bg-gray-50">
                        <td className="px-3 py-2 text-center text-gray-600 font-medium">{index + 1}</td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              const newExpanded = new Set(expandedSales)
                              if (isExpanded) {
                                newExpanded.delete(sale.id)
                              } else {
                                newExpanded.add(sale.id)
                              }
                              setExpandedSales(newExpanded)
                            }}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                            title={isExpanded ? "Collapse details" : "Expand details"}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-gray-600" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-600" />
                            )}
                          </button>
                        </td>
                        <td className="px-3 py-2">{new Date(sale.sale_date).toLocaleDateString('en-IN')}</td>
                        <td className="px-3 py-2 font-medium">{sale.sale_number}</td>
                        <td className="px-3 py-2">{sale.customers?.name}</td>
                        {viewMode === 'actual' ? (
                          <>
                            <td className="px-3 py-2 text-right">{sale.total_slabs}</td>
                            <td className="px-3 py-2 text-right">{sale.total_sqft.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right">
                              {saleTons > 0 ? (
                                <span className="text-orange-600 font-medium">{saleTons.toFixed(2)}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">₹{formatIndianNumber(sale.subtotal_amount)}</td>
                            <td className="px-3 py-2 text-right">
                              ₹{formatIndianNumber(sale.tax_amount + sale.mining_amount + sale.loading_amount)}
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-green-700">
                              ₹{formatIndianNumber(sale.gross_total)}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-3 py-2 text-xs">
                              {officialBillItems.length > 0 ? (
                                <div className="space-y-0.5">
                                  {officialBillItems.map((item: any, idx: number) => (
                                    <div key={idx}>{item.material_name || 'N/A'}</div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400">No items</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">{officialSqft.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right font-bold text-purple-700">
                              ₹{formatIndianNumber(sale.official_total || 0)}
                            </td>
                          </>
                        )}
                      </tr>
                      
                      {/* Expanded Details Row */}
                      {isExpanded && (
                        <tr className="border-t bg-blue-50">
                          <td colSpan={viewMode === 'actual' ? 11 : 8} className="px-3 py-4">
                            <div className="space-y-4">
                              {/* Sale Items */}
                              {sale.sale_items && sale.sale_items.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Sale Items (Actual)</h4>
                                  <div className="bg-white rounded border overflow-hidden">
                                    <table className="w-full text-xs">
                                      <thead className="bg-gray-100">
                                        <tr>
                                          <th className="px-2 py-1.5 text-left font-medium">#</th>
                                          <th className="px-2 py-1.5 text-left font-medium">Material</th>
                                          <th className="px-2 py-1.5 text-right font-medium">Slabs</th>
                                          <th className="px-2 py-1.5 text-right font-medium">Sq.Ft</th>
                                          {sale.sale_items.some((item: any) => item.is_tonnage_material || (item.tons && item.tons > 0)) && (
                                            <th className="px-2 py-1.5 text-right font-medium">Tons</th>
                                          )}
                                          <th className="px-2 py-1.5 text-right font-medium">Rate</th>
                                          <th className="px-2 py-1.5 text-right font-medium">Amount</th>
                                          <th className="px-2 py-1.5 text-left font-medium">Notes</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {sale.sale_items.map((item: any, idx: number) => (
                                          <tr key={idx} className="border-t">
                                            <td className="px-2 py-1.5 text-gray-600">{idx + 1}</td>
                                            <td className="px-2 py-1.5">{item.material_name}</td>
                                            <td className="px-2 py-1.5 text-right">
                                              {item.is_tonnage_material ? '—' : (item.slabs_count || 0)}
                                            </td>
                                            <td className="px-2 py-1.5 text-right">{(item.square_feet || 0).toFixed(2)}</td>
                                            {sale.sale_items.some((item: any) => item.is_tonnage_material || (item.tons && item.tons > 0)) && (
                                              <td className="px-2 py-1.5 text-right">
                                                {item.is_tonnage_material ? (item.tons || 0).toFixed(2) : '—'}
                                              </td>
                                            )}
                                            <td className="px-2 py-1.5 text-right">
                                              {item.is_tonnage_material 
                                                ? `₹${(item.rate_per_ton || 0).toFixed(2)}/ton`
                                                : `₹${(item.rate_per_sqft || 0).toFixed(2)}/sqft`
                                              }
                                            </td>
                                            <td className="px-2 py-1.5 text-right font-medium">₹{formatIndianNumber(item.total_amount)}</td>
                                            <td className="px-2 py-1.5 text-gray-600 text-xs">{item.remarks || ''}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                              
                              {/* Summary */}
                              <div className="bg-white rounded border p-3">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-xs">
                                  <div>
                                    <span className="text-gray-600">Subtotal:</span>
                                    <span className="ml-2 font-semibold">₹{formatIndianNumber(sale.subtotal_amount)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Tax:</span>
                                    <span className="ml-2 font-semibold">₹{formatIndianNumber(sale.tax_amount)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Mining:</span>
                                    <span className="ml-2 font-semibold">₹{formatIndianNumber(sale.mining_amount)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Loading:</span>
                                    <span className="ml-2 font-semibold">₹{formatIndianNumber(sale.loading_amount)}</span>
                                  </div>
                                  <div className="col-span-2 sm:col-span-4 pt-2 border-t mt-1">
                                    <span className="text-gray-700 font-medium">Gross Total:</span>
                                    <span className="ml-2 font-bold text-base">₹{formatIndianNumber(sale.gross_total)}</span>
                                    <span className="ml-4 text-gray-600">RTGS:</span>
                                    <span className="ml-2 font-semibold">₹{formatIndianNumber(sale.rtgs_expected)}</span>
                                    <span className="ml-4 text-gray-600">Cash:</span>
                                    <span className="ml-2 font-semibold">₹{formatIndianNumber(sale.cash_expected)}</span>
                                  </div>
                                  {officialBillItems.length > 0 && (
                                    <div className="col-span-2 sm:col-span-4 pt-2 border-t mt-1">
                                      <span className="text-gray-700 font-medium">Official Total:</span>
                                      <span className="ml-2 font-bold">₹{formatIndianNumber(sale.official_total || 0)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* Remarks */}
                              {sale.remarks && (
                                <div className="bg-white rounded border p-2">
                                  <span className="text-xs text-gray-600">Remarks:</span>
                                  <span className="ml-2 text-xs text-gray-800">{sale.remarks}</span>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                      </>
                    )})}
                  </tbody>
                  <tfoot className="bg-gray-100 border-t-2 font-bold">
                    <tr>
                      <td className="px-3 py-2" colSpan={4}>Total</td>
                      {viewMode === 'actual' ? (
                        <>
                          <td className="px-3 py-2 text-right">{totalSlabs}</td>
                          <td className="px-3 py-2 text-right">{totalSqft.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-orange-600">{totalTons.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right">
                            ₹{formatIndianNumber(filteredSales.reduce((sum, s) => sum + s.subtotal_amount, 0))}
                          </td>
                          <td className="px-3 py-2 text-right">
                            ₹{formatIndianNumber(filteredSales.reduce((sum, s) => sum + s.tax_amount + s.mining_amount + s.loading_amount, 0))}
                          </td>
                          <td className="px-3 py-2 text-right text-green-700">
                            ₹{formatIndianNumber(totalRevenue)}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-2 text-right">—</td>
                          <td className="px-3 py-2 text-right">{totalOfficialSqft.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-purple-700">
                            ₹{formatIndianNumber(totalOfficialAmount)}
                          </td>
                        </>
                      )}
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
      </div>
    </AppLayout>
  )
}
