'use client';

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import { formatDisplayDate } from "@/lib/date-utils";
import { useToast } from "@/components/ui/toast";
import { useSessionMonthYear } from "@/hooks/useSessionMonth";
import * as XLSX from 'xlsx-js-style';
import { 
  Plus, 
  Trash2,
  Calendar,
  DollarSign,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Edit2,
  Save,
  X,
  Filter,
  Download,
  Settings,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight
} from "lucide-react";

interface BankCollection {
  id: string;
  name: string;
  openingBalance: number;     // Balance carried forward from previous months
  totalReceived: number;      // Total collected from customers in current period
  rtgs: number;               // RTGS collections in current period
  cash: number;               // Cash collections in current period
  totalExpenses: number;      // Total spent from this account in current period
  currentBalance: number;     // Closing balance (opening + received - spent)
}

interface Expense {
  id: string;
  date: string;
  account_id: string;
  amount: number;
  notes?: string;
  description?: string;
  bank_accounts?: {
    name: string;
  };
  expense_categories?: {
    name: string;
    color?: string;
  };
}

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const fmt = (n: number) => INR.format(n || 0);

// Helper function to format number with Indian comma style (1,00,000)
// Supports negative numbers (e.g., -1,00,000)
const formatIndianNumber = (value: string): string => {
  if (!value) return '';
  
  // Check if negative
  const isNegative = value.toString().startsWith('-');
  
  // Remove existing commas and non-numeric characters except decimal point and minus sign
  const numStr = value.replace(/[^\d.-]/g, '').replace(/-/g, '');
  
  // Split into integer and decimal parts
  const parts = numStr.split('.');
  let intPart = parts[0];
  const decPart = parts.length > 1 ? '.' + parts[1] : '';
  
  // Apply Indian number system formatting
  if (intPart.length > 3) {
    const lastThree = intPart.slice(-3);
    const remaining = intPart.slice(0, -3);
    intPart = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  }
  
  return (isNegative ? '-' : '') + intPart + decPart;
};

// Helper function to remove commas for saving to database
// Preserves negative sign
const parseIndianNumber = (value: string): string => {
  return value.replace(/,/g, '');
};

// Helper function to get subtle account-specific colors
const getAccountColor = (accountName: string): string => {
  const name = accountName?.toLowerCase() || '';
  
  // Subtle, eye-friendly pastel colors for each account
  if (name.includes('ramya')) {
    return 'bg-blue-50 hover:bg-blue-100'; // Soft blue
  } else if (name.includes('prudvi')) {
    return 'bg-purple-50 hover:bg-purple-100'; // Soft purple
  } else if (name.includes('avenir')) {
    return 'bg-emerald-50 hover:bg-emerald-100'; // Soft emerald
  } else if (name.includes('galaxy')) {
    return 'bg-amber-50 hover:bg-amber-100'; // Soft amber
  } else if (name.includes('counter')) {
    return 'bg-rose-50 hover:bg-rose-100'; // Soft rose
  } else if (name.includes('sri')) {
    return 'bg-cyan-50 hover:bg-cyan-100'; // Soft cyan
  } else if (name.includes('sreenivas')) {
    return 'bg-indigo-50 hover:bg-indigo-100'; // Soft indigo
  } else {
    return 'bg-slate-50 hover:bg-slate-100'; // Soft slate (default)
  }
};

