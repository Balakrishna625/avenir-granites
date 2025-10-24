"use client"

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { BarChart3, TrendingUp, Package, DollarSign, Users, Layers } from 'lucide-react'

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
  customers?: { name: string }
  sale_items?: Array<{
    material_name: string
    slabs_count: number
    square_feet: number
    total_amount: number
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
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7))

  useEffect(() => {
    fetchSales()
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

  // Filter sales by selected month
  const filteredSales = sales.filter(sale => {
    const saleMonth = sale.sale_date.substring(0, 7)
    return saleMonth === selectedMonth
  })

  // Calculate analytics
  const totalSales = filteredSales.length
  const totalSlabs = filteredSales.reduce((sum, sale) => sum + sale.total_slabs, 0)
  const totalSqft = filteredSales.reduce((sum, sale) => sum + sale.total_sqft, 0)
  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.gross_total, 0)
  const totalRTGS = filteredSales.reduce((sum, sale) => sum + sale.rtgs_expected, 0)
  const totalCash = filteredSales.reduce((sum, sale) => sum + sale.cash_expected, 0)

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

  // Material-wise analytics
  const materialStats = filteredSales.reduce((acc, sale) => {
    sale.sale_items?.forEach(item => {
      if (!acc[item.material_name]) {
        acc[item.material_name] = {
          slabs: 0,
          sqft: 0,
          revenue: 0
        }
      }
      acc[item.material_name].slabs += item.slabs_count
      acc[item.material_name].sqft += item.square_feet
      acc[item.material_name].revenue += item.total_amount
    })
    return acc
  }, {} as Record<string, { slabs: number; sqft: number; revenue: number }>)

  const topMaterials = Object.entries(materialStats)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sales Analytics</h1>
          <p className="text-gray-600 text-sm mt-1">Analyze sales performance and trends</p>
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
        <div className="text-center py-12 text-gray-500">Loading analytics...</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
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
                  <p className="text-sm text-gray-600">Total Slabs</p>
                  <p className="text-2xl font-bold mt-1">{totalSlabs}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-lg">
                  <Layers className="w-6 h-6 text-purple-600" />
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

          {/* Revenue Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
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
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Top Customers */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold">Top 5 Customers</h2>
              </div>
              {topCustomers.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No customer data available</p>
              ) : (
                <div className="space-y-3">
                  {topCustomers.map(([customer, stats], index) => (
                    <div key={customer} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 text-blue-700 font-bold w-8 h-8 rounded-full flex items-center justify-center text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{customer}</p>
                          <p className="text-xs text-gray-600">{stats.sales} sales • {stats.slabs} slabs • {stats.sqft.toFixed(2)} sq.ft.</p>
                        </div>
                      </div>
                      <p className="font-bold text-green-700">₹{formatIndianNumber(stats.revenue)}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Top Materials */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Layers className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold">Top 5 Materials</h2>
              </div>
              {topMaterials.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No material data available</p>
              ) : (
                <div className="space-y-3">
                  {topMaterials.map(([material, stats], index) => (
                    <div key={material} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="bg-purple-100 text-purple-700 font-bold w-8 h-8 rounded-full flex items-center justify-center text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{material}</p>
                          <p className="text-xs text-gray-600">{stats.slabs} slabs • {stats.sqft.toFixed(2)} sq.ft.</p>
                        </div>
                      </div>
                      <p className="font-bold text-green-700">₹{formatIndianNumber(stats.revenue)}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Detailed Sales Table */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Sales Details</h2>
            {filteredSales.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No sales for selected month</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Date</th>
                      <th className="px-3 py-2 text-left font-medium">Sale #</th>
                      <th className="px-3 py-2 text-left font-medium">Customer</th>
                      <th className="px-3 py-2 text-right font-medium">Slabs</th>
                      <th className="px-3 py-2 text-right font-medium">Sq. Ft.</th>
                      <th className="px-3 py-2 text-right font-medium">Subtotal</th>
                      <th className="px-3 py-2 text-right font-medium">Charges</th>
                      <th className="px-3 py-2 text-right font-medium">Gross Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.map((sale) => (
                      <tr key={sale.id} className="border-t hover:bg-gray-50">
                        <td className="px-3 py-2">{new Date(sale.sale_date).toLocaleDateString('en-IN')}</td>
                        <td className="px-3 py-2 font-medium">{sale.sale_number}</td>
                        <td className="px-3 py-2">{sale.customers?.name}</td>
                        <td className="px-3 py-2 text-right">{sale.total_slabs}</td>
                        <td className="px-3 py-2 text-right">{sale.total_sqft.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">₹{formatIndianNumber(sale.subtotal_amount)}</td>
                        <td className="px-3 py-2 text-right">
                          ₹{formatIndianNumber(sale.tax_amount + sale.mining_amount + sale.loading_amount)}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-green-700">
                          ₹{formatIndianNumber(sale.gross_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-100 border-t-2 font-bold">
                    <tr>
                      <td className="px-3 py-2" colSpan={3}>Total</td>
                      <td className="px-3 py-2 text-right">{totalSlabs}</td>
                      <td className="px-3 py-2 text-right">{totalSqft.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">
                        ₹{formatIndianNumber(filteredSales.reduce((sum, s) => sum + s.subtotal_amount, 0))}
                      </td>
                      <td className="px-3 py-2 text-right">
                        ₹{formatIndianNumber(filteredSales.reduce((sum, s) => sum + s.tax_amount + s.mining_amount + s.loading_amount, 0))}
                      </td>
                      <td className="px-3 py-2 text-right text-green-700">
                        ₹{formatIndianNumber(totalRevenue)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
