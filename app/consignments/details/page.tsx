"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Save, Package, DollarSign, TrendingUp, Blocks, Edit2, Trash2, BarChart3, PackagePlus, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { AppLayout } from '@/components/AppLayout'
import { toast, Toaster } from 'sonner'

interface BlockRow {
  id: string
  block_name: string
  gross_measurement: string
  net_measurement: string
}

interface Consignment {
  id: string
  consignment_number: string
  quarry_name: string
  purchase_date: string
  total_blocks_count: number
  net_measurement: number
  purchase_cost_rate: number
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
    block_no: string | null
    gross_measurement: number | null
    net_measurement: number | null
    arrival_status: 'pending' | 'received'
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
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [selectedYear, setSelectedYear] = useState('all')
  const [selectedQuarry, setSelectedQuarry] = useState('all')

  // Form data
  const [formData, setFormData] = useState({
    id: '',
    purchase_date: new Date().toISOString().split('T')[0],
    quarry_name: '',
    net_measurement: '',
    number_of_blocks: '', // Number of blocks to create as placeholders
    purchase_cost_rate: '', // User can enter manually
    production_cost_per_sqft: '', // Production cost per sqft (for all quarries)
    transport_cost: '',
    loading_cost: '',
    quarry_commission: '',
    other_charges: ''
  })

  const [blockRows, setBlockRows] = useState<BlockRow[]>([
    { id: '1', block_name: 'AVG-', gross_measurement: '', net_measurement: '' }
  ])

  // Fetch consignments
  useEffect(() => {
    fetchConsignments()
    fetchStats()
  }, [selectedMonth, selectedYear, selectedQuarry])

