'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { GalaxyAccount } from '@/components/GalaxyAccount';
import { Calendar } from 'lucide-react';

export default function GalaxyPage() {
  const [selectedYear, setSelectedYear] = useState<number | "all">("all");
  const [selectedMonth, setSelectedMonth] = useState<number | "all">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Calculate date range from month selector
  const getDateRange = () => {
    if (selectedYear !== "all" && selectedMonth !== "all") {
      const from = new Date(selectedYear as number, (selectedMonth as number) - 1, 1).toISOString().split('T')[0];
      const to = new Date(selectedYear as number, selectedMonth as number, 0).toISOString().split('T')[0];
      return { from, to };
    } else if (selectedYear !== "all") {
      const from = new Date(selectedYear as number, 0, 1).toISOString().split('T')[0];
      const to = new Date(selectedYear as number, 11, 31).toISOString().split('T')[0];
      return { from, to };
    }
    return { from: dateFrom, to: dateTo };
  };

  const { from, to } = getDateRange();

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Date Filter */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <select 
              className="border rounded-xl px-3 py-2 flex-1" 
              value={selectedYear}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedYear(val === "all" ? "all" : parseInt(val));
                setDateFrom("");
                setDateTo("");
              }}
            >
              <option value="all">All Years</option>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <select 
              className="border rounded-xl px-3 py-2 flex-1" 
              value={selectedMonth}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedMonth(val === "all" ? "all" : parseInt(val));
                setDateFrom("");
                setDateTo("");
              }}
              disabled={selectedYear === "all"}
            >
              <option value="all">All Months</option>
              {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((month, index) => (
                <option key={index} value={index + 1}>{month}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Galaxy Account Component */}
        <GalaxyAccount dateFrom={from} dateTo={to} />
      </div>
    </AppLayout>
  );
}
