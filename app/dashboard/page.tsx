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
    totalConsignments: 0,
    totalProfit: 0,
    avgMargin: 0,
    totalProduction: 0,
    totalBlocks: 0,
    avgCostPerSqft: 0,
    avgSellingRate: 0,
    totalInventory: 0,
    activeBlocks: 0,
    consignmentAnalytics: [],
    topBuyers: [],
    recentSales: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const response = await fetch('/api/analytics');
        const data = await response.json();
        if (response.ok && data) {
          // Safe type checking and fallback values
          const overview = data.overview || {};
          const blocks = data.blocks || {};
          const parts = data.parts || {};
          const buyers = data.buyers || {};
          const recentSales = data.recent_sales || [];

          // Calculate total inventory safely
          let totalInventory = 0;
          if (parts && typeof parts === 'object') {
            totalInventory = (Object.values(parts) as any[]).reduce((sum: number, part: any) => {
              return sum + (typeof part?.remaining_sqft === 'number' ? part.remaining_sqft : 0);
            }, 0);
          }

          setDashboardData({
            totalConsignments: Number(overview.total_consignments) || 0,
            totalProfit: Number(overview.total_profit) || 0,
            avgMargin: Number(overview.profit_margin) || 0,
            totalProduction: Number(overview.total_sqft_produced) || 0,
            totalBlocks: Number(overview.total_blocks) || 0,
            avgCostPerSqft: Number(overview.avg_cost_per_sqft) || 0,
            avgSellingRate: overview.total_sqft_sold > 0 ? Number(overview.total_sales) / Number(overview.total_sqft_sold) : 0,
            totalInventory: totalInventory,
            activeBlocks: Number(blocks.by_status?.RAW) || 0,
            consignmentAnalytics: [],
            topBuyers: Array.isArray(buyers.top_buyers) ? buyers.top_buyers : [],
            recentSales: Array.isArray(recentSales) ? recentSales : []
          });
        } else {
          console.error('Dashboard API Error:', data.error);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen w-full bg-gray-50 p-6 flex items-center justify-center">
          <div className="text-center">
            <Clock className="h-8 w-8 animate-spin mx-auto text-blue-600" />
            <p className="mt-2 text-gray-600">Loading dashboard data...</p>
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
                  <p className="text-xs text-gray-500">Avg Margin: {dashboardData.avgMargin.toFixed(2)}%</p>
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
                  <p className="text-2xl font-bold text-blue-600">{dashboardData.totalProduction.toLocaleString()} Sqft</p>
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
                        {consignment.margin.toFixed(1)}% margin
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Blocks: <span className="font-medium">{consignment.blocks}</span></p>
                        <p className="text-gray-600">Net Measurement: <span className="font-medium">{consignment.netMeasurement}m</span></p>
                        <p className="text-gray-600">Total Cost: <span className="font-medium">₹{consignment.totalCost.toLocaleString()}</span></p>
                      </div>
                      <div>
                        <p className="text-gray-600">Cost/SqFt: <span className="font-medium">₹{consignment.costPerSqft.toFixed(2)}</span></p>
                        <p className="text-green-600">Profit: <span className="font-bold">₹{consignment.profit.toLocaleString()}</span></p>
                        <p className="text-blue-600">Margin: <span className="font-bold">{consignment.margin.toFixed(1)}%</span></p>
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
                      <p className="text-sm text-gray-600">{buyer.sqftPurchased.toLocaleString()} sqft purchased</p>
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
              <Link href="/granite/manufacturing">
                <Button variant="outline" className="flex flex-col items-center space-y-2 h-20 w-full">
                  <Scissors className="h-6 w-6" />
                  <span className="text-sm">Slab Manufacturing</span>
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