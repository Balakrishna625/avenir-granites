"use client"

import { useState, useEffect, useMemo } from 'react'
import { Plus, X, Save, Edit3, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { AppLayout } from '@/components/AppLayout'
import { useToast } from '@/components/ui/toast'

interface Factory {
  id: string
  name: string
}

interface MaterialType {
  id: string
  name: string
}

interface UnpolishPurchase {
  id: string
  purchase_number: string
  purchase_date: string
  factory_id: string
  factory_name: string
  material_type_id: string
  material_name: string
  slabs_count: number
  sft: number
  rate_per_sft: number
  total_amount: number
  remarks: string
  factories?: { name: string }
  unpolish_material_types?: { name: string }
}

interface FormData {
  date: string
  factory_id: string
  factory_name: string
  material_type_id: string
  material_name: string
  slabs_count: string
  sft: string
  rate_per_sft: string
  remarks: string
}

function formatIndianNumber(num: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num)
}

export default function UnpolishPurchasesPage() {
  const { showToast } = useToast()
  const [factories, setFactories] = useState<Factory[]>([])
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([])
  const [purchases, setPurchases] = useState<UnpolishPurchase[]>([])
  const [loading, setLoading] = useState(false)
  const [purchasesLoading, setPurchasesLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [filterFactoryId, setFilterFactoryId] = useState<string>('all')
  
  // Modals
  const [showFactoryModal, setShowFactoryModal] = useState(false)
  const [showMaterialModal, setShowMaterialModal] = useState(false)
  const [newFactoryName, setNewFactoryName] = useState('')
  const [newMaterialName, setNewMaterialName] = useState('')
  const [addingFactory, setAddingFactory] = useState(false)
  const [addingMaterial, setAddingMaterial] = useState(false)

  const initialFormData: FormData = useMemo(() => ({
    date: new Date().toISOString().split('T')[0],
    factory_id: '',
    factory_name: '',
    material_type_id: '',
    material_name: '',
    slabs_count: '',
    sft: '',
    rate_per_sft: '',
    remarks: ''
  }), [])

  const [formData, setFormData] = useState<FormData>(initialFormData)

  useEffect(() => {
    fetchFactories()
    fetchMaterialTypes()
    fetchPurchases()
  }, [])

  const fetchFactories = async () => {
    try {
      const response = await fetch('/api/factories')
      if (response.ok) {
        const data = await response.json()
        setFactories(data)
      }
    } catch (error) {
      console.error('Error fetching factories:', error)
    }
  }

  const fetchMaterialTypes = async () => {
    try {
      const response = await fetch('/api/unpolish-material-types')
      if (response.ok) {
        const data = await response.json()
        setMaterialTypes(data)
      }
    } catch (error) {
      console.error('Error fetching material types:', error)
    }
  }

  const fetchPurchases = async () => {
    try {
      setPurchasesLoading(true)
      const response = await fetch('/api/unpolish-purchases')
      if (response.ok) {
        const data = await response.json()
        setPurchases(data)
      }
    } catch (error) {
      console.error('Error fetching purchases:', error)
    } finally {
      setPurchasesLoading(false)
    }
  }

  const createFactory = async () => {
    if (!newFactoryName.trim()) {
      showToast('error', 'Please enter a factory name')
      return
    }

    setAddingFactory(true)
    try {
      const response = await fetch('/api/factories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFactoryName.trim() })
      })

      if (response.ok) {
        const newFactory = await response.json()
        setFactories([...factories, newFactory])
        setFormData(prev => ({ ...prev, factory_id: newFactory.id, factory_name: newFactory.name }))
        setNewFactoryName('')
        setShowFactoryModal(false)
        showToast('success', 'Factory added successfully')
      } else {
        const error = await response.json()
        showToast('error', error.error || 'Failed to add factory')
      }
    } catch (error: any) {
      showToast('error', error.message)
    } finally {
      setAddingFactory(false)
    }
  }

  const createMaterialType = async () => {
    if (!newMaterialName.trim()) {
      showToast('error', 'Please enter a material type name')
      return
    }

    setAddingMaterial(true)
    try {
      const response = await fetch('/api/unpolish-material-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newMaterialName.trim() })
      })

      if (response.ok) {
        const newMaterial = await response.json()
        setMaterialTypes([...materialTypes, newMaterial])
        setFormData(prev => ({ ...prev, material_type_id: newMaterial.id, material_name: newMaterial.name }))
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

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value }
      
      // Update factory name when factory changes
      if (field === 'factory_id') {
        const factory = factories.find(f => f.id === value)
        updated.factory_name = factory?.name || ''
      }
      
      // Update material name when material type changes
      if (field === 'material_type_id') {
        const material = materialTypes.find(m => m.id === value)
        updated.material_name = material?.name || ''
      }
      
      return updated
    })
  }

  const calculateTotal = () => {
    const sft = parseFloat(formData.sft) || 0
    const rate = parseFloat(formData.rate_per_sft) || 0
    return sft * rate
  }

  const resetForm = () => {
    setFormData(initialFormData)
    setIsEditing(false)
    setEditingId(null)
  }

  const handleSubmit = async () => {
    // Validation
    if (!formData.date || !formData.factory_id || !formData.material_type_id || !formData.sft || !formData.rate_per_sft) {
      showToast('error', 'Please fill all required fields')
      return
    }

    const sft = parseFloat(formData.sft)
    if (isNaN(sft) || sft <= 0) {
      showToast('error', 'SFT must be a valid positive number')
      return
    }

    const rate = parseFloat(formData.rate_per_sft)
    if (isNaN(rate) || rate <= 0) {
      showToast('error', 'Rate/SFT must be a valid positive number')
      return
    }

    setLoading(true)
    try {
      const payload = {
        ...formData,
        slabs_count: parseInt(formData.slabs_count) || 0,
        sft: parseFloat(formData.sft),
        rate_per_sft: parseFloat(formData.rate_per_sft)
      }

      if (isEditing && editingId) {
        // Update existing purchase
        const response = await fetch('/api/unpolish-purchases', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, id: editingId })
        })

        if (response.ok) {
          const updatedPurchase = await response.json()
          setPurchases(purchases.map(p => p.id === editingId ? updatedPurchase : p))
          showToast('success', 'Purchase updated successfully!')
          resetForm()
        } else {
          const error = await response.json()
          showToast('error', error.error || 'Failed to update purchase')
        }
      } else {
        // Create new purchase
        const response = await fetch('/api/unpolish-purchases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, purchase_date: formData.date })
        })

        if (response.ok) {
          const newPurchase = await response.json()
          setPurchases([newPurchase, ...purchases])
          showToast('success', 'Purchase added successfully!')
          resetForm()
        } else {
          const error = await response.json()
          showToast('error', error.error || 'Failed to add purchase')
        }
      }
    } catch (error: any) {
      showToast('error', error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (purchase: UnpolishPurchase) => {
    setFormData({
      date: purchase.purchase_date,
      factory_id: purchase.factory_id,
      factory_name: purchase.factory_name,
      material_type_id: purchase.material_type_id,
      material_name: purchase.material_name,
      slabs_count: purchase.slabs_count.toString(),
      sft: purchase.sft.toFixed(3),
      rate_per_sft: purchase.rate_per_sft.toFixed(2),
      remarks: purchase.remarks || ''
    })
    setIsEditing(true)
    setEditingId(purchase.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (purchase: UnpolishPurchase) => {
    if (!confirm(`Delete purchase ${purchase.purchase_number}?`)) return

    try {
      const response = await fetch(`/api/unpolish-purchases?id=${purchase.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete purchase')
      }

      setPurchases(purchases.filter(p => p.id !== purchase.id))
      showToast('success', 'Purchase deleted successfully!')
    } catch (error: any) {
      showToast('error', error.message)
    }
  }

  const total = calculateTotal()

  // Calculate statistics
  const purchaseStats = useMemo(() => {
    const purchasesToCalculate = filterFactoryId === 'all' ? purchases : purchases.filter(p => p.factory_id === filterFactoryId)
    
    return purchasesToCalculate.reduce((acc, purchase) => ({
      totalPurchases: acc.totalPurchases + 1,
      totalSlabs: acc.totalSlabs + purchase.slabs_count,
      totalSft: acc.totalSft + purchase.sft,
      totalAmount: acc.totalAmount + purchase.total_amount
    }), {
      totalPurchases: 0,
      totalSlabs: 0,
      totalSft: 0,
      totalAmount: 0
    })
  }, [purchases, filterFactoryId])

  // Sort purchases
  const sortedPurchases = useMemo(() => {
    let filtered = purchases
    if (filterFactoryId !== 'all') {
      filtered = purchases.filter(purchase => purchase.factory_id === filterFactoryId)
    }
    
    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.purchase_date).getTime()
      const dateB = new Date(b.purchase_date).getTime()
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA
    })
  }, [purchases, sortOrder, filterFactoryId])

  return (
    <AppLayout>
      <div className="min-h-screen w-full bg-gray-50 p-4 sm:p-6 space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Unpolish Purchases</h1>
          <p className="text-gray-600 text-sm mt-1">Track unpolished material purchases from factories</p>
        </div>

        {/* KPI Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="text-sm text-blue-600 font-medium">Total Purchases</div>
            <div className="text-2xl font-bold text-blue-900 mt-1">{purchaseStats.totalPurchases}</div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="text-sm text-green-600 font-medium">Total Slabs</div>
            <div className="text-2xl font-bold text-green-900 mt-1">{formatIndianNumber(purchaseStats.totalSlabs)}</div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="text-sm text-purple-600 font-medium">Total SFT</div>
            <div className="text-2xl font-bold text-purple-900 mt-1">{formatIndianNumber(purchaseStats.totalSft)}</div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <div className="text-sm text-orange-600 font-medium">Total Amount</div>
            <div className="text-2xl font-bold text-orange-900 mt-1">₹{formatIndianNumber(purchaseStats.totalAmount)}</div>
          </Card>
        </div>

        {/* Data Entry Form */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">
            {isEditing ? 'Edit Purchase' : 'Add New Purchase'}
          </h2>
          
          {/* Row 1: Date and Factory */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className="w-full"
              />
            </div>

            {/* Factory */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Factory Name <span className="text-red-500">*</span>
                <button
                  onClick={() => setShowFactoryModal(true)}
                  className="ml-2 text-xs text-blue-600 hover:text-blue-700 inline-flex items-center gap-0.5"
                  title="Add new factory"
                >
                  <Plus className="w-3 h-3" />New
                </button>
              </label>
              <select
                value={formData.factory_id}
                onChange={(e) => handleInputChange('factory_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Factory</option>
                {factories.map(factory => (
                  <option key={factory.id} value={factory.id}>{factory.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Material Type, Slabs, SFT, Rate, Total, Remarks */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Material Type */}
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Material Type <span className="text-red-500">*</span>
                <button
                  onClick={() => setShowMaterialModal(true)}
                  className="ml-2 text-xs text-blue-600 hover:text-blue-700 inline-flex items-center gap-0.5"
                  title="Add new material type"
                >
                  <Plus className="w-3 h-3" />New
                </button>
              </label>
              <select
                value={formData.material_type_id}
                onChange={(e) => handleInputChange('material_type_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select</option>
                {materialTypes.map(material => (
                  <option key={material.id} value={material.id}>{material.name}</option>
                ))}
              </select>
            </div>

            {/* Slabs Count */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slabs
              </label>
              <Input
                type="number"
                value={formData.slabs_count}
                onChange={(e) => handleInputChange('slabs_count', e.target.value)}
                placeholder="0"
                min="0"
                step="1"
              />
            </div>

            {/* SFT */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SFT <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                value={formData.sft}
                onChange={(e) => handleInputChange('sft', e.target.value)}
                placeholder="0.000"
                min="0"
                step="0.001"
              />
            </div>

            {/* Rate/SFT */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rate/SFT <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                value={formData.rate_per_sft}
                onChange={(e) => handleInputChange('rate_per_sft', e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>

            {/* Total (Display Only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total
              </label>
              <div className="px-3 py-2 bg-gradient-to-br from-green-50 to-green-100 border border-green-300 rounded-md font-bold text-green-900 text-center">
                ₹{formatIndianNumber(total)}
              </div>
            </div>

            {/* Remarks */}
            <div className="col-span-2 md:col-span-3 lg:col-span-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Remarks
              </label>
              <Input
                type="text"
                value={formData.remarks}
                onChange={(e) => handleInputChange('remarks', e.target.value)}
                placeholder="Optional notes..."
              />
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : (isEditing ? 'Update Purchase' : 'Save Purchase')}
            </Button>
            {isEditing && (
              <Button
                onClick={resetForm}
                variant="outline"
              >
                Cancel
              </Button>
            )}
          </div>
        </Card>

        {/* Purchases List */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold">Purchase Records</h2>
            
            <div className="flex gap-2 items-center">
              {/* Factory Filter */}
              <select
                value={filterFactoryId}
                onChange={(e) => setFilterFactoryId(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Factories</option>
                {factories.map(factory => (
                  <option key={factory.id} value={factory.id}>{factory.name}</option>
                ))}
              </select>

              {/* Sort Order */}
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {sortOrder === 'asc' ? 'Oldest First' : 'Newest First'}
              </button>
            </div>
          </div>

          {purchasesLoading ? (
            <div className="text-center py-8 text-gray-500">Loading purchases...</div>
          ) : sortedPurchases.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No purchases found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Factory</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Slabs</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">SFT</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate/SFT</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedPurchases.map((purchase) => (
                    <tr key={purchase.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(purchase.purchase_date).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {purchase.purchase_number}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {purchase.factory_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {purchase.material_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {purchase.slabs_count}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {purchase.sft.toFixed(3)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        ₹{formatIndianNumber(purchase.rate_per_sft)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                        ₹{formatIndianNumber(purchase.total_amount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {purchase.remarks || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleEdit(purchase)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title="Edit"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(purchase)}
                            className="text-red-600 hover:text-red-800 p-1"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Add Factory Modal */}
      {showFactoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Add New Factory</h3>
            <Input
              type="text"
              value={newFactoryName}
              onChange={(e) => setNewFactoryName(e.target.value)}
              placeholder="Factory name"
              className="mb-4"
              onKeyPress={(e) => e.key === 'Enter' && createFactory()}
            />
            <div className="flex gap-2 justify-end">
              <Button
                onClick={() => {
                  setShowFactoryModal(false)
                  setNewFactoryName('')
                }}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={createFactory}
                disabled={addingFactory || !newFactoryName.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {addingFactory ? 'Adding...' : 'Add Factory'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Material Type Modal */}
      {showMaterialModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Add New Material Type</h3>
            <Input
              type="text"
              value={newMaterialName}
              onChange={(e) => setNewMaterialName(e.target.value)}
              placeholder="Material type name"
              className="mb-4"
              onKeyPress={(e) => e.key === 'Enter' && createMaterialType()}
            />
            <div className="flex gap-2 justify-end">
              <Button
                onClick={() => {
                  setShowMaterialModal(false)
                  setNewMaterialName('')
                }}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={createMaterialType}
                disabled={addingMaterial || !newMaterialName.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {addingMaterial ? 'Adding...' : 'Add Material'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
