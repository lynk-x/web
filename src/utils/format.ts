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
/**
 * Converts a wall-clock date/time entered in a specific IANA timezone to a UTC ISO string.
 *
 * Uses `Intl.DateTimeFormat` to read the actual offset that `tz` observes at the given
 * wall-clock instant (so DST transitions resolve correctly), instead of the previous
 * `toLocaleString` round-trip which derived the offset via the browser's local timezone
 * and could double up on DST across a transition boundary.
 *
 * @example toUtcIso('2026-03-08', '14:00', 'America/New_York') // DST-correct UTC instant
 */
export function toUtcIso(date: string, time: string, tz?: string): string {
    if (!tz) {
        // No timezone specified: interpret as the browser's local time (original behaviour).
        return new Date(`${date}T${time}`).toISOString();
    }

    try {
        // Treat the input as if it were UTC to get a reference instant, then measure how far
        // that instant's wall-clock representation in `tz` differs from the intended wall clock.
        const asUtc = new Date(`${date}T${time}:00Z`);

        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hourCycle: 'h23',
        }).formatToParts(asUtc);

        const get = (type: string) => parts.find(p => p.type === type)?.value ?? '0';
        const tzWallClock = Date.UTC(
            Number(get('year')), Number(get('month')) - 1, Number(get('day')),
            Number(get('hour')), Number(get('minute')), Number(get('second')),
        );

        // Difference between the intended wall clock and what `tz` shows for `asUtc`
        // is exactly the offset needed to correct `asUtc` to the real UTC instant.
        const diff = asUtc.getTime() - tzWallClock;
        return new Date(asUtc.getTime() + diff).toISOString();
    } catch {
        // Fall through to naive parse if the timezone string is invalid.
        return new Date(`${date}T${time}`).toISOString();
    }
}

export function formatCurrency(amount: number | string | null | undefined, currency: string = 'USD'): string {
    if (amount == null) return '-';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '-';
    return num.toLocaleString('en-US', { style: 'currency', currency });
}

/**
 * Formats a number with locale-aware thousand separators.
 *
 * @example formatNumber(123456) // "123,456"
 */
export function formatNumber(num: number | null | undefined): string {
    if (num == null) return '-';
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
    
    return d.toLocaleDateString('en-GB', {
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
    
    return d.toLocaleString('en-GB', {
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
    
    return d.toLocaleTimeString('en-GB', {
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
        return new Intl.DateTimeFormat('en-GB', {
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
        return new Intl.DateTimeFormat('en-GB', opts).format(d);
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
        return new Intl.DateTimeFormat('en-GB', {
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
