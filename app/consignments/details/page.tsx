"use client"

import { useState, useEffect } from 'react'
import { Plus, X, Save, Package, DollarSign, TrendingUp, Blocks } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { AppLayout } from '@/components/AppLayout'

interface BlockRow {
  id: string
  block_name: string
  net_measurement: string
  gross_measurement: string
}

interface Consignment {
  id: string
  consignment_number: string
  quarry_name: string
  purchase_date: string
  total_blocks_count: number
  total_net_measurement: number
  total_gross_measurement: number
  purchase_cost: number
  transport_cost: number
  loading_cost: number
  quarry_commission: number
  other_charges: number
  total_expenditure: number
  granite_blocks?: Array<{
    id: string
    block_no: string
    net_measurement: number
    gross_measurement: number
  }>
}

interface Stats {
  totalConsignments: number
  totalMoneySpent: number
  totalBlocks: number
  totalNetMeasurement: number
  totalGrossMeasurement: number
  quarryBreakdown: Array<{
    quarry: string
    count: number
    totalSpent: number
    totalBlocks: number
  }>
}

const QUARRIES = ['Sai lakshmi', 'Sambrajyam', 'Burgandy', 'Gokanakonda', 'Ummadivaram']

function formatIndianNumber(num: number): string {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  }).format(num)
}