export default function ExpensesPage() {
  const { showToast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bankCollections, setBankCollections] = useState<BankCollection[]>([]);
  const [allBankAccounts, setAllBankAccounts] = useState<Array<{id: string; name: string}>>([]); // New: All bank accounts for form dropdown
  const [expenseCategories, setExpenseCategories] = useState<Array<{id: string; name: string; color?: string}>>([]); // Expense categories
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [formDate, setFormDate] = useState(() => {
    // Initialize with current month and year
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const day = String(new Date().getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [formAmount, setFormAmount] = useState("");
  const [formAccount, setFormAccount] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formNotes, setFormNotes] = useState("");
  
  // Month selector - persists in session, resets to current month on new session
  const { selectedMonth, selectedYear, setSelectedMonth, setSelectedYear } = useSessionMonthYear('expenses')

  // Sort and filter state
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc'); // asc = oldest first (default)
  const [filterAccount, setFilterAccount] = useState<string>(''); // empty = show all

  // Edit state
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{
    date: string;
    amount: string;
    account_id: string;
    category_id: string;
    notes: string;
  }>({
    date: '',
    amount: '',
    account_id: '',
    category_id: '',
    notes: ''
  });

  // Adjustment modal state
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [selectedAccountForAdjustment, setSelectedAccountForAdjustment] = useState<BankCollection | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentNotes, setAdjustmentNotes] = useState("");

  // Category modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);

  // WhatsApp quick add state
  const [showWhatsAppInput, setShowWhatsAppInput] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [whatsappImage, setWhatsappImage] = useState<File | null>(null);
  const [submittingWhatsApp, setSubmittingWhatsApp] = useState(false);

  // UI-only: Hidden accounts state (stored in localStorage)
  const [hiddenAccountIds, setHiddenAccountIds] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('hiddenBankAccounts');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    }
    return new Set();
  });

  // Load all bank accounts and categories once on mount
  useEffect(() => {
    loadAllBankAccounts();
    loadExpenseCategories();
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedYear, selectedMonth]);

  async function loadAllBankAccounts() {
    try {
      const response = await fetch('/api/bank-accounts');
      const data = await response.json();
      setAllBankAccounts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load bank accounts:", error);
      setAllBankAccounts([]);
    }
  }

  async function loadExpenseCategories() {
    try {
      const response = await fetch('/api/expense-categories');
      const data = await response.json();
      setExpenseCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load expense categories:", error);
      setExpenseCategories([]);
    }
  }

  const createExpenseCategory = async () => {
    if (!newCategoryName.trim()) {
      showToast('error', 'Please enter a category name');
      return;
    }

    setAddingCategory(true);
    try {
      const response = await fetch('/api/expense-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newCategoryName.trim(),
          description: newCategoryDescription.trim() || undefined
        })
      });

      if (response.ok) {
        const newCategory = await response.json();
        setExpenseCategories([...expenseCategories, newCategory]);
        setFormCategory(newCategory.id); // Auto-select the newly created category
        setNewCategoryName('');
        setNewCategoryDescription('');
        setShowCategoryModal(false);
        showToast('success', 'Expense category added successfully');
      } else {
        const error = await response.json();
        showToast('error', error.error || 'Failed to add category');
      }
    } catch (error: any) {
      showToast('error', error.message);
    } finally {
      setAddingCategory(false);
    }
  };

  // Toggle account visibility in top section (UI-only, no data changes)
  const toggleAccountVisibility = (accountId: string) => {
    const newHiddenIds = new Set(hiddenAccountIds);
    if (newHiddenIds.has(accountId)) {
      newHiddenIds.delete(accountId);
    } else {
      newHiddenIds.add(accountId);
    }
    setHiddenAccountIds(newHiddenIds);
    
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('hiddenBankAccounts', JSON.stringify(Array.from(newHiddenIds)));
    }
  };

  async function loadData() {
    try {
      setLoading(true);
      
      // Calculate date range for selected month
      const startDate = new Date(selectedYear, selectedMonth - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];

      console.log(`Loading expenses from ${startDate} to ${endDate}`);

      const [expensesRes, collectionsRes] = await Promise.all([
        fetch(`/api/expenses?from=${startDate}&to=${endDate}`),
        fetch(`/api/bank-accounts/balance-after-expenses?from=${startDate}&to=${endDate}`)
      ]);

      const [expensesData, collectionsData] = await Promise.all([
        expensesRes.json(),
        collectionsRes.json()
      ]);

      console.log(`Loaded ${Array.isArray(expensesData) ? expensesData.length : 0} expenses:`, expensesData);

      // Sort expenses by date (respects sortOrder state)
      const sortedExpenses = Array.isArray(expensesData) 
        ? expensesData.sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
          })
        : [];

      setExpenses(sortedExpenses);
      setBankCollections(Array.isArray(collectionsData) ? collectionsData : []);
    } catch (error) {
      console.error("Failed to load data:", error);
      setExpenses([]);
      setBankCollections([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formDate || !formAmount || !formAccount || !formCategory) {
      alert("Please fill all required fields");
      return;
    }

    try {
      // Use the selected category from the form
      const categoryId = formCategory;

      // Create expense (debited from bank_accounts, not expense_accounts)
      const expense = {
        date: formDate,
        category_id: categoryId,
        amount: parseFloat(formAmount),
        tax_amount: 0,
        total_amount: parseFloat(formAmount),
        account_id: formAccount, // This is bank_account_id
        description: formNotes || "Expense",
        payment_method: "RTGS", // Valid values: CASH, CHEQUE, RTGS, UPI, CREDIT_CARD
        payment_status: "PAID", // Use uppercase to match database convention
        notes: formNotes
      };

      console.log('Submitting expense:', expense);

      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expense)
      });

      if (response.ok) {
        const addedExpense = await response.json();
        console.log('Expense added successfully:', addedExpense);
        
        // Reset form but keep date in current month
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        const day = String(new Date().getDate()).padStart(2, '0');
        setFormDate(`${year}-${month}-${day}`);
        setFormAmount("");
        setFormAccount("");
        setFormCategory("");
        setFormNotes("");
        
        // Reload data (this will show updated collections minus expenses)
        await loadData();
        
        // Show success toast
        showToast('success', 'Expense added successfully!');
      } else {
        const error = await response.json();
        console.error('Failed to add expense:', error);
        showToast('error', `Failed to add expense: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error adding expense:", error);
      showToast('error', 'Failed to add expense');
    }
  }

  async function handleWhatsAppSubmit() {
    if (!whatsappMessage.trim()) {
      showToast('error', 'Please enter a WhatsApp message');
      return;
    }

    setSubmittingWhatsApp(true);
    try {
      // Step 1: Parse the WhatsApp message to extract expense data
      const parseResponse = await fetch('/api/expenses/parse-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: whatsappMessage.trim() })
      });

      if (!parseResponse.ok) {
        throw new Error('Failed to parse WhatsApp message');
      }

      const parsedData = await parseResponse.json();

      // Step 2: Upload image if present
      let imageUrl = null;
      if (whatsappImage) {
        const formData = new FormData();
        formData.append('file', whatsappImage);
        
        const uploadResponse = await fetch('/api/upload-receipt', {
          method: 'POST',
          body: formData
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          imageUrl = uploadData.url;
        }
      }

      // Step 3: Create pending expense
      const pendingExpense = {
        message_text: whatsappMessage.trim(),
        image_url: imageUrl,
        amount: parsedData.amount || 0,
        description: parsedData.description || 'WhatsApp expense',
        expense_date: parsedData.date || new Date().toISOString().split('T')[0],
        parsed_text_amount: parsedData.amount,
        confidence_score: parsedData.confidence || 0.5
      };

      const response = await fetch('/api/expenses/pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingExpense)
      });

      if (!response.ok) {
        throw new Error('Failed to create pending expense');
      }

      // Success - reset form
      setWhatsappMessage('');
      setWhatsappImage(null);
      setShowWhatsAppInput(false);
      showToast('success', 'Expense added to approval queue! Check "Pending Approvals" to review.');
      
    } catch (error: any) {
      console.error('Error submitting WhatsApp expense:', error);
      showToast('error', error.message || 'Failed to submit expense');
    } finally {
      setSubmittingWhatsApp(false);
    }
  }

  async function handleDeleteExpense(id: string) {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: "DELETE"
      });

      if (response.ok) {
        await loadData();
        showToast('success', 'Expense deleted successfully!');
      }
    } catch (error) {
      console.error("Error deleting expense:", error);
      showToast('error', 'Failed to delete expense');
    }
  }

  function handleEditExpense(expense: Expense) {
    setEditingExpenseId(expense.id);
    setEditFormData({
      date: expense.date,
      amount: expense.amount.toString(),
      account_id: expense.account_id,
      category_id: expense.category_id,
      notes: expense.notes || ''
    });
  }

  function handleCancelEdit() {
    setEditingExpenseId(null);
    setEditFormData({
      date: '',
      amount: '',
      account_id: '',
      category_id: '',
      notes: ''
    });
  }

  async function handleSaveEdit(expenseId: string) {
    try {
      const updatedExpense = {
        date: editFormData.date,
        category_id: editFormData.category_id,
        amount: parseFloat(editFormData.amount),
        tax_amount: 0,
        total_amount: parseFloat(editFormData.amount),
        account_id: editFormData.account_id,
        description: editFormData.notes || "Expense",
        payment_method: "RTGS",
        payment_status: "PAID",
        notes: editFormData.notes
      };

      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedExpense)
      });

      if (response.ok) {
        await loadData();
        setEditingExpenseId(null);
        showToast('success', 'Expense updated successfully!');
      } else {
        const error = await response.json();
        console.error('Failed to update expense:', error);
        showToast('error', `Failed to update expense: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error updating expense:", error);
      showToast('error', 'Failed to update expense');
    }
  }

  function openAdjustmentModal(account: BankCollection) {
    setSelectedAccountForAdjustment(account);
    setAdjustmentAmount("");
    setAdjustmentNotes("");
    setShowAdjustmentModal(true);
  }

  function closeAdjustmentModal() {
    setShowAdjustmentModal(false);
    setSelectedAccountForAdjustment(null);
    setAdjustmentAmount("");
    setAdjustmentNotes("");
  }

  async function handleSaveAdjustment() {
    if (!selectedAccountForAdjustment) return;

    try {
      const response = await fetch("/api/bank-accounts/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank_account_id: selectedAccountForAdjustment.id,
          adjustment_amount: parseFloat(adjustmentAmount) || 0,
          notes: adjustmentNotes || "Opening balance adjustment for pre-tracking settlements",
          effective_date: new Date().toISOString().split('T')[0]
        })
      });

      if (response.ok) {
        await loadData();
        closeAdjustmentModal();
        showToast('success', 'Opening balance adjusted successfully!');
      } else {
        const error = await response.json();
        showToast('error', `Failed to update expense: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error updating expense:", error);
      showToast('error', 'Failed to update expense');
    }
  }

  function toggleSortOrder() {
    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(newOrder);
    
    // Re-sort the existing expenses
    const sorted = [...expenses].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return newOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
    setExpenses(sorted);
  }

  // Filter expenses by account
  const filteredExpenses = filterAccount 
    ? expenses.filter(exp => exp.account_id === filterAccount)
    : expenses;

  // Export to Excel function
  function exportToExcel() {
    if (!filterAccount) {
      showToast('error', 'Please select an account to export');
      return;
    }

    // Get the selected account details
    const selectedAccount = bankCollections.find(acc => acc.id === filterAccount);
    if (!selectedAccount) {
      showToast('error', 'Account not found');
      return;
    }

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Account Summary Sheet
    const summaryData = [
      ['EXPENSE REPORT'],
      ['Account Name:', selectedAccount.name],
      ['Period:', `${monthNames[selectedMonth - 1]} ${selectedYear}`],
      [''],
      ['ACCOUNT BALANCE SUMMARY'],
      ['Opening Balance:', selectedAccount.openingBalance],
      ['Received (RTGS):', selectedAccount.rtgs],
      ['Received (Cash):', selectedAccount.cash],
      ['Total Received:', selectedAccount.totalReceived],
      ['Total Expenses:', selectedAccount.totalExpenses],
      ['Current Balance:', selectedAccount.currentBalance],
      [''],
      ['EXPENSE DETAILS']
    ];

    // Expense details headers
    const expenseHeaders = ['Date', 'Description', 'Amount'];
    summaryData.push(expenseHeaders);

    // Add expense rows
    filteredExpenses.forEach(expense => {
      summaryData.push([
        formatDisplayDate(expense.date),
        expense.notes || expense.description || '-',
        expense.amount
      ]);
    });

    // Add total row
    const totalFilteredExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    summaryData.push(['', 'TOTAL:', totalFilteredExpenses]);

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(summaryData);

    // Set column widths
    ws['!cols'] = [
      { wch: 20 },
      { wch: 40 },
      { wch: 15 }
    ];

    // Apply styling to highlight important cells
    const highlightStyle = {
      fill: {
        fgColor: { rgb: "FFFF00" }
      },
      font: {
        bold: true
      }
    };

    // Helper function to set cell style
    const setCellStyle = (cellRef: string, style: any) => {
      if (!ws[cellRef]) return;
      ws[cellRef].s = style;
    };

    // Highlight Account Name (B2)
    setCellStyle('B2', highlightStyle);

    // Highlight Total Expenses (B10)
    setCellStyle('B10', highlightStyle);

    // Highlight Current Balance (B11)
    setCellStyle('B11', highlightStyle);

    // Highlight Total in expense details (last row, column C)
    const totalRowIndex = 13 + filteredExpenses.length + 1; // 13 headers + expenses + 1 for total row
    const totalCellRef = `C${totalRowIndex}`;
    setCellStyle(totalCellRef, highlightStyle);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Expense Report');

    // Generate filename
    const filename = `${selectedAccount.name}_Expenses_${monthNames[selectedMonth - 1]}_${selectedYear}.xlsx`;

    // Save file with styles
    XLSX.writeFile(wb, filename);

    showToast('success', 'Excel file exported successfully!');
  }

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const totalExpenses = Array.isArray(expenses) ? expenses.reduce((sum, exp) => sum + exp.amount, 0) : 0;

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Expense Management</h1>
            <p className="text-gray-600">Track expenses and account balances</p>
          </div>
          
          {/* Month Selector */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Year:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Month:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {monthNames.map((month, index) => (
                  <option key={index} value={index + 1}>{month}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Bank Collections Tiles */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">Bank Collections - Current Balance</h2>
            </div>
            {hiddenAccountIds.size > 0 && (
              <p className="text-xs text-gray-500">
                {hiddenAccountIds.size} account{hiddenAccountIds.size > 1 ? 's' : ''} hidden
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {bankCollections
              .filter(collection => !hiddenAccountIds.has(collection.id))
              .map((collection) => (
              <Card key={collection.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                <CardContent className="p-3 relative">
                  {/* Action buttons */}
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button
                      onClick={() => toggleAccountVisibility(collection.id)}
                      className="p-1 rounded hover:bg-gray-100 transition-colors"
                      title="Hide this account from top section"
                    >
                      <EyeOff className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
                    </button>
                    <button
                      onClick={() => openAdjustmentModal(collection)}
                      className="p-1 rounded hover:bg-gray-100 transition-colors"
                      title="Adjust opening balance"
                    >
                      <Settings className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                  </div>

                  <h3 className="text-xs font-semibold text-gray-700 mb-1.5 truncate pr-6" title={collection.name}>
                    {collection.name}
                  </h3>
                  <p className="text-xl font-bold text-green-700 mb-2">{fmt(collection.currentBalance)}</p>
                  <div className="space-y-0.5 text-[10px]">
                    <div className="flex justify-between text-purple-600 pb-0.5 border-b border-gray-200 mb-1">
                      <span>Opening Balance:</span>
                      <span className="font-semibold">{fmt(collection.openingBalance)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Received:</span>
                      <span className="font-semibold text-blue-600">{fmt(collection.totalReceived)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500 ml-1">
                      <span>RTGS:</span>
                      <span className="font-medium">{fmt(collection.rtgs)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500 ml-1">
                      <span>Cash:</span>
                      <span className="font-medium">{fmt(collection.cash)}</span>
                    </div>
                    <div className="flex justify-between text-red-600 pt-0.5 border-t border-gray-200 mt-1">
                      <span>Expenses:</span>
                      <span className="font-semibold">-{fmt(collection.totalExpenses)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Show Hidden Accounts Section */}
          {hiddenAccountIds.size > 0 && (
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <EyeOff className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-700">Hidden Accounts</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {bankCollections
                  .filter(collection => hiddenAccountIds.has(collection.id))
                  .map((collection) => (
                    <button
                      key={collection.id}
                      onClick={() => toggleAccountVisibility(collection.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors text-sm"
                      title="Click to show this account"
                    >
                      <Eye className="w-3.5 h-3.5 text-gray-500" />
                      <span className="text-gray-700">{collection.name}</span>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Add Expense Section */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Add New Expense</h2>
            </div>

            {/* Quick Add from WhatsApp - Collapsible Section */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-lg mb-6 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowWhatsAppInput(!showWhatsAppInput)}
                className="w-full flex items-center justify-between p-4 hover:bg-green-100/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-green-500 text-white p-2 rounded-lg">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-bold text-gray-900">Quick Add from WhatsApp</h3>
                    <p className="text-xs text-gray-600">Paste message and receipt to add to approval queue</p>
                  </div>
                </div>
                {showWhatsAppInput ? (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                )}
              </button>

              {showWhatsAppInput && (
                <div className="p-4 pt-0 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                      WhatsApp Message / Caption
                    </label>
                    <textarea
                      value={whatsappMessage}
                      onChange={(e) => setWhatsappMessage(e.target.value)}
                      placeholder="Paste WhatsApp message here...&#10;Example: Paid 5000 for diesel at Indian Oil on 12th Dec"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                      rows={4}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                      Receipt Image (Optional)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setWhatsappImage(e.target.files?.[0] || null)}
                      className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                    />
                    {whatsappImage && (
                      <p className="text-xs text-gray-600 mt-1">Selected: {whatsappImage.name}</p>
                    )}
                  </div>

                  <Button
                    type="button"
                    onClick={handleWhatsAppSubmit}
                    disabled={submittingWhatsApp || !whatsappMessage.trim()}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submittingWhatsApp ? 'Processing...' : 'Parse & Add to Queue'}
                  </Button>
                </div>
              )}
            </div>

            <form onSubmit={handleAddExpense} className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
                  <div className="lg:col-span-1">
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full text-sm"
                      placeholder="Select date"
                      required
                    />
                  </div>

                  <div className="lg:col-span-1">
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                      Amount <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="50,000"
                      value={formatIndianNumber(formAmount)}
                      onChange={(e) => setFormAmount(parseIndianNumber(e.target.value))}
                      className="w-full"
                      required
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                      Debited From <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formAccount}
                      onChange={(e) => setFormAccount(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select Account</option>
                      {allBankAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="lg:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-1">
                      <select
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">Select Category</option>
                        {expenseCategories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowCategoryModal(true)}
                        className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center flex-shrink-0"
                        title="Add new category"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                      Notes
                    </label>
                    <Input
                      type="text"
                      placeholder="Enter description or notes"
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  <div className="md:col-span-1">
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700 w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Expense
                    </Button>
                  </div>
                </div>
              </form>

            {/* Expenses Summary */}
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Total Expenses - {monthNames[selectedMonth - 1]} {selectedYear}</p>
                  <p className="text-3xl font-bold text-blue-700 mt-1">{fmt(totalExpenses)}</p>
                  <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                    {filteredExpenses.length} transaction{filteredExpenses.length !== 1 ? 's' : ''} {filterAccount && '(filtered)'}
                  </p>
                </div>
                <div className="bg-white rounded-full p-3 shadow-sm">
                  <Calendar className="w-8 h-8 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Filter and Sort Controls */}
            <div className="mb-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-600" />
                <label className="text-sm font-medium text-gray-700">Filter by Account:</label>
                <select
                  value={filterAccount}
                  onChange={(e) => setFilterAccount(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Accounts</option>
                  {bankCollections.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                {filterAccount && (
                  <Button
                    onClick={exportToExcel}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export to Excel</span>
                  </Button>
                )}
                
                <Button
                  onClick={toggleSortOrder}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                {sortOrder === 'asc' ? (
                  <>
                    <ArrowUp className="w-4 h-4" />
                    <span>Oldest First</span>
                  </>
                ) : (
                  <>
                    <ArrowDown className="w-4 h-4" />
                    <span>Newest First</span>
                  </>
                )}
              </Button>
              </div>
            </div>

            {/* Expenses Table */}
            <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
              {filteredExpenses.length === 0 ? (
                <div className="text-center py-16 bg-gray-50">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">
                    {filterAccount ? 'No expenses for selected account' : 'No expenses recorded for this month'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {filterAccount ? 'Try selecting a different account' : 'Add an expense to get started'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Account
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Amount (₹)
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {filteredExpenses.map((expense, index) => {
                        const isEditing = editingExpenseId === expense.id;
                        const accountName = expense.bank_accounts?.name || '';
                        const rowColorClass = getAccountColor(accountName);
                        
                        return (
                        <tr 
                          key={expense.id} 
                          className={`transition-colors ${rowColorClass}`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            {isEditing ? (
                              <Input
                                type="date"
                                value={editFormData.date}
                                onChange={(e) => setEditFormData({...editFormData, date: e.target.value})}
                                className="w-full text-sm"
                                placeholder="Select date"
                              />
                            ) : (
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                <Calendar className="w-4 h-4 text-blue-600" />
                              </div>
                              <span className="text-sm font-medium text-gray-900">
                                {formatDisplayDate(expense.date)}
                              </span>
                            </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {isEditing ? (
                              <select
                                value={editFormData.category_id}
                                onChange={(e) => setEditFormData({...editFormData, category_id: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              >
                                {expenseCategories.map(cat => (
                                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                              </select>
                            ) : (
                            <div className="flex items-center gap-2">
                              {expense.expense_categories?.color && (
                                <div 
                                  className="w-3 h-3 rounded-full flex-shrink-0" 
                                  style={{ backgroundColor: expense.expense_categories.color }}
                                />
                              )}
                              <span className="text-sm text-gray-900 font-medium">
                                {expense.expense_categories?.name || 'Uncategorized'}
                              </span>
                            </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {isEditing ? (
                              <select
                                value={editFormData.account_id}
                                onChange={(e) => setEditFormData({...editFormData, account_id: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              >
                                {bankCollections.map(acc => (
                                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                                ))}
                              </select>
                            ) : (
                            <span className="text-sm text-gray-900 font-medium">
                              {expense.bank_accounts?.name || 'Unknown Account'}
                            </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {isEditing ? (
                              <Input
                                type="text"
                                value={editFormData.notes}
                                onChange={(e) => setEditFormData({...editFormData, notes: e.target.value})}
                                className="w-full"
                                placeholder="Enter notes"
                              />
                            ) : (
                            <span className="text-sm text-gray-600">
                              {expense.notes || expense.description || '-'}
                            </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            {isEditing ? (
                              <Input
                                type="text"
                                value={formatIndianNumber(editFormData.amount)}
                                onChange={(e) => setEditFormData({...editFormData, amount: parseIndianNumber(e.target.value)})}
                                className="w-full text-right"
                              />
                            ) : (
                            <span className="text-sm font-bold text-red-600">
                              {fmt(expense.amount)}
                            </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-2">
                              {isEditing ? (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSaveEdit(expense.id)}
                                    className="text-green-600 hover:bg-green-50 hover:border-green-200"
                                  >
                                    <Save className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCancelEdit}
                                    className="text-gray-600 hover:bg-gray-50"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditExpense(expense)}
                                    className="text-blue-600 hover:bg-blue-50 hover:border-blue-200"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteExpense(expense.id)}
                                    className="text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                  </tbody>
                </table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Adjustment Modal */}
        {showAdjustmentModal && selectedAccountForAdjustment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Adjust Opening Balance
                  </h3>
                  <button
                    onClick={closeAdjustmentModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Account: <span className="font-semibold">{selectedAccountForAdjustment.name}</span>
                  </p>
                  <p className="text-xs text-gray-500 mb-4">
                    Use this to set the correct opening balance for settlements that happened before you started tracking in the system.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Adjustment Amount (₹)
                    </label>
                    <Input
                      type="text"
                      value={formatIndianNumber(adjustmentAmount)}
                      onChange={(e) => setAdjustmentAmount(parseIndianNumber(e.target.value))}
                      placeholder="Enter amount (e.g., -43704 to reduce balance)"
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter negative amount to reduce opening balance, positive to increase
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={adjustmentNotes}
                      onChange={(e) => setAdjustmentNotes(e.target.value)}
                      placeholder="e.g., Previous settlements before Oct 2025"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    onClick={closeAdjustmentModal}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveAdjustment}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Save Adjustment
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Category Modal */}
        {showCategoryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Add New Expense Category</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Category Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="e.g., Repair Expenses, Segment Purchase"
                    className="w-full"
                    autoFocus
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !addingCategory) {
                        createExpenseCategory();
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Description (Optional)
                  </label>
                  <Input
                    type="text"
                    value={newCategoryDescription}
                    onChange={(e) => setNewCategoryDescription(e.target.value)}
                    placeholder="Brief description of this category"
                    className="w-full"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCategoryModal(false);
                      setNewCategoryName('');
                      setNewCategoryDescription('');
                    }}
                    disabled={addingCategory}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={createExpenseCategory}
                    disabled={addingCategory || !newCategoryName.trim()}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {addingCategory ? 'Adding...' : 'Add Category'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
