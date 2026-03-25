import DOMPurify from 'dompurify';

/**
 * Sanitizes user input to prevent XSS attacks while maintaining basic formatting.
 * 
 * @param value The raw input string from the user.
 * @returns A sanitized and trimmed version of the input.
 */
export function sanitizeInput(value: string): string {
    if (!value) return '';

    // If we're on the server, DOMPurify needs a window object.
    // However, this is intended for client-side use in forms.
    if (typeof window === 'undefined') {
        // Fallback for server-side: strip tags using regex
        return value.replace(/<[^>]*>?/gm, '');
    }

    // Default configuration for DOMPurify:
    // - USE_PROFILES: { html: true } (only allow safe HTML)
    // - FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'object']
    // - FORBID_ATTR: ['on*', 'style']
    const clean = DOMPurify.sanitize(value, {
        USE_PROFILES: { html: true },
        FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'object', 'meta', 'link'],
        FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onkeydown'],
        ALLOWED_TAGS: [], // Start with empty to strip ALL tags for plain text inputs
        RETURN_DOM: false,
    });

    return clean as string;
}

/**
 * Specialized version for Rich Text inputs (e.g. Tiptap) that allows some formatting tags.
 */
export function sanitizeRichText(value: string): string {
    if (!value || typeof window === 'undefined') return value;

    const clean = DOMPurify.sanitize(value, {
        ALLOWED_TAGS: [
            'p', 'br', 'b', 'i', 'em', 'strong', 'u', 's', 'strike', 'ul', 'ol', 'li', 
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre', 'a'
        ],
        ALLOWED_ATTR: ['href', 'target', 'rel'],
        FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'object', 'meta', 'link'],
        FORBID_ATTR: ['style', 'on*'],
        RETURN_DOM: false,
    });

    return clean as string;
}
