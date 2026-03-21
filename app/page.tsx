'use client';

import React, { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, Download, PlusCircle, BarChart3, Settings, Archive, Lock, Unlock, Pencil, Trash2, FileText } from "lucide-react";
import { ConsignmentsTable } from "@/components/ConsignmentsTable";
import { TransactionsTable } from "@/components/TransactionsTable";
import { CustomerAnalytics } from "@/components/CustomerAnalytics";
import { CustomerSettlementModal } from "@/components/CustomerSettlementModal";
import { PinUnlockModal } from "@/components/PinUnlockModal";
import { useToast } from "@/components/ui/toast";
import { useMasking } from "@/contexts/MaskingContext";
import * as XLSX from "xlsx-js-style";
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

// Helper function to detect "Galaxy" with fuzzy matching for typos
function isGalaxyRelated(text: string | null | undefined): boolean {
  if (!text) return false;
  const normalized = text.toLowerCase().trim();
  
  // Exact and common variations
  const patterns = [
    'galaxy',
    'galxy',     // missing 'a'
    'galacy',    // switched letters
    'galexy',    // 'e' instead of 'a'
    'galaxi',    // missing 'y'
    'glaxy',     // missing 'a'
    'galaxys',   // plural
    'galxay',    // switched letters
  ];
  
  return patterns.some(pattern => normalized.includes(pattern));
}

