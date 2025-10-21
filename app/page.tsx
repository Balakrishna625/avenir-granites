'use client';

import React, { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, Download, PlusCircle, BarChart3, Settings, Archive } from "lucide-react";
import { ConsignmentsTable } from "@/components/ConsignmentsTable";
import { TransactionsTable } from "@/components/TransactionsTable";
import { CustomerAnalytics } from "@/components/CustomerAnalytics";
import { CustomerSettlementModal } from "@/components/CustomerSettlementModal";
import { useToast } from "@/components/ui/toast";
import * as XLSX from "xlsx";
import { formatDisplayDate } from "@/lib/date-utils";

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
  const [customers, setCustomers] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [consignments, setConsignments] = useState<any[]>([]);
  const [txns, setTxns] = useState<any[]>([]);
  const [waivedTransactions, setWaivedTransactions] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showAllHistory, setShowAllHistory] = useState(false); // Toggle for viewing all periods vs current period only
  const [consignmentSubmitted, setConsignmentSubmitted] = useState(false);
  const [transactionSubmitted, setTransactionSubmitted] = useState(false);
  const [editingOldDue, setEditingOldDue] = useState(false);
  const [oldDueInput, setOldDueInput] = useState("");
  const [editingWaivedAmount, setEditingWaivedAmount] = useState(false);
  const [waivedAmountInput, setWaivedAmountInput] = useState("");
  const [waivedDateInput, setWaivedDateInput] = useState("");
  const [waivedNotesInput, setWaivedNotesInput] = useState("");
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const { showToast } = useToast();

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
    if (dateFrom) p.set("from", dateFrom);
    if (dateTo) p.set("to", dateTo);
    
    // Only filter by active period when a specific customer is selected and showAllHistory is false
    if (customerId && customerId !== "all" && !showAllHistory) {
      p.set("activeOnly", "true");
    }
    
    fetch(`/api/consignments?${p.toString()}`).then((r) => r.json()).then(setConsignments);
    fetch(`/api/transactions?${p.toString()}`).then((r) => r.json()).then(setTxns);
    
    // Load waived transactions for the selected customer
    if (customerId && customerId !== "all") {
      fetch(`/api/waived-transactions?customerId=${customerId}`)
        .then((r) => r.json())
        .then(setWaivedTransactions);
    } else {
      setWaivedTransactions([]);
    }
  }, [customerId, dateFrom, dateTo, showAllHistory]);

  const kpi = useMemo(() => {
    const expectedTotal = consignments.reduce((s, r) => s + (r.total || 0), 0);
    const expectedRTGS = consignments.reduce((s, r) => s + (r.rtgs_expected || 0), 0);
    const expectedCASH = consignments.reduce((s, r) => s + (r.cash_expected || 0), 0);
    const receivedRTGS = txns.filter((t) => t.mode === "RTGS").reduce((s, t) => s + (t.amount || 0), 0);
    const receivedCASH = txns.filter((t) => t.mode === "CASH").reduce((s, t) => s + (t.amount || 0), 0);
    
    // Calculate old due amount and waived amount for the selected customer
    let oldDueAmount = 0;
    let waivedAmount = 0;
    if (customerId !== "all") {
      const selectedCustomer = customers.find(c => c.id === customerId);
      oldDueAmount = selectedCustomer?.old_due_amount || 0;
      // Calculate waived amount from waived_transactions
      waivedAmount = waivedTransactions.reduce((sum, wt) => sum + (wt.amount || 0), 0);
    } else {
      // For "all customers", sum up all old due amounts
      oldDueAmount = customers.reduce((sum, customer) => sum + (customer.old_due_amount || 0), 0);
      waivedAmount = 0; // Can't calculate for "all" without loading all transactions
    }
    
    return { 
      expectedTotal, 
      expectedRTGS, 
      expectedCASH, 
      receivedRTGS, 
      receivedCASH, 
      receivedTotal: receivedRTGS + receivedCASH,
      oldDueAmount,
      waivedAmount,
      totalReceivables: expectedTotal + oldDueAmount - (receivedRTGS + receivedCASH) - waivedAmount
    };
  }, [consignments, txns, customers, customerId, waivedTransactions]);

  // Calculate account-wise totals
  const accountSummary = useMemo(() => {
    const accountTotals = new Map();
    
    txns.forEach(txn => {
      const account = accounts.find(a => a.id === txn.account_id);
      const accountName = account?.name || 'Unknown Account';
      
      if (!accountTotals.has(accountName)) {
        accountTotals.set(accountName, { total: 0, rtgs: 0, cash: 0 });
      }
      
      const current = accountTotals.get(accountName);
      current.total += txn.amount || 0;
      
      if (txn.mode === 'RTGS') {
        current.rtgs += txn.amount || 0;
      } else if (txn.mode === 'CASH') {
        current.cash += txn.amount || 0;
      }
    });
    
    return Array.from(accountTotals.entries()).map(([name, data]) => ({
      name,
      total: data.total,
      rtgs: data.rtgs,
      cash: data.cash
    })).sort((a, b) => b.total - a.total); // Sort by total amount descending
  }, [txns, accounts]);

  const currentCustomerName =
    customerId === "all" ? "All Customers" : (customers.find((c) => c.id === customerId)?.name || "");

  async function exportExcel() {
    try {
      const xlsx = await ensureXlsxReady();
      
      // Overall Summary
      const summary = [
        { Metric: "Total Invoiced", Value: kpi.expectedTotal },
        { Metric: "Invoiced RTGS", Value: kpi.expectedRTGS },
        { Metric: "Invoiced Cash", Value: kpi.expectedCASH },
        { Metric: "Received RTGS", Value: kpi.receivedRTGS },
        { Metric: "Received Cash", Value: kpi.receivedCASH },
        { Metric: "Total Received", Value: kpi.receivedTotal },
        { Metric: "Old Due Amount", Value: kpi.oldDueAmount },
        { Metric: "Pending RTGS", Value: Math.max(0, kpi.expectedRTGS - kpi.receivedRTGS) },
        { Metric: "Pending Cash", Value: Math.max(0, kpi.expectedCASH - kpi.receivedCASH) },
        { Metric: "Total Pending", Value: kpi.expectedTotal - kpi.receivedTotal },
        { Metric: "Total Receivables", Value: kpi.totalReceivables },
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
          Total_Invoiced: expectedTotal,
          Invoiced_RTGS: expectedRTGS,
          Invoiced_Cash: expectedCash,
          Received_RTGS: receivedRTGS,
          Received_Cash: receivedCash,
          Total_Received: receivedRTGS + receivedCash,
          Old_Due_Amount: customer.old_due_amount || 0,
          Pending_RTGS: Math.max(0, expectedRTGS - receivedRTGS),
          Pending_Cash: Math.max(0, expectedCash - receivedCash),
          Total_Pending: expectedTotal - (receivedRTGS + receivedCash),
          Total_Receivables: expectedTotal + (customer.old_due_amount || 0) - (receivedRTGS + receivedCash),
          Collection_Rate: expectedTotal > 0 ? `${((receivedRTGS + receivedCash) / expectedTotal * 100).toFixed(1)}%` : '0%'
        };
      }).filter(c => c.Total_Invoiced > 0 || c.Total_Received > 0); // Only include customers with activity

      // Detailed Consignments
      const consRows = consignments.map((c: any, index) => ({
        'S.No': index + 1,
        Date: c.date,
        Customer: customers.find((x) => x.id === c.customer_id)?.name || "Unknown",
        'Total (₹)': c.total,
        'RTGS Invoiced (₹)': c.rtgs_expected || 0,
        'Cash Invoiced (₹)': c.cash_expected || 0,
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
          'Created Date': formatDisplayDate(customer.created_at),
          'Total Consignments': customerConsignments.length,
          'Total Transactions': customerTransactions.length,
          'Last Consignment': customerConsignments.length > 0 ? 
            formatDisplayDate(new Date(Math.max(...customerConsignments.map(c => new Date(c.date).getTime())))) : 'None',
          'Last Transaction': customerTransactions.length > 0 ? 
            formatDisplayDate(new Date(Math.max(...customerTransactions.map(t => new Date(t.date).getTime())))) : 'None'
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

  async function handleAddConsignment(e: React.FormEvent<HTMLFormElement>) {
    try {
      await addConsignment(e);
    } catch (error) {
      console.error("Error adding consignment:", error);
      // Error is already shown by addConsignment function via alert
    }
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
    if (!payload.customer_id) {
      alert("Please select/add a customer first.");
      throw new Error("No customer selected");
    }
    
    const res = await fetch("/api/consignments", { method: "POST", body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Create failed");
      throw new Error(data.error || "Create failed");
    }
    
    // Success: Update state (form will be cleared by child component)
    setConsignments((s) => [...s, data]);
    
    // Show success indicator for 2 seconds
    setConsignmentSubmitted(true);
    setTimeout(() => setConsignmentSubmitted(false), 2000);
    
    showToast("success", "Consignment added successfully!");
  }

  async function handleAddTransaction(e: React.FormEvent<HTMLFormElement>) {
    try {
      await addTxn(e);
    } catch (error) {
      console.error("Error adding transaction:", error);
      // Error is already shown by addTxn function via alert
    }
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
    if (!payload.customer_id) {
      alert("Please select/add a customer first.");
      throw new Error("No customer selected");
    }
    
    const res = await fetch("/api/transactions", { method: "POST", body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Create failed");
      throw new Error(data.error || "Create failed");
    }
    
    // Success: Update state (form will be cleared by child component)
    setTxns((s) => [...s, data]);
    
    // Show success indicator for 2 seconds
    setTransactionSubmitted(true);
    setTimeout(() => setTransactionSubmitted(false), 2000);
    
    showToast("success", "Transaction added successfully!");
  }

  async function updateOldDueAmount() {
    if (customerId === "all") {
      alert("Please select a specific customer to update old due amount.");
      return;
    }

    const amount = parseFloat(oldDueInput);
    if (isNaN(amount) || amount < 0) {
      alert("Please enter a valid amount (0 or greater).");
      return;
    }

    try {
      const res = await fetch("/api/customers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: customerId, old_due_amount: amount }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Update failed");
        return;
      }

      // Update local state
      setCustomers(prevCustomers =>
        prevCustomers.map(customer =>
          customer.id === customerId
            ? { ...customer, old_due_amount: amount }
            : customer
        )
      );

      setEditingOldDue(false);
      setOldDueInput("");
      showToast("success", "Old due amount updated successfully!");
    } catch (error) {
      alert("Failed to update old due amount");
      console.error("Error updating old due amount:", error);
    }
  }

  function startEditingOldDue() {
    if (customerId === "all") {
      alert("Please select a specific customer to manage old due amount.");
      return;
    }
    
    const selectedCustomer = customers.find(c => c.id === customerId);
    setOldDueInput(String(selectedCustomer?.old_due_amount || 0));
    setEditingOldDue(true);
  }

  function cancelEditingOldDue() {
    setEditingOldDue(false);
    setOldDueInput("");
  }

  async function updateWaivedAmount() {
    if (customerId === "all") {
      alert("Please select a specific customer to add waived amount.");
      return;
    }

    const amount = parseFloat(waivedAmountInput);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount (must be greater than 0).");
      return;
    }

    if (!waivedDateInput) {
      alert("Please enter the date when amount was waived.");
      return;
    }

    try {
      const res = await fetch("/api/waived-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          customer_id: customerId, 
          amount: amount,
          waived_date: waivedDateInput,
          notes: waivedNotesInput || null
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to save waived amount");
        return;
      }

      // Reload waived transactions
      const updatedTransactions = await fetch(`/api/waived-transactions?customerId=${customerId}`)
        .then((r) => r.json());
      setWaivedTransactions(updatedTransactions);

      setEditingWaivedAmount(false);
      setWaivedAmountInput("");
      setWaivedDateInput("");
      setWaivedNotesInput("");
      showToast("success", "Waived amount saved successfully!");
    } catch (error) {
      alert("Failed to save waived amount");
      console.error("Error saving waived amount:", error);
    }
  }

  function startEditingWaivedAmount() {
    if (customerId === "all") {
      alert("Please select a specific customer to add waived amount.");
      return;
    }
    
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    setWaivedDateInput(today);
    setWaivedAmountInput("");
    setWaivedNotesInput("");
    setEditingWaivedAmount(true);
  }

  function cancelEditingWaivedAmount() {
    setEditingWaivedAmount(false);
    setWaivedAmountInput("");
    setWaivedDateInput("");
    setWaivedNotesInput("");
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
      date: updatedData.date,
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
    if (!res.ok) {
      showToast("error", data.error || "Delete failed");
      return;
    }
    
    setConsignments((s) => s.filter(c => c.id !== consignmentId));
    showToast("success", "Consignment deleted successfully!");
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
    if (!res.ok) {
      showToast("error", data.error || "Delete failed");
      return;
    }
    
    setTxns((s) => s.filter(t => t.id !== transactionId));
    showToast("success", "Transaction deleted successfully!");
  }

  function handleSettlementSuccess() {
    // Reload all data after settlement
    setConsignmentSubmitted(false);
    setTransactionSubmitted(false);
    
    // Reload customers to get updated old_due_amount
    fetch("/api/customers").then((r) => r.json()).then(setCustomers);
    
    // Reload consignments and transactions for the customer
    const p = new URLSearchParams();
    if (customerId) p.set("customerId", customerId);
    if (dateFrom) p.set("from", dateFrom);
    if (dateTo) p.set("to", dateTo);
    
    // Only filter by active period when a specific customer is selected and showAllHistory is false
    if (customerId && customerId !== "all" && !showAllHistory) {
      p.set("activeOnly", "true");
    }
    
    fetch(`/api/consignments?${p.toString()}`).then((r) => r.json()).then(setConsignments);
    fetch(`/api/transactions?${p.toString()}`).then((r) => r.json()).then(setTxns);
    
    // Reload waived transactions
    if (customerId && customerId !== "all") {
      fetch(`/api/waived-transactions?customerId=${customerId}`)
        .then((r) => r.json())
        .then(setWaivedTransactions);
    }
  }

  return (
    <AppLayout>
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
              <Input type="date" className="border-0 p-0 focus-visible:ring-0 w-full min-w-[160px]" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 border rounded-xl px-3 py-2 md:col-span-2">
              <Calendar className="w-4 h-4" />
              <Input type="date" className="border-0 p-0 focus-visible:ring-0 w-full min-w-[160px]" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>

            <form onSubmit={addCustomer} className="flex items-stretch gap-2 md:col-span-4 justify-self-end w-full md:w-auto">
              <Input name="new_customer" placeholder="Add customer (unique)" className="border rounded-xl px-3 py-2 h-11 text-base flex-1 md:w-[260px]" />
              <Button type="submit" className="h-11 rounded-2xl shrink-0">
                <PlusCircle className="w-4 h-4 mr-2" /> Add
              </Button>
            </form>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="px-6 py-2 rounded-full border text-lg font-semibold bg-blue-50 text-blue-700 border-blue-200 shadow-sm">
                {currentCustomerName || "Select a customer"}
              </div>
              {customerId && customerId !== "all" && (
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showAllHistory}
                    onChange={(e) => setShowAllHistory(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-medium">Show All History</span>
                  <span className="text-xs text-gray-500">(includes settled periods)</span>
                </label>
              )}
            </div>
            <div className="flex gap-3">
              {customerId && customerId !== "all" && (
                <Button 
                  type="button" 
                  className="rounded-2xl bg-green-600 hover:bg-green-700 pointer-events-auto" 
                  onClick={() => setShowSettlementModal(true)}
                >
                  <Archive className="w-4 h-4 mr-2" /> Settle Account
                </Button>
              )}
              <Button type="button" className="rounded-2xl pointer-events-auto" variant="secondary" onClick={exportExcel}>
                <Download className="w-4 h-4 mr-2" /> Export Excel
              </Button>
            </div>
          </div>
        </div>
      </div>

            {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <div className="text-xs text-gray-600 uppercase tracking-wide">Total Invoiced</div>
          <div className="text-2xl font-bold text-gray-900">{fmt(kpi.expectedTotal)}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <div className="text-xs text-gray-600 uppercase tracking-wide">Invoiced RTGS</div>
          <div className="text-2xl font-bold text-gray-900">{fmt(kpi.expectedRTGS)}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <div className="text-xs text-gray-600 uppercase tracking-wide">Invoiced Cash</div>
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
          <div className="text-xs text-purple-600 uppercase tracking-wide">Total Pending</div>
          <div className="text-2xl font-bold text-purple-600">{fmt(Math.max(0, kpi.expectedTotal - kpi.receivedTotal - kpi.waivedAmount))}</div>
          {kpi.waivedAmount > 0 && (
            <div className="text-xs text-amber-600 mt-1">After waived amount</div>
          )}
        </div>
        {/* Only show Total Receivables if there's an old due amount */}
        {kpi.oldDueAmount > 0 && (
          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="text-xs text-red-600 uppercase tracking-wide">Total Receivables</div>
            <div className="text-2xl font-bold text-red-600">{fmt(Math.max(0, kpi.totalReceivables))}</div>
            <div className="text-xs text-red-500 mt-1">Including Previous Due</div>
          </div>
        )}
      </div>

      {/* Previous Due Section - Compact and subtle for individual customers */}
      {customerId !== "all" && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-orange-600 text-sm">₹</span>
              </div>
              <div>
                <span className="text-gray-700 font-medium">Previous Due: </span>
                <span className="text-lg font-semibold text-orange-900">{fmt(kpi.oldDueAmount)}</span>
                {kpi.oldDueAmount > 0 && (
                  <span className="text-xs text-gray-500 ml-2">(included in Total Receivables)</span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {!editingOldDue ? (
                <Button 
                  onClick={startEditingOldDue}
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 px-3 border-gray-300 text-gray-600 hover:bg-gray-100"
                >
                  {kpi.oldDueAmount > 0 ? 'Edit' : 'Add'}
                </Button>
              ) : (
                <>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={oldDueInput}
                    onChange={(e) => setOldDueInput(e.target.value)}
                    placeholder="Amount"
                    className="w-24 h-7 text-xs text-right"
                  />
                  <Button 
                    onClick={updateOldDueAmount}
                    size="sm"
                    className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700"
                  >
                    Save
                  </Button>
                  <Button 
                    onClick={cancelEditingOldDue}
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Waived Amount Section - With date, notes, and history */}
      {customerId !== "all" && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center">
                <span className="text-amber-600 text-sm">₹</span>
              </div>
              <div>
                <span className="text-gray-700 font-medium">Total Amount Waived: </span>
                <span className="text-lg font-semibold text-amber-900">{fmt(kpi.waivedAmount)}</span>
                {kpi.waivedAmount > 0 && (
                  <span className="text-xs text-gray-500 ml-2">({waivedTransactions.length} {waivedTransactions.length === 1 ? 'entry' : 'entries'})</span>
                )}
              </div>
            </div>
            <Button 
              onClick={startEditingWaivedAmount}
              size="sm"
              variant="outline"
              className="text-xs h-7 px-3 border-amber-300 text-amber-700 hover:bg-amber-100"
            >
              Add Waived Amount
            </Button>
          </div>

          {/* Add Waived Amount Form */}
          {editingWaivedAmount && (
            <div className="bg-white border border-amber-300 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Amount *</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={waivedAmountInput}
                    onChange={(e) => setWaivedAmountInput(e.target.value)}
                    placeholder="Amount waived"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Date *</label>
                  <Input
                    type="date"
                    value={waivedDateInput}
                    onChange={(e) => setWaivedDateInput(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="md:col-span-1 flex items-end gap-2">
                  <Button 
                    onClick={updateWaivedAmount}
                    size="sm"
                    className="h-8 px-3 text-xs bg-green-600 hover:bg-green-700"
                  >
                    Save
                  </Button>
                  <Button 
                    onClick={cancelEditingWaivedAmount}
                    size="sm"
                    variant="outline"
                    className="h-8 px-3 text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Notes (Optional)</label>
                <Input
                  type="text"
                  value={waivedNotesInput}
                  onChange={(e) => setWaivedNotesInput(e.target.value)}
                  placeholder="Reason for waiving amount..."
                  className="h-8 text-sm"
                />
              </div>
            </div>
          )}

          {/* Waived Transactions History */}
          {waivedTransactions.length > 0 && (
            <div className="bg-white border border-amber-200 rounded-lg p-3">
              <h4 className="text-xs font-semibold text-gray-700 mb-2">Waived Amount History:</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {waivedTransactions.map((wt) => (
                  <div key={wt.id} className="flex items-start justify-between text-xs border-b border-gray-100 pb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-amber-700">{fmt(wt.amount)}</span>
                        <span className="text-gray-500">on {formatDisplayDate(wt.waived_date)}</span>
                      </div>
                      {wt.notes && (
                        <div className="text-gray-600 mt-1 italic">{wt.notes}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content Area - Show Customer Analytics for "All customers" or Tables for specific customer */}
      {customerId === "all" ? (
        <CustomerAnalytics dateFrom={dateFrom} dateTo={dateTo} />
      ) : (
        <>
          {/* Consignments Table */}
          <ConsignmentsTable 
            consignments={consignments}
            onAddConsignment={customerId !== "all" ? handleAddConsignment : undefined}
            onEditConsignment={editConsignment}
            onDeleteConsignment={deleteConsignment}
            customerId={customerId}
            customers={customers}
            showSubmissionSuccess={consignmentSubmitted}
          />

          {/* Transactions Table */}
          <TransactionsTable 
            transactions={txns}
            accounts={accounts}
            customers={customers}
            onAddTransaction={customerId !== "all" ? handleAddTransaction : undefined}
            onEditTransaction={editTransaction}
            onDeleteTransaction={deleteTransaction}
            showSubmissionSuccess={transactionSubmitted}
          />

          {/* Account-wise Summary */}
          {accountSummary.length > 0 && (
            <div className="mt-8 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Account-wise Collection Summary</h3>
              <div className="overflow-x-auto">
                <div className="flex gap-4 pb-2 min-w-min">
                  {accountSummary.map((account, index) => (
                    <div key={account.name} className="bg-white rounded-xl p-4 border shadow-sm flex-shrink-0 w-64">
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-gray-700 truncate" title={account.name}>
                          {account.name}
                        </div>
                        <div className="text-xl font-bold text-gray-900">{fmt(account.total)}</div>
                        <div className="space-y-1 text-xs text-gray-600">
                          <div className="flex justify-between">
                            <span>RTGS:</span>
                            <span className="font-medium text-blue-600">{fmt(account.rtgs)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Cash:</span>
                            <span className="font-medium text-green-600">{fmt(account.cash)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <p className="text-xs text-gray-500 text-center">
        Granite Ledger - Comprehensive consignment and payment management system
      </p>
      </div>

      {/* Settlement Modal */}
      {showSettlementModal && customerId && customerId !== "all" && (
        <CustomerSettlementModal
          customerId={customerId}
          customerName={currentCustomerName}
          currentBalance={kpi.expectedTotal - kpi.receivedTotal}
          oldDueAmount={kpi.oldDueAmount}
          waivedAmount={kpi.waivedAmount}
          onClose={() => setShowSettlementModal(false)}
          onSuccess={handleSettlementSuccess}
        />
      )}
    </AppLayout>
  );
}


