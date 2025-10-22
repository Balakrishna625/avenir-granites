/**
 * Customer Name Masking Utility
 * Masks customer names for privacy during demos/presentations
 * 
 * Example: "Mahalakshmi Granites" → "Ma*****"
 *          "Ashapura" → "As****"
 */

export function maskCustomerName(name: string): string {
  if (!name || name.length <= 2) return name;
  
  // Take first 2 characters (uppercase)
  const prefix = name.substring(0, 2).toUpperCase();
  
  // Add asterisks for remaining length
  const asterisks = '*'.repeat(5);
  
  return `${prefix}${asterisks}`;
}

/**
 * Check if masking is unlocked
 */
export function isMaskingUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('customer_names_unlocked') === 'true';
}

/**
 * Set masking unlock status
 */
export function setMaskingUnlocked(unlocked: boolean): void {
  if (typeof window === 'undefined') return;
  if (unlocked) {
    localStorage.setItem('customer_names_unlocked', 'true');
  } else {
    localStorage.removeItem('customer_names_unlocked');
  }
}

/**
 * Verify unlock PIN
 */
export function verifyUnlockPIN(pin: string): boolean {
  return pin === '9669';
}
