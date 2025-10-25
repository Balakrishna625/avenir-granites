"use client"

import { useState, useEffect, useMemo } from 'react'
import { Plus, X, Save, Edit3, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { AppLayout } from '@/components/AppLayout'

interface Customer {
  id: string
  name: string
}

interface MaterialType {
  id: string
  name: string
}

interface SaleItem {
  id: string
  material_type_id: string | null
  material_name: string
  slabs_count: number
  square_feet: number
  rate_per_sqft: number
  total_amount: number
  remarks: string
}

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
  remarks: string
  official_bill_items?: Array<{
    material_name: string
    square_feet: number
    rate_per_sqft: number
    total_amount: number
  }>
  official_tax?: number
  official_total?: number
  customers?: { name: string }
  sale_items?: SaleItem[]
}

interface ItemRow {
  id: string
  material_type_id: string
  material_name: string
  slabs_count: string
  square_feet: string
  rate_per_sqft: string
  total_amount: number
}

interface OfficialBillItem {
  id: string
  material_name: string
  square_feet: string
  rate_per_sqft: string
  total_amount: number
}

interface FormData {
  date: string
  customer_id: string
  itemRows: ItemRow[]
  tax_amount: string
  mining_amount: string
  loading_amount: string
  officialBillItems: OfficialBillItem[]
  official_tax: string
  rtgs_expected: string
  cash_expected: string
  remarks: string
}

function formatIndianNumber(num: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num)
}

