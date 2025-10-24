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

interface FormData {
  date: string
  customer_id: string
  itemRows: ItemRow[]
  tax_amount: string
  mining_amount: string
  loading_amount: string
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
    const paymentTotal = (parseFloat(formData.rtgs_expected) || 0) + (parseFloat(formData.cash_expected) || 0)
    
    return { totalSlabs, totalSqft, subtotal, grossTotal, paymentTotal }
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

    const { grossTotal, paymentTotal } = calculateTotals()
    const paymentDifference = Math.abs(paymentTotal - grossTotal)
    
    if (paymentDifference > 0.01) {
      alert(`Payment split (₹${formatIndianNumber(paymentTotal)}) must equal Gross Total (₹${formatIndianNumber(grossTotal)})`)
      return
    }

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
          rtgs_expected: parseFloat(formData.rtgs_expected) || 0,
          cash_expected: parseFloat(formData.cash_expected) || 0,
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

  const { totalSlabs, totalSqft, subtotal, grossTotal, paymentTotal } = calculateTotals()
  const paymentDifference = Math.abs(paymentTotal - grossTotal)

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Sales Data Entry</h1>
          <p className="text-gray-600 text-sm mt-1">Record new sales and automatically create consignments</p>
        </div>

        {/* Sales Entry Form */}
        <Card className="p-6 mb-6">
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

            {/* Payment Split in one line */}
            <div>
              <label className="block text-sm font-medium mb-2">Payment Split *</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-600 block mb-1">RTGS Expected</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.rtgs_expected}
                    onChange={(e) => handleInputChange('rtgs_expected', e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Cash Expected</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.cash_expected}
                    onChange={(e) => handleInputChange('cash_expected', e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
              {paymentDifference > 0.01 && (
                <p className="text-red-600 text-sm mt-2">
                  ⚠️ Payment total (₹{formatIndianNumber(paymentTotal)}) must equal Gross Total - Difference: ₹{formatIndianNumber(paymentDifference)}
                </p>
              )}
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
              disabled={loading || !formData.customer_id || paymentDifference > 0.01}
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
        <h2 className="text-lg font-semibold mb-4">Recent Sales</h2>
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
                  <th className="px-3 py-2 text-right font-medium">Slabs</th>
                  <th className="px-3 py-2 text-right font-medium">Sq. Ft.</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                  <th className="px-3 py-2 text-right font-medium">RTGS</th>
                  <th className="px-3 py-2 text-right font-medium">Cash</th>
                </tr>
              </thead>
              <tbody>
                {sales.slice(0, 10).map((sale) => (
                  <tr key={sale.id} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{sale.sale_number}</td>
                    <td className="px-3 py-2">{new Date(sale.sale_date).toLocaleDateString('en-IN')}</td>
                    <td className="px-3 py-2">{sale.customers?.name}</td>
                    <td className="px-3 py-2 text-right">{sale.total_slabs}</td>
                    <td className="px-3 py-2 text-right">{sale.total_sqft.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-medium">₹{formatIndianNumber(sale.gross_total)}</td>
                    <td className="px-3 py-2 text-right">₹{formatIndianNumber(sale.rtgs_expected)}</td>
                    <td className="px-3 py-2 text-right">₹{formatIndianNumber(sale.cash_expected)}</td>
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
