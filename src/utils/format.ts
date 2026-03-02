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
/**
 * Formats a date string or timestamp into a relative "time ago" string.
 *
 * @example formatRelativeTime("2024-06-01T12:00:00Z") // "2 hours ago"
 */
export function formatRelativeTime(date: string | Date): string {
    if (!date) return 'Never';
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diff = now.getTime() - d.getTime();

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) return d.toLocaleDateString();
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
}
