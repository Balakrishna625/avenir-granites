'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Package, TrendingUp, DollarSign, Truck } from 'lucide-react';
import Link from 'next/link';

interface Supplier {
  id: string;
  name: string;
  contact_person: string;
}

interface Consignment {
  id: string;
  consignment_number: string;
  supplier_id: string;
  arrival_date: string;
  total_blocks: number;
  total_net_measurement: number;
  total_gross_measurement: number;
  total_elavance: number;
  payment_cash: number;
  payment_upi: number;
  transport_cost: number;
  total_expenditure: number;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  supplier?: Supplier;
}

export default function ConsignmentsPage() {
  const [consignments, setConsignments] = useState<Consignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const totalConsignments = consignments.length;
  const totalBlocks = consignments.reduce((sum, c) => sum + (c.total_blocks || 0), 0);
  const totalNetMeasurement = consignments.reduce((sum, c) => sum + (c.total_net_measurement || 0), 0);
  const totalExpenditure = consignments.reduce((sum, c) => sum + (c.total_expenditure || 0), 0);

  const filteredConsignments = consignments.filter(consignment => {
    const matchesSearch = consignment.consignment_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         consignment.supplier?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || consignment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    loadConsignments();
  }, []);

  const loadConsignments = async () => {
    try {
      const mockData: Consignment[] = [
        {
          id: '1',
          consignment_number: 'CON-001',
          supplier_id: '1',
          arrival_date: '2024-01-15',
          total_blocks: 25,
          total_net_measurement: 450.5,
          total_gross_measurement: 520.0,
          total_elavance: 69.5,
          payment_cash: 50000,
          payment_upi: 25000,
          transport_cost: 5000,
          total_expenditure: 80000,
          status: 'ACTIVE',
          supplier: { id: '1', name: 'Rising Sun Exports', contact_person: 'Manager' }
        },
        {
          id: '2',
          consignment_number: 'CON-002',
          supplier_id: '2',
          arrival_date: '2024-01-20',
          total_blocks: 18,
          total_net_measurement: 320.8,
          total_gross_measurement: 375.0,
          total_elavance: 54.2,
          payment_cash: 35000,
          payment_upi: 15000,
          transport_cost: 3500,
          total_expenditure: 53500,
          status: 'ACTIVE',
          supplier: { id: '2', name: 'Bargandy Quarry', contact_person: 'Sales Head' }
        }
      ];
      setConsignments(mockData);
    } catch (error) {
      console.error('Error loading consignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'COMPLETED': return 'bg-blue-100 text-blue-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading consignments...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Granite Consignments</h1>
          <p className="text-gray-600 mt-1">Manage granite consignments and blocks</p>
        </div>
        <Link href="/consignments/new">
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Consignment
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Consignments</p>
              <p className="text-2xl font-bold text-gray-900">{totalConsignments}</p>
            </div>
            <Package className="w-8 h-8 text-blue-600" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Blocks</p>
              <p className="text-2xl font-bold text-gray-900">{totalBlocks}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Measurement</p>
              <p className="text-2xl font-bold text-gray-900">{totalNetMeasurement.toFixed(1)}m</p>
            </div>
            <Truck className="w-8 h-8 text-purple-600" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Expenditure</p>
              <p className="text-2xl font-bold text-gray-900">₹{totalExpenditure.toLocaleString()}</p>
            </div>
            <DollarSign className="w-8 h-8 text-orange-600" />
          </div>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by consignment number or supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 bg-white"
        >
          <option value="all">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Consignment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Blocks
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Net Measurement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expenditure
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredConsignments.map((consignment) => (
                <tr key={consignment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{consignment.consignment_number}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-900">{consignment.supplier?.name}</div>
                    <div className="text-sm text-gray-500">{consignment.supplier?.contact_person}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                    {new Date(consignment.arrival_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                    {consignment.total_blocks || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                    {(consignment.total_net_measurement || 0).toFixed(1)}m
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                    ₹{(consignment.total_expenditure || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(consignment.status)}`}>
                      {consignment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link href={`/consignments/${consignment.id}`}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredConsignments.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No consignments found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.' 
                : 'Get started by creating a new consignment.'}
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <div className="mt-6">
                <Link href="/consignments/new">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    New Consignment
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
