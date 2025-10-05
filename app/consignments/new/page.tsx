'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Building2 } from 'lucide-react';
import Link from 'next/link';
import { AppLayout } from '@/components/AppLayout';

interface Supplier {
  id: string;
  name: string;
  contact_person: string;
}

export default function NewConsignmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [formData, setFormData] = useState({
    consignment_number: '',
    supplier_id: '',
    arrival_date: '',
    payment_cash: '',
    payment_upi: '',
    transport_cost: '',
    notes: ''
  });

  useEffect(() => {
    loadSuppliers();
    // Auto-generate consignment number
    const today = new Date();
    const dateStr = today.toISOString().slice(2, 10).replace(/-/g, '');
    const consignmentNumber = `CON-${dateStr}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    setFormData(prev => ({ ...prev, consignment_number: consignmentNumber }));
  }, []);

  const loadSuppliers = async () => {
    try {
      // Mock data for now
      const mockSuppliers: Supplier[] = [
        { id: '1', name: 'Rising Sun Exports', contact_person: 'Manager' },
        { id: '2', name: 'Bargandy Quarry', contact_person: 'Sales Head' },
        { id: '3', name: 'Local Granite Quarry', contact_person: 'Owner' }
      ];
      setSuppliers(mockSuppliers);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.consignment_number || !formData.supplier_id || !formData.arrival_date) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('/api/granite-consignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to create consignment');
      
      const result = await response.json();
      
      // Calculate totals for display
      const paymentCash = parseFloat(formData.payment_cash || '0');
      const paymentUpi = parseFloat(formData.payment_upi || '0');
      const transportCost = parseFloat(formData.transport_cost || '0');
      const totalExpenditure = paymentCash + paymentUpi + transportCost;
      
      alert(`Consignment created successfully!\n\nConsignment Number: ${formData.consignment_number}\nTotal Expenditure: ₹${totalExpenditure.toLocaleString()}`);
      
      // Redirect to the new consignment detail page
      router.push(`/consignments/${result.id}`);
    } catch (error) {
      console.error('Error creating consignment:', error);
      alert('Failed to create consignment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const totalExpenditure = 
    parseFloat(formData.payment_cash || '0') + 
    parseFloat(formData.payment_upi || '0') + 
    parseFloat(formData.transport_cost || '0');

  return (
    <AppLayout>
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/consignments">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">New Consignment</h1>
          <p className="text-gray-600 mt-1">Create a new granite consignment</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Consignment Details */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Consignment Details
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Consignment Number *
              </label>
              <Input
                value={formData.consignment_number}
                onChange={(e) => setFormData({ ...formData, consignment_number: e.target.value })}
                placeholder="CON-241005-001"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier *
              </label>
              <select
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
                required
              >
                <option value="">Select Supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name} ({supplier.contact_person})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Arrival Date *
              </label>
              <Input
                type="date"
                value={formData.arrival_date}
                onChange={(e) => setFormData({ ...formData, arrival_date: e.target.value })}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <Input
                value="ACTIVE"
                disabled
                className="bg-gray-50"
              />
            </div>
          </div>
        </Card>

        {/* Payment Details */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cash Payment (₹)
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.payment_cash}
                onChange={(e) => setFormData({ ...formData, payment_cash: e.target.value })}
                placeholder="50000"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                UPI Payment (₹)
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.payment_upi}
                onChange={(e) => setFormData({ ...formData, payment_upi: e.target.value })}
                placeholder="25000"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transport Cost (₹)
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.transport_cost}
                onChange={(e) => setFormData({ ...formData, transport_cost: e.target.value })}
                placeholder="5000"
              />
            </div>
          </div>
          
          {/* Total Expenditure Display */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium text-gray-900">Total Expenditure:</span>
              <span className="text-2xl font-bold text-blue-600">
                ₹{totalExpenditure.toLocaleString()}
              </span>
            </div>
          </div>
        </Card>

        {/* Notes */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 h-24 resize-none"
              placeholder="Any additional notes about this consignment..."
            />
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end">
          <Link href="/consignments">
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Consignment'}
          </Button>
        </div>
      </form>
    </div>
    </AppLayout>
  );
}
