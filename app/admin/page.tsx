'use client';

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle, Users, CreditCard, ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";

interface Customer {
  id: string;
  name: string;
  created_at: string;
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
        alert("Failed to load data. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, []);

  async function addCustomer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = String(formData.get("customerName") || "").trim();
    
    if (!name) {
      alert("Customer name is required");
      return;
    }

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        alert(data.error || "Failed to create customer");
        return;
      }
      
      setCustomers(prev => [data, ...prev]);
      e.currentTarget.reset();
      alert("Customer added successfully!");
    } catch (error) {
      console.error("Failed to add customer:", error);
      alert("Failed to add customer. Please try again.");
    }
  }

  async function addBankAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = String(formData.get("bankAccountName") || "").trim();
    
    if (!name) {
      alert("Bank account name is required");
      return;
    }

    try {
      const res = await fetch("/api/bank-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        alert(data.error || "Failed to create bank account");
        return;
      }
      
      setBankAccounts(prev => [data, ...prev]);
      e.currentTarget.reset();
      alert("Bank account added successfully!");
    } catch (error) {
      console.error("Failed to add bank account:", error);
      alert("Failed to add bank account. Please try again.");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
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
                    <div>
                      <div className="font-medium text-gray-900">{customer.name}</div>
                      <div className="text-sm text-gray-500">
                        Created: {new Date(customer.created_at).toLocaleDateString()}
                      </div>
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
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}