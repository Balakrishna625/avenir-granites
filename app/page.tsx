'use client';

import React, { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, Download, PlusCircle, BarChart3, Settings } from "lucide-react";
import { ConsignmentsTable } from "@/components/ConsignmentsTable";
import { TransactionsTable } from "@/components/TransactionsTable";
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

  const kpi = useMemo(() => {
    const expectedTotal = consignments.reduce((s, r) => s + (r.total || 0), 0);
    const expectedRTGS = consignments.reduce((s, r) => s + (r.rtgs_expected || 0), 0);
    const expectedCASH = consignments.reduce((s, r) => s + (r.cash_expected || 0), 0);
    const receivedRTGS = txns.filter((t) => t.mode === "RTGS").reduce((s, t) => s + (t.amount || 0), 0);
    const receivedCASH = txns.filter((t) => t.mode === "CASH").reduce((s, t) => s + (t.amount || 0), 0);
    return { 
      expectedTotal, 
      expectedRTGS, 
      expectedCASH, 
      receivedRTGS, 
      receivedCASH, 
      receivedTotal: receivedRTGS + receivedCASH 
    };
  }, [consignments, txns]);

  const currentCustomerName =
    customerId === "all" ? "All Customers" : (customers.find((c) => c.id === customerId)?.name || "");

  async function exportExcel() {
    try {
      const xlsx = await ensureXlsxReady();
      
      // Overall Summary
      const summary = [
        { Metric: "Expected Total", Value: kpi.expectedTotal },
        { Metric: "Expected RTGS", Value: kpi.expectedRTGS },
        { Metric: "Expected Cash", Value: kpi.expectedCASH },
        { Metric: "Received RTGS", Value: kpi.receivedRTGS },
        { Metric: "Received Cash", Value: kpi.receivedCASH },
        { Metric: "Total Received", Value: kpi.receivedTotal },
        { Metric: "Pending RTGS", Value: Math.max(0, kpi.expectedRTGS - kpi.receivedRTGS) },
        { Metric: "Pending Cash", Value: Math.max(0, kpi.expectedCASH - kpi.receivedCASH) },
        { Metric: "Total Pending", Value: kpi.expectedTotal - kpi.receivedTotal },
      ];

      // Customer-wise Summary
      const customerSummary = customers.map(customer => {
        const customerConsignments = consignments.filter(c => c.customer_id === customer.id);
        const customerTransactions = txns.filter(t => t.customer_id === customer.id);
        
        const expectedTotal = customerConsignments.reduce((s, c) => s + (c.total || 0), 0);
        const expectedRTGS = customerConsignments.reduce((s, c) => s + (c.rtgs_expected || 0), 0);
        const expectedCash = customerConsignments.reduce((s, c) => s + (c.cash_expected || 0), 0);
        const receivedRTGS = customerTransactions.filter(t => t.mode === 'RTGS').reduce((s, t) => s + (t.amount || 0), 0);
        const receivedCash = customerTransactions.filter(t => t.mode === 'CASH').reduce((s, t) => s + (t.amount || 0), 0);
        
        return {
          Customer: customer.name,
          Expected_Total: expectedTotal,
          Expected_RTGS: expectedRTGS,
          Expected_Cash: expectedCash,
          Received_RTGS: receivedRTGS,
          Received_Cash: receivedCash,
          Total_Received: receivedRTGS + receivedCash,
          Pending_RTGS: Math.max(0, expectedRTGS - receivedRTGS),
          Pending_Cash: Math.max(0, expectedCash - receivedCash),
          Total_Pending: expectedTotal - (receivedRTGS + receivedCash),
          Collection_Rate: expectedTotal > 0 ? `${((receivedRTGS + receivedCash) / expectedTotal * 100).toFixed(1)}%` : '0%'
        };
      }).filter(c => c.Expected_Total > 0 || c.Total_Received > 0); // Only include customers with activity

      // Detailed Consignments
      const consRows = consignments.map((c: any, index) => ({
        'S.No': index + 1,
        Date: c.date,
        Customer: customers.find((x) => x.id === c.customer_id)?.name || "Unknown",
        'Total (₹)': c.total,
        'RTGS Expected (₹)': c.rtgs_expected || 0,
        'Cash Expected (₹)': c.cash_expected || 0,
        Remarks: c.remarks || ""
      }));

      // Detailed Transactions - RTGS
      const rtgsRows = txns.filter(t => t.mode === 'RTGS').map((t: any, index) => ({
        'S.No': index + 1,
        Date: t.date,
        Customer: customers.find((x) => x.id === t.customer_id)?.name || "Unknown",
        Account: accounts.find((a) => a.id === t.account_id)?.name || "Unknown",
        'Amount (₹)': t.amount,
        Note: t.note || ""
      }));

      // Detailed Transactions - Cash
      const cashRows = txns.filter(t => t.mode === 'CASH').map((t: any, index) => ({
        'S.No': index + 1,
        Date: t.date,
        Customer: customers.find((x) => x.id === t.customer_id)?.name || "Unknown",
        Account: accounts.find((a) => a.id === t.account_id)?.name || "Unknown",
        'Amount (₹)': t.amount,
        Note: t.note || ""
      }));

      // All Transactions Combined
      const allTxnRows = txns.map((t: any, index) => ({
        'S.No': index + 1,
        Date: t.date,
        Customer: customers.find((x) => x.id === t.customer_id)?.name || "Unknown",
        Mode: t.mode,
        Account: accounts.find((a) => a.id === t.account_id)?.name || "Unknown",
        'Amount (₹)': t.amount,
        Note: t.note || ""
      }));

      // Customer Details (Combined view per customer)
      const customerDetails = customers.map(customer => {
        const customerConsignments = consignments.filter(c => c.customer_id === customer.id);
        const customerTransactions = txns.filter(t => t.customer_id === customer.id);
        
        if (customerConsignments.length === 0 && customerTransactions.length === 0) return null;
        
        return {
          Customer: customer.name,
          'Created Date': new Date(customer.created_at).toLocaleDateString(),
          'Total Consignments': customerConsignments.length,
          'Total Transactions': customerTransactions.length,
          'Last Consignment': customerConsignments.length > 0 ? 
            Math.max(...customerConsignments.map(c => new Date(c.date).getTime())) : 'None',
          'Last Transaction': customerTransactions.length > 0 ? 
            Math.max(...customerTransactions.map(t => new Date(t.date).getTime())) : 'None'
        };
      }).filter(Boolean);

      // Create workbook and add sheets
      const wb = xlsx.utils.book_new();
      
      // Add all sheets
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(summary), "Overall Summary");
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(customerSummary), "Customer Summary");
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(consRows), "All Consignments");
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(allTxnRows), "All Transactions");
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(rtgsRows), "RTGS Transactions");
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(cashRows), "Cash Transactions");
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(customerDetails), "Customer Details");

      const safeName = __safeName(currentCustomerName || "all");
      const fileName = `granite-ledger-${safeName}-${new Date().toISOString().split('T')[0]}.xlsx`;
      xlsx.writeFile(wb, fileName);
      
      alert(`Excel file exported successfully: ${fileName}`);
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

  async function editConsignment(consignmentId: string, updatedData: any) {
    const rtgs = updatedData.rtgs_expected || 0;
    const cash = updatedData.cash_expected || 0;
    const total = updatedData.total || 0;

    // Validation: Total should equal RTGS + Cash
    if (Math.abs(total - (rtgs + cash)) > 0.01) {
      alert(`Validation Error: Total (₹${total.toLocaleString()}) must equal RTGS Expected (₹${rtgs.toLocaleString()}) + Cash Expected (₹${cash.toLocaleString()}) = ₹${(rtgs + cash).toLocaleString()}`);
      return;
    }

    const payload = {
      total: total,
      rtgs_expected: rtgs,
      cash_expected: cash,
      remarks: updatedData.remarks || '',
    };

    const res = await fetch(`/api/consignments/${consignmentId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error || "Update failed");
    
    setConsignments((s) => s.map(c => c.id === consignmentId ? { ...c, ...payload } : c));
  }

  async function deleteConsignment(consignmentId: string) {
    if (!confirm("Are you sure you want to delete this consignment?")) return;

    const res = await fetch(`/api/consignments/${consignmentId}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return alert(data.error || "Delete failed");
    
    setConsignments((s) => s.filter(c => c.id !== consignmentId));
    alert("Consignment deleted successfully!");
  }

  async function editTransaction(transactionId: string, updatedData: any) {
    const payload = {
      amount: updatedData.amount || 0,
      note: updatedData.note || '',
    };

    const res = await fetch(`/api/transactions/${transactionId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error || "Update failed");
    
    setTxns((s) => s.map(t => t.id === transactionId ? { ...t, ...payload } : t));
  }

  async function deleteTransaction(transactionId: string) {
    if (!confirm("Are you sure you want to delete this transaction?")) return;

    const res = await fetch(`/api/transactions/${transactionId}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return alert(data.error || "Delete failed");
    
    setTxns((s) => s.filter(t => t.id !== transactionId));
    alert("Transaction deleted successfully!");
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 p-6 space-y-6">
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold">Granite Customer Dashboard</h1>
            <p className="text-gray-600">Manage consignments and payments with comprehensive table views</p>
          </div>
          <div className="flex space-x-3">
            <a 
              href="/analytics" 
              className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </a>
            <a 
              href="/admin" 
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Settings className="w-4 h-4 mr-2" />
              Admin Panel
            </a>
          </div>
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

          <div className="flex justify-between items-center">
            <div className="px-6 py-2 rounded-full border text-lg font-semibold bg-blue-50 text-blue-700 border-blue-200 shadow-sm">
              {currentCustomerName || "Select a customer"}
            </div>
            <Button type="button" className="rounded-2xl pointer-events-auto" variant="secondary" onClick={exportExcel}>
              <Download className="w-4 h-4 mr-2" /> Export Excel
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <div className="text-xs text-gray-600 uppercase tracking-wide">Expected Total</div>
          <div className="text-2xl font-bold text-gray-900">{fmt(kpi.expectedTotal)}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <div className="text-xs text-gray-600 uppercase tracking-wide">Expected RTGS</div>
          <div className="text-2xl font-bold text-gray-900">{fmt(kpi.expectedRTGS)}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <div className="text-xs text-gray-600 uppercase tracking-wide">Expected Cash</div>
          <div className="text-2xl font-bold text-gray-900">{fmt(kpi.expectedCASH)}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <div className="text-xs text-blue-600 uppercase tracking-wide">Received RTGS</div>
          <div className="text-2xl font-bold text-blue-600">{fmt(kpi.receivedRTGS)}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <div className="text-xs text-green-600 uppercase tracking-wide">Received Cash</div>
          <div className="text-2xl font-bold text-green-600">{fmt(kpi.receivedCASH)}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <div className="text-xs text-amber-600 uppercase tracking-wide">Pending RTGS</div>
          <div className="text-2xl font-bold text-amber-600">{fmt(Math.max(0, kpi.expectedRTGS - kpi.receivedRTGS))}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <div className="text-xs text-amber-600 uppercase tracking-wide">Pending Cash</div>
          <div className="text-2xl font-bold text-amber-600">{fmt(Math.max(0, kpi.expectedCASH - kpi.receivedCASH))}</div>
        </div>
      </div>

      {/* Consignments Table */}
      <ConsignmentsTable 
        consignments={consignments}
        onAddConsignment={addConsignment}
        onEditConsignment={editConsignment}
        onDeleteConsignment={deleteConsignment}
        customerId={customerId}
        customers={customers}
      />

      {/* Transactions Table */}
      <TransactionsTable 
        transactions={txns}
        accounts={accounts}
        customers={customers}
        onAddTransaction={addTxn}
        onEditTransaction={editTransaction}
        onDeleteTransaction={deleteTransaction}
      />

      <p className="text-xs text-gray-500 text-center">
        Granite Ledger - Comprehensive consignment and payment management system
      </p>
    </div>
  );
}


