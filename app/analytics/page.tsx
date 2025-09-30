'use client';

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, ArrowLeft } from "lucide-react";
import Link from "next/link";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Cell,
} from "recharts";

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const fmt = (n: number) => INR.format(n || 0);

function __computeKpi(cons: any[], tx: any[]) {
  const expectedTotal = cons.reduce((s, r) => s + (r.total || 0), 0);
  const expectedRTGS = cons.reduce((s, r) => s + (r.rtgs_expected || 0), 0);
  const expectedCASH = cons.reduce((s, r) => s + (r.cash_expected || 0), 0);
  const receivedRTGS = tx.filter((t) => t.mode === "RTGS").reduce((s, t) => s + (t.amount || 0), 0);
  const receivedCASH = tx.filter((t) => t.mode === "CASH").reduce((s, t) => s + (t.amount || 0), 0);
  return {
    expectedTotal, expectedRTGS, expectedCASH, receivedRTGS, receivedCASH,
    receivableRTGS: expectedRTGS - receivedRTGS,
    receivableCASH: expectedCASH - receivedCASH,
    receivableTotal: expectedTotal - (receivedRTGS + receivedCASH),
  };
}

export default function AnalyticsPage() {
  const [customerId, setCustomerId] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const [customers, setCustomers] = useState<any[]>([]);
  const [consignments, setConsignments] = useState<any[]>([]);
  const [txns, setTxns] = useState<any[]>([]);

  useEffect(() => {
    async function boot() {
      const cust = await fetch("/api/customers").then((r) => r.json());
      setCustomers(cust);
    }
    boot();
  }, []);

  useEffect(() => {
    const p = new URLSearchParams();
    if (customerId) p.set("customerId", customerId);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    fetch(`/api/consignments?${p.toString()}`).then((r) => r.json()).then(setConsignments);
    fetch(`/api/transactions?${p.toString()}`).then((r) => r.json()).then(setTxns);
  }, [customerId, from, to]);

  const kpi = useMemo(() => __computeKpi(consignments, txns), [consignments, txns]);

  const byModePie = useMemo(
    () => [
      { name: "RTGS Received", value: kpi.receivedRTGS },
      { name: "Cash Received", value: kpi.receivedCASH },
    ],
    [kpi]
  );

  const receivableSplit = useMemo(
    () => [
      { name: "RTGS Receivable", value: kpi.receivableRTGS },
      { name: "Cash Receivable", value: kpi.receivableCASH },
    ],
    [kpi]
  );

  const currentCustomerName =
    customerId === "all" ? "All Customers" : (customers.find((c) => c.id === customerId)?.name || "");

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
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        </div>
        <div className="flex space-x-3">
          <Link href="/admin">
            <Button variant="secondary">Admin Panel</Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <select className="border rounded-xl px-3 py-2 md:col-span-4" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="all">All customers</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <div className="flex items-center gap-2 border rounded-xl px-3 py-2 md:col-span-2">
            <Calendar className="w-4 h-4" />
            <Input type="date" className="border-0 p-0 focus-visible:ring-0 w-full min-w-[160px]" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 border rounded-xl px-3 py-2 md:col-span-2">
            <Calendar className="w-4 h-4" />
            <Input type="date" className="border-0 p-0 focus-visible:ring-0 w-full min-w-[160px]" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Customer Display */}
      <div className="flex justify-center">
        <div className="px-6 py-2 rounded-full border text-lg font-semibold bg-blue-50 text-blue-700 border-blue-200 shadow-sm">
          {currentCustomerName || "Select a customer"}
        </div>
      </div>

      {/* KPI Grid */}
      <KPIGrid kpi={kpi} />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-4">Payments by Mode</h3>
            <div className="h-80">
              <ResponsiveContainer>
                <PieChart>
                  <Pie dataKey="value" data={byModePie} outerRadius={100} label>
                    {byModePie.map((_, i) => <Cell key={`cell-p-${i}`} fill={i === 0 ? "#2563eb" : "#16a34a"} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v as number)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-4">Receivable Split (RTGS vs Cash)</h3>
            <div className="h-80">
              <ResponsiveContainer>
                <BarChart data={receivableSplit}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(v) => String(fmt(v as number)).replace("₹", "")} />
                  <Tooltip formatter={(v) => fmt(v as number)} />
                  <Bar dataKey="value">
                    {receivableSplit.map((e, i) => <Cell key={`cell-b-${i}`} fill={e.name.includes("RTGS") ? "#2563eb" : "#16a34a"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-xl font-semibold mb-4">Performance Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{fmt(kpi.expectedTotal)}</div>
              <div className="text-sm text-gray-600 mt-1">Total Expected</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{fmt(kpi.receivedRTGS + kpi.receivedCASH)}</div>
              <div className="text-sm text-gray-600 mt-1">Total Received</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">{fmt(kpi.receivableTotal)}</div>
              <div className="text-sm text-gray-600 mt-1">Total Pending</div>
            </div>
          </div>
          
          {kpi.expectedTotal > 0 && (
            <div className="mt-6">
              <div className="text-sm text-gray-600 mb-2">Collection Rate</div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${Math.min(100, ((kpi.receivedRTGS + kpi.receivedCASH) / kpi.expectedTotal) * 100)}%` }}
                ></div>
              </div>
              <div className="text-right text-sm text-gray-600 mt-1">
                {((kpi.receivedRTGS + kpi.receivedCASH) / kpi.expectedTotal * 100).toFixed(1)}%
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KPIGrid({ kpi }: { kpi: any }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
      <KPI label="Expected Total" value={kpi.expectedTotal} />
      <KPI label="Expected RTGS" value={kpi.expectedRTGS} />
      <KPI label="Expected Cash" value={kpi.expectedCASH} />
      <KPI label="Received RTGS" value={kpi.receivedRTGS} />
      <KPI label="Received Cash" value={kpi.receivedCASH} />
      <KPI label="Pending RTGS" value={kpi.receivableRTGS} highlight />
      <KPI label="Pending Cash" value={kpi.receivableCASH} highlight />
    </div>
  );
}

function getKpiTone(label: string) {
  const l = label.toLowerCase();
  if (l.includes("pending")) return { border: "border-amber-500", bg: "bg-amber-50", text: "text-amber-800" } as const;
  if (l.includes("rtgs")) return { border: "border-blue-500", bg: "bg-blue-50", text: "text-blue-800" } as const;
  if (l.includes("cash")) return { border: "border-green-500", bg: "bg-green-50", text: "text-green-800" } as const;
  if (l.includes("expected")) return { border: "border-slate-400", bg: "bg-slate-50", text: "text-slate-800" } as const;
  if (l.includes("received")) return { border: "border-emerald-500", bg: "bg-emerald-50", text: "text-emerald-800" } as const;
  return { border: "border-slate-300", bg: "bg-white", text: "text-slate-900" } as const;
}

function KPI({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  const tone = getKpiTone(label);
  return (
    <Card className={`rounded-2xl shadow-sm border-l-4 ${tone.bg} ${tone.border}`}>
      <CardContent className="p-4">
        <div className={`text-xs uppercase tracking-wide ${tone.text}`}>{label}</div>
        <div className="text-xl font-semibold">{fmt(value || 0)}</div>
      </CardContent>
    </Card>
  );
}