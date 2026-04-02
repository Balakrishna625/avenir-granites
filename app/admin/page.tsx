'use client';

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import { PlusCircle, Users, CreditCard, ArrowLeft, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import Link from "next/link";
import { formatDisplayDate } from "@/lib/date-utils";

interface Customer {
  id: string;
  name: string;
  created_at: string;
  customer_type?: string;
}

interface BankAccount {
  id: string;
  name: string;
}

export default function AdminPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'customers' | 'banks'>('customers');
  const { showToast } = useToast();

  useEffect(() => {
    async function loadData() {
      try {
        const [customersRes, bankAccountsRes] = await Promise.all([
          fetch("/api/customers"),
          fetch("/api/bank-accounts")
        ]);
        
        const customersData = await customersRes.json();
        const bankAccountsData = await bankAccountsRes.json();
        
        setCustomers(customersData);
        setBankAccounts(bankAccountsData);
      } catch (error) {
        console.error("Failed to load data:", error);
        showToast("error", "Failed to load data. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, []);

  async function addCustomer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget; // Store form reference before async operations
    const formData = new FormData(form);
    const name = String(formData.get("customerName") || "").trim();
    const customer_type = String(formData.get("customerType") || "regular");
    
    if (!name) {
      showToast("error", "Customer name is required");
      return;
    }

    try {
      console.log('Adding customer:', { name, customer_type });
      
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, customer_type })
      });
      
      console.log('Response status:', res.status, res.statusText);
      
      const data = await res.json();
      console.log('Response data:', data);
      
      if (!res.ok) {
        showToast("error", data.error || "Failed to create customer");
        return;
      }
      
      setCustomers(prev => [data, ...prev]);
      form.reset();
      showToast("success", "Customer added successfully!");
    } catch (error) {
      console.error("Failed to add customer:", error);
      showToast("error", `Failed to add customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async function updateCustomerType(customerId: string, newType: string) {
    try {
      const res = await fetch("/api/customers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: customerId, customer_type: newType })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        showToast("error", data.error || "Failed to update customer type");
        return;
      }
      
      setCustomers(prev => 
        prev.map(c => c.id === customerId ? { ...c, customer_type: newType } : c)
      );
      showToast("success", `Customer type updated to ${newType}`);
    } catch (error) {
      console.error("Failed to update customer type:", error);
      showToast("error", "Failed to update customer type. Please try again.");
    }
  }

  async function deleteCustomer(customerId: string, customerName: string) {
    if (!confirm(`Are you sure you want to delete the customer "${customerName}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/customers?id=${customerId}`, {
        method: "DELETE"
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        if (data.inUse) {
          const usageDetails = [];
          if (data.consignmentCount > 0) {
            usageDetails.push(`${data.consignmentCount} consignment(s)`);
          }
          if (data.transactionCount > 0) {
            usageDetails.push(`${data.transactionCount} transaction(s)`);
          }
          
          showToast("error", `Cannot delete customer "${customerName}". This customer has ${usageDetails.join(' and ')}. Please remove those records first.`);
        } else {
          showToast("error", data.error || "Failed to delete customer");
        }
        return;
      }
      
      setCustomers(prev => prev.filter(customer => customer.id !== customerId));
      showToast("success", `Customer "${customerName}" deleted successfully!`);
    } catch (error) {
      console.error("Failed to delete customer:", error);
      showToast("error", "Failed to delete customer. Please try again.");
    }
  }

  async function addBankAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget; // Store form reference before async operations
    const formData = new FormData(form);
    const name = String(formData.get("bankAccountName") || "").trim();
    
    if (!name) {
      showToast("error", "Bank account name is required");
      return;
    }

    try {
      console.log('Adding bank account:', { name });
      
      const res = await fetch("/api/bank-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      
      console.log('Response status:', res.status, res.statusText);
      
      const data = await res.json();
      console.log('Response data:', data);
      
      if (!res.ok) {
        showToast("error", data.error || "Failed to create bank account");
        return;
      }
      
      setBankAccounts(prev => [data, ...prev]);
      form.reset();
      showToast("success", "Bank account added successfully!");
    } catch (error) {
      console.error("Failed to add bank account:", error);
      showToast("error", `Failed to add bank account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async function deleteBankAccount(accountId: string, accountName: string) {
    if (!confirm(`Are you sure you want to delete the bank account "${accountName}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/bank-accounts?id=${accountId}`, {
        method: "DELETE"
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        if (data.inUse) {
          showToast("error", `Cannot delete bank account "${accountName}". This account is being used in ${data.usageCount} transaction(s). Please remove those transactions first.`);
        } else {
          showToast("error", data.error || "Failed to delete bank account");
        }
        return;
      }
      
      setBankAccounts(prev => prev.filter(account => account.id !== accountId));
      showToast("success", `Bank account "${accountName}" deleted successfully!`);
    } catch (error) {
      console.error("Failed to delete bank account:", error);
      showToast("error", "Failed to delete bank account. Please try again.");
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
          <div className="text-lg text-gray-600">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen w-full bg-gray-50 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/">
            <Button variant="secondary" className="flex items-center space-x-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
        </div>
        <div className="flex space-x-3">
          <Link href="/analytics">
            <Button variant="secondary">Analytics</Button>
          </Link>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-2 border-b">
        <button
          onClick={() => setActiveTab('customers')}
          className={`px-4 py-2 font-medium rounded-t-lg ${
            activeTab === 'customers'
              ? 'bg-white border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Customers</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('banks')}
          className={`px-4 py-2 font-medium rounded-t-lg ${
            activeTab === 'banks'
              ? 'bg-white border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center space-x-2">
            <CreditCard className="w-4 h-4" />
            <span>Bank Accounts</span>
          </div>
        </button>
      </div>

      {/* Customers Tab */}
      {activeTab === 'customers' && (
        <div className="space-y-6">
          {/* Add Customer Form */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
              <PlusCircle className="w-5 h-5" />
              <span>Add New Customer</span>
            </h2>
            <form onSubmit={addCustomer} className="flex items-end space-x-4">
              <div className="flex-1">
                <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Name
                </label>
                <Input
                  id="customerName"
                  name="customerName"
                  type="text"
                  placeholder="Enter customer name"
                  required
                  className="w-full"
                />
              </div>
              <div className="w-48">
                <label htmlFor="customerType" className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Type
                </label>
                <select
                  id="customerType"
                  name="customerType"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue="regular"
                >
                  <option value="regular">Regular</option>
                  <option value="one-time">One-Time</option>
                </select>
              </div>
              <Button type="submit" className="flex items-center space-x-2">
                <PlusCircle className="w-4 h-4" />
                <span>Add Customer</span>
              </Button>
            </form>
          </Card>

          {/* Customers List */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Existing Customers</h2>
            {customers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No customers found</p>
            ) : (
              <div className="space-y-2">
                {customers.map((customer) => (
                  <div
                    key={customer.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{customer.name}</div>
                      <div className="text-sm text-gray-500">
                        Created: {formatDisplayDate(customer.created_at)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        value={customer.customer_type || 'regular'}
                        onChange={(e) => updateCustomerType(customer.id, e.target.value)}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="regular">Regular</option>
                        <option value="one-time">One-Time</option>
                      </select>
                      <Button
                        onClick={() => deleteCustomer(customer.id, customer.name)}
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Bank Accounts Tab */}
      {activeTab === 'banks' && (
        <div className="space-y-6">
          {/* Add Bank Account Form */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
              <PlusCircle className="w-5 h-5" />
              <span>Add New Bank Account</span>
            </h2>
            <form onSubmit={addBankAccount} className="flex items-end space-x-4">
              <div className="flex-1">
                <label htmlFor="bankAccountName" className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Account Name
                </label>
                <Input
                  id="bankAccountName"
                  name="bankAccountName"
                  type="text"
                  placeholder="Enter bank account name"
                  required
                  className="w-full"
                />
              </div>
              <Button type="submit" className="flex items-center space-x-2">
                <PlusCircle className="w-4 h-4" />
                <span>Add Account</span>
              </Button>
            </form>
          </Card>

          {/* Bank Accounts List */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Existing Bank Accounts</h2>
            {bankAccounts.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No bank accounts found</p>
            ) : (
              <div className="space-y-2">
                {bankAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="font-medium text-gray-900">{account.name}</div>
                    <Button
                      onClick={() => deleteBankAccount(account.id, account.name)}
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
    </AppLayout>
  );
}