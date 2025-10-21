/**
 * EXAMPLE: Using Unsaved Changes Warning on an Edit Page
 * 
 * This example shows how to implement the unsaved changes warning
 * on a page that loads existing data and allows editing.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import { UnsavedChangesIndicator } from '@/components/ui/UnsavedChangesIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

export default function EditCustomerPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Current form data
  const [formData, setFormData] = useState<Customer | null>(null);
  
  // Initial data as loaded from server (for comparison)
  const [initialData, setInitialData] = useState<Customer | null>(null);
  
  // Check if form has unsaved changes
  const hasUnsavedChanges = 
    formData && initialData 
      ? JSON.stringify(formData) !== JSON.stringify(initialData)
      : false;
  
  // Enable unsaved changes warning
  const { allowNavigation } = useUnsavedChangesWarning(
    hasUnsavedChanges,
    'You have unsaved changes to this customer. Are you sure you want to leave?'
  );
  
  // Load customer data on mount
  useEffect(() => {
    loadCustomer();
  }, [params.id]);
  
  const loadCustomer = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/customers/${params.id}`);
      const data = await response.json();
      
      // Set both current and initial data
      setFormData(data);
      setInitialData(data); // ← Important: Save as initial state
    } catch (error) {
      console.error('Failed to load customer:', error);
      alert('Failed to load customer');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/customers/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save customer');
      }
      
      // After successful save:
      // 1. Allow navigation (important!)
      allowNavigation();
      
      // 2. Update initial data so form is no longer "dirty"
      setInitialData(formData);
      
      // 3. Show success message
      alert('Customer saved successfully!');
      
      // 4. Navigate away (optional)
      // router.push('/customers');
      
    } catch (error) {
      console.error('Failed to save customer:', error);
      alert('Failed to save customer');
    } finally {
      setSaving(false);
    }
  };
  
  const handleCancel = () => {
    // If there are unsaved changes, the warning will show automatically
    // when user clicks back or tries to navigate
    router.back();
  };
  
  const handleReset = () => {
    if (hasUnsavedChanges) {
      if (window.confirm('Discard all changes and reset to original values?')) {
        setFormData(initialData); // Reset to initial
      }
    }
  };
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!formData) {
    return <div>Customer not found</div>;
  }
  
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Customer</h1>
        <p className="text-gray-600">Update customer information</p>
      </div>
      
      {/* Show unsaved changes indicator */}
      <UnsavedChangesIndicator hasUnsavedChanges={hasUnsavedChanges} />
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Phone</label>
          <Input
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Address</label>
          <Input
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
        </div>
        
        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={saving || !hasUnsavedChanges}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleReset}
            disabled={!hasUnsavedChanges}
          >
            Reset
          </Button>
          
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleCancel}
          >
            Cancel
          </Button>
        </div>
      </form>
      
      {/* Optional: Show what changed */}
      {hasUnsavedChanges && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
          <strong>Modified fields:</strong>
          <ul className="mt-1 ml-4 list-disc">
            {initialData && formData.name !== initialData.name && <li>Name</li>}
            {initialData && formData.email !== initialData.email && <li>Email</li>}
            {initialData && formData.phone !== initialData.phone && <li>Phone</li>}
            {initialData && formData.address !== initialData.address && <li>Address</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * KEY POINTS:
 * 
 * 1. Track both `formData` (current) and `initialData` (loaded from server)
 * 
 * 2. Set `initialData` when loading data from server
 * 
 * 3. Compare them to detect changes:
 *    hasChanges = JSON.stringify(formData) !== JSON.stringify(initialData)
 * 
 * 4. Call `allowNavigation()` after successful save
 * 
 * 5. Optionally update `initialData = formData` after save to stay on page
 * 
 * 6. The warning works automatically for:
 *    - Browser back button
 *    - Browser refresh
 *    - Navigation links
 *    - router.push/back calls
 * 
 * 7. No need to manually confirm on Cancel button - the warning shows automatically
 */
