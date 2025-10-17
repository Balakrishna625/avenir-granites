/**
 * Date utility functions for consistent date formatting across the application
 */

/**
 * Formats a date string or Date object to DD-MM-YYYY format
 * @param date - Date string (YYYY-MM-DD, ISO format) or Date object
 * @returns Formatted date string in DD-MM-YYYY format
 */
export function formatDateToDDMMYYYY(date: string | Date | null | undefined): string {
  if (!date) return '-';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) return '-';
    
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear();
    
    return `${day}-${month}-${year}`;
  } catch (error) {
    return '-';
  }
}

/**
 * Converts DD-MM-YYYY format to YYYY-MM-DD format for database storage
 * @param dateStr - Date string in DD-MM-YYYY format
 * @returns Date string in YYYY-MM-DD format
 */
export function convertDDMMYYYYToYYYYMMDD(dateStr: string): string {
  if (!dateStr || dateStr === '-') return '';
  
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return '';
    
    const [day, month, year] = parts;
    return `${year}-${month}-${day}`;
  } catch (error) {
    return '';
  }
}

/**
 * Formats a date for display in tables and UI
 * @param date - Date string or Date object
 * @returns Formatted date string in DD-MM-YYYY format
 */
export function formatDisplayDate(date: string | Date | null | undefined): string {
  return formatDateToDDMMYYYY(date);
}
