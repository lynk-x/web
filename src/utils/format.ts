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
export function formatCurrency(amount: number | string, currency: string = 'USD'): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return num.toLocaleString('en-US', { style: 'currency', currency });
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
 * Formats a date to dd/mm/yyyy (International Standard).
 *
 * @example formatDate("2024-12-31") // "31/12/2024"
 */
export function formatDate(date: string | Date | number): string {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    
    return d.toLocaleDateString('en-US', {
        dateStyle: 'medium'
    });
}

/**
 * Formats a date and time to dd/mm/yyyy, HH:mm.
 */
export function formatDateTime(date: string | Date | number): string {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    
    return d.toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
    });
}

/**
 * Formats a date to HH:mm (24-hour).
 */
export function formatTime(date: string | Date | number): string {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    
    return d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
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

    if (days > 7) return formatDate(d);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
}

/**
 * Formats a file size in bytes to a human-readable string (KB, MB, GB).
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Formats a UTC date string in the event's canonical local timezone.
 *
 * Use this for displaying event start/end times — NOT `formatDateTime`.
 * `formatDateTime` uses the VIEWER's browser timezone; this function uses the
 * EVENT's timezone so all attendees see the same canonical local time.
 *
 * Falls back to `formatDateTime` if the timezone is missing or unrecognised.
 *
 * @param date    UTC timestamp (ISO string or Date)
 * @param tz      IANA timezone string, e.g. 'Africa/Nairobi'. From `events.timezone`
 *                or `vw_user_tickets.display_timezone`.
 *
 * @example
 * formatDateInTimezone('2026-08-15T17:00:00Z', 'Africa/Nairobi')
 * // → '15/08/2026'
 */
export function formatDateInTimezone(date: string | Date | number, tz?: string | null): string {
    if (!date) return '-';
    const d = new Date(
        typeof date === 'number' ? date : typeof date === 'string' ? date : date.getTime()
    );
    if (isNaN(d.getTime())) return '-';

    if (!tz) return formatDate(d);

    try {
        return new Intl.DateTimeFormat('en-US', {
            dateStyle: 'medium',
            timeZone: tz,
        }).format(d);
    } catch {
        // Invalid timezone string — fall back to viewer locale
        return formatDate(d);
    }
}

/**
 * Formats a UTC date string as `dd/mm/yyyy HH:mm` in the event's canonical local timezone.
 *
 * Use this for displaying event start/end times in ticketing, attendance,
 * and event detail views. Do NOT use `formatDateTime` for event times.
 *
 * @param date    UTC timestamp (ISO string or Date)
 * @param tz      IANA timezone string, e.g. 'Africa/Nairobi'. From `events.timezone`
 *                or `vw_user_tickets.display_timezone`.
 * @param showTz  If true, appends the short timezone abbreviation (e.g. 'EAT').
 *
 * @example
 * formatDateTimeInTimezone('2026-08-15T17:00:00Z', 'Africa/Nairobi')
 * // → '15/08/2026 20:00'
 * formatDateTimeInTimezone('2026-08-15T17:00:00Z', 'Africa/Nairobi', true)
 * // → '15/08/2026 20:00 EAT'
 */
export function formatDateTimeInTimezone(
    date: string | Date | number,
    tz?: string | null,
    showTz = false,
): string {
    if (!date) return '-';
    const d = new Date(
        typeof date === 'number' ? date : typeof date === 'string' ? date : date.getTime()
    );
    if (isNaN(d.getTime())) return '-';

    if (!tz) return formatDateTime(d);

    try {
        const opts: Intl.DateTimeFormatOptions = {
            dateStyle: 'medium',
            timeStyle: 'short',
            hour12: true,
            timeZone: tz,
            ...(showTz ? { timeZoneName: 'short' } : {}),
        };
        return new Intl.DateTimeFormat('en-US', opts).format(d);
    } catch {
        return formatDateTime(d);
    }
}

/**
 * Formats a UTC date string as `HH:mm AM/PM` in the event's canonical local timezone.
 */
export function formatTimeInTimezone(date: string | Date | number, tz?: string | null): string {
    if (!date) return '-';
    const d = new Date(
        typeof date === 'number' ? date : typeof date === 'string' ? date : date.getTime()
    );
    if (isNaN(d.getTime())) return '-';

    if (!tz) return formatTime(d);

    try {
        return new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: tz,
        }).format(d);
    } catch {
        return formatTime(d);
    }
}

/**
 * Formats a date as "Thursday 11th Mar, 2007" in the event's canonical timezone.
 * Used for high-fidelity event detail views.
 */
export function formatEventDate(date: string | Date | number, tz?: string | null): string {
    if (!date) return '-';
    const d = new Date(
        typeof date === 'number' ? date : typeof date === 'string' ? date : date.getTime()
    );
    if (isNaN(d.getTime())) return '-';

    const getOrdinal = (n: number) => {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return s[(v - 20) % 10] || s[v] || s[0];
    };

    try {
        const formatter = new Intl.DateTimeFormat('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            timeZone: tz || undefined,
        });
        const parts = formatter.formatToParts(d);
        
        const weekday = parts.find(p => p.type === 'weekday')?.value;
        const day = parts.find(p => p.type === 'day')?.value;
        const month = parts.find(p => p.type === 'month')?.value;
        const year = parts.find(p => p.type === 'year')?.value;

        const dayNum = parseInt(day || '0');
        return `${weekday} ${dayNum}${getOrdinal(dayNum)} ${month}, ${year}`;
    } catch {
        return formatDate(d);
    }
}
