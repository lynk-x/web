"use client";

import React, { useState, useEffect, useRef } from 'react';
import styles from './page.module.css';
import Link from 'next/link';

interface Event {
    id: string;
    name: string;
    location: string;
    time: string;
    month: string;
    day: string;
    status: 'published' | 'draft' | 'past';
}

// Expanded mock data to test pagination
const initialEvents: Event[] = [
    { id: '1', name: 'Nairobi Tech Summit 2024', location: 'KICC', time: '9:00 AM', month: 'OCT', day: '12', status: 'published' },
    { id: '2', name: 'AfroBeats Festival', location: 'Carnivore', time: '6:00 PM', month: 'NOV', day: '05', status: 'published' },
    { id: '3', name: 'Startup Pitch Night', location: 'Westlands', time: '5:00 PM', month: 'DEC', day: '01', status: 'draft' },
    { id: '4', name: 'Comedy Night Special', location: 'Movenpick', time: '7:30 PM', month: 'DEC', day: '15', status: 'published' },
    { id: '5', name: 'Christmas Market', location: 'Karen', time: '10:00 AM', month: 'DEC', day: '24', status: 'draft' },
    { id: '6', name: 'New Year Eve Bash', location: 'Sarit Centre', time: '8:00 PM', month: 'JAN', day: '31', status: 'published' },
    { id: '7', name: 'Safaricom Jazz', location: 'Uhuru Gardens', time: '2:00 PM', month: 'FEB', day: '14', status: 'published' },
];

export default function DashboardOverview() {
    const [filter, setFilter] = useState<'All' | 'Upcoming' | 'Past' | 'Draft'>('All');
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 4; // Show 4 events per page

    const menuRef = useRef<HTMLDivElement>(null);

    const filteredEvents = initialEvents.filter(event => {
        if (filter === 'All') return true;
        if (filter === 'Draft') return event.status === 'draft';
        if (filter === 'Upcoming') return event.status === 'published';
        return true;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
    const paginatedEvents = filteredEvents.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    // Reset pagination when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [filter]);

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const toggleMenu = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        setOpenMenuId(openMenuId === id ? null : id);
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Welcome back, John 👋</h1>
                    <p className={styles.subtitle}>Here is what is happening with your events today.</p>
                </div>
                <Link href="/dashboard/events/create" className={styles.createBtn}>
                    + Create Event
                </Link>
            </header>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Total Revenue</span>
                    <div className={styles.statValue}>KES 124,500</div>
                    <span className={`${styles.statChange} ${styles.positive}`}>+12% from last month</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Tickets Sold</span>
                    <div className={styles.statValue}>482</div>
                    <span className={`${styles.statChange} ${styles.positive}`}>+24 new today</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Active Events</span>
                    <div className={styles.statValue}>3</div>
                    <span className={styles.statNote}>2 upcoming, 1 live</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Page Views</span>
                    <div className={styles.statValue}>12.5k</div>
                    <span className={`${styles.statChange} ${styles.negative}`}>-2% from last week</span>
                </div>
            </div>

            <div className={styles.contentGrid}>
                <div className={styles.upcomingEvents}>
                    <div className={styles.sectionHeader}>
                        <div className={styles.sectionTitleRow}>
                            <h2 className={styles.sectionTitle}>My Events</h2>
                            <div className={styles.filterTabs}>
                                {['All', 'Upcoming', 'Draft'].map((f) => (
                                    <button
                                        key={f}
                                        className={`${styles.filterTab} ${filter === f ? styles.activeFilter : ''}`}
                                        onClick={() => setFilter(f as any)}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <span className={styles.resultCount}>
                            Showing {paginatedEvents.length} of {filteredEvents.length}
                        </span>
                    </div>
                    <div className={styles.eventList}>
                        {paginatedEvents.map(event => (
                            <div key={event.id} className={styles.eventCard}>
                                <div className={styles.eventContent}>
                                    <div className={styles.eventDate}>
                                        <span className={styles.month}>{event.month}</span>
                                        <span className={styles.day}>{event.day}</span>
                                    </div>
                                    <div className={styles.eventInfo}>
                                        <h3 className={styles.eventName}>{event.name}</h3>
                                        <div className={styles.eventMeta}>{event.location} • {event.time}</div>
                                    </div>
                                    <div className={styles.eventStatus}>{event.status}</div>
                                </div>
                                <div className={styles.cardActions}>
                                    <Link href="/guests" className={styles.guestListLink} title="View Guest List">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="9" cy="7" r="4"></circle>
                                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                        </svg>
                                    </Link>
                                    <button
                                        className={styles.optionsBtn}
                                        onClick={(e) => toggleMenu(e, event.id)}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="1"></circle>
                                            <circle cx="12" cy="5" r="1"></circle>
                                            <circle cx="12" cy="19" r="1"></circle>
                                        </svg>
                                    </button>
                                    {openMenuId === event.id && (
                                        <div className={styles.optionsMenu} ref={menuRef}>
                                            <button className={styles.menuItem}>Edit Event</button>
                                            <button className={styles.menuItem}>View Analytics</button>
                                            <button className={styles.menuItem}>Duplicate</button>
                                            <div className={styles.menuDivider}></div>
                                            <button className={`${styles.menuItem} ${styles.deleteItem}`}>Delete</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
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
        </div>
    );
}
