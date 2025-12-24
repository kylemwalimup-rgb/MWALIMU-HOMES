/**
 * Currency formatting utilities for Kenya Shillings (KSh)
 */

export const KES_LOCALE = 'en-KE';
export const KES_CURRENCY = 'KES';

/**
 * Format amount as Kenya Shillings
 * Examples:
 * - formatKES(1000) -> "KSh 1,000.00"
 * - formatKES(50000.5) -> "KSh 50,000.50"
 * - formatKES(0) -> "KSh 0.00"
 */
export function formatKES(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(num)) {
    return 'KSh 0.00';
  }

  // Format with 2 decimal places and thousand separators
  const formatted = new Intl.NumberFormat(KES_LOCALE, {
    style: 'currency',
    currency: KES_CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);

  // Replace currency symbol with KSh
  return formatted.replace('KES', 'KSh').trim();
}

/**
 * Format amount as Kenya Shillings without currency symbol
 * Examples:
 * - formatKESNumber(1000) -> "1,000.00"
 * - formatKESNumber(50000.5) -> "50,000.50"
 */
export function formatKESNumber(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(num)) {
    return '0.00';
  }

  return new Intl.NumberFormat(KES_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Parse KES formatted string back to number
 * Examples:
 * - parseKES("KSh 1,000.00") -> 1000
 * - parseKES("1,000.50") -> 1000.50
 */
export function parseKES(formatted: string): number {
  // Remove KSh, commas, and spaces
  const cleaned = formatted
    .replace(/KSh\s?/g, '')
    .replace(/,/g, '')
    .trim();
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Calculate percentage of total in KES format
 */
export function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0;
  return (part / total) * 100;
}

/**
 * Format percentage with 1 decimal place
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}
