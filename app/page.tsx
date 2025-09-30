'use client';

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, Download, PlusCircle } from "lucide-react";
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
import * as XLSX from "xlsx";

declare global {
  interface Window { XLSX?: any; }
}

const XLSX_CDN_URL = "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
async function ensureXlsxReady(): Promise<any> {
  // @ts-ignore
  if (XLSX && (XLSX as any).writeFile) return XLSX;
  if (typeof window !== "undefined" && window.XLSX?.writeFile) return window.XLSX;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = XLSX_CDN_URL;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load XLSX from CDN"));
    document.head.appendChild(s);
  });
  if (window.XLSX?.writeFile) return window.XLSX;
  throw new Error("XLSX not available after dynamic load");
}

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

function __safeName(s: string) { return (s || "all").replace(/[^a-z0-9]+/gi, "_").toLowerCase(); }

export default function Page() {
  const [customerId, setCustomerId] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const [customers, setCustomers] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [consignments, setConsignments] = useState<any[]>([]);
  const [txns, setTxns] = useState<any[]>([]);

  useEffect(() => {
    async function boot() {
      const [cust, accts] = await Promise.all([
        fetch("/api/customers").then((r) => r.json()),
        fetch("/api/bank-accounts").then((r) => r.json()),
      ]);
      setCustomers(cust);
      setAccounts(accts);
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

  async function exportExcel() {
    try {
      const xlsx = await ensureXlsxReady();
      const consRows = consignments.map((c: any) => ({
        Date: c.date, Customer: customers.find((x) => x.id === c.customer_id)?.name || "",
        Total: c.total, RTGS_Expected: c.rtgs_expected, Cash_Expected: c.cash_expected, Remarks: c.remarks || ""
      }));
      const txnRows = txns.map((t: any) => ({
        Date: t.date, Customer: customers.find((x) => x.id === t.customer_id)?.name || "",
        Mode: t.mode, Account: (accounts.find((a) => a.id === t.account_id)?.name) || "",
        Amount: t.amount, Note: t.note || ""
      }));
      const summary = [
        { Metric: "Expected Total", Value: kpi.expectedTotal },
        { Metric: "Expected RTGS", Value: kpi.expectedRTGS },
        { Metric: "Expected Cash", Value: kpi.expectedCASH },
        { Metric: "Received RTGS", Value: kpi.receivedRTGS },
        { Metric: "Received Cash", Value: kpi.receivedCASH },
        { Metric: "Pending RTGS", Value: kpi.receivableRTGS },
        { Metric: "Pending Cash", Value: kpi.receivableCASH },
        { Metric: "Pending Total", Value: kpi.receivableTotal },
      ];
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(summary), "Summary");
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(consRows), "Consignments");
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(txnRows), "Transactions");
      const safeName = __safeName(currentCustomerName || "all");
      xlsx.writeFile(wb, `granite-ledger-${safeName}-${Date.now()}.xlsx`);
    } catch (err) {
      console.error(err);
      alert("Export failed. Ensure internet (for CDN fallback) or bundle 'xlsx'.");
    }
  }

  async function addCustomer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get("new_customer") || "").trim();
    if (!name) return alert("Customer name is required");
    const res = await fetch("/api/customers", { method: "POST", body: JSON.stringify({ name }) });
    const data = await res.json();
    if (!res.ok) return alert(data.error || "Create failed");
    setCustomers((s) => [data, ...s]);
    setCustomerId(data.id);
    e.currentTarget.reset();
  }

  async function addConsignment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      customer_id: customerId === "all" ? customers[0]?.id : customerId,
      date: String(fd.get("c_date") || ""),
      total: Number(fd.get("c_total") || 0),
      rtgs_expected: Number(fd.get("c_rtgs") || 0),
      cash_expected: Number(fd.get("c_cash") || 0),
      remarks: String(fd.get("c_remarks") || ""),
    };
    if (!payload.customer_id) return alert("Please select/add a customer first.");
    const res = await fetch("/api/consignments", { method: "POST", body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) return alert(data.error || "Create failed");
    setConsignments((s) => [...s, data]);
    e.currentTarget.reset();
  }

  async function addTxn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      customer_id: customerId === "all" ? customers[0]?.id : customerId,
      date: String(fd.get("t_date") || ""),
      mode: String(fd.get("t_mode") || "RTGS"),
      account_id: String(fd.get("t_account") || ""),
      amount: Number(fd.get("t_amount") || 0),
      note: String(fd.get("t_note") || ""),
    };
    if (!payload.customer_id) return alert("Please select/add a customer first.");
    const res = await fetch("/api/transactions", { method: "POST", body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) return alert(data.error || "Create failed");
    setTxns((s) => [...s, data]);
    e.currentTarget.reset();
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 p-6 space-y-6">
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold">Granite Customer Dashboard</h1>
            <p className="text-gray-600">Consignments (expected) vs Payments (actual) with date range & customer filter</p>
          </div>
          <a 
            href="/admin" 
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Admin Panel
          </a>
        </div>

        <div className="w-full space-y-3">
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

            <form onSubmit={addCustomer} className="flex items-stretch gap-2 md:col-span-4 justify-self-end w-full md:w-auto">
              <Input name="new_customer" placeholder="Add customer (unique)" className="border rounded-xl px-3 py-2 h-11 text-base flex-1 md:w-[260px]" />
              <Button type="submit" className="h-11 rounded-2xl shrink-0">
                <PlusCircle className="w-4 h-4 mr-2" /> Add
              </Button>
            </form>
          </div>

          <div className="flex justify-end">
            <Button type="button" className="rounded-2xl pointer-events-auto" variant="secondary" onClick={exportExcel}>
              <Download className="w-4 h-4 mr-2" /> Export Excel
            </Button>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="px-6 py-2 rounded-full border text-lg font-semibold bg-blue-50 text-blue-700 border-blue-200 shadow-sm">
          {currentCustomerName || "Select a customer"}
        </div>
      </div>

      <KPIGrid kpi={kpi} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-4">
            <h3 className="font-medium mb-2">Payments by Mode</h3>
            <div className="h-56">
              <ResponsiveContainer>
                <PieChart>
                  <Pie dataKey="value" data={byModePie} outerRadius={85} label>
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
          <CardContent className="p-4">
            <h3 className="font-medium mb-2">Receivable Split (RTGS vs Cash)</h3>
            <div className="h-56">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-0 overflow-hidden">
            <div className="p-4 flex items-center justify-between">
              <h3 className="font-medium">Consignments (Expected)</h3>
            </div>
            <form onSubmit={addConsignment} className="px-4 pb-4 grid grid-cols-1 md:grid-cols-8 gap-3">
              <div className="flex items-center gap-2 border rounded-xl px-3 py-2 md:col-span-2">
                <Calendar className="w-4 h-4" />
                <Input name="c_date" type="date" className="border-0 p-0 focus-visible:ring-0 w-full h-11 text-base" required />
              </div>
              <Input name="c_total" type="number" placeholder="Total (₹)" className="border rounded-xl px-3 py-2 w-full h-11 text-base md:col-span-2" required />
              <Input name="c_rtgs" type="number" placeholder="RTGS expected (₹)" className="border rounded-xl px-3 py-2 w-full h-11 text-base md:col-span-2" />
              <Input name="c_cash" type="number" placeholder="Cash expected (₹)" className="border rounded-xl px-3 py-2 w-full h-11 text-base md:col-span-2" />
              <Input name="c_remarks" type="text" placeholder="Remarks (optional)" className="border rounded-xl px-3 py-2 w-full h-11 text-base md:col-span-6" />
              <Button className="rounded-2xl h-11 md:col-span-2 self-start" type="submit">
                <PlusCircle className="w-4 h-4 mr-2" /> Add
              </Button>
            </form>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    <th className="px-4 py-2">S.No</th>
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2 text-right">Total (₹)</th>
                    <th className="px-4 py-2 text-right">RTGS Expected</th>
                    <th className="px-4 py-2 text-right">Cash Expected</th>
                    <th className="px-4 py-2">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {consignments.map((c, idx) => (
                    <tr key={c.id} className="border-t">
                      <td className="px-4 py-2">{idx + 1}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{c.date}</td>
                      <td className="px-4 py-2 text-right">{fmt(c.total)}</td>
                      <td className="px-4 py-2 text-right">{fmt(c.rtgs_expected)}</td>
                      <td className="px-4 py-2 text-right">{fmt(c.cash_expected)}</td>
                      <td className="px-4 py-2">{c.remarks || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-0 overflow-hidden">
            <div className="p-4 flex items-center justify-between">
              <h3 className="font-medium">Payments (Transactions)</h3>
            </div>
            <form onSubmit={addTxn} className="px-4 pb-4 grid grid-cols-1 md:grid-cols-10 gap-3">
              <div className="flex items-center gap-2 border rounded-xl px-3 md:col-span-3 h-11 min-w-[240px]">
                <Calendar className="w-4 h-4 shrink-0" />
                <Input name="t_date" type="date" className="border-0 p-0 focus-visible:ring-0 w-full h-10 bg-transparent appearance-none text-base" required />
              </div>
              <select name="t_mode" className="border rounded-xl px-3 py-2 w-full h-11 text-base md:col-span-2">
                <option value="RTGS">RTGS</option>
                <option value="CASH">CASH</option>
              </select>
              <select name="t_account" className="border rounded-xl px-3 py-2 w-full h-11 text-base md:col-span-3">
                {accounts.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <Input name="t_amount" type="number" placeholder="Amount (₹)" className="border rounded-xl px-3 py-2 w-full h-11 text-base md:col-span-2" required />
              <Input name="t_note" type="text" placeholder="Note (optional)" className="border rounded-xl px-3 py-2 w-full h-11 text-base md:col-span-3" />
              <Button className="h-11 rounded-2xl px-4 w-full md:w-auto md:col-span-1 place-self-start" type="submit">
                <PlusCircle className="w-4 h-4 mr-2" /> Add
              </Button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 pt-0">
              <div className="overflow-x-auto">
                <h4 className="font-medium mb-2">RTGS</h4>
                <table className="min-w-full text-[15px]">
                  <thead>
                    <tr className="bg-gray-100 text-left">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Account</th>
                      <th className="px-4 py-3 text-right">Amount (₹)</th>
                      <th className="px-4 py-3">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txns.filter((t) => t.mode === "RTGS").map((t) => (
                      <tr key={t.id} className="border-t">
                        <td className="px-4 py-3 whitespace-nowrap">{t.date}</td>
                        <td className="px-4 py-3 min-w-[180px]">{accounts.find((a) => a.id === t.account_id)?.name}</td>
                        <td className="px-4 py-3 text-right">{fmt(t.amount)}</td>
                        <td className="px-4 py-3">{t.note || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="overflow-x-auto">
                <h4 className="font-medium mb-2">Cash</h4>
                <table className="min-w-full text-[15px]">
                  <thead>
                    <tr className="bg-gray-100 text-left">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Account</th>
                      <th className="px-4 py-3 text-right">Amount (₹)</th>
                      <th className="px-4 py-3">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txns.filter((t) => t.mode === "CASH").map((t) => (
                      <tr key={t.id} className="border-t">
                        <td className="px-4 py-3 whitespace-nowrap">{t.date}</td>
                        <td className="px-4 py-3 min-w-[180px]">{accounts.find((a) => a.id === t.account_id)?.name}</td>
                        <td className="px-4 py-3 text-right">{fmt(t.amount)}</td>
                        <td className="px-4 py-3">{t.note || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-gray-500">MVP: consignments = expectations; transactions = actuals. Date pickers, Excel export, unique customers via DB, secure server routes.</p>
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