  const fetchConsignments = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedMonth !== 'all' && selectedYear !== 'all') {
        params.append('month', selectedMonth)
        params.append('year', selectedYear)
      }
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
      const params = new URLSearchParams()
      if (selectedMonth !== 'all' && selectedYear !== 'all') {
        params.append('month', selectedMonth)
        params.append('year', selectedYear)
      }

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
        gross_measurement: '',
        net_measurement: ''
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
    const totalGross = blockRows.reduce((sum, row) => sum + (parseFloat(row.gross_measurement) || 0), 0)
    const totalNet = blockRows.reduce((sum, row) => sum + (parseFloat(row.net_measurement) || 0), 0)
    return { totalBlocks, totalGross, totalNet }
  }

  // Calculate transport cost per block based on quarry
  const getTransportCostPerBlock = () => {
    if (formData.quarry_name === 'Gokanakonda') return 10000
    if (formData.quarry_name === 'Sai lakshmi' || formData.quarry_name === 'Sambrajyam') return 4500
    return 0
  }

  const calculateTransportCost = () => {
    const { totalBlocks } = calculateTotals()
    const ratePerBlock = getTransportCostPerBlock()
    return totalBlocks * ratePerBlock
  }

  const calculatePurchaseCost = () => {
    if (!formData.net_measurement || !formData.purchase_cost_rate) return 0
    const rate = parseFloat(formData.purchase_cost_rate) || 0
    return (parseFloat(formData.net_measurement) || 0) * rate
  }

  const calculateTotalExpenditure = () => {
    const purchaseCost = calculatePurchaseCost()
    const transportCost = parseFloat(formData.transport_cost) || 0 // Use manual transport cost from form
    const loadingCost = parseFloat(formData.loading_cost) || 0
    const quarryCommission = parseFloat(formData.quarry_commission) || 0
    const otherCharges = parseFloat(formData.other_charges) || 0
    return purchaseCost + transportCost + loadingCost + quarryCommission + otherCharges
  }

  const handleSaveConsignment = async () => {
    // Validation
    if (!formData.quarry_name) {
      toast.error('Please select a quarry')
      return
    }

    if (!formData.net_measurement || parseFloat(formData.net_measurement) <= 0) {
      toast.error('Please enter net measurement')
      return
    }

    if (!formData.purchase_cost_rate || parseFloat(formData.purchase_cost_rate) <= 0) {
      toast.error('Please enter purchase cost rate')
      return
    }

    if (!formData.number_of_blocks || parseInt(formData.number_of_blocks) < 1) {
      toast.error('Please enter number of blocks')
      return
    }

    // Check if user has entered block details manually
    const validBlocks = blockRows.filter(
      row => row.block_name.trim() !== 'AVG-' && 
             row.block_name.trim() !== ''
    )

    const useManualBlocks = validBlocks.length > 0
    const numberOfBlocks = useManualBlocks ? validBlocks.length : parseInt(formData.number_of_blocks)

    setSaving(true)
    try {
      // Use user-entered purchase_cost_rate
      const purchase_cost_rate = parseFloat(formData.purchase_cost_rate) || 0

      // Step 1: Create/Update consignment
      const consignmentPayload = {
        ...(editingConsignment && { id: formData.id }),
        purchase_date: formData.purchase_date,
        quarry_name: formData.quarry_name,
        total_blocks_count: numberOfBlocks,
        net_measurement: parseFloat(formData.net_measurement),
        purchase_cost_rate: purchase_cost_rate,
        production_cost_per_sqft: parseFloat(formData.production_cost_per_sqft) || 0,
        total_gross_measurement: useManualBlocks ? blockRows.reduce((sum, row) => sum + (parseFloat(row.gross_measurement) || 0), 0) : 0,
        transport_cost: parseFloat(formData.transport_cost) || 0,
        loading_cost: parseFloat(formData.loading_cost) || 0,
        quarry_commission: parseFloat(formData.quarry_commission) || 0,
        other_charges: parseFloat(formData.other_charges) || 0,
        blocks: useManualBlocks ? validBlocks.map(block => ({
          block_name: block.block_name,
          gross_measurement: parseFloat(block.gross_measurement) || 0,
          net_measurement: parseFloat(block.net_measurement) || 0,
          arrival_status: 'received' // Manual blocks are already received
        })) : [] // Empty array - we'll create placeholders separately
      }

      const consignmentResponse = await fetch('/api/consignments-new', {
        method: editingConsignment ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(consignmentPayload)
      })

      const consignmentResult = await consignmentResponse.json()

      if (!consignmentResponse.ok) {
        toast.error(`Error: ${consignmentResult.error}`)
        setSaving(false)
        return
      }

      // Step 2: Create placeholder blocks if no manual blocks entered
      if (!useManualBlocks && !editingConsignment) {
        const consignmentId = consignmentResult.consignment.id
        const placeholderResponse = await fetch('/api/granite-blocks/create-placeholders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            consignment_id: consignmentId,
            number_of_blocks: parseInt(formData.number_of_blocks)
          })
        })

        const placeholderResult = await placeholderResponse.json()

        if (!placeholderResponse.ok) {
          toast.error(`Error creating placeholder blocks: ${placeholderResult.error}`)
          setSaving(false)
          return
        }

        toast.success(`Consignment saved with ${placeholderResult.count} placeholder blocks!`)
      } else {
        toast.success(`Consignment ${editingConsignment ? 'updated' : 'saved'} successfully!`)
      }

      setShowAddForm(false)
      setEditingConsignment(null)
      resetForm()
      fetchConsignments()
      fetchStats()
    } catch (error) {
      console.error('Error saving consignment:', error)
      toast.error('Failed to save consignment')
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setFormData({
      id: '',
      purchase_date: new Date().toISOString().split('T')[0],
      quarry_name: '',
      net_measurement: '',
      number_of_blocks: '',
      purchase_cost_rate: '',
      production_cost_per_sqft: '',
      transport_cost: '',
      loading_cost: '',
      quarry_commission: '',
      other_charges: ''
    })
    setBlockRows([
      { id: '1', block_name: 'AVG-', gross_measurement: '', net_measurement: '' }
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
      net_measurement: consignment.net_measurement?.toString() || '',
      number_of_blocks: consignment.total_blocks_count?.toString() || '',
      purchase_cost_rate: consignment.purchase_cost_rate?.toString() || '',
      production_cost_per_sqft: (consignment as any).production_cost_per_sqft?.toString() || '',
      transport_cost: consignment.transport_cost?.toString() || '',
      loading_cost: consignment.loading_cost?.toString() || '',
      quarry_commission: consignment.quarry_commission?.toString() || '',
      other_charges: consignment.other_charges?.toString() || ''
    })
    setBlockRows(
      consignment.granite_blocks?.map((block, index) => ({
        id: String(index + 1),
        block_name: block.block_no,
        gross_measurement: block.gross_measurement?.toString() || '',
        net_measurement: (block as any).net_measurement?.toString() || ''
      })) || [{ id: '1', block_name: 'AVG-', gross_measurement: '', net_measurement: '' }]
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
        toast.error(error.error || 'Failed to delete consignment')
        throw new Error(error.error || 'Failed to delete consignment')
      }

      toast.success('Consignment deleted successfully')
      fetchConsignments()
      fetchStats()
    } catch (error) {
      console.error('Error deleting consignment:', error)
      toast.error(error instanceof Error ? error.message : 'Unknown error occurred')
    }
  }

  const { totalBlocks, totalGross, totalNet } = calculateTotals()

  return (
    <AppLayout>
      <Toaster richColors position="top-center" />
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Consignment Details</h1>
          <p className="text-gray-600">Manage granite block consignments from quarries</p>
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
                <option value="all">All Months</option>
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
                <option value="all">All Years</option>
                {Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 uppercase tracking-wide">Quarry</label>
              <select
                value={selectedQuarry}
                onChange={(e) => setSelectedQuarry(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md font-semibold text-emerald-700"
              >
                <option value="all" className="font-semibold text-gray-700">All Quarries</option>
                {QUARRIES.map(quarry => (
                  <option key={quarry} value={quarry} className="font-semibold text-emerald-700">{quarry}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>
        {/* Add Consignment Button - Centered */}
        {!showAddForm && (
          <div className="flex justify-center">
            <Button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Consignment
            </Button>
          </div>
        )}

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

              {/* Section 2: Block Details - OPTIONAL */}
              <div className="border-b pb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                      <Blocks className="w-5 h-5 text-purple-600" />
                      Block Details (Optional)
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Leave empty to create placeholder blocks. Fill details when blocks arrive at factory.
                    </p>
                  </div>
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
                  {/* Mobile: Stack labels with inputs, Desktop: Grid layout */}
                  <div className="hidden sm:grid sm:grid-cols-12 gap-3 text-xs font-medium text-gray-600 px-2">
                    <div className="col-span-5">Block Name</div>
                    <div className="col-span-3 text-right">Gross (m)</div>
                    <div className="col-span-3 text-right">Net (m) <span className="text-gray-400">(Optional)</span></div>
                    <div className="col-span-1"></div>
                  </div>

                  {blockRows.map((row, index) => (
                    <div key={row.id} className="bg-gray-50 p-3 rounded-lg">
                      {/* Mobile: Vertical Stack, Desktop: Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                        <div className="sm:col-span-5">
                          <label className="text-xs font-medium text-gray-700 mb-1 block sm:hidden">Block Name</label>
                          <Input
                            value={row.block_name}
                            onChange={(e) => handleBlockRowChange(row.id, 'block_name', e.target.value.toUpperCase())}
                            placeholder="AVG-XXX"
                            className="font-mono w-full"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <label className="text-xs font-medium text-gray-700 mb-1 block sm:hidden">Gross Measurement (m)</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={row.gross_measurement}
                            onChange={(e) => handleBlockRowChange(row.id, 'gross_measurement', e.target.value)}
                            onWheel={(e) => e.currentTarget.blur()}
                            placeholder="0.00"
                            className="text-right w-full"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <label className="text-xs font-medium text-gray-700 mb-1 block sm:hidden">Net Measurement (m) - Optional</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={row.net_measurement}
                            onChange={(e) => handleBlockRowChange(row.id, 'net_measurement', e.target.value)}
                            onWheel={(e) => e.currentTarget.blur()}
                            placeholder="0.00"
                            className="text-right w-full"
                          />
                        </div>
                        <div className="sm:col-span-1 flex justify-center">
                          {blockRows.length > 1 && (
                            <Button
                              onClick={() => handleRemoveBlockRow(row.id)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-800 p-1 w-full sm:w-auto"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
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
                      <label className="block text-sm text-gray-600 mb-1">Total Gross (m)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={totalGross.toFixed(2)}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Net Measurement (m) <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.net_measurement}
                      onChange={(e) => setFormData({ ...formData, net_measurement: e.target.value })}
                      onWheel={(e) => e.currentTarget.blur()}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Blocks <span className="text-red-500">*</span>
                      <span className="ml-2 text-xs text-gray-500">(Placeholders will be created)</span>
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.number_of_blocks}
                      onChange={(e) => setFormData({ ...formData, number_of_blocks: e.target.value })}
                      onWheel={(e) => e.currentTarget.blur()}
                      placeholder="7"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Purchase Cost Rate <span className="text-red-500">*</span>
                      <span className="ml-2 text-xs text-gray-500">
                        (per meter)
                      </span>
                    </label>
                    <Input
                      type="number"
                      value={formData.purchase_cost_rate}
                      onChange={(e) => setFormData({ ...formData, purchase_cost_rate: e.target.value })}
                      onWheel={(e) => e.currentTarget.blur()}
                      placeholder="18000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Purchase Cost (Auto-calculated)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">₹</span>
                      <Input
                        type="text"
                        value={
                          formData.net_measurement && formData.purchase_cost_rate
                            ? formatIndianNumber((parseFloat(formData.net_measurement) || 0) * 
                               (parseFloat(formData.purchase_cost_rate) || 0))
                            : '0'
                        }
                        disabled
                        className="pl-7 bg-gray-100 font-semibold"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Production Cost per Sqft
                      <span className="ml-2 text-xs text-gray-500">(Optional - All quarries)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">₹</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.production_cost_per_sqft}
                        onChange={(e) => setFormData({ ...formData, production_cost_per_sqft: e.target.value })}
                        onWheel={(e) => e.currentTarget.blur()}
                        placeholder="32"
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
                        onWheel={(e) => e.currentTarget.blur()}
                        placeholder="0"
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
                        onWheel={(e) => e.currentTarget.blur()}
                        placeholder="0"
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
                        onWheel={(e) => e.currentTarget.blur()}
                        placeholder="0"
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
                        onWheel={(e) => e.currentTarget.blur()}
                        placeholder="0"
                        className="pl-7"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Total Expenditure</label>
                    <div className="px-4 py-2.5 bg-green-50 border-2 border-green-300 rounded-md font-bold text-green-700 text-lg">
                      ₹{formatIndianNumber(calculateTotalExpenditure())}
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
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Blocks</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Arrival</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Net (m)</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Gross (m)</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Total Cost</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {consignments.map((consignment) => {
                    const receivedBlocks = consignment.granite_blocks?.filter(b => b.arrival_status === 'received').length || 0
                    const totalBlocks = consignment.total_blocks_count || 0
                    const arrivalProgress = totalBlocks > 0 ? Math.round((receivedBlocks / totalBlocks) * 100) : 0
                    const allReceived = receivedBlocks === totalBlocks && totalBlocks > 0
                    
                    return (
                      <tr key={consignment.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {consignment.consignment_number}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {new Date(consignment.purchase_date).toLocaleDateString('en-GB')}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block font-bold px-3 py-1.5 rounded-full text-sm shadow-sm ${getQuarryColor(consignment.quarry_name)}`}>
                            {consignment.quarry_name}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-gray-700">
                          {consignment.total_blocks_count}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              allReceived 
                                ? 'bg-green-100 text-green-700' 
                                : receivedBlocks > 0 
                                  ? 'bg-yellow-100 text-yellow-700' 
                                  : 'bg-gray-100 text-gray-600'
                            }`}>
                              {receivedBlocks}/{totalBlocks}
                            </span>
                            <span className="text-xs text-gray-500">{arrivalProgress}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-gray-700">
                          {formatIndianNumber(consignment.net_measurement || consignment.total_net_measurement || 0)}
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-gray-700">
                          {formatIndianNumber(consignment.total_gross_measurement)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-green-700">
                          ₹{formatIndianNumber(consignment.total_expenditure)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center justify-center gap-2">
                          <Button
                            onClick={() => router.push(`/consignments/edit-blocks?consignment_id=${consignment.id}`)}
                            variant="outline"
                            size="sm"
                            className="text-green-600 hover:text-green-800"
                            title="Manage Blocks"
                          >
                            <PackagePlus className="w-4 h-4" />
                          </Button>
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
                            onClick={() => router.push(`/consignments/polish-analytics?id=${consignment.id}`)}
                            variant="outline"
                            size="sm"
                            className="text-amber-600 hover:text-amber-800"
                            title="Polish Analytics"
                          >
                            <Sparkles className="w-4 h-4" />
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
                  )})}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  )
}
