"use client";

import { useEffect, useState } from 'react';

interface UsePaginationResult {
    currentPage: number;
    setCurrentPage: (page: number) => void;
    totalCount: number;
    setTotalCount: (count: number) => void;
    totalPages: number;
    resetToFirstPage: () => void;
}

/**
 * Current-page/total-count/total-pages state for a paginated table.
 * Pass `resetKeys` (e.g. filter values) to auto-reset to page 1 whenever any of them change.
 */
export function usePagination(itemsPerPage: number, resetKeys: readonly unknown[] = []): UsePaginationResult {
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const resetToFirstPage = () => setCurrentPage(1);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (resetKeys.length > 0) setCurrentPage(1);
    }, resetKeys);

    return {
        currentPage,
        setCurrentPage,
        totalCount,
        setTotalCount,
        totalPages: Math.ceil(totalCount / itemsPerPage),
        resetToFirstPage,
    };
}
