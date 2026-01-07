"use client"

import { useState, useEffect, useMemo } from 'react'
import { Plus, X, Save, Edit3, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { AppLayout } from '@/components/AppLayout'
import { useToast } from '@/components/ui/toast'
import { useSessionMonthYear } from '@/hooks/useSessionMonth'

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
  tons: number
  rate_per_ton: number
  is_tonnage_material: boolean
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
  total_tons: number
  subtotal_amount: number
  tax_amount: number
  mining_amount: number
  loading_amount: number
  gross_total: number
  rtgs_expected: number
  cash_expected: number
  remarks: string
  only_bill?: boolean
  job_work?: boolean
  official_bill_items?: Array<{
    material_name: string
    square_feet: number
    rate_per_sqft: number
    total_amount: number
  }>
  official_tax?: number
  end_customer_name?: string
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
  tons: string
  rate_per_ton: string
  is_tonnage_material: boolean
  total_amount: number
  remarks: string
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
  end_customer_name: string
  rtgs_expected: string
  cash_expected: string
  remarks: string
  createConsignment: boolean
  onlyBill: boolean
  entryType: 'sales' | 'onlyBill' | 'jobWork'
}

function formatIndianNumber(num: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num)
}

export default function SalesDataEntryPage() {
  const { showToast } = useToast()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(false)
  const [salesLoading, setSalesLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'actual' | 'official'>('actual')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc') // asc = oldest first, desc = newest first
  const [expandedSales, setExpandedSales] = useState<Set<string>>(new Set())
  const [filterCustomerId, setFilterCustomerId] = useState<string>('all') // Filter by customer
  const [showMaterialModal, setShowMaterialModal] = useState(false)
  const [newMaterialName, setNewMaterialName] = useState('')
  const [addingMaterial, setAddingMaterial] = useState(false)

  // Month selector state - persists in session, resets to current month on new session
  const { selectedMonth, selectedYear, setSelectedMonth, setSelectedYear } = useSessionMonthYear('sales-data-entry')

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
      tons: '',
      rate_per_ton: '',
      is_tonnage_material: false,
      total_amount: 0,
      remarks: ''
    }],
    tax_amount: '',
    mining_amount: '',
    loading_amount: '',
    officialBillItems: [{
      id: crypto.randomUUID(),
      material_name: 'S/G',
      square_feet: '',
      rate_per_sqft: '',
      total_amount: 0
    }],
    official_tax: '',
    end_customer_name: '',
    rtgs_expected: '',
    cash_expected: '',
    remarks: '',
    createConsignment: true,
    onlyBill: false,
    entryType: 'sales'
  }), [])

  const [formData, setFormData] = useState<FormData>(initialFormData)

  useEffect(() => {
    fetchCustomers()
    fetchMaterialTypes()
    fetchSales()
  }, [selectedMonth, selectedYear])

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

  const createMaterialType = async () => {
    if (!newMaterialName.trim()) {
      showToast('error', 'Please enter a material type name')
      return
    }

    setAddingMaterial(true)
    try {
      const response = await fetch('/api/material-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newMaterialName.trim() })
      })

      if (response.ok) {
        const newMaterial = await response.json()
        setMaterialTypes([...materialTypes, newMaterial])
        setNewMaterialName('')
        setShowMaterialModal(false)
        showToast('success', 'Material type added successfully')
      } else {
        const error = await response.json()
        showToast('error', error.error || 'Failed to add material type')
      }
    } catch (error: any) {
      showToast('error', error.message)
    } finally {
      setAddingMaterial(false)
    }
  }

  const fetchSales = async () => {
    try {
      setSalesLoading(true)
      // Filter by selected month and year
      const response = await fetch(`/api/sales?month=${selectedMonth}&year=${selectedYear}`)
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

  // Helper function to check if a material type is tonnage-based
  const isTonnageMaterial = (materialTypeId: string): boolean => {
    if (!materialTypeId) return false
    const material = materialTypes.find(m => m.id === materialTypeId)
    return material?.name?.toLowerCase().includes('tonnage') || false
  }

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
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
            updated.is_tonnage_material = isTonnageMaterial(value)
            // Reset fields when switching material type
            if (updated.is_tonnage_material) {
              // Switching to tonnage: clear slabs and rates, keep square_feet for optional entry
              updated.slabs_count = ''
              updated.rate_per_sqft = ''
              // Don't clear square_feet - allow it to be optionally filled
            } else {
              // Switching to regular: clear tons and ton-rate
              updated.tons = ''
              updated.rate_per_ton = ''
            }
            updated.total_amount = 0
          }
          
          // Auto-calculate total when sqft or rate changes (for regular materials)
          if (field === 'square_feet' || field === 'rate_per_sqft') {
            const sqft = parseFloat(field === 'square_feet' ? value : updated.square_feet) || 0
            const rate = parseFloat(field === 'rate_per_sqft' ? value : updated.rate_per_sqft) || 0
            updated.total_amount = sqft * rate
          }
          
          // Auto-calculate total when tons or rate_per_ton changes (for tonnage materials)
          if (field === 'tons' || field === 'rate_per_ton') {
            const tons = parseFloat(field === 'tons' ? value : updated.tons) || 0
            const rate = parseFloat(field === 'rate_per_ton' ? value : updated.rate_per_ton) || 0
            updated.total_amount = tons * rate
            
            // Auto-calculate square feet if not manually entered (155 sqft per ton)
            // Only auto-fill if square_feet is empty or zero
            if (field === 'tons' && (!updated.square_feet || parseFloat(updated.square_feet) === 0)) {
              updated.square_feet = (tons * 155).toFixed(2)
            }
          }
          
          // For tonnage materials: if square_feet is manually entered, don't auto-calculate
          // This allows user to override the 155 sqft/ton default
          
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
          tons: '',
          rate_per_ton: '',
          is_tonnage_material: false,
          total_amount: 0,
          remarks: ''
        }
      ]
    }))
  }

  const removeItemRow = (rowId: string) => {
    if (formData.itemRows.length <= 1) {
      showToast('error', 'At least one item is required')
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
      showToast('error', 'At least one official bill item is required')
      return
    }
    setFormData(prev => ({
      ...prev,
      officialBillItems: prev.officialBillItems.filter(row => row.id !== rowId)
    }))
  }

  const calculateTotals = () => {
    const totalSlabs = formData.itemRows.reduce(
      (sum, row) => sum + (row.is_tonnage_material ? 0 : parseInt(row.slabs_count) || 0), 
      0
    )
    // Include square feet from both regular and tonnage materials
    const totalSqft = formData.itemRows.reduce(
      (sum, row) => sum + (parseFloat(row.square_feet) || 0), 
      0
    )
    const totalTons = formData.itemRows.reduce(
      (sum, row) => sum + (row.is_tonnage_material ? parseFloat(row.tons) || 0 : 0), 
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
    
    return { totalSlabs, totalSqft, totalTons, subtotal, grossTotal, officialSubtotal, officialTotal, rtgs, cash }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const isJobWork = formData.entryType === 'jobWork'
    const isOnlyBill = formData.entryType === 'onlyBill'
    
    // Only Bill mode: customer is optional, only official bill is required
    if (isOnlyBill) {
      if (formData.officialBillItems.length === 0 || !formData.officialBillItems[0].square_feet) {
        showToast('error', 'Please add at least one official bill item')
        return
      }
    } else {
      // Normal mode and Job Work: customer and items are required
      if (!formData.customer_id) {
        showToast('error', 'Please select a customer')
        return
      }

      if (formData.itemRows.length === 0 || !formData.itemRows[0].material_name) {
        showToast('error', 'Please add at least one item')
        return
      }
    }

    const { grossTotal, rtgs, cash } = calculateTotals()

    setLoading(true)

    try {
      const url = isEditing && editingId ? `/api/sales/${editingId}` : '/api/sales'
      const method = isEditing && editingId ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: isOnlyBill ? null : formData.customer_id,
          sale_date: formData.date,
          items: isOnlyBill ? [] : formData.itemRows.map(item => ({
            material_type_id: item.material_type_id || null,
            material_name: item.material_name,
            slabs_count: parseInt(item.slabs_count) || 0,
            square_feet: parseFloat(item.square_feet) || 0,
            rate_per_sqft: parseFloat(item.rate_per_sqft) || 0,
            tons: parseFloat(item.tons) || 0,
            rate_per_ton: parseFloat(item.rate_per_ton) || 0,
            is_tonnage_material: item.is_tonnage_material,
            total_amount: item.total_amount,
            remarks: item.remarks || ''
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
          end_customer_name: formData.end_customer_name || null,
          rtgs_expected: isJobWork ? 0 : rtgs,
          cash_expected: isJobWork ? 0 : cash,
          remarks: formData.remarks,
          createConsignment: isOnlyBill ? false : (isJobWork ? true : formData.createConsignment),
          onlyBill: isOnlyBill,
          jobWork: isJobWork
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `Failed to ${isEditing ? 'update' : 'create'} sale`)
      }

      const savedSale = await response.json()
      
      if (isEditing && editingId) {
        setSales(sales.map(s => s.id === editingId ? savedSale : s))
        showToast('success', 'Sale updated successfully!')
      } else {
        setSales([savedSale, ...sales])
        const message = formData.createConsignment 
          ? 'Sale created successfully! Consignment auto-added to customer account.'
          : 'Sale recorded successfully!'
        showToast('success', message)
      }

      // Reset form
      setFormData(initialFormData)
      setIsEditing(false)
      setEditingId(null)
      await fetchSales()
    } catch (error: any) {
      showToast('error', error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData(initialFormData)
    setIsEditing(false)
    setEditingId(null)
  }

  const handleEdit = async (sale: Sale) => {
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' })
    
    // Fetch full sale details including items
    try {
      const response = await fetch(`/api/sales/${sale.id}`)
      if (!response.ok) throw new Error('Failed to fetch sale details')
      
      const saleDetails = await response.json()
      
      // Populate form with sale data
      setFormData({
        date: saleDetails.sale_date.split('T')[0],
        customer_id: saleDetails.customer_id,
        onlyBill: saleDetails.only_bill || false,
        itemRows: (saleDetails.sale_items && saleDetails.sale_items.length > 0) ? saleDetails.sale_items.map((item: any) => {
          const isTonnage = item.is_tonnage_material || false
          return {
            id: crypto.randomUUID(),
            material_type_id: item.material_type_id || '',
            material_name: item.material_name,
            slabs_count: isTonnage ? '' : (item.slabs_count?.toString() || ''),
            square_feet: (item.square_feet?.toString() || ''),
            rate_per_sqft: isTonnage ? '' : (item.rate_per_sqft?.toString() || ''),
            tons: isTonnage ? (item.tons?.toString() || '') : '',
            rate_per_ton: isTonnage ? (item.rate_per_ton?.toString() || '') : '',
            is_tonnage_material: isTonnage,
            total_amount: item.total_amount,
            remarks: item.remarks || ''
          }
        }) : [{
          id: crypto.randomUUID(),
          material_type_id: '',
          material_name: '',
          slabs_count: '',
          square_feet: '',
          rate_per_sqft: '',
          tons: '',
          rate_per_ton: '',
          is_tonnage_material: false,
          total_amount: 0,
          remarks: ''
        }],
        tax_amount: saleDetails.tax_amount.toString(),
        mining_amount: saleDetails.mining_amount.toString(),
        loading_amount: saleDetails.loading_amount.toString(),
        officialBillItems: saleDetails.official_bill_items?.map((item: any) => ({
          id: crypto.randomUUID(),
          material_name: item.material_name,
          square_feet: item.square_feet.toString(),
          rate_per_sqft: item.rate_per_sqft.toString(),
          total_amount: item.total_amount
        })) || [{
          id: crypto.randomUUID(),
          material_name: '',
          square_feet: '',
          rate_per_sqft: '',
          total_amount: 0
        }],
        official_tax: saleDetails.official_tax?.toString() || '',
        end_customer_name: saleDetails.end_customer_name || '',
        rtgs_expected: saleDetails.rtgs_expected.toString(),
        cash_expected: saleDetails.cash_expected.toString(),
        remarks: saleDetails.remarks || '',
        createConsignment: true // Default to true when editing
      })
      
      setIsEditing(true)
      setEditingId(sale.id)
    } catch (error: any) {
      showToast('error', `Error loading sale: ${error.message}`)
    }
  }

  const handleDelete = async (sale: Sale) => {
    const confirmed = confirm(
      `⚠️ Are you sure you want to delete Sale #${sale.sale_number}?\n\n` +
      `Customer: ${sale.customers?.name}\n` +
      `Amount: ₹${formatIndianNumber(sale.gross_total)}\n\n` +
      `This will also delete:\n` +
      `- All sale items\n` +
      `- Associated consignment entries\n\n` +
      `This action cannot be undone!`
    )
    
    if (!confirmed) return
    
    try {
      const response = await fetch(`/api/sales/${sale.id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete sale')
      }
      
      setSales(sales.filter(s => s.id !== sale.id))
      showToast('success', 'Sale deleted successfully!')
    } catch (error: any) {
      showToast('error', error.message)
    }
  }

  const { totalSlabs, totalSqft, totalTons, subtotal, grossTotal, officialSubtotal, officialTotal, rtgs, cash } = calculateTotals()

  // Calculate aggregated statistics from filtered sales
  // CRITICAL: Exclude job_work entries - they are NOT sales, just service tracking
  const salesStats = useMemo(() => {
    const salesToCalculate = filterCustomerId === 'all' ? sales : sales.filter(s => s.customer_id === filterCustomerId)
    // Filter out job_work entries - they should NOT be counted in sales statistics
    const actualSales = salesToCalculate.filter(s => !s.job_work)
    return actualSales.reduce((acc, sale) => ({
      totalSlabs: acc.totalSlabs + sale.total_slabs,
      totalSqft: acc.totalSqft + sale.total_sqft,
      totalAmount: acc.totalAmount + sale.gross_total,
      totalTax: acc.totalTax + sale.tax_amount,
      totalMining: acc.totalMining + sale.mining_amount,
      totalLoading: acc.totalLoading + sale.loading_amount
    }), {
      totalSlabs: 0,
      totalSqft: 0,
      totalAmount: 0,
      totalTax: 0,
      totalMining: 0,
      totalLoading: 0
    })
  }, [sales, filterCustomerId])

  // Month navigation functions
  const goToPreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12)
      setSelectedYear(selectedYear - 1)
    } else {
      setSelectedMonth(selectedMonth - 1)
    }
  }

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1)
      setSelectedYear(selectedYear + 1)
    } else {
      setSelectedMonth(selectedMonth + 1)
    }
  }

  const getMonthName = (month: number) => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December']
    return monthNames[month - 1]
  }

  // Filter and sort sales
  const sortedSales = useMemo(() => {
    // First filter by customer if selected
    let filtered = sales
    if (filterCustomerId !== 'all') {
      filtered = sales.filter(sale => sale.customer_id === filterCustomerId)
    }
    
    // Filter by official bill view - only show sales with non-zero official bill sq.ft
    if (viewMode === 'official') {
      filtered = filtered.filter(sale => {
        const officialBillItems = sale.official_bill_items || []
        const officialSqft = officialBillItems.reduce((sum: number, item: any) => sum + (Number(item.square_feet) || 0), 0)
        return officialSqft > 0
      })
    }
    
    // Then sort by date
    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.sale_date).getTime()
      const dateB = new Date(b.sale_date).getTime()
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA
    })
  }, [sales, sortOrder, filterCustomerId, viewMode])

  return (
    <AppLayout>
      <div className="min-h-screen w-full bg-gray-50 p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Sales Data Entry</h1>
            <p className="text-gray-600 text-sm mt-1">Record new sales and automatically create consignments</p>
          </div>
          
          {/* Month Selector */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm w-fit">
            <Button 
              onClick={goToPreviousMonth}
              variant="outline"
              size="sm"
              className="h-8"
            >
              ←
            </Button>
            <div className="text-center min-w-[140px]">
              <div className="font-semibold text-gray-900">{getMonthName(selectedMonth)}</div>
              <div className="text-xs text-gray-500">{selectedYear}</div>
            </div>
            <Button 
              onClick={goToNextMonth}
              variant="outline"
              size="sm"
              className="h-8"
            >
              →
            </Button>
          </div>
        </div>

        {/* Summary Statistics Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-4">
          <Card className="p-3 sm:p-4">
            <div className="text-xs text-gray-600 mb-1">TOTAL SALES</div>
            <div className="text-lg sm:text-xl font-bold text-gray-900">
              {sales.filter(s => !s.job_work).length}
            </div>
          </Card>

          <Card className="p-3 sm:p-4">
            <div className="text-xs text-gray-600 mb-1">TOTAL SLABS SOLD</div>
            <div className="text-lg sm:text-xl font-bold text-gray-900">
              {salesStats.totalSlabs.toLocaleString('en-IN')}
            </div>
          </Card>
          
          <Card className="p-3 sm:p-4">
            <div className="text-xs text-gray-600 mb-1">TOTAL SQ.FT SOLD</div>
            <div className="text-lg sm:text-xl font-bold text-gray-900">
              {salesStats.totalSqft.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </Card>
          
          <Card className="p-3 sm:p-4">
            <div className="text-xs text-gray-600 mb-1">TOTAL AMOUNT SOLD</div>
            <div className="text-lg sm:text-xl font-bold text-gray-900">
              ₹{formatIndianNumber(salesStats.totalAmount)}
            </div>
          </Card>
          
          <Card className="p-3 sm:p-4">
            <div className="text-xs text-gray-600 mb-1">TOTAL TAX</div>
            <div className="text-lg sm:text-xl font-bold text-orange-600">
              ₹{formatIndianNumber(salesStats.totalTax)}
            </div>
          </Card>
          
          <Card className="p-3 sm:p-4">
            <div className="text-xs text-gray-600 mb-1">TOTAL MINING</div>
            <div className="text-lg sm:text-xl font-bold text-purple-600">
              ₹{formatIndianNumber(salesStats.totalMining)}
            </div>
          </Card>
          
          <Card className="p-3 sm:p-4">
            <div className="text-xs text-gray-600 mb-1">TOTAL LOADING</div>
            <div className="text-lg sm:text-xl font-bold text-blue-600">
              ₹{formatIndianNumber(salesStats.totalLoading)}
            </div>
          </Card>
        </div>

        {/* Sales Entry Form */}
        <Card className="p-4 sm:p-6">
          {isEditing && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Editing Sale - Make changes and click Update to save</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Entry Type, Date, and Customer in one row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Entry Type *</label>
                <select
                  value={formData.entryType}
                  onChange={(e) => {
                    const type = e.target.value as 'sales' | 'onlyBill' | 'jobWork'
                    setFormData(prev => ({
                      ...prev,
                      entryType: type,
                      onlyBill: type === 'onlyBill',
                      // Reset fields based on entry type
                      customer_id: type === 'onlyBill' ? '' : prev.customer_id,
                      itemRows: type === 'jobWork' ? [{
                        id: crypto.randomUUID(),
                        material_type_id: '',
                        material_name: '',
                        slabs_count: '',
                        square_feet: '',
                        rate_per_sqft: '',
                        tons: '',
                        rate_per_ton: '',
                        is_tonnage_material: false,
                        total_amount: 0,
                        remarks: ''
                      }] : prev.itemRows,
                      tax_amount: type === 'jobWork' ? '0' : prev.tax_amount,
                      mining_amount: type === 'jobWork' ? '0' : prev.mining_amount,
                      rtgs_expected: type === 'jobWork' ? '0' : prev.rtgs_expected,
                      cash_expected: type === 'jobWork' ? '0' : prev.cash_expected
                    }))
                  }}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="sales">Sales Entry (Default)</option>
                  <option value="onlyBill">Only Bill (Mining Audit)</option>
                  <option value="jobWork">Job Work (Polishing Service)</option>
                </select>
                {formData.entryType === 'onlyBill' && (
                  <p className="text-xs text-amber-600 mt-1">Mining audit only - Customer optional</p>
                )}
                {formData.entryType === 'jobWork' && (
                  <p className="text-xs text-purple-600 mt-1">Service tracking - NOT a sale</p>
                )}
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium mb-1">Date *</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  required
                />
              </div>

            {/* Customer */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Customer {formData.entryType !== 'onlyBill' && '*'}
              </label>
              <select
                value={formData.customer_id}
                onChange={(e) => handleInputChange('customer_id', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                required={formData.entryType !== 'onlyBill'}
                disabled={formData.entryType === 'onlyBill'}
              >
                <option value="">{formData.entryType === 'onlyBill' ? 'N/A (Only Bill Mode)' : 'Select customer...'}</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Items Table - Hide for Only Bill mode */}
          {formData.entryType !== 'onlyBill' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">
                {formData.entryType === 'jobWork' ? 'Job Work Details *' : 'Sales Items *'}
              </label>
              {formData.entryType !== 'jobWork' && (
                <Button type="button" onClick={addItemRow} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Item
                </Button>
              )}
            </div>

            <div className="border rounded-lg overflow-x-auto">
              {formData.entryType === 'jobWork' ? (
                // Simplified Job Work Table
                <table className="w-full text-sm">
                  <thead className="bg-purple-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Material Type *</th>
                      <th className="px-3 py-2 text-left font-medium">No. of Slabs *</th>
                      <th className="px-3 py-2 text-left font-medium">Square Feet *</th>
                      <th className="px-3 py-2 text-left font-medium">Rate per Sq.Ft *</th>
                      <th className="px-3 py-2 text-right font-medium">Job Work Amount</th>
                      <th className="px-3 py-2 text-left font-medium">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-3 py-3">
                        <select
                          value={formData.itemRows[0]?.material_type_id || ''}
                          onChange={(e) => handleItemRowChange(formData.itemRows[0].id, 'material_type_id', e.target.value)}
                          className="w-full border rounded px-2 py-1.5 text-sm"
                          required
                        >
                          <option value="">Select material...</option>
                          {materialTypes.map(material => (
                            <option key={material.id} value={material.id}>
                              {material.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-3">
                        <Input
                          type="number"
                          value={formData.itemRows[0]?.slabs_count || ''}
                          onChange={(e) => handleItemRowChange(formData.itemRows[0].id, 'slabs_count', e.target.value)}
                          onWheel={(e) => e.currentTarget.blur()}
                          className="w-24"
                          placeholder="Slabs"
                          required
                        />
                      </td>
                      <td className="px-3 py-3">
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.itemRows[0]?.square_feet || ''}
                          onChange={(e) => handleItemRowChange(formData.itemRows[0].id, 'square_feet', e.target.value)}
                          onWheel={(e) => e.currentTarget.blur()}
                          className="w-32"
                          placeholder="Sq.Ft"
                          required
                        />
                      </td>
                      <td className="px-3 py-3">
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.itemRows[0]?.rate_per_sqft || ''}
                          onChange={(e) => handleItemRowChange(formData.itemRows[0].id, 'rate_per_sqft', e.target.value)}
                          onWheel={(e) => e.currentTarget.blur()}
                          className="w-32"
                          placeholder="Rate"
                          required
                        />
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-purple-700">
                        ₹{formatIndianNumber(formData.itemRows[0]?.total_amount || 0)}
                      </td>
                      <td className="px-3 py-3">
                        <Input
                          type="text"
                          value={formData.itemRows[0]?.remarks || ''}
                          onChange={(e) => handleItemRowChange(formData.itemRows[0].id, 'remarks', e.target.value)}
                          className="w-full"
                          placeholder="Job work details..."
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                // Regular Sales Table
              <table className="w-full text-sm min-w-[800px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium w-12">S.No</th>
                    <th className="px-3 py-2 text-left font-medium">
                      <div className="flex items-center justify-between">
                        <span>Material Type</span>
                        <button
                          type="button"
                          onClick={() => setShowMaterialModal(true)}
                          className="text-blue-600 hover:text-blue-700 text-xs font-normal ml-2"
                          title="Add new material type"
                        >
                          + New
                        </button>
                      </div>
                    </th>
                    <th className="px-3 py-2 text-left font-medium">Slabs</th>
                    <th className="px-3 py-2 text-left font-medium">
                      Qty (Tons/Sq.Ft)
                    </th>
                    <th className="px-3 py-2 text-left font-medium">
                      {formData.itemRows.some(row => isTonnageMaterial(row.material_type_id)) && 
                       !formData.itemRows.some(row => !isTonnageMaterial(row.material_type_id) && row.material_type_id)
                        ? 'Rate/Ton' 
                        : formData.itemRows.some(row => isTonnageMaterial(row.material_type_id))
                        ? 'Rate'
                        : 'Rate/Sq.Ft'}
                    </th>
                    <th className="px-3 py-2 text-right font-medium">Amount</th>
                    <th className="py-2 pl-24 pr-2 text-left font-medium">Notes</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.itemRows.map((row, index) => {
                    const isTonnage = isTonnageMaterial(row.material_type_id)
                    
                    return (
                    <tr key={row.id} className={index > 0 ? 'border-t' : ''}>
                      <td className="px-3 py-2 text-center text-gray-600 font-medium">
                        {index + 1}
                      </td>
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
                      {!isTonnage && (
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            value={row.slabs_count}
                            onChange={(e) => handleItemRowChange(row.id, 'slabs_count', e.target.value)}
                            onWheel={(e) => e.currentTarget.blur()}
                            className="w-20"
                            placeholder="Slabs"
                          />
                        </td>
                      )}
                      {isTonnage && (
                        <td className="px-3 py-2 text-gray-400 text-center">
                          —
                        </td>
                      )}
                      <td className="px-3 py-2">
                        {isTonnage ? (
                          <div className="space-y-1">
                            <Input
                              type="number"
                              step="0.01"
                              value={row.tons}
                              onChange={(e) => handleItemRowChange(row.id, 'tons', e.target.value)}
                              onWheel={(e) => e.currentTarget.blur()}
                              className="w-24"
                              placeholder="Tons"
                              required
                            />
                            <Input
                              type="number"
                              step="0.01"
                              value={row.square_feet}
                              onChange={(e) => handleItemRowChange(row.id, 'square_feet', e.target.value)}
                              onWheel={(e) => e.currentTarget.blur()}
                              className="w-24 text-xs"
                              placeholder="Sq.Ft (opt)"
                              title="Optional: Square feet. If empty, calculated as Tons × 155"
                            />
                          </div>
                        ) : (
                          <Input
                            type="number"
                            step="0.01"
                            value={row.square_feet}
                            onWheel={(e) => e.currentTarget.blur()}
                            onChange={(e) => handleItemRowChange(row.id, 'square_feet', e.target.value)}
                            className="w-24"
                            placeholder="Sq.Ft"
                            required
                          />
                        )}
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={isTonnage ? row.rate_per_ton : row.rate_per_sqft}
                          onChange={(e) => handleItemRowChange(row.id, isTonnage ? 'rate_per_ton' : 'rate_per_sqft', e.target.value)}
                          onWheel={(e) => e.currentTarget.blur()}
                          className="w-20"
                          placeholder={isTonnage ? "Rate/Ton" : "Rate/Sq.Ft"}
                          required
                        />
                      </td>
                      <td className="px-2 py-2 text-right font-medium">
                        ₹{formatIndianNumber(row.total_amount)}
                      </td>
                      <td className="py-2 pl-24 pr-2">
                        <Input
                          type="text"
                          value={row.remarks}
                          onChange={(e) => handleItemRowChange(row.id, 'remarks', e.target.value)}
                          className="w-48"
                          placeholder="Notes..."
                        />
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
                    )
                  })}
                  {/* Summary Row */}
                  <tr className="bg-blue-50 font-medium border-t-2">
                    <td className="px-3 py-2" colSpan={2}>Total</td>
                    <td className="px-3 py-2">
                      {totalSlabs > 0 && <span>{totalSlabs} slabs</span>}
                      {totalSlabs > 0 && totalTons > 0 && <span> / </span>}
                      {totalTons > 0 && <span>{totalTons.toFixed(2)} tons</span>}
                    </td>
                    <td className="px-3 py-2">
                      {totalSqft > 0 && <span>{totalSqft.toFixed(2)} sqft</span>}
                      {totalSqft > 0 && totalTons > 0 && <span> / </span>}
                      {totalTons > 0 && <span>{totalTons.toFixed(2)} tons</span>}
                    </td>
                    <td className="py-2 pr-2"></td>
                    <td className="px-2 py-2 text-right">₹{formatIndianNumber(subtotal)}</td>
                    <td className="py-2 pl-24 pr-2"></td>
                    <td className="px-3 py-2"></td>
                  </tr>
                </tbody>
              </table>
              )}
            </div>
          </div>
          )}

          {/* Additional Charges & Payment Split */}
          <div className="space-y-4">
            {/* Additional Charges in one line */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {formData.entryType === 'jobWork' ? 'Job Work Charges' : 'Additional Charges'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {formData.entryType !== 'jobWork' && (
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Tax</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.tax_amount}
                    onChange={(e) => {
                      const taxValue = e.target.value;
                      handleInputChange('tax_amount', taxValue);
                      // Auto-sync to official tax
                      handleInputChange('official_tax', taxValue);
                    }}
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder="0.00"
                  />
                </div>
                )}
                {formData.entryType !== 'jobWork' && (
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Mining</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.mining_amount}
                    onChange={(e) => handleInputChange('mining_amount', e.target.value)}
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder="0.00"
                  />
                </div>
                )}
                <div>
                  <label className="text-xs text-gray-600 block mb-1">
                    {formData.entryType === 'jobWork' ? 'Loading/Unloading Charges' : 'Loading'}
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.loading_amount}
                    onChange={(e) => handleInputChange('loading_amount', e.target.value)}
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Gross Total Display */}
            <div className={`p-4 rounded-lg border ${formData.entryType === 'jobWork' ? 'bg-purple-50 border-purple-200' : 'bg-green-50 border-green-200'}`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  {formData.entryType === 'jobWork' ? 'Total Job Work Charges:' : 'Gross Total:'}
                </span>
                <span className={`font-bold text-xl ${formData.entryType === 'jobWork' ? 'text-purple-700' : 'text-green-700'}`}>
                  ₹{formatIndianNumber(grossTotal)}
                </span>
              </div>
              {formData.entryType === 'jobWork' && (
                <p className="text-xs text-purple-600 mt-2">This amount will be added to customer payable balance</p>
              )}
            </div>

            {/* Official Bill Section - Hide for Job Work */}
            {formData.entryType !== 'jobWork' && (
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
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                            onWheel={(e) => e.currentTarget.blur()}
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
                            onWheel={(e) => e.currentTarget.blur()}
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
                          variant="outline"
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
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="0.00"
                  className="bg-white max-w-xs"
                />
              </div>

              {/* End Customer Name */}
              <div className="mt-3">
                <label className="text-xs text-gray-700 block mb-1">End Customer Name (Bill Written For)</label>
                <Input
                  type="text"
                  value={formData.end_customer_name}
                  onChange={(e) => handleInputChange('end_customer_name', e.target.value)}
                  placeholder="Enter end customer name"
                  className="bg-white max-w-md"
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
            )}

            {/* Payment Split - Auto-filled - Hide for Job Work */}
            {formData.entryType !== 'jobWork' && (
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <label className="block text-sm font-semibold mb-3 text-yellow-900">Payment Split (Auto-calculated)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            )}
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

          {/* Consignment Creation Option - Hide for Job Work (always creates for job work) */}
          {formData.entryType !== 'jobWork' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.createConsignment}
                onChange={(e) => handleInputChange('createConsignment', e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div>
                <div className="font-medium text-blue-900">Auto-create consignment for customer</div>
                <div className="text-xs text-blue-700 mt-1">
                  ⚠️ Uncheck this if you've already manually added this sale to customer's consignment to avoid duplicates
                </div>
              </div>
            </label>
          </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={loading || (formData.entryType !== 'onlyBill' && !formData.customer_id)}
              className="flex-1"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading 
                ? (isEditing ? 'Updating...' : 'Saving...') 
                : (isEditing 
                    ? 'Update Sale' 
                    : (formData.entryType === 'jobWork'
                        ? 'Save Job Work & Add to Customer Payable'
                        : formData.createConsignment 
                          ? 'Save Sale & Create Consignment' 
                          : 'Save Sale Only'))
              }
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
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col gap-3 mb-4">
          <h2 className="text-lg font-semibold">
            All Sales
            {filterCustomerId !== 'all' && (
              <span className="ml-2 text-sm font-normal text-blue-600">
                ({sortedSales.length} filtered)
              </span>
            )}
          </h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 flex-1 sm:flex-none">
              <label className="text-sm text-gray-600 whitespace-nowrap">Customer:</label>
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
            <Button
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              variant="outline"
              className="text-sm w-full sm:w-auto justify-center"
            >
              Sort: {sortOrder === 'asc' ? 'Oldest First ↑' : 'Newest First ↓'}
            </Button>
            <div className="flex items-center gap-2 flex-1 sm:flex-none">
              <label className="text-sm text-gray-600 whitespace-nowrap">View:</label>
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
        {salesLoading ? (
          <div className="text-center py-8 text-gray-500">Loading sales...</div>
        ) : sales.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No sales recorded yet</div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden">
                <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium w-12">S.No</th>
                  <th className="px-3 py-2 text-center font-medium w-10"></th>
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
                  <th className="px-3 py-2 text-center font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedSales.map((sale, index) => {
                  const officialBillItems = sale.official_bill_items || [];
                  const officialSqft = officialBillItems.reduce((sum: number, item: any) => sum + (Number(item.square_feet) || 0), 0);
                  
                  // Calculate tons from sale_items if total_tons is not set (for old data)
                  const calculatedTons = sale.sale_items?.reduce((sum: number, item: any) => {
                    return sum + (item.is_tonnage_material ? (Number(item.tons) || 0) : 0);
                  }, 0) || 0;
                  const displayTons = sale.total_tons || calculatedTons;
                  const isExpanded = expandedSales.has(sale.id);
                  
                  return (
                    <>
                    <tr key={sale.id} className={`border-t hover:bg-gray-50 ${sale.job_work ? 'bg-purple-50/40' : ''}`}>
                      <td className="px-3 py-2 text-center text-gray-600 font-medium">{index + 1}</td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            const newExpanded = new Set(expandedSales);
                            if (isExpanded) {
                              newExpanded.delete(sale.id);
                            } else {
                              newExpanded.add(sale.id);
                            }
                            setExpandedSales(newExpanded);
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
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{sale.sale_number}</span>
                          {sale.job_work && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                              Job Work
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">{new Date(sale.sale_date).toLocaleDateString('en-IN')}</td>
                      <td className="px-3 py-2">{sale.customers?.name}</td>
                      {viewMode === 'actual' ? (
                        <>
                          <td className="px-3 py-2 text-right">
                            {(sale.total_slabs > 0 || displayTons === 0) && <div>{sale.total_slabs} slabs</div>}
                            {displayTons > 0 && <div className="text-orange-600 font-medium">{displayTons.toFixed(2)} tons</div>}
                          </td>
                          <td className="px-3 py-2 text-right">{(sale.total_sqft || 0).toFixed(2)}</td>
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
                      <td className="px-3 py-2 text-right">
                        {sale.job_work ? (
                          <span className="font-medium text-purple-700">₹{formatIndianNumber(sale.gross_total)}</span>
                        ) : (
                          `₹${formatIndianNumber(sale.cash_expected)}`
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(sale)}
                            className="p-1.5"
                            title="Edit sale"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(sale)}
                            className="p-1.5 hover:bg-red-50"
                            title="Delete sale"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expanded Details Row */}
                    {isExpanded && (
                      <tr className="border-t bg-blue-50">
                        <td colSpan={viewMode === 'actual' ? 11 : 11} className="px-3 py-4">
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
                                    {sale.end_customer_name && (
                                      <>
                                        <span className="ml-4 text-gray-600">Bill For:</span>
                                        <span className="ml-2 font-medium">{sale.end_customer_name}</span>
                                      </>
                                    )}
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
                  );
                })}
              </tbody>
            </table>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Add Material Type Modal */}
      {showMaterialModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add New Material Type</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Material Type Name *</label>
                <Input
                  type="text"
                  value={newMaterialName}
                  onChange={(e) => setNewMaterialName(e.target.value)}
                  placeholder="e.g., S/G, D/G, etc."
                  className="w-full"
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !addingMaterial) {
                      createMaterialType()
                    }
                  }}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowMaterialModal(false)
                    setNewMaterialName('')
                  }}
                  disabled={addingMaterial}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={createMaterialType}
                  disabled={addingMaterial || !newMaterialName.trim()}
                >
                  {addingMaterial ? 'Adding...' : 'Add Material Type'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </AppLayout>
  )
}
