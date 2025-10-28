"use client"

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Package, Plus, Trash2, Users, X, Check } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { useToast } from '@/components/ui/toast'

interface Consignment {
  id: string
  consignment_number: string
  arrival_date: string
  supplier_id: string
}

interface ConsignmentGroup {
  id: string
  group_name: string
  description: string
  created_at: string
  total_consignments: number
  consignments_in_group: Array<{
    consignment_id: string
    consignment_number: string
    arrival_date: string
  }>
}

export default function ConsignmentGroupingPage() {
  const { showToast } = useToast()
  const [groups, setGroups] = useState<ConsignmentGroup[]>([])
  const [consignments, setConsignments] = useState<Consignment[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewGroupForm, setShowNewGroupForm] = useState(false)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [selectedConsignments, setSelectedConsignments] = useState<string[]>([])
  
  const [newGroup, setNewGroup] = useState({
    group_name: '',
    description: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [groupsRes, consignmentsRes] = await Promise.all([
        fetch('/api/consignment-groups'),
        fetch('/api/granite-consignments')
      ])

      if (groupsRes.ok) {
        const groupsData = await groupsRes.json()
        setGroups(groupsData)
      }

      if (consignmentsRes.ok) {
        const consignmentsData = await consignmentsRes.json()
        setConsignments(consignmentsData)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      showToast('error', 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGroup = async () => {
    if (!newGroup.group_name.trim()) {
      showToast('error', 'Please enter a group name')
      return
    }

    if (selectedConsignments.length === 0) {
      showToast('error', 'Please select at least one consignment')
      return
    }

    try {
      const response = await fetch('/api/consignment-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_name: newGroup.group_name,
          description: newGroup.description,
          consignment_ids: selectedConsignments
        })
      })

      if (response.ok) {
        showToast('success', 'Group created successfully')
        setNewGroup({ group_name: '', description: '' })
        setSelectedConsignments([])
        setShowNewGroupForm(false)
        fetchData()
      } else {
        const error = await response.json()
        showToast('error', error.error || 'Failed to create group')
      }
    } catch (error) {
      console.error('Error creating group:', error)
      showToast('error', 'Failed to create group')
    }
  }

  const handleAddConsignmentsToGroup = async (groupId: string) => {
    if (selectedConsignments.length === 0) {
      showToast('error', 'Please select consignments to add')
      return
    }

    try {
      const response = await fetch(`/api/consignment-groups/${groupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consignment_ids: selectedConsignments })
      })

      if (response.ok) {
        showToast('success', 'Consignments added to group')
        setSelectedConsignments([])
        setEditingGroupId(null)
        fetchData()
      } else {
        const error = await response.json()
        showToast('error', error.error || 'Failed to add consignments')
      }
    } catch (error) {
      console.error('Error adding consignments:', error)
      showToast('error', 'Failed to add consignments')
    }
  }

  const handleRemoveConsignmentFromGroup = async (groupId: string, consignmentId: string) => {
    try {
      const response = await fetch(`/api/consignment-groups/${groupId}/members/${consignmentId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        showToast('success', 'Consignment removed from group')
        fetchData()
      } else {
        showToast('error', 'Failed to remove consignment')
      }
    } catch (error) {
      console.error('Error removing consignment:', error)
      showToast('error', 'Failed to remove consignment')
    }
  }

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this group? This will not delete the consignments.')) {
      return
    }

    try {
      const response = await fetch(`/api/consignment-groups/${groupId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        showToast('success', 'Group deleted successfully')
        fetchData()
      } else {
        showToast('error', 'Failed to delete group')
      }
    } catch (error) {
      console.error('Error deleting group:', error)
      showToast('error', 'Failed to delete group')
    }
  }

  const toggleConsignmentSelection = (consignmentId: string) => {
    setSelectedConsignments(prev =>
      prev.includes(consignmentId)
        ? prev.filter(id => id !== consignmentId)
        : [...prev, consignmentId]
    )
  }

  const getAvailableConsignments = (groupId?: string) => {
    const usedConsignmentIds = new Set<string>()
    groups.forEach(group => {
      if (group.id !== groupId) {
        group.consignments_in_group?.forEach(c => usedConsignmentIds.add(c.consignment_id))
      }
    })
    return consignments.filter(c => !usedConsignmentIds.has(c.id))
  }

  return (
    <AppLayout>
      <div className="min-h-screen w-full bg-gray-50 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Consignment Grouping</h1>
            <p className="text-gray-600 text-sm mt-1">Group related consignments for combined tracking</p>
          </div>
          <Button
            onClick={() => setShowNewGroupForm(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Group
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading groups...</div>
        ) : (
          <>
            {/* New Group Form */}
            {showNewGroupForm && (
              <Card className="p-6 border-2 border-blue-200 bg-blue-50">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Create New Group</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowNewGroupForm(false)
                      setNewGroup({ group_name: '', description: '' })
                      setSelectedConsignments([])
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Group Name *</label>
                    <Input
                      value={newGroup.group_name}
                      onChange={(e) => setNewGroup({ ...newGroup, group_name: e.target.value })}
                      placeholder="e.g., AVG Group 1, January 2025 Batch"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <Input
                      value={newGroup.description}
                      onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                      placeholder="Optional description"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Select Consignments * ({selectedConsignments.length} selected)
                    </label>
                    <div className="border rounded-lg max-h-60 overflow-y-auto bg-white">
                      {getAvailableConsignments().map((consignment) => (
                        <div
                          key={consignment.id}
                          className={`p-3 border-b hover:bg-gray-50 cursor-pointer flex items-center gap-3 ${
                            selectedConsignments.includes(consignment.id) ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => toggleConsignmentSelection(consignment.id)}
                        >
                          <div className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                            selectedConsignments.includes(consignment.id)
                              ? 'bg-blue-500 border-blue-500'
                              : 'border-gray-300'
                          }`}>
                            {selectedConsignments.includes(consignment.id) && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{consignment.consignment_number}</p>
                            <p className="text-xs text-gray-600">
                              Arrival: {new Date(consignment.arrival_date).toLocaleDateString('en-IN')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleCreateGroup} className="flex-1">
                      Create Group
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowNewGroupForm(false)
                        setNewGroup({ group_name: '', description: '' })
                        setSelectedConsignments([])
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Groups List */}
            <div className="space-y-3">
              {groups.length === 0 ? (
                <Card className="p-12 text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No groups created yet</p>
                  <p className="text-sm text-gray-400 mt-1">Create your first group to organize consignments</p>
                </Card>
              ) : (
                groups.map((group) => (
                  <Card key={group.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="bg-purple-100 p-2 rounded-lg">
                            <Users className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold">{group.group_name}</h3>
                            {group.description && (
                              <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingGroupId(editingGroupId === group.id ? null : group.id)}
                        >
                          {editingGroupId === group.id ? 'Done' : 'Add More'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteGroup(group.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Add Consignments Section */}
                    {editingGroupId === group.id && (
                      <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm font-medium mb-2">
                          Select consignments to add ({selectedConsignments.length} selected)
                        </p>
                        <div className="border rounded-lg max-h-48 overflow-y-auto bg-white mb-3">
                          {getAvailableConsignments(group.id).map((consignment) => (
                            <div
                              key={consignment.id}
                              className={`p-2 border-b hover:bg-gray-50 cursor-pointer flex items-center gap-2 text-sm ${
                                selectedConsignments.includes(consignment.id) ? 'bg-blue-50' : ''
                              }`}
                              onClick={() => toggleConsignmentSelection(consignment.id)}
                            >
                              <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                                selectedConsignments.includes(consignment.id)
                                  ? 'bg-blue-500 border-blue-500'
                                  : 'border-gray-300'
                              }`}>
                                {selectedConsignments.includes(consignment.id) && (
                                  <Check className="w-3 h-3 text-white" />
                                )}
                              </div>
                              <span className="font-medium">{consignment.consignment_number}</span>
                            </div>
                          ))}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAddConsignmentsToGroup(group.id)}
                          disabled={selectedConsignments.length === 0}
                        >
                          Add Selected
                        </Button>
                      </div>
                    )}

                    {/* Consignments in Group */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Consignments in Group ({group.total_consignments})
                      </p>
                      <div className="space-y-2">
                        {group.consignments_in_group?.map((consignment) => (
                          <div
                            key={consignment.consignment_id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                          >
                            <div className="flex items-center gap-3">
                              <Package className="w-4 h-4 text-gray-600" />
                              <div>
                                <p className="font-medium">{consignment.consignment_number}</p>
                                <p className="text-xs text-gray-600">
                                  Arrival: {new Date(consignment.arrival_date).toLocaleDateString('en-IN')}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveConsignmentFromGroup(group.id, consignment.consignment_id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
