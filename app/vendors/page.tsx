'use client';

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { 
  Plus,
  Users,
  TrendingUp,
  TrendingDown,
  DollarSign,
  X,
  AlertCircle
} from "lucide-react";

const INR = new Intl.NumberFormat("en-IN", { 
  style: "currency", 
  currency: "INR", 
  maximumFractionDigits: 0 
});
const fmt = (n: number) => INR.format(n || 0);

interface Vendor {
  id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  vendor_code?: string;
  gst_number?: string;
  payment_terms?: string;
  balance: number;
  total_purchases: number;
  total_payments: number;
}

export default function VendorsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [newVendor, setNewVendor] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: ''
  });

  useEffect(() => {
    loadVendors();
  }, []);

  async function loadVendors() {
    try {
      setLoading(true);
      const response = await fetch('/api/vendors');
      if (!response.ok) throw new Error('Failed to load vendors');
      
      const data = await response.json();
      setVendors(data);
    } catch (error) {
      console.error('Failed to load vendors:', error);
      showToast('error', 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  }

  const handleAddVendor = async () => {
    if (!newVendor.name.trim()) {
      showToast('error', 'Vendor name is required');
      return;
    }

    try {
      const response = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVendor)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add vendor');
      }

      showToast('success', 'Vendor added successfully');
      setShowAddModal(false);
      setNewVendor({ name: '', contact_person: '', phone: '', email: '', address: '' });
      await loadVendors();
    } catch (error: any) {
      console.error('Failed to add vendor:', error);
      showToast('error', error.message || 'Failed to add vendor');
    }
  };

  const totalBalance = vendors.reduce((sum, v) => sum + v.balance, 0);
  const vendorsWithBalance = vendors.filter(v => v.balance > 0).length;
  const totalPurchases = vendors.reduce((sum, v) => sum + v.total_purchases, 0);
  const totalPayments = vendors.reduce((sum, v) => sum + v.total_payments, 0);

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg text-gray-600">Loading vendors...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen w-full bg-gray-50 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              Vendor Management
            </h1>
            <p className="text-gray-600 mt-1">Track vendor balances, purchases, and payments</p>
          </div>
          <Button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Vendor
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Vendors</p>
                  <p className="text-2xl font-bold text-gray-900">{vendors.length}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Outstanding Balance</p>
                  <p className="text-2xl font-bold text-red-600">{fmt(totalBalance)}</p>
                  <p className="text-xs text-gray-500 mt-1">{vendorsWithBalance} vendors</p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Purchases</p>
                  <p className="text-2xl font-bold text-orange-600">{fmt(totalPurchases)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Payments</p>
                  <p className="text-2xl font-bold text-green-600">{fmt(totalPayments)}</p>
                </div>
                <TrendingDown className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Vendors Table */}
        <Card>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Vendor Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Contact</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Total Purchases</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Total Payments</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Balance Due</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {vendors.map((vendor) => (
                    <tr 
                      key={vendor.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/vendors/${vendor.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{vendor.name}</p>
                          {vendor.vendor_code && (
                            <p className="text-xs text-gray-500">{vendor.vendor_code}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-600">
                          {vendor.contact_person && <p>{vendor.contact_person}</p>}
                          {vendor.phone && <p className="text-xs">{vendor.phone}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-orange-600">
                        {fmt(vendor.total_purchases)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-green-600">
                        {fmt(vendor.total_payments)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold ${
                          vendor.balance > 0 ? 'text-red-600' : 
                          vendor.balance < 0 ? 'text-green-600' : 
                          'text-gray-600'
                        }`}>
                          {fmt(vendor.balance)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/vendors/${vendor.id}`);
                          }}
                          variant="outline"
                          size="sm"
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {vendors.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium">No vendors found</p>
                <p className="text-gray-400 text-sm mt-2">Click "Add Vendor" to get started</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Vendor Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Add New Vendor</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor Name *
                  </label>
                  <Input
                    value={newVendor.name}
                    onChange={(e) => setNewVendor({...newVendor, name: e.target.value})}
                    placeholder="Enter vendor name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person
                  </label>
                  <Input
                    value={newVendor.contact_person}
                    onChange={(e) => setNewVendor({...newVendor, contact_person: e.target.value})}
                    placeholder="Enter contact person name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <Input
                    value={newVendor.phone}
                    onChange={(e) => setNewVendor({...newVendor, phone: e.target.value})}
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={newVendor.email}
                    onChange={(e) => setNewVendor({...newVendor, email: e.target.value})}
                    placeholder="Enter email address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <Input
                    value={newVendor.address}
                    onChange={(e) => setNewVendor({...newVendor, address: e.target.value})}
                    placeholder="Enter address"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleAddVendor}
                    variant="default"
                    className="flex-1"
                  >
                    Add Vendor
                  </Button>
                  <Button
                    onClick={() => setShowAddModal(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
