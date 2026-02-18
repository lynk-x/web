/**
 * Shared formatting utilities for the Lynk-X web application.
 *
 * These functions were previously duplicated inline across 8+ table
 * components. Centralising them here ensures consistent behaviour
 * and a single place to update formatting logic.
 */

/**
 * Converts a snake_case or lowercase string to Title Case.
 *
 * @example formatString("in_review")  // "In Review"
 * @example formatString("draft")      // "Draft"
 */
export function formatString(str: string): string {
    return str
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Formats a numeric amount as a USD currency string.
 *
 * @example formatCurrency(1234.5)   // "$1,234.50"
 * @example formatCurrency("500")    // "$500.00"
 */
export function formatCurrency(amount: number | string): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return num.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

/**
 * Formats a number with locale-aware thousand separators.
 *
 * @example formatNumber(123456) // "123,456"
 */
export function formatNumber(num: number): string {
    return num.toLocaleString();
}

/**
 * Extracts up to two uppercase initials from a full name.
 *
 * @example getInitials("John Doe")       // "JD"
 * @example getInitials("Alice")          // "A"
 * @example getInitials("Mary Jane Watson") // "MJ"
 */
export function getInitials(name: string): string {
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}
