/**
 * Format currency in Indian Lakhs format
 * @param amount - Amount in rupees
 * @returns Formatted string like "₹1.12L" or "₹45.67K"
 */
export function formatCurrency(amount: number): string {
  if (amount === 0) return '₹0';
  
  const absAmount = Math.abs(amount);
  const isNegative = amount < 0;
  const prefix = isNegative ? '-₹' : '₹';
  
  // Format in Lakhs for amounts >= 1 lakh
  if (absAmount >= 100000) {
    const lakhs = absAmount / 100000;
    return `${prefix}${lakhs.toFixed(2)}L`;
  }
  
  // Format in thousands for amounts >= 1000
  if (absAmount >= 1000) {
    const thousands = absAmount / 1000;
    return `${prefix}${thousands.toFixed(1)}K`;
  }
  
  // Format normal for small amounts
  return `${prefix}${absAmount.toFixed(0)}`;
}

/**
 * Format currency in Indian Rupee number format (e.g., 1,00,000)
 * @param amount - Amount in rupees
 * @returns Formatted string like "₹1,00,000"
 */
export function formatINR(amount: number): string {
  const formatter = new Intl.NumberFormat('en-IN', { 
    style: 'currency', 
    currency: 'INR', 
    maximumFractionDigits: 0 
  });
  return formatter.format(amount || 0);
}

/**
 * Format plain number in Indian numbering system (without currency symbol)
 * @param amount - Number to format
 * @returns Formatted string like "1,00,000"
 */
export function formatIndianNumber(amount: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(amount || 0));
}

/**
 * Format month name from "OCT-2025" to "October 2025"
 */
export function formatMonthName(monthStr: string): string {
  const months: Record<string, string> = {
    'JAN': 'January',
    'FEB': 'February',
    'MAR': 'March',
    'APR': 'April',
    'MAY': 'May',
    'JUN': 'June',
    'JUL': 'July',
    'AUG': 'August',
    'SEP': 'September',
    'OCT': 'October',
    'NOV': 'November',
    'DEC': 'December'
  };
  
  const parts = monthStr.split('-');
  if (parts.length !== 2) return monthStr;
  
  const monthAbbr = parts[0].toUpperCase();
  const year = parts[1];
  
  return `${months[monthAbbr] || monthAbbr} ${year}`;
}

/**
 * Format short month for charts (e.g., "Oct-25")
 */
export function formatShortMonth(monthStr: string): string {
  const parts = monthStr.split('-');
  if (parts.length !== 2) return monthStr;
  
  const month = parts[0].charAt(0) + parts[0].slice(1).toLowerCase();
  const year = parts[1].slice(-2);
  
  return `${month}-${year}`;
}