export default function SalesDataEntryPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(false)
  const [salesLoading, setSalesLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'actual' | 'official'>('actual')

  const initialFormData: FormData = useMemo(() => ({
    date: new Date().toISOString().split('T')[0],
    customer_id: '',
    itemRows: [{
      id: crypto.randomUUID(),
      material_type_id: '',
      material_name: '',
      slabs_count: '',
      square_feet: '',
      rate_per_sqft: '',
      total_amount: 0
    }],
    tax_amount: '',
    mining_amount: '',
    loading_amount: '',
    officialBillItems: [{
      id: crypto.randomUUID(),
      material_name: '',
      square_feet: '',
      rate_per_sqft: '',
      total_amount: 0
    }],
    official_tax: '',
    rtgs_expected: '',
    cash_expected: '',
    remarks: ''
  }), [])

  const [formData, setFormData] = useState<FormData>(initialFormData)

  useEffect(() => {
    fetchCustomers()
    fetchMaterialTypes()
    fetchSales()
  }, [])

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

  const fetchMaterialTypes = async () => {
    try {
      const response = await fetch('/api/material-types')
      if (response.ok) {
        const data = await response.json()
        setMaterialTypes(data)
      }
    } catch (error) {
      console.error('Error fetching material types:', error)
    }
  }

  const fetchSales = async () => {
    try {
      setSalesLoading(true)
      const response = await fetch('/api/sales')
      if (response.ok) {
        const data = await response.json()
        setSales(data)
      }
    } catch (error) {
      console.error('Error fetching sales:', error)
    } finally {
      setSalesLoading(false)
    }
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleItemRowChange = (rowId: string, field: keyof ItemRow, value: string) => {
    setFormData(prev => ({
      ...prev,
      itemRows: prev.itemRows.map(row => {
        if (row.id === rowId) {
          const updated = { ...row, [field]: value }
          
          // Update material name when material type changes
          if (field === 'material_type_id') {
            const material = materialTypes.find(m => m.id === value)
            updated.material_name = material?.name || ''
          }
          
          // Auto-calculate total when sqft or rate changes
          if (field === 'square_feet' || field === 'rate_per_sqft') {
            const sqft = parseFloat(field === 'square_feet' ? value : updated.square_feet) || 0
            const rate = parseFloat(field === 'rate_per_sqft' ? value : updated.rate_per_sqft) || 0
            updated.total_amount = sqft * rate
          }
          
          return updated
        }
        return row
      })
    }))
  }

  const addItemRow = () => {
    setFormData(prev => ({
      ...prev,
      itemRows: [
        ...prev.itemRows,
        {
          id: crypto.randomUUID(),
          material_type_id: '',
          material_name: '',
          slabs_count: '',
          square_feet: '',
          rate_per_sqft: '',
          total_amount: 0
        }
      ]
    }))
  }

  const removeItemRow = (rowId: string) => {
    if (formData.itemRows.length <= 1) {
      alert('At least one item is required')
      return
    }
    setFormData(prev => ({
      ...prev,
      itemRows: prev.itemRows.filter(row => row.id !== rowId)
    }))
  }

  // Official Bill Item Handlers
  const handleOfficialBillItemChange = (rowId: string, field: keyof OfficialBillItem, value: string) => {
    setFormData(prev => ({
      ...prev,
      officialBillItems: prev.officialBillItems.map(row => {
        if (row.id === rowId) {
          const updated = { ...row, [field]: value }
          
          // Auto-calculate total when sqft or rate changes
          if (field === 'square_feet' || field === 'rate_per_sqft') {
            const sqft = parseFloat(field === 'square_feet' ? value : updated.square_feet) || 0
            const rate = parseFloat(field === 'rate_per_sqft' ? value : updated.rate_per_sqft) || 0
            updated.total_amount = sqft * rate
          }
          
          return updated
        }
        return row
      })
    }))
  }

  const addOfficialBillItem = () => {
    setFormData(prev => ({
      ...prev,
      officialBillItems: [
        ...prev.officialBillItems,
        {
          id: crypto.randomUUID(),
          material_name: '',
          square_feet: '',
          rate_per_sqft: '',
          total_amount: 0
        }
      ]
    }))
  }

  const removeOfficialBillItem = (rowId: string) => {
    if (formData.officialBillItems.length <= 1) {
      alert('At least one official bill item is required')
      return
    }
    setFormData(prev => ({
      ...prev,
      officialBillItems: prev.officialBillItems.filter(row => row.id !== rowId)
    }))
  }

  const calculateTotals = () => {
    const totalSlabs = formData.itemRows.reduce(
      (sum, row) => sum + (parseInt(row.slabs_count) || 0), 
      0
    )
    const totalSqft = formData.itemRows.reduce(
      (sum, row) => sum + (parseFloat(row.square_feet) || 0), 
      0
    )
    const subtotal = formData.itemRows.reduce((sum, row) => sum + row.total_amount, 0)
    const grossTotal = subtotal + 
      (parseFloat(formData.tax_amount) || 0) + 
      (parseFloat(formData.mining_amount) || 0) + 
      (parseFloat(formData.loading_amount) || 0)
    
    // Official bill calculations from items array
    const officialSubtotal = formData.officialBillItems.reduce((sum, item) => sum + item.total_amount, 0)
    const officialTax = parseFloat(formData.official_tax) || 0
    const officialTotal = officialSubtotal + officialTax
    
    // Auto-calculate payment split
    const rtgs = officialTotal
    const cash = grossTotal - officialTotal
    
    return { totalSlabs, totalSqft, subtotal, grossTotal, officialSubtotal, officialTotal, rtgs, cash }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.customer_id) {
      alert('Please select a customer')
      return
    }

    if (formData.itemRows.length === 0 || !formData.itemRows[0].material_name) {
      alert('Please add at least one item')
      return
    }

    const { grossTotal, rtgs, cash } = calculateTotals()

    setLoading(true)

    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: formData.customer_id,
          sale_date: formData.date,
          items: formData.itemRows.map(item => ({
            material_type_id: item.material_type_id || null,
            material_name: item.material_name,
            slabs_count: parseInt(item.slabs_count) || 0,
            square_feet: parseFloat(item.square_feet) || 0,
            rate_per_sqft: parseFloat(item.rate_per_sqft) || 0,
            total_amount: item.total_amount
          })),
          tax_amount: parseFloat(formData.tax_amount) || 0,
          mining_amount: parseFloat(formData.mining_amount) || 0,
          loading_amount: parseFloat(formData.loading_amount) || 0,
          official_bill_items: formData.officialBillItems.map(item => ({
            material_name: item.material_name,
            square_feet: parseFloat(item.square_feet) || 0,
            rate_per_sqft: parseFloat(item.rate_per_sqft) || 0,
            total_amount: item.total_amount
          })),
          official_tax: parseFloat(formData.official_tax) || 0,
          rtgs_expected: rtgs,
          cash_expected: cash,
          remarks: formData.remarks
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create sale')
      }

      const newSale = await response.json()
      setSales([newSale, ...sales])

      // Reset form
      setFormData(initialFormData)
      alert('✅ Sale created successfully! Consignment auto-added to customer account.')
      await fetchSales()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData(initialFormData)
    setIsEditing(false)
    setEditingId(null)
  }

  const { totalSlabs, totalSqft, subtotal, grossTotal, officialSubtotal, officialTotal, rtgs, cash } = calculateTotals()

  return (
    <AppLayout>
      <div className="min-h-screen w-full bg-gray-50 p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Sales Data Entry</h1>
          <p className="text-gray-600 text-sm mt-1">Record new sales and automatically create consignments</p>
        </div>

        {/* Sales Entry Form */}
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date and Customer Row */}
            <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date *</label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Customer *</label>
              <select
                value={formData.customer_id}
                onChange={(e) => handleInputChange('customer_id', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                required
              >
                <option value="">Select customer...</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Sales Items *</label>
              <Button type="button" onClick={addItemRow} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Material Type</th>
                    <th className="px-3 py-2 text-left font-medium">Slabs</th>
                    <th className="px-3 py-2 text-left font-medium">Sq. Ft.</th>
                    <th className="px-3 py-2 text-left font-medium">Rate/Sq.Ft</th>
                    <th className="px-3 py-2 text-right font-medium">Amount</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.itemRows.map((row, index) => (
                    <tr key={row.id} className={index > 0 ? 'border-t' : ''}>
                      <td className="px-3 py-2">
                        <select
                          value={row.material_type_id}
                          onChange={(e) => handleItemRowChange(row.id, 'material_type_id', e.target.value)}
                          className="w-full border rounded px-2 py-1.5 text-sm"
                          required
                        >
                          <option value="">Select...</option>
                          {materialTypes.map(material => (
                            <option key={material.id} value={material.id}>
                              {material.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          value={row.slabs_count}
                          onChange={(e) => handleItemRowChange(row.id, 'slabs_count', e.target.value)}
                          className="w-20"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={row.square_feet}
                          onChange={(e) => handleItemRowChange(row.id, 'square_feet', e.target.value)}
                          className="w-24"
                          placeholder="0.00"
                          required
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={row.rate_per_sqft}
                          onChange={(e) => handleItemRowChange(row.id, 'rate_per_sqft', e.target.value)}
                          className="w-24"
                          placeholder="0.00"
                          required
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        ₹{formatIndianNumber(row.total_amount)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {formData.itemRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItemRow(row.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {/* Summary Row */}
                  <tr className="bg-blue-50 font-medium border-t-2">
                    <td className="px-3 py-2">Total</td>
                    <td className="px-3 py-2">{totalSlabs}</td>
                    <td className="px-3 py-2">{totalSqft.toFixed(2)}</td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2 text-right">₹{formatIndianNumber(subtotal)}</td>
                    <td className="px-3 py-2"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Additional Charges & Payment Split */}
          <div className="space-y-4">
            {/* Additional Charges in one line */}
            <div>
              <label className="block text-sm font-medium mb-2">Additional Charges</label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Tax</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.tax_amount}
                    onChange={(e) => handleInputChange('tax_amount', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Mining</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.mining_amount}
                    onChange={(e) => handleInputChange('mining_amount', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Loading</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.loading_amount}
                    onChange={(e) => handleInputChange('loading_amount', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Gross Total Display */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Gross Total:</span>
                <span className="font-bold text-xl text-green-700">₹{formatIndianNumber(grossTotal)}</span>
              </div>
            </div>

            {/* Official Bill Section */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-blue-900">Official Bill (On Paper)</label>
                <Button
                  type="button"
                  onClick={addOfficialBillItem}
                  size="sm"
                  variant="outline"
                  className="text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Item
                </Button>
              </div>

              {/* Official Bill Items */}
              <div className="space-y-3">
                {formData.officialBillItems.map((item, index) => (
                  <div key={item.id} className="bg-white p-3 rounded-lg border border-blue-200">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 grid grid-cols-4 gap-3">
                        <div>
                          <label className="text-xs text-gray-600 block mb-1">Material</label>
                          <Input
                            type="text"
                            value={item.material_name}
                            onChange={(e) => handleOfficialBillItemChange(item.id, 'material_name', e.target.value)}
                            placeholder="Material name"
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 block mb-1">Sq.Ft</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.square_feet}
                            onChange={(e) => handleOfficialBillItemChange(item.id, 'square_feet', e.target.value)}
                            placeholder="0.00"
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 block mb-1">Rate/Sq.Ft</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.rate_per_sqft}
                            onChange={(e) => handleOfficialBillItemChange(item.id, 'rate_per_sqft', e.target.value)}
                            placeholder="0.00"
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 block mb-1">Amount</label>
                          <div className="text-sm font-semibold py-2 px-3 bg-gray-100 rounded">
                            ₹{formatIndianNumber(item.total_amount)}
                          </div>
                        </div>
                      </div>
                      {formData.officialBillItems.length > 1 && (
                        <Button
                          type="button"
                          onClick={() => removeOfficialBillItem(item.id)}
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 mt-6"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Tax Field */}
              <div className="mt-3">
                <label className="text-xs text-gray-700 block mb-1">Tax</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.official_tax}
                  onChange={(e) => handleInputChange('official_tax', e.target.value)}
                  placeholder="0.00"
                  className="bg-white max-w-xs"
                />
              </div>

              {/* Totals */}
              <div className="mt-3 flex items-center justify-between bg-blue-100 p-2 rounded">
                <span className="text-sm font-medium">Subtotal:</span>
                <span className="font-semibold">₹{formatIndianNumber(officialSubtotal)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between bg-blue-600 text-white p-3 rounded">
                <span className="font-semibold">Official Total:</span>
                <span className="font-bold text-lg">₹{formatIndianNumber(officialTotal)}</span>
              </div>
            </div>

            {/* Payment Split - Auto-filled */}
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <label className="block text-sm font-semibold mb-3 text-yellow-900">Payment Split (Auto-calculated)</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-700 block mb-1">RTGS Expected (Official)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={rtgs.toFixed(2)}
                    readOnly
                    className="bg-gray-100 font-semibold"
                    title="Auto-filled from Official Total"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-700 block mb-1">Cash Expected (Difference)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={cash.toFixed(2)}
                    readOnly
                    className="bg-gray-100 font-semibold"
                    title="Auto-calculated: Gross Total - Official Total"
                  />
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-600">
                <p>💡 RTGS = Official Total | Cash = Gross Total - Official Total</p>
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium mb-1">Remarks</label>
            <textarea
              value={formData.remarks}
              onChange={(e) => handleInputChange('remarks', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
              rows={2}
              placeholder="Optional notes..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={loading || !formData.customer_id}
              className="flex-1"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : 'Save Sale & Create Consignment'}
            </Button>
            <Button
              type="button"
              onClick={handleCancel}
              variant="outline"
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>

      {/* Sales Records Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Sales</h2>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">View:</label>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as 'actual' | 'official')}
              className="border rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="actual">Actual Sale</option>
              <option value="official">Official Bill</option>
            </select>
          </div>
        </div>
        {salesLoading ? (
          <div className="text-center py-8 text-gray-500">Loading sales...</div>
        ) : sales.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No sales recorded yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Sale #</th>
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-left font-medium">Customer</th>
                  {viewMode === 'actual' ? (
                    <>
                      <th className="px-3 py-2 text-right font-medium">Slabs</th>
                      <th className="px-3 py-2 text-right font-medium">Sq. Ft.</th>
                      <th className="px-3 py-2 text-right font-medium">Total</th>
                    </>
                  ) : (
                    <>
                      <th className="px-3 py-2 text-left font-medium">Items</th>
                      <th className="px-3 py-2 text-right font-medium">Sq. Ft.</th>
                      <th className="px-3 py-2 text-right font-medium">Official Total</th>
                    </>
                  )}
                  <th className="px-3 py-2 text-right font-medium">RTGS</th>
                  <th className="px-3 py-2 text-right font-medium">Cash</th>
                </tr>
              </thead>
              <tbody>
                {sales.slice(0, 10).map((sale) => {
                  const officialBillItems = sale.official_bill_items || [];
                  const officialSqft = officialBillItems.reduce((sum: number, item: any) => sum + (Number(item.square_feet) || 0), 0);
                  
                  return (
                    <tr key={sale.id} className="border-t hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">{sale.sale_number}</td>
                      <td className="px-3 py-2">{new Date(sale.sale_date).toLocaleDateString('en-IN')}</td>
                      <td className="px-3 py-2">{sale.customers?.name}</td>
                      {viewMode === 'actual' ? (
                        <>
                          <td className="px-3 py-2 text-right">{sale.total_slabs}</td>
                          <td className="px-3 py-2 text-right">{sale.total_sqft.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right font-medium">₹{formatIndianNumber(sale.gross_total)}</td>
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
                          <td className="px-3 py-2 text-right font-medium">₹{formatIndianNumber(sale.official_total || 0)}</td>
                        </>
                      )}
                      <td className="px-3 py-2 text-right">₹{formatIndianNumber(sale.rtgs_expected)}</td>
                      <td className="px-3 py-2 text-right">₹{formatIndianNumber(sale.cash_expected)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      </div>
    </AppLayout>
  )
}
