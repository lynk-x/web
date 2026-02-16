"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

// Extended mock data to demonstrate pagination
const detailedInsights = [
    { id: 1, event: 'Nairobi Tech Summit 2024', sold: 482, revenue: 124500, conversion: '3.2%', status: 'Active' },
    { id: 2, event: 'AfroBeats Festival', sold: 340, revenue: 85000, conversion: '2.8%', status: 'Active' },
    { id: 3, event: 'Startup Pitch Night', sold: 0, revenue: 0, conversion: '0%', status: 'Draft' },
    { id: 4, event: 'Art & Wine Mixer', sold: 85, revenue: 21250, conversion: '4.1%', status: 'Past' },
    { id: 5, event: 'Comedy Night Special', sold: 200, revenue: 50000, conversion: '5.0%', status: 'Active' },
    { id: 6, event: 'Jazz in the Park', sold: 150, revenue: 37500, conversion: '2.5%', status: 'Past' },
    { id: 7, event: 'Product Launch: Alpha', sold: 50, revenue: 0, conversion: 'N/A', status: 'Draft' },
    { id: 8, event: 'Charity Gala Dinner', sold: 300, revenue: 300000, conversion: '4.8%', status: 'Active' },
];

export default function AnalyticsPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Filter data based on search
    const filteredData = detailedInsights.filter(item =>
        item.event.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Calculate pagination
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = filteredData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        setCurrentPage(1); // Reset to first page on search
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handleExport = () => {
        // Mock export functionality
        const csvContent = "data:text/csv;charset=utf-8,"
            + "Event,Revenue,Tickets Sold\n"
            + filteredData.map(e => `${e.event},${e.revenue},${e.sold}`).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "main_analytics_report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Analytics & Reports</h1>
                    <p className={styles.subtitle}>Select an event to view detailed performance metrics.</p>
                </div>
                <div className={styles.actions}>
                    {/* Search Bar */}
                    <div className={styles.searchContainer}>
                        <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        <input
                            type="text"
                            placeholder="Search events..."
                            className={styles.searchInput}
                            value={searchQuery}
                            onChange={handleSearch}
                        />
                    </div>
                    <button className={styles.exportBtn} onClick={handleExport}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Export Report
                    </button>
                </div>
            </header>

            {/* Detailed Insights Table */}
            <div className={styles.tableCard}>
                <div className={styles.cardHeader}>
                    <h2 className={styles.chartTitle}>All Events</h2>
                    <span className={styles.resultCountShowing}>
                        Showing {paginatedData.length} of {filteredData.length} events
                    </span>
                </div>

                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Event Name</th>
                                <th>Tickets Sold</th>
                                <th>Revenue</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.length > 0 ? (
                                paginatedData.map((item) => (
                                    <tr key={item.id}>
                                        <td className={styles.eventName}>{item.event}</td>
                                        <td>{item.sold}</td>
                                        <td className={styles.money}>KES {item.revenue.toLocaleString()}</td>
                                        <td>
                                            <span className={`${styles.badge} ${styles[item.status.toLowerCase()]}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <Link href={`/dashboard/analytics/event/${item.id}`} className={styles.viewLink} title="View Insights">
                                                {/* Changed Icon to Bar Chart/Graph */}
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <line x1="18" y1="20" x2="18" y2="10"></line>
                                                    <line x1="12" y1="20" x2="12" y2="4"></line>
                                                    <line x1="6" y1="20" x2="6" y2="14"></line>
                                                </svg>
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className={styles.emptyState}>
                                        No events found matching "{searchQuery}"
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className={styles.pagination}>
                        <button
                            className={styles.pageBtn}
                            disabled={currentPage === 1}
                            onClick={() => handlePageChange(currentPage - 1)}
                        >
                            Previous
                        </button>
                        {[...Array(totalPages)].map((_, index) => (
                            <button
                                key={index}
                                className={`${styles.pageNumber} ${currentPage === index + 1 ? styles.activePage : ''}`}
                                onClick={() => handlePageChange(index + 1)}
                            >
                                {index + 1}
                            </button>
                        ))}
                        <button
                            className={styles.pageBtn}
                            disabled={currentPage === totalPages}
                            onClick={() => handlePageChange(currentPage + 1)}
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
