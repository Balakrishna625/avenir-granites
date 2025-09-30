'use client';

import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Mountain, 
  Boxes, 
  Scissors, 
  DollarSign, 
  ShoppingBag,
  TrendingUp,
  Package,
  AlertTriangle,
  BarChart3,
  Users,
  Download,
  Plus,
  Clock
} from "lucide-react";
import Link from "next/link";

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const fmt = (n: number) => INR.format(n || 0);

export default function GraniteDashboard() {
  const [dashboardData, setDashboardData] = useState({
    totalConsignments: 12,
    totalProfit: 477740.27,
    avgProfitMargin: 29.25,
    totalSqftProduced: 16331.88,
    avgCostPerSqft: 115.30,
    avgSellingRate: 144.55,
    totalInventory: 2450.5, // Remaining sqft
    activeBlocks: 24,
    totalExpenditure: 1229836,
    netMeasurement: 33.797,
    grossMeasurement: 52.273,
    topBuyers: [
      { name: 'SAIKRUPA', totalPurchases: 6542.35, totalProfit: 182456.78, avgRate: 154.2 },
      { name: 'CHAMUDE', totalPurchases: 4231.89, totalProfit: 124568.34, avgRate: 148.5 },
      { name: 'LOCAL GANDHI', totalPurchases: 2847.12, totalProfit: 79234.56, avgRate: 146.8 }
    ],
    recentSales: [
      { buyer: 'CHAMUDE', blockPart: 'AVG36A', sqft: 775.745, rate: 145, profit: 22943.18, date: '2023-11-04' },
      { buyer: 'SAIKRUPA', blockPart: 'AVG33B', sqft: 1433.74, rate: 143, profit: 39936.31, date: '2023-11-18' },
      { buyer: 'SAIKRUPA', blockPart: 'AVG33A', sqft: 765.927, rate: 143, profit: 21331.50, date: '2023-11-21' },
      { buyer: 'LOCAL GANDHI', blockPart: 'AVG34B', sqft: 385.0, rate: 145, profit: 11318.75, date: '2023-11-18' }
    ],
    consignmentAnalytics: [
      { 
        consignment: 'RISING SUN-29.09.23', 
        supplier: 'Rising Sun Exports',
        totalBlocks: 6,
        netMeasurement: 33.797,
        totalSqft: 16331.88,
        totalCost: 1229836,
        costPerSqft: 75.30,
        profit: 477740.27,
        profitMargin: 38.8
      }
    ]
  });

  const profitMargin = dashboardData.totalProfit > 0 ? 
    (dashboardData.totalProfit / (dashboardData.totalExpenditure + dashboardData.totalProfit) * 100) : 0;

  return (
    <AppLayout>
      <div className="min-h-screen w-full bg-gray-50 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Granite Processing Dashboard</h1>
            <p className="text-gray-600">Monitor your quarry to slab processing operations</p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" className="flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Export Report</span>
            </Button>
            <Link href="/granite/consignments">
              <Button className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>New Consignment</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Profit</p>
                  <p className="text-2xl font-bold text-green-600">₹{dashboardData.totalProfit.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Avg Margin: {dashboardData.avgProfitMargin.toFixed(2)}%</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Production</p>
                  <p className="text-2xl font-bold text-blue-600">{dashboardData.totalSqftProduced.toLocaleString()} Sqft</p>
                  <p className="text-xs text-gray-500">From {dashboardData.totalConsignments} consignments</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Mountain className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Cost vs Selling Rate</p>
                  <p className="text-2xl font-bold text-purple-600">₹{dashboardData.avgCostPerSqft.toFixed(0)} / ₹{dashboardData.avgSellingRate.toFixed(0)}</p>
                  <p className="text-xs text-gray-500">Per sqft (Cost/Selling)</p>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Inventory Remaining</p>
                  <p className="text-2xl font-bold text-orange-600">{dashboardData.totalInventory.toLocaleString()} Sqft</p>
                  <p className="text-xs text-gray-500">From {dashboardData.activeBlocks} active blocks</p>
                </div>
                <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Boxes className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Consignment Performance */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                Consignment Performance
              </h3>
              <div className="space-y-4">
                {dashboardData.consignmentAnalytics.map((consignment, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900">{consignment.consignment}</h4>
                        <p className="text-sm text-gray-600">{consignment.supplier}</p>
                      </div>
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                        {consignment.profitMargin.toFixed(1)}% margin
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Blocks: <span className="font-medium">{consignment.totalBlocks}</span></p>
                        <p className="text-gray-600">Net Measurement: <span className="font-medium">{consignment.netMeasurement}m</span></p>
                        <p className="text-gray-600">Total SqFt: <span className="font-medium">{consignment.totalSqft.toLocaleString()}</span></p>
                      </div>
                      <div>
                        <p className="text-gray-600">Total Cost: <span className="font-medium">₹{consignment.totalCost.toLocaleString()}</span></p>
                        <p className="text-gray-600">Cost/SqFt: <span className="font-medium">₹{consignment.costPerSqft.toFixed(2)}</span></p>
                        <p className="text-green-600">Profit: <span className="font-bold">₹{consignment.profit.toLocaleString()}</span></p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Buyers */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2 text-green-600" />
                Top Buyers
              </h3>
              <div className="space-y-4">
                {dashboardData.topBuyers.map((buyer, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">{buyer.name}</h4>
                      <p className="text-sm text-gray-600">{buyer.totalPurchases.toLocaleString()} sqft purchased</p>
                      <p className="text-xs text-green-600">Avg rate: ₹{buyer.avgRate}/sqft</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">₹{buyer.totalProfit.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">Total profit</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Sales Activity */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <ShoppingBag className="h-5 w-5 mr-2 text-purple-600" />
              Recent Sales Activity
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Buyer</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Block Part</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">SqFt</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Rate</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.recentSales.map((sale, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-3 px-4 text-sm text-gray-600">{sale.date}</td>
                      <td className="py-3 px-4 text-sm font-medium">{sale.buyer}</td>
                      <td className="py-3 px-4 text-sm text-blue-600">{sale.blockPart}</td>
                      <td className="py-3 px-4 text-sm text-right">{sale.sqft.toLocaleString()}</td>
                      <td className="py-3 px-4 text-sm text-right">₹{sale.rate}</td>
                      <td className="py-3 px-4 text-sm text-right text-green-600 font-medium">₹{sale.profit.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link href="/granite/consignments">
                <Button variant="outline" className="flex flex-col items-center space-y-2 h-20 w-full">
                  <Mountain className="h-6 w-6" />
                  <span className="text-sm">New Consignment</span>
                </Button>
              </Link>
              <Link href="/granite/cutting">
                <Button variant="outline" className="flex flex-col items-center space-y-2 h-20 w-full">
                  <Scissors className="h-6 w-6" />
                  <span className="text-sm">Record Cutting</span>
                </Button>
              </Link>
              <Link href="/granite/sales">
                <Button variant="outline" className="flex flex-col items-center space-y-2 h-20 w-full">
                  <ShoppingBag className="h-6 w-6" />
                  <span className="text-sm">Add Sale</span>
                </Button>
              </Link>
              <Link href="/granite/costing">
                <Button variant="outline" className="flex flex-col items-center space-y-2 h-20 w-full">
                  <BarChart3 className="h-6 w-6" />
                  <span className="text-sm">View Reports</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}