export default function Page() {
  const { maskName, isUnlocked, attemptUnlock, lock } = useMasking();
  const [customers, setCustomers] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [consignments, setConsignments] = useState<any[]>([]);
  const [txns, setTxns] = useState<any[]>([]);
  const [waivedTransactions, setWaivedTransactions] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState("all");
  const [selectedYear, setSelectedYear] = useState<number | "all">("all");
  const [selectedMonth, setSelectedMonth] = useState<number | "all">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showAllHistory, setShowAllHistory] = useState(false); // Toggle for viewing all periods vs current period only
  const [showOneTimeCustomers, setShowOneTimeCustomers] = useState(false); // Toggle for including all customers (regular + one-time) in dropdown
  const [consignmentSubmitted, setConsignmentSubmitted] = useState(false);
  const [transactionSubmitted, setTransactionSubmitted] = useState(false);
  const [editingOldDue, setEditingOldDue] = useState(false);
  const [oldDueInput, setOldDueInput] = useState("");
  const [oldDueNotesInput, setOldDueNotesInput] = useState("");
  const [editingWaivedAmount, setEditingWaivedAmount] = useState(false);
  const [editingWaivedId, setEditingWaivedId] = useState<string | null>(null);
  const [waivedAmountInput, setWaivedAmountInput] = useState("");
  const [waivedDateInput, setWaivedDateInput] = useState("");
  const [waivedNotesInput, setWaivedNotesInput] = useState("");
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [excludeGalaxy, setExcludeGalaxy] = useState(false);
  const [excludeOnlyBill, setExcludeOnlyBill] = useState(false);
  const [consignmentDateFrom, setConsignmentDateFrom] = useState("");
  const [consignmentDateTo, setConsignmentDateTo] = useState("");
  const { showToast } = useToast();

  const handleUnlockToggle = () => {
    if (isUnlocked) {
      lock();
    } else {
      setShowPinModal(true);
    }
  };

  const handlePinSubmit = (pin: string) => {
    const success = attemptUnlock(pin);
    if (success) {
      setShowPinModal(false);
    } else {
      alert('Incorrect PIN');
    }
  };

  useEffect(() => {
    async function boot() {
      // Load customers based on toggle
      // When disabled: only regular customers
      // When enabled: all customers (regular + one-time)
      const customerType = showOneTimeCustomers ? "all" : "regular";
      const [cust, accts] = await Promise.all([
        fetch(`/api/customers?type=${customerType}`).then((r) => r.json()),
        fetch("/api/bank-accounts").then((r) => r.json()),
      ]);
      setCustomers(cust);
      setAccounts(accts);
    }
    boot();
  }, [showOneTimeCustomers]);

  useEffect(() => {
    // Calculate date range from month selector
    let from = dateFrom;
    let to = dateTo;
    
    if (selectedYear !== "all" && selectedMonth !== "all") {
      from = new Date(selectedYear, selectedMonth - 1, 1).toISOString().split('T')[0];
      to = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];
    } else if (selectedYear !== "all") {
      from = new Date(selectedYear, 0, 1).toISOString().split('T')[0];
      to = new Date(selectedYear, 11, 31).toISOString().split('T')[0];
    }
    
    const p = new URLSearchParams();
    if (customerId) p.set("customerId", customerId);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    
    // Only filter by active period when a specific customer is selected and showAllHistory is false
    if (customerId && customerId !== "all" && !showAllHistory) {
      p.set("activeOnly", "true");
    }
    
    fetch(`/api/consignments?${p.toString()}`).then((r) => r.json()).then(setConsignments).catch(() => setConsignments([]));
    fetch(`/api/transactions?${p.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        // Ensure data is an array
        if (Array.isArray(data)) {
          setTxns(data);
        } else {
          console.error('Transactions API returned non-array:', data);
          setTxns([]);
        }
      })
      .catch((error) => {
        console.error('Failed to load transactions:', error);
        setTxns([]);
      });
    
    // Load waived transactions for the selected customer
    if (customerId && customerId !== "all") {
      fetch(`/api/waived-transactions?customerId=${customerId}`)
        .then((r) => r.json())
        .then(setWaivedTransactions);
    } else {
      setWaivedTransactions([]);
    }
  }, [customerId, dateFrom, dateTo, showAllHistory, selectedYear, selectedMonth]);

  // Check if current customer has any Galaxy-related consignments
  const hasGalaxyConsignments = useMemo(() => {
    if (customerId === "all") return false;
    return consignments.some(c => isGalaxyRelated(c.remarks));
  }, [consignments, customerId]);

  // Check if current customer has any only bill consignments
  const hasOnlyBillEntries = useMemo(() => {
    if (customerId === "all") return false;
    return consignments.some(c => c.entry_type === 'only_bill');
  }, [consignments, customerId]);

  // Filter consignments based on Galaxy exclusion, Only Bill exclusion, and date range
  const filteredConsignments = useMemo(() => {
    let filtered = consignments;
    
    // Apply date filters if set
    if (consignmentDateFrom) {
      filtered = filtered.filter(c => c.date >= consignmentDateFrom);
    }
    if (consignmentDateTo) {
      filtered = filtered.filter(c => c.date <= consignmentDateTo);
    }
    
    if (excludeGalaxy && customerId !== "all") {
      filtered = filtered.filter(c => !isGalaxyRelated(c.remarks));
    }
    
    if (excludeOnlyBill && customerId !== "all") {
      filtered = filtered.filter(c => c.entry_type !== 'only_bill');
    }
    
    return filtered;
  }, [consignments, excludeGalaxy, excludeOnlyBill, customerId, consignmentDateFrom, consignmentDateTo]);

  // Filter transactions by consignment date range for consistent KPI calculations
  const filteredTransactions = useMemo(() => {
    let filtered = txns;
    
    // Apply consignment date filters to transactions if set
    if (consignmentDateFrom) {
      filtered = filtered.filter(t => t.date >= consignmentDateFrom);
    }
    if (consignmentDateTo) {
      filtered = filtered.filter(t => t.date <= consignmentDateTo);
    }
    
    return filtered;
  }, [txns, consignmentDateFrom, consignmentDateTo]);

  const kpi = useMemo(() => {
    const expectedTotal = filteredConsignments.reduce((s, r) => s + (r.total || 0), 0);
    const expectedRTGS = filteredConsignments.reduce((s, r) => s + (r.rtgs_expected || 0), 0);
    const expectedCASH = filteredConsignments.reduce((s, r) => s + (r.cash_expected || 0), 0);
    const receivedRTGS = filteredTransactions.filter((t) => t.mode === "RTGS").reduce((s, t) => s + (t.amount || 0), 0);
    const receivedCASH = filteredTransactions.filter((t) => t.mode === "CASH").reduce((s, t) => s + (t.amount || 0), 0);
    const receivedTotal = receivedRTGS + receivedCASH;
    
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
    
    // Calculate effective Galaxy payments when Galaxy is excluded
    let effectiveGalaxyPayments = 0;
    let adjustedTotalReceivables = expectedTotal + oldDueAmount - receivedTotal - waivedAmount;
    
    if (excludeGalaxy && customerId !== "all") {
      // When Galaxy is excluded, check if payments exceed non-Galaxy expected amount
      const excessPayment = receivedTotal - expectedTotal;
      if (excessPayment > 0) {
        effectiveGalaxyPayments = excessPayment;
        // Adjust receivables to not go negative
        adjustedTotalReceivables = 0;
      }
    }
    
    return { 
      expectedTotal, 
      expectedRTGS, 
      expectedCASH, 
      receivedRTGS, 
      receivedCASH, 
      receivedTotal,
      oldDueAmount,
      waivedAmount,
      totalReceivables: adjustedTotalReceivables,
      effectiveGalaxyPayments
    };
  }, [filteredConsignments, filteredTransactions, customers, customerId, waivedTransactions, excludeGalaxy]);

  // Calculate account-wise totals
  const accountSummary = useMemo(() => {
    const accountTotals = new Map();
    
    filteredTransactions.forEach(txn => {
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
  }, [filteredTransactions, accounts]);

  const currentCustomerName =
    customerId === "all" ? "All Customers" : (customers.find((c) => c.id === customerId)?.name || "");

  function openAccountStatement() {
    if (customerId === 'all') {
      alert('Please select a specific customer to generate an account statement.');
      return;
    }

    const selectedCustomer = customers.find(c => c.id === customerId);

    const statementData = {
      customerName: selectedCustomer?.name || '',
      generatedDate: new Date().toISOString().split('T')[0],
      consignmentDateFrom,
      consignmentDateTo,
      excludeGalaxy,
      excludeOnlyBill,
      kpi: {
        expectedTotal: kpi.expectedTotal,
        expectedRTGS: kpi.expectedRTGS,
        expectedCASH: kpi.expectedCASH,
        receivedRTGS: kpi.receivedRTGS,
        receivedCASH: kpi.receivedCASH,
        receivedTotal: kpi.receivedTotal,
        oldDueAmount: kpi.oldDueAmount,
        waivedAmount: kpi.waivedAmount,
        totalReceivables: kpi.totalReceivables,
      },
      oldDueNotes: selectedCustomer?.old_due_notes || null,
      waivedTransactions: waivedTransactions.map(wt => ({
        id: wt.id,
        amount: wt.amount,
        waived_date: wt.waived_date,
        notes: wt.notes || null,
      })),
      consignments: filteredConsignments.map(c => ({
        date: c.date,
        total: c.total,
        rtgs_expected: c.rtgs_expected || 0,
        cash_expected: c.cash_expected || 0,
        remarks: c.remarks || null,
        entry_type: c.entry_type || null,
      })),
      transactions: filteredTransactions.map(t => ({
        date: t.date,
        mode: t.mode,
        amount: t.amount,
        account_name: accounts.find(a => a.id === t.account_id)?.name || '',
        note: t.note || null,
      })),
    };

    sessionStorage.setItem('account_statement_data', JSON.stringify(statementData));
    window.open('/account-statement', '_blank');
  }

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
        body: JSON.stringify({ id: customerId, old_due_amount: amount, old_due_notes: oldDueNotesInput || null }),
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
            ? { ...customer, old_due_amount: amount, old_due_notes: oldDueNotesInput || null }
            : customer
        )
      );

      setEditingOldDue(false);
      setOldDueInput("");
      setOldDueNotesInput("");
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
    setOldDueNotesInput(selectedCustomer?.old_due_notes || "");
    setEditingOldDue(true);
  }

  function cancelEditingOldDue() {
    setEditingOldDue(false);
    setOldDueInput("");
    setOldDueNotesInput("");
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
      if (editingWaivedId) {
        // Update existing entry
        const res = await fetch("/api/waived-transactions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            id: editingWaivedId,
            amount,
            waived_date: waivedDateInput,
            notes: waivedNotesInput || null
          }),
        });
        const data = await res.json();
        if (!res.ok) { alert(data.error || "Failed to update waived amount"); return; }
        showToast("success", "Waived amount updated!");
      } else {
        // Create new entry
        const res = await fetch("/api/waived-transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            customer_id: customerId, 
            amount,
            waived_date: waivedDateInput,
            notes: waivedNotesInput || null
          }),
        });
        const data = await res.json();
        if (!res.ok) { alert(data.error || "Failed to save waived amount"); return; }
        showToast("success", "Waived amount saved successfully!");
      }

      const updatedTransactions = await fetch(`/api/waived-transactions?customerId=${customerId}`)
        .then((r) => r.json());
      setWaivedTransactions(updatedTransactions);

      setEditingWaivedAmount(false);
      setEditingWaivedId(null);
      setWaivedAmountInput("");
      setWaivedDateInput("");
      setWaivedNotesInput("");
    } catch (error) {
      alert("Failed to save waived amount");
      console.error("Error saving waived amount:", error);
    }
  }

  function startEditWaivedEntry(wt: any) {
    setEditingWaivedId(wt.id);
    setWaivedAmountInput(String(wt.amount));
    setWaivedDateInput(wt.waived_date);
    setWaivedNotesInput(wt.notes || "");
    setEditingWaivedAmount(true);
  }

  async function deleteWaivedEntry(id: string) {
    if (!confirm("Delete this waived amount entry?")) return;
    try {
      const res = await fetch(`/api/waived-transactions?id=${id}`, { method: "DELETE" });
      if (!res.ok) { alert("Failed to delete entry"); return; }
      const updatedTransactions = await fetch(`/api/waived-transactions?customerId=${customerId}`)
        .then((r) => r.json());
      setWaivedTransactions(updatedTransactions);
      showToast("success", "Waived amount entry deleted.");
    } catch {
      alert("Failed to delete entry");
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
    setEditingWaivedId(null);
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
      date: updatedData.date,
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
    <DashboardLayout>
      <div className="min-h-screen w-full bg-gray-50 p-4 sm:p-6 space-y-6">
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold">Granite Customer Dashboard</h1>
            <p className="text-gray-600 text-sm sm:text-base">Manage consignments and payments with comprehensive table views</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <Button 
              onClick={handleUnlockToggle}
              className={`flex items-center space-x-2 text-sm sm:text-base ${
                isUnlocked 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-orange-600 hover:bg-orange-700'
              }`}
            >
              {isUnlocked ? (
                <>
                  <Unlock className="w-4 h-4" />
                  <span className="hidden sm:inline">Lock Names</span>
                  <span className="sm:hidden">Lock</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span className="hidden sm:inline">Unlock Names</span>
                  <span className="sm:hidden">Unlock</span>
                </>
              )}
            </Button>
            <a 
              href="/analytics" 
              className="inline-flex items-center px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Analytics</span>
            </a>
            <a 
              href="/admin" 
              className="inline-flex items-center px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Settings className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Admin Panel</span>
            </a>
          </div>
        </div>

        <div className="w-full space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-1 lg:col-span-3">
              <label className="text-xs font-medium text-gray-700 mb-1 block sm:hidden">Customer</label>
              <select className="border rounded-xl px-3 py-2 w-full" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="all">All customers</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{maskName(c.name)}</option>)}
              </select>
            </div>

            <div className="sm:col-span-1 lg:col-span-3">
              <label className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={showOneTimeCustomers}
                  onChange={(e) => setShowOneTimeCustomers(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Include All Customers</span>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:col-span-2 lg:col-span-6">
              <Calendar className="w-4 h-4 text-gray-500 hidden sm:block" />
              <select 
                className="border rounded-xl px-3 py-2 w-full sm:flex-1" 
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
                className="border rounded-xl px-3 py-2 w-full sm:flex-1" 
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

          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <div className="px-4 sm:px-6 py-2 rounded-full border text-base sm:text-lg font-semibold bg-blue-50 text-blue-700 border-blue-200 shadow-sm w-full sm:w-auto text-center">
                {maskName(currentCustomerName || "Select a customer")}
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
                  <span className="text-xs text-gray-500 hidden sm:inline">(includes settled periods)</span>
                </label>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              {customerId && customerId !== "all" && (
                <Button 
                  type="button" 
                  className="rounded-2xl bg-green-600 hover:bg-green-700 pointer-events-auto w-full sm:w-auto justify-center" 
                  onClick={() => setShowSettlementModal(true)}
                >
                  <Archive className="w-4 h-4 mr-2" /> Settle Account
                </Button>
              )}
              <Button type="button" className="rounded-2xl pointer-events-auto w-full sm:w-auto justify-center" variant="secondary" onClick={exportExcel}>
                <Download className="w-4 h-4 mr-2" /> Export Excel
              </Button>
              {customerId && customerId !== 'all' && (
                <Button type="button" className="rounded-2xl pointer-events-auto w-full sm:w-auto justify-center bg-orange-600 hover:bg-orange-700 text-white" onClick={openAccountStatement}>
                  <FileText className="w-4 h-4 mr-2" /> Account Statement
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

            {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-3 md:gap-4">
        <div className="bg-white rounded-xl p-3 md:p-4 border shadow-sm min-w-0">
          <div className="text-[10px] md:text-xs text-gray-600 uppercase tracking-wide truncate">Total Invoiced</div>
          <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900 break-words">{fmt(kpi.expectedTotal)}</div>
        </div>
        <div className="bg-white rounded-xl p-3 md:p-4 border shadow-sm min-w-0">
          <div className="text-[10px] md:text-xs text-gray-600 uppercase tracking-wide truncate">Invoiced RTGS</div>
          <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900 break-words">{fmt(kpi.expectedRTGS)}</div>
        </div>
        <div className="bg-white rounded-xl p-3 md:p-4 border shadow-sm min-w-0">
          <div className="text-[10px] md:text-xs text-gray-600 uppercase tracking-wide truncate">Invoiced Cash</div>
          <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900 break-words">{fmt(kpi.expectedCASH)}</div>
        </div>
        <div className="bg-white rounded-xl p-3 md:p-4 border shadow-sm min-w-0">
          <div className="text-[10px] md:text-xs text-blue-600 uppercase tracking-wide truncate">Received RTGS</div>
          <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-blue-600 break-words">{fmt(kpi.receivedRTGS)}</div>
        </div>
        <div className="bg-white rounded-xl p-3 md:p-4 border shadow-sm min-w-0">
          <div className="text-[10px] md:text-xs text-green-600 uppercase tracking-wide truncate">Received Cash</div>
          <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-green-600 break-words">{fmt(kpi.receivedCASH)}</div>
        </div>
        <div className="bg-white rounded-xl p-3 md:p-4 border shadow-sm min-w-0">
          <div className={`text-[10px] md:text-xs uppercase tracking-wide truncate ${
            (kpi.expectedTotal - kpi.receivedTotal - kpi.waivedAmount) >= 0 
              ? 'text-purple-600' 
              : 'text-green-600'
          }`}>
            {(kpi.expectedTotal - kpi.receivedTotal - kpi.waivedAmount) >= 0 ? 'Total Pending' : 'Total Advance'}
          </div>
          <div className={`text-base sm:text-lg md:text-xl lg:text-2xl font-bold break-words ${
            (kpi.expectedTotal - kpi.receivedTotal - kpi.waivedAmount) >= 0 
              ? 'text-purple-600' 
              : 'text-green-600'
          }`}>
            {fmt(Math.abs(kpi.expectedTotal - kpi.receivedTotal - kpi.waivedAmount))}
          </div>
          {kpi.waivedAmount > 0 && (
            <div className="text-[10px] md:text-xs text-amber-600 mt-1 truncate">After waived amount</div>
          )}
        </div>
        {/* Show Total Receivables/Advance based on value */}
        {(kpi.oldDueAmount > 0 || kpi.totalReceivables < 0) && (
          <div className="bg-white rounded-xl p-3 md:p-4 border shadow-sm min-w-0">
            <div className={`text-[10px] md:text-xs uppercase tracking-wide truncate ${
              kpi.totalReceivables >= 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {kpi.totalReceivables >= 0 ? 'Total Receivables' : 'Total Advance'}
            </div>
            <div className={`text-base sm:text-lg md:text-xl lg:text-2xl font-bold break-words ${
              kpi.totalReceivables >= 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {fmt(Math.abs(kpi.totalReceivables))}
            </div>
            <div className={`text-[10px] md:text-xs mt-1 truncate ${
              kpi.totalReceivables >= 0 ? 'text-red-500' : 'text-green-500'
            }`}>
              {kpi.totalReceivables >= 0 ? 'Including Previous Due' : 'Overpayment Credit'}
            </div>
          </div>
        )}
        
        {/* Galaxy Payments Tile - Only show when Galaxy excluded and there's excess payment */}
        {excludeGalaxy && kpi.effectiveGalaxyPayments > 0 && (
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-3 md:p-4 border-2 border-purple-200 shadow-sm min-w-0">
            <div className="text-[10px] md:text-xs text-purple-600 uppercase tracking-wide font-semibold truncate">Galaxy Payments</div>
            <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-purple-600 break-words">{fmt(kpi.effectiveGalaxyPayments)}</div>
            <div className="text-[10px] md:text-xs text-purple-500 mt-1 truncate">Effective Amount Received</div>
          </div>
        )}
      </div>

      {/* Previous Due Section - Compact and subtle for individual customers */}
      {customerId !== "all" && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm space-y-3">
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
                {!editingOldDue && customers.find(c => c.id === customerId)?.old_due_notes && (
                  <div className="text-xs text-gray-500 mt-1 italic">
                    {customers.find(c => c.id === customerId)?.old_due_notes}
                  </div>
                )}
              </div>
            </div>
            <Button 
              onClick={editingOldDue ? cancelEditingOldDue : startEditingOldDue}
              size="sm"
              variant="outline"
              className="text-xs h-7 px-3 border-gray-300 text-gray-600 hover:bg-gray-100"
            >
              {editingOldDue ? 'Cancel' : (kpi.oldDueAmount > 0 ? 'Edit' : 'Add')}
            </Button>
          </div>

          {editingOldDue && (
            <div className="bg-white border border-gray-300 rounded-lg p-3 space-y-2">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 block mb-1">Amount (₹) *</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={oldDueInput}
                    onChange={(e) => setOldDueInput(e.target.value)}
                    placeholder="0"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={updateOldDueAmount}
                    size="sm"
                    className="h-8 px-4 text-xs bg-green-600 hover:bg-green-700"
                  >
                    Save
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Notes (Optional)</label>
                <Input
                  type="text"
                  value={oldDueNotesInput}
                  onChange={(e) => setOldDueNotesInput(e.target.value)}
                  placeholder="e.g. Carried over from previous year, dispute settlement..."
                  className="h-8 text-sm"
                />
              </div>
            </div>
          )}
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

          {/* Add / Edit Waived Amount Form */}
          {editingWaivedAmount && (
            <div className="bg-white border border-amber-300 rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-amber-700">
                {editingWaivedId ? "Edit Waived Amount" : "Add Waived Amount"}
              </p>
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
                  <div key={wt.id} className="flex items-start justify-between text-xs border-b border-gray-100 pb-2 last:border-0">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-amber-700">{fmt(wt.amount)}</span>
                        <span className="text-gray-500">on {formatDisplayDate(wt.waived_date)}</span>
                      </div>
                      {wt.notes && (
                        <div className="text-gray-600 mt-1 italic">{wt.notes}</div>
                      )}
                    </div>
                    <div className="flex gap-1 ml-2 shrink-0">
                      <button
                        onClick={() => startEditWaivedEntry(wt)}
                        className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                        title="Edit"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => deleteWaivedEntry(wt.id)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
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
          {/* Galaxy Filter and Only Bill Filter - Show only when customer is selected */}
          {customerId !== "all" && (hasGalaxyConsignments || hasOnlyBillEntries) && (
            <div className="mb-4 flex justify-end gap-3">
              {hasGalaxyConsignments && (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-xl">
                  <input
                    type="checkbox"
                    id="excludeGalaxy"
                    checked={excludeGalaxy}
                    onChange={(e) => setExcludeGalaxy(e.target.checked)}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <label htmlFor="excludeGalaxy" className="text-sm font-medium text-green-800 cursor-pointer">
                    Exclude Galaxy
                  </label>
                </div>
              )}
              
              {hasOnlyBillEntries && (
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl">
                  <input
                    type="checkbox"
                    id="excludeOnlyBill"
                    checked={excludeOnlyBill}
                    onChange={(e) => setExcludeOnlyBill(e.target.checked)}
                    className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                  />
                  <label htmlFor="excludeOnlyBill" className="text-sm font-medium text-amber-800 cursor-pointer">
                    Exclude Only Bill
                  </label>
                </div>
              )}
            </div>
          )}
          
          {/* Consignments Date Filter */}
          <div className="bg-white rounded-xl border shadow-sm p-4 mb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-semibold text-gray-700">Filter Consignments:</span>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-1">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label className="text-sm text-gray-600 whitespace-nowrap">From:</label>
                  <Input
                    type="date"
                    value={consignmentDateFrom}
                    onChange={(e) => setConsignmentDateFrom(e.target.value)}
                    className="border rounded-lg px-3 py-1.5 text-sm w-full sm:w-auto"
                  />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label className="text-sm text-gray-600 whitespace-nowrap">To:</label>
                  <Input
                    type="date"
                    value={consignmentDateTo}
                    onChange={(e) => setConsignmentDateTo(e.target.value)}
                    className="border rounded-lg px-3 py-1.5 text-sm w-full sm:w-auto"
                  />
                </div>
                {(consignmentDateFrom || consignmentDateTo) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setConsignmentDateFrom("");
                      setConsignmentDateTo("");
                    }}
                    className="text-xs whitespace-nowrap w-full sm:w-auto"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
              <div className="text-sm text-gray-600 font-medium">
                {filteredConsignments.length} / {consignments.length} records
              </div>
            </div>
          </div>

          {/* Consignments Table */}
          <ConsignmentsTable 
            consignments={filteredConsignments}
            onAddConsignment={customerId !== "all" ? handleAddConsignment : undefined}
            onEditConsignment={editConsignment}
            onDeleteConsignment={deleteConsignment}
            customerId={customerId}
            customers={customers}
            showSubmissionSuccess={consignmentSubmitted}
          />

          {/* Transactions Table */}
          <TransactionsTable 
            transactions={filteredTransactions}
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

      {/* PIN Unlock Modal */}
      <PinUnlockModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSubmit={handlePinSubmit}
      />
    </DashboardLayout>
  );
}