export default function ConsignmentDetailsPage() {
  const [showAddForm, setShowAddForm] = useState(false)
  const [consignments, setConsignments] = useState<Consignment[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Filters
  const currentDate = new Date()
  const [selectedMonth, setSelectedMonth] = useState(String(currentDate.getMonth() + 1))
  const [selectedYear, setSelectedYear] = useState(String(currentDate.getFullYear()))
  const [selectedQuarry, setSelectedQuarry] = useState('all')

  // Form data
  const [formData, setFormData] = useState({
    purchase_date: new Date().toISOString().split('T')[0],
    quarry_name: '',
    total_net_measurement: '',
    total_gross_measurement: '',
    purchase_cost: '',
    transport_cost: '',
    loading_cost: '',
    quarry_commission: '',
    other_charges: ''
  })

  const [blockRows, setBlockRows] = useState<BlockRow[]>([
    { id: '1', block_name: 'AVG-', net_measurement: '', gross_measurement: '' }
  ])

  // Fetch consignments
  useEffect(() => {
    fetchConsignments()
    fetchStats()
  }, [selectedMonth, selectedYear, selectedQuarry])

  const fetchConsignments = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        month: selectedMonth,
        year: selectedYear
      })
      if (selectedQuarry !== 'all') {
        params.append('quarry', selectedQuarry)
      }

      const response = await fetch(`/api/consignments-new?${params}`)
      const data = await response.json()
      setConsignments(data || [])
    } catch (error) {
      console.error('Error fetching consignments:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams({
        month: selectedMonth,
        year: selectedYear
      })

      const response = await fetch(`/api/consignments-new/stats?${params}`)
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleAddBlockRow = () => {
    setBlockRows([
      ...blockRows,
      {
        id: Date.now().toString(),
        block_name: 'AVG-',
        net_measurement: '',
        gross_measurement: ''
      }
    ])
  }

  const handleRemoveBlockRow = (id: string) => {
    if (blockRows.length > 1) {
      setBlockRows(blockRows.filter(row => row.id !== id))
    }
  }

  const handleBlockRowChange = (id: string, field: keyof BlockRow, value: string) => {
    setBlockRows(blockRows.map(row =>
      row.id === id ? { ...row, [field]: value } : row
    ))
  }

  const calculateTotals = () => {
    const totalBlocks = blockRows.filter(row => row.block_name.trim() !== 'AVG-' && row.block_name.trim() !== '').length
    const totalNet = blockRows.reduce((sum, row) => sum + (parseFloat(row.net_measurement) || 0), 0)
    const totalGross = blockRows.reduce((sum, row) => sum + (parseFloat(row.gross_measurement) || 0), 0)
    return { totalBlocks, totalNet, totalGross }
  }

  const handleSaveConsignment = async () => {
    // Validation
    if (!formData.quarry_name) {
      alert('Please select a quarry')
      return
    }

    const validBlocks = blockRows.filter(
      row => row.block_name.trim() !== 'AVG-' && 
             row.block_name.trim() !== '' &&
             row.net_measurement !== '' &&
             row.gross_measurement !== ''
    )

    if (validBlocks.length === 0) {
      alert('Please add at least one block with measurements')
      return
    }

    setSaving(true)
    try {
      const { totalBlocks, totalNet, totalGross } = calculateTotals()

      const payload = {
        purchase_date: formData.purchase_date,
        quarry_name: formData.quarry_name,
        total_blocks_count: totalBlocks,
        total_net_measurement: totalNet,
        total_gross_measurement: totalGross,
        purchase_cost: parseFloat(formData.purchase_cost) || 0,
        transport_cost: parseFloat(formData.transport_cost) || 0,
        loading_cost: parseFloat(formData.loading_cost) || 0,
        quarry_commission: parseFloat(formData.quarry_commission) || 0,
        other_charges: parseFloat(formData.other_charges) || 0,
        blocks: validBlocks
      }

      const response = await fetch('/api/consignments-new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (response.ok) {
        alert('Consignment saved successfully!')
        setShowAddForm(false)
        resetForm()
        fetchConsignments()
        fetchStats()
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Error saving consignment:', error)
      alert('Failed to save consignment')
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setFormData({
      purchase_date: new Date().toISOString().split('T')[0],
      quarry_name: '',
      total_net_measurement: '',
      total_gross_measurement: '',
      purchase_cost: '',
      transport_cost: '',
      loading_cost: '',
      quarry_commission: '',
      other_charges: ''
    })
    setBlockRows([
      { id: '1', block_name: 'AVG-', net_measurement: '', gross_measurement: '' }
    ])
  }

  const { totalBlocks, totalNet, totalGross } = calculateTotals()

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Consignment Details</h1>
            <p className="text-gray-600">Manage granite block consignments from quarries</p>
          </div>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2"
          >
            {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showAddForm ? 'Cancel' : 'Add Consignment'}
          </Button>
        </div>

        {/* Statistics Tiles */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Consignments</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalConsignments}</p>
                </div>
                <Package className="w-10 h-10 text-blue-500" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Money Spent</p>
                  <p className="text-2xl font-bold text-gray-900">₹{formatIndianNumber(stats.totalMoneySpent)}</p>
                </div>
                <DollarSign className="w-10 h-10 text-green-500" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Blocks</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalBlocks}</p>
                </div>
                <Blocks className="w-10 h-10 text-purple-500" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Net Measurement</p>
                  <p className="text-2xl font-bold text-gray-900">{formatIndianNumber(stats.totalNetMeasurement)} m</p>
                </div>
                <TrendingUp className="w-10 h-10 text-orange-500" />
              </div>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <option key={month} value={month}>
                    {new Date(2000, month - 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                {Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quarry</label>
              <select
                value={selectedQuarry}
                onChange={(e) => setSelectedQuarry(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="all">All Quarries</option>
                {QUARRIES.map(quarry => (
                  <option key={quarry} value={quarry}>{quarry}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Add Consignment Form */}
        {showAddForm && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Add New Consignment</h2>

            <div className="space-y-6">
              {/* Basic Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Purchase Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quarry Name <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.quarry_name}
                    onChange={(e) => setFormData({ ...formData, quarry_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select Quarry</option>
                    {QUARRIES.map(quarry => (
                      <option key={quarry} value={quarry}>{quarry}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Measurements (Auto-calculated but can be overridden) */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Total Measurements (Auto-calculated)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Total Blocks</label>
                    <Input
                      type="number"
                      value={totalBlocks}
                      disabled
                      className="bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Total Net Measurement (m)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={totalNet.toFixed(2)}
                      disabled
                      className="bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Total Gross Measurement (m)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={totalGross.toFixed(2)}
                      disabled
                      className="bg-gray-100"
                    />
                  </div>
                </div>
              </div>

              {/* Cost Details */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Cost Details (₹)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Purchase Cost</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.purchase_cost}
                      onChange={(e) => setFormData({ ...formData, purchase_cost: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Transport Cost</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.transport_cost}
                      onChange={(e) => setFormData({ ...formData, transport_cost: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Loading Cost</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.loading_cost}
                      onChange={(e) => setFormData({ ...formData, loading_cost: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Quarry Commission</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.quarry_commission}
                      onChange={(e) => setFormData({ ...formData, quarry_commission: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Other Charges</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.other_charges}
                      onChange={(e) => setFormData({ ...formData, other_charges: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="w-full">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Total Expenditure</label>
                      <div className="px-3 py-2 bg-green-50 border border-green-300 rounded-md font-semibold text-green-700">
                        ₹{formatIndianNumber(
                          (parseFloat(formData.purchase_cost) || 0) +
                          (parseFloat(formData.transport_cost) || 0) +
                          (parseFloat(formData.loading_cost) || 0) +
                          (parseFloat(formData.quarry_commission) || 0) +
                          (parseFloat(formData.other_charges) || 0)
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Block Details */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Block Details</h3>
                  <Button
                    onClick={handleAddBlockRow}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Block
                  </Button>
                </div>

                <div className="space-y-2">
                  {blockRows.map((row, index) => (
                    <div key={row.id} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5">
                        {index === 0 && (
                          <label className="block text-xs text-gray-600 mb-1">Block Name</label>
                        )}
                        <Input
                          type="text"
                          value={row.block_name}
                          onChange={(e) => handleBlockRowChange(row.id, 'block_name', e.target.value)}
                          placeholder="AVG-1"
                        />
                      </div>
                      <div className="col-span-3">
                        {index === 0 && (
                          <label className="block text-xs text-gray-600 mb-1">Net Meas. (m)</label>
                        )}
                        <Input
                          type="number"
                          step="0.01"
                          value={row.net_measurement}
                          onChange={(e) => handleBlockRowChange(row.id, 'net_measurement', e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="col-span-3">
                        {index === 0 && (
                          <label className="block text-xs text-gray-600 mb-1">Gross Meas. (m)</label>
                        )}
                        <Input
                          type="number"
                          step="0.01"
                          value={row.gross_measurement}
                          onChange={(e) => handleBlockRowChange(row.id, 'gross_measurement', e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        {index === 0 && <div className="h-6"></div>}
                        {blockRows.length > 1 && (
                          <Button
                            onClick={() => handleRemoveBlockRow(row.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  onClick={() => {
                    setShowAddForm(false)
                    resetForm()
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveConsignment}
                  disabled={saving}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Consignment'}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Consignments List */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Consignments</h2>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : consignments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No consignments found for the selected period
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">CSG No.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Quarry</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Blocks</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Net (m)</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Gross (m)</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Total Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {consignments.map((consignment) => (
                    <tr key={consignment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {consignment.consignment_number}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {new Date(consignment.purchase_date).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{consignment.quarry_name}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">
                        {consignment.total_blocks_count}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">
                        {formatIndianNumber(consignment.total_net_measurement)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">
                        {formatIndianNumber(consignment.total_gross_measurement)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-green-700">
                        ₹{formatIndianNumber(consignment.total_expenditure)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  )
}
