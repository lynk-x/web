"use client";

import React from 'react';
import styles from './Pagination.module.css';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    className?: string; // Optional class for layout adjustments
}

/**
 * Standardized Pagination component for management tables.
 * Centralizes page navigation logic and styling.
 */
const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalPages,
    onPageChange,
    className = ''
}) => {
    // Don't render if there's only one page or none
    if (totalPages <= 1) return null;

    return (
        <div className={`${styles.paginationContainer} ${className}`}>
            <div className={styles.pageInfo}>
                Page {currentPage} of {Math.max(1, totalPages)}
            </div>

            <div className={styles.pageControls}>
                <button
                    className={styles.paginationBtn}
                    disabled={currentPage === 1}
                    onClick={() => onPageChange(currentPage - 1)}
                    aria-label="Previous page"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                    Previous
                </button>

                <div className={styles.pageNumbers}>
                    {[...Array(totalPages)].map((_, index) => {
                        const pageNum = index + 1;
                        // For many pages, we might want to truncate, but sticking to current logic for now
                        return (
                            <button
                                key={pageNum}
                                className={`${styles.paginationPage} ${currentPage === pageNum ? styles.activePage : ''}`}
                                onClick={() => onPageChange(pageNum)}
                                aria-label={`Go to page ${pageNum}`}
                                aria-current={currentPage === pageNum ? 'page' : undefined}
                            >
                                {pageNum}
                            </button>
                        );
                    })}
                </div>

                <button
                    className={styles.paginationBtn}
                    disabled={currentPage === totalPages}
                    onClick={() => onPageChange(currentPage + 1)}
                    aria-label="Next page"
                >
                    Next
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default Pagination;
