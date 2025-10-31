"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Save, Package, DollarSign, TrendingUp, Blocks, Edit2, Trash2, BarChart3 } from 'lucide-react'
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
  const router = useRouter()
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingConsignment, setEditingConsignment] = useState<Consignment | null>(null)
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
    id: '',
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
        ...(editingConsignment && { id: formData.id }),
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
        method: editingConsignment ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (response.ok) {
        alert(`Consignment ${editingConsignment ? 'updated' : 'saved'} successfully!`)
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
      id: '',
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
    setShowAddForm(false)
    setEditingConsignment(null)
  }

  const handleEdit = (consignment: Consignment) => {
    setEditingConsignment(consignment)
    setFormData({
      id: consignment.id,
      purchase_date: consignment.purchase_date || new Date().toISOString().split('T')[0],
      quarry_name: consignment.quarry_name || '',
      total_net_measurement: consignment.total_net_measurement?.toString() || '',
      total_gross_measurement: consignment.total_gross_measurement?.toString() || '',
      purchase_cost: consignment.purchase_cost?.toString() || '',
      transport_cost: consignment.transport_cost?.toString() || '',
      loading_cost: consignment.loading_cost?.toString() || '',
      quarry_commission: consignment.quarry_commission?.toString() || '',
      other_charges: consignment.other_charges?.toString() || ''
    })
    setBlockRows(
      consignment.granite_blocks?.map((block, index) => ({
        id: String(index + 1),
        block_name: block.block_no,
        net_measurement: block.net_measurement?.toString() || '',
        gross_measurement: block.gross_measurement?.toString() || ''
      })) || [{ id: '1', block_name: 'AVG-', net_measurement: '', gross_measurement: '' }]
    )
    setShowAddForm(true)
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  }

  const handleDelete = async (consignmentId: string) => {
    if (!confirm('Are you sure you want to delete this consignment? This will also delete all associated blocks.')) {
      return
    }

    try {
      const response = await fetch(`/api/consignments-new?id=${consignmentId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete consignment')
      }

      alert('Consignment deleted successfully')
      fetchConsignments()
      fetchStats()
    } catch (error) {
      console.error('Error deleting consignment:', error)
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`)
    }
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
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Actions</th>
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
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            onClick={() => router.push(`/consignments/analytics?id=${consignment.id}`)}
                            variant="outline"
                            size="sm"
                            className="text-purple-600 hover:text-purple-800"
                            title="View Analytics"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleEdit(consignment)}
                            variant="outline"
                            size="sm"
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleDelete(consignment.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-800"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Add/Edit Consignment Form */}
        {showAddForm && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6">
              {editingConsignment ? 'Edit Consignment' : 'Add New Consignment'}
            </h2>

            <div className="space-y-8">
              {/* Section 1: Basic Information */}
              <div className="border-b pb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Purchase Date <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={formData.purchase_date}
                      onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                      className="text-base"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quarry Name <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.quarry_name}
                      onChange={(e) => setFormData({ ...formData, quarry_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-base"
                    >
                      <option value="">Select Quarry</option>
                      {QUARRIES.map(quarry => (
                        <option key={quarry} value={quarry}>{quarry}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Block Details */}
              <div className="border-b pb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    <Blocks className="w-5 h-5 text-purple-600" />
                    Block Details
                  </h3>
                  <Button
                    onClick={handleAddBlockRow}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Block
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-12 gap-3 text-xs font-medium text-gray-600 px-2">
                    <div className="col-span-5">Block Name</div>
                    <div className="col-span-3 text-right">Net (m)</div>
                    <div className="col-span-3 text-right">Gross (m)</div>
                    <div className="col-span-1"></div>
                  </div>

                  {blockRows.map((row, index) => (
                    <div key={row.id} className="grid grid-cols-12 gap-3 items-center bg-gray-50 p-3 rounded-lg">
                      <div className="col-span-5">
                        <Input
                          value={row.block_name}
                          onChange={(e) => handleBlockRowChange(row.id, 'block_name', e.target.value.toUpperCase())}
                          placeholder="AVG-XXX"
                          className="font-mono"
                        />
                      </div>
                      <div className="col-span-3">
                        <Input
                          type="number"
                          step="0.01"
                          value={row.net_measurement}
                          onChange={(e) => handleBlockRowChange(row.id, 'net_measurement', e.target.value)}
                          placeholder="0.00"
                          className="text-right"
                        />
                      </div>
                      <div className="col-span-3">
                        <Input
                          type="number"
                          step="0.01"
                          value={row.gross_measurement}
                          onChange={(e) => handleBlockRowChange(row.id, 'gross_measurement', e.target.value)}
                          placeholder="0.00"
                          className="text-right"
                        />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        {blockRows.length > 1 && (
                          <Button
                            onClick={() => handleRemoveBlockRow(row.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-800 p-1"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Auto-calculated Totals */}
                <div className="mt-4 bg-blue-50 p-4 rounded-lg">
                  <p className="text-xs font-medium text-gray-600 mb-3">Summary (Auto-calculated)</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Total Blocks</label>
                      <Input
                        type="number"
                        value={totalBlocks}
                        disabled
                        className="bg-white font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Total Net (m)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={totalNet.toFixed(2)}
                        disabled
                        className="bg-white font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Total Gross (m)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={totalGross.toFixed(2)}
                        disabled
                        className="bg-white font-semibold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Cost Details */}
              <div className="border-b pb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Cost Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Cost</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">₹</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.purchase_cost}
                        onChange={(e) => setFormData({ ...formData, purchase_cost: e.target.value })}
                        placeholder="0.00"
                        className="pl-7"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Transport Cost</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">₹</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.transport_cost}
                        onChange={(e) => setFormData({ ...formData, transport_cost: e.target.value })}
                        placeholder="0.00"
                        className="pl-7"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Loading Cost</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">₹</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.loading_cost}
                        onChange={(e) => setFormData({ ...formData, loading_cost: e.target.value })}
                        placeholder="0.00"
                        className="pl-7"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quarry Commission</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">₹</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.quarry_commission}
                        onChange={(e) => setFormData({ ...formData, quarry_commission: e.target.value })}
                        placeholder="0.00"
                        className="pl-7"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Other Charges</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">₹</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.other_charges}
                        onChange={(e) => setFormData({ ...formData, other_charges: e.target.value })}
                        placeholder="0.00"
                        className="pl-7"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Total Expenditure</label>
                    <div className="px-4 py-2.5 bg-green-50 border-2 border-green-300 rounded-md font-bold text-green-700 text-lg">
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

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  onClick={() => {
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
                  {saving ? (editingConsignment ? 'Updating...' : 'Saving...') : (editingConsignment ? 'Update Consignment' : 'Save Consignment')}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}
