"use client";

import { useEffect, useState } from 'react';

const ROW_HEIGHT_PX = 48;
const CHROME_HEIGHT_PX = 420; // header, toolbar, stat cards, table header/footer, page padding

interface UseResponsivePageSizeOptions {
    /** Row height in px for this table's density; defaults to the standard DataTable row. */
    rowHeight?: number;
    /** Vertical space reserved for everything above/below the table body on this page. */
    chromeHeight?: number;
    /** Smallest page size to return, even on short viewports. */
    min?: number;
    /** Largest page size to return, even on tall viewports. */
    max?: number;
}

/**
 * Derives a table page size from the current viewport height so a full page
 * of rows fits without scrolling, recalculating on window resize.
 */
export function useResponsivePageSize(options: UseResponsivePageSizeOptions = {}): number {
    const {
        rowHeight = ROW_HEIGHT_PX,
        chromeHeight = CHROME_HEIGHT_PX,
        min = 5,
        max = 25,
    } = options;

    const [pageSize, setPageSize] = useState(min);

    useEffect(() => {
        const compute = () => {
            const available = window.innerHeight - chromeHeight;
            const rows = Math.floor(available / rowHeight);
            setPageSize(Math.min(max, Math.max(min, rows)));
        };

        compute();
        window.addEventListener('resize', compute);
        return () => window.removeEventListener('resize', compute);
    }, [rowHeight, chromeHeight, min, max]);

    return pageSize;
}
