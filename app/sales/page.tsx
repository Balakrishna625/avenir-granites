"use client"

import { useState, useEffect } from 'react'
import { Plus, X, Save, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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

// Helper function to format numbers in Indian style
function formatIndianNumber(num: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num)
}

export default function SalesPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [customerId, setCustomerId] = useState('')
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0])
  const [lineItems, setLineItems] = useState<Array<{
    material_type_id: string
    material_name: string
    slabs_count: string
    square_feet: string
    rate_per_sqft: string
    total_amount: number
    remarks: string
  }>>([{
    material_type_id: '',
    material_name: '',
    slabs_count: '',
    square_feet: '',
    rate_per_sqft: '',
    total_amount: 0,
    remarks: ''
  }])
  const [taxAmount, setTaxAmount] = useState('')
  const [miningAmount, setMiningAmount] = useState('')
  const [loadingAmount, setLoadingAmount] = useState('')
  const [rtgsExpected, setRtgsExpected] = useState('')
  const [cashExpected, setCashExpected] = useState('')
  const [remarks, setRemarks] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // Fetch initial data
  useEffect(() => {
    Promise.all([
      fetch('/api/customers').then(res => res.json()),
      fetch('/api/material-types').then(res => res.json()),
      fetch('/api/sales').then(res => res.json())
    ]).then(([customersData, materialsData, salesData]) => {
      setCustomers(customersData)
      setMaterialTypes(materialsData)
      setSales(salesData)
      setLoading(false)
    }).catch(err => {
      console.error('Error fetching data:', err)
      setLoading(false)
    })
  }, [])

  // Calculate line item total
  const calculateLineTotal = (sqft: string, rate: string): number => {
    const sqftNum = parseFloat(sqft) || 0
    const rateNum = parseFloat(rate) || 0
    return sqftNum * rateNum
  }

  // Update line item
  const updateLineItem = (index: number, field: string, value: string) => {
    const newItems = [...lineItems]
    newItems[index] = { ...newItems[index], [field]: value }

    // Auto-calculate total when sqft or rate changes
    if (field === 'square_feet' || field === 'rate_per_sqft') {
      newItems[index].total_amount = calculateLineTotal(
        newItems[index].square_feet,
        newItems[index].rate_per_sqft
      )
    }

    // Update material name when material type changes
    if (field === 'material_type_id') {
      const material = materialTypes.find(m => m.id === value)
      newItems[index].material_name = material?.name || ''
    }

    setLineItems(newItems)
  }

  // Add new line item
  const addLineItem = () => {
    setLineItems([...lineItems, {
      material_type_id: '',
      material_name: '',
      slabs_count: '',
      square_feet: '',
      rate_per_sqft: '',
      total_amount: 0,
      remarks: ''
    }])
  }

  // Remove line item
  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index))
    }
  }

  // Calculate summary totals
  const totalSlabs = lineItems.reduce((sum, item) => sum + (parseInt(item.slabs_count) || 0), 0)
  const totalSqft = lineItems.reduce((sum, item) => sum + (parseFloat(item.square_feet) || 0), 0)
  const subtotal = lineItems.reduce((sum, item) => sum + item.total_amount, 0)
  const grossTotal = subtotal + (parseFloat(taxAmount) || 0) + (parseFloat(miningAmount) || 0) + (parseFloat(loadingAmount) || 0)
  const paymentTotal = (parseFloat(rtgsExpected) || 0) + (parseFloat(cashExpected) || 0)
  const paymentDifference = Math.abs(paymentTotal - grossTotal)

  // Submit form
  const handleSubmit = async () => {
    // Validation
    if (!customerId) {
      alert('Please select a customer')
      return
    }

    if (lineItems.length === 0 || !lineItems[0].material_name) {
      alert('Please add at least one line item')
      return
    }

    if (paymentDifference > 0.01) {
      alert(`Payment split (₹${formatIndianNumber(paymentTotal)}) must equal Gross Total (₹${formatIndianNumber(grossTotal)})`)
      return
    }

    setSaving(true)

    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customerId,
          sale_date: saleDate,
          items: lineItems.map(item => ({
            material_type_id: item.material_type_id || null,
            material_name: item.material_name,
            slabs_count: parseInt(item.slabs_count) || 0,
            square_feet: parseFloat(item.square_feet) || 0,
            rate_per_sqft: parseFloat(item.rate_per_sqft) || 0,
            total_amount: item.total_amount,
            remarks: item.remarks
          })),
          tax_amount: parseFloat(taxAmount) || 0,
          mining_amount: parseFloat(miningAmount) || 0,
          loading_amount: parseFloat(loadingAmount) || 0,
          rtgs_expected: parseFloat(rtgsExpected) || 0,
          cash_expected: parseFloat(cashExpected) || 0,
          remarks
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create sale')
      }

      const newSale = await response.json()
      setSales([newSale, ...sales])

      // Reset form
      setCustomerId('')
      setSaleDate(new Date().toISOString().split('T')[0])
      setLineItems([{
        material_type_id: '',
        material_name: '',
        slabs_count: '',
        square_feet: '',
        rate_per_sqft: '',
        total_amount: 0,
        remarks: ''
      }])
      setTaxAmount('')
      setMiningAmount('')
      setLoadingAmount('')
      setRtgsExpected('')
      setCashExpected('')
      setRemarks('')

      setToastMessage('✅ Sale created successfully! Consignment auto-added to customer account.')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 5000)
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">Loading sales data...</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in-down">
          {toastMessage}
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ShoppingCart className="w-8 h-8" />
          Sales Management
        </h1>
        <p className="text-gray-600 mt-2">Create sales and automatically generate consignments</p>
      </div>

      {/* Sales Form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>New Sale</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Customer and Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Customer *</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Select customer...</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Sale Date *</label>
                <Input
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                />
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium">Line Items *</label>
                <Button onClick={addLineItem} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Item
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium">Material Type</th>
                      <th className="px-3 py-2 text-left text-xs font-medium">Slabs</th>
                      <th className="px-3 py-2 text-left text-xs font-medium">Sq. Ft.</th>
                      <th className="px-3 py-2 text-left text-xs font-medium">Rate/Sq.Ft</th>
                      <th className="px-3 py-2 text-right text-xs font-medium">Total</th>
                      <th className="px-3 py-2 text-left text-xs font-medium">Remarks</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-3 py-2">
                          <select
                            value={item.material_type_id}
                            onChange={(e) => updateLineItem(index, 'material_type_id', e.target.value)}
                            className="w-full border rounded px-2 py-1 text-sm"
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
                            value={item.slabs_count}
                            onChange={(e) => updateLineItem(index, 'slabs_count', e.target.value)}
                            className="w-20 text-sm"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={item.square_feet}
                            onChange={(e) => updateLineItem(index, 'square_feet', e.target.value)}
                            className="w-24 text-sm"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={item.rate_per_sqft}
                            onChange={(e) => updateLineItem(index, 'rate_per_sqft', e.target.value)}
                            className="w-24 text-sm"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          ₹{formatIndianNumber(item.total_amount)}
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="text"
                            value={item.remarks}
                            onChange={(e) => updateLineItem(index, 'remarks', e.target.value)}
                            className="w-32 text-sm"
                            placeholder="Optional"
                          />
                        </td>
                        <td className="px-3 py-2">
                          {lineItems.length > 1 && (
                            <button
                              onClick={() => removeLineItem(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary Section */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3">Summary</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total Slabs:</span>
                  <span className="ml-2 font-medium">{totalSlabs}</span>
                </div>
                <div>
                  <span className="text-gray-600">Total Sq. Ft.:</span>
                  <span className="ml-2 font-medium">{totalSqft.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Sub-total:</span>
                  <span className="ml-2 font-medium">₹{formatIndianNumber(subtotal)}</span>
                </div>
              </div>
            </div>

            {/* Additional Charges */}
            <div>
              <label className="block text-sm font-medium mb-3">Additional Charges</label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Tax Amount</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={taxAmount}
                    onChange={(e) => setTaxAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Mining Amount</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={miningAmount}
                    onChange={(e) => setMiningAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Loading Amount</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={loadingAmount}
                    onChange={(e) => setLoadingAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Gross Total */}
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-lg">Gross Total:</span>
                <span className="font-bold text-2xl text-green-700">₹{formatIndianNumber(grossTotal)}</span>
              </div>
            </div>

            {/* Payment Split */}
            <div>
              <label className="block text-sm font-medium mb-3">Payment Split *</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">RTGS Expected</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={rtgsExpected}
                    onChange={(e) => setRtgsExpected(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Cash Expected</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={cashExpected}
                    onChange={(e) => setCashExpected(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
              {paymentDifference > 0.01 && (
                <p className="text-red-600 text-sm mt-2">
                  ⚠️ Payment total (₹{formatIndianNumber(paymentTotal)}) must equal Gross Total (₹{formatIndianNumber(grossTotal)})
                  - Difference: ₹{formatIndianNumber(paymentDifference)}
                </p>
              )}
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-sm font-medium mb-2">Remarks</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 resize-none"
                rows={2}
                placeholder="Optional notes about this sale..."
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={saving || !customerId || lineItems.length === 0 || paymentDifference > 0.01}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Creating Sale...' : 'Create Sale & Consignment'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales History */}
      <Card>
        <CardHeader>
          <CardTitle>Sales History</CardTitle>
        </CardHeader>
        <CardContent>
          {sales.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No sales recorded yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Sale #</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Customer</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Slabs</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Sq. Ft.</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Gross Total</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">RTGS</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Cash</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{sale.sale_number}</td>
                      <td className="px-4 py-3">{new Date(sale.sale_date).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-3">{sale.customers?.name}</td>
                      <td className="px-4 py-3 text-right">{sale.total_slabs}</td>
                      <td className="px-4 py-3 text-right">{sale.total_sqft.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-medium">₹{formatIndianNumber(sale.gross_total)}</td>
                      <td className="px-4 py-3 text-right">₹{formatIndianNumber(sale.rtgs_expected)}</td>
                      <td className="px-4 py-3 text-right">₹{formatIndianNumber(sale.cash_expected)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
