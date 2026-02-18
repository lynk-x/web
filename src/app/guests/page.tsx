"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import { Guest } from '@/types/guest';
import { initialGuests } from '@/data/mockGuests';

export default function GuestListPage() {
    const [guests, setGuests] = useState<Guest[]>(initialGuests);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [ticketFilter, setTicketFilter] = useState('All');
    const [selectedGuests, setSelectedGuests] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Filter Logic
    const filteredGuests = guests.filter(guest => {
        const matchesSearch = guest.name.toLowerCase().includes(search.toLowerCase()) ||
            guest.email.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'All' || guest.status === statusFilter;
        const matchesTicket = ticketFilter === 'All' || guest.ticketType === ticketFilter;
        return matchesSearch && matchesStatus && matchesTicket;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredGuests.length / itemsPerPage);
    const paginatedGuests = filteredGuests.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Selection Logic
    const toggleSelectAll = () => {
        if (selectedGuests.size === paginatedGuests.length && paginatedGuests.length > 0) {
            selectedGuests.clear();
            setSelectedGuests(new Set(selectedGuests));
        } else {
            paginatedGuests.forEach(g => selectedGuests.add(g.id));
            setSelectedGuests(new Set(selectedGuests));
        }
    };

    const toggleSelectGuest = (id: string) => {
        if (selectedGuests.has(id)) {
            selectedGuests.delete(id);
        } else {
            selectedGuests.add(id);
        }
        setSelectedGuests(new Set(selectedGuests));
    };

    const toggleCheckIn = (id: string) => {
        setGuests(guests.map(g => {
            if (g.id === id) {
                return { ...g, status: g.status === 'Checked In' ? 'Pending' : 'Checked In' };
            }
            return g;
        }));
    };

    const bulkCheckIn = () => {
        setGuests(guests.map(g => {
            if (selectedGuests.has(g.id)) {
                return { ...g, status: 'Checked In' };
            }
            return g;
        }));
        selectedGuests.clear();
        setSelectedGuests(new Set());
    };

    return (
        <div className={styles.container}>
            <Link href="/dashboard/organize" className={styles.backLink}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5"></path>
                    <path d="M12 19l-7-7 7-7"></path>
                </svg>
                Back to Dashboard
            </Link>

            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Nairobi Tech Summit 2024</h1>
                    <p className={styles.subtitle}>Guest List • Manage attendees and manual check-ins.</p>
                </div>
                <div className={styles.actions}>
                    {selectedGuests.size > 0 && (
                        <button className={styles.bulkActionBtn} onClick={bulkCheckIn}>
                            Check In Selected ({selectedGuests.size})
                        </button>
                    )}
                    <button className={styles.exportBtn}>Export CSV</button>
                    <button className={styles.inviteBtn}>+ Invite Guest</button>
                </div>
            </header>

            <div className={styles.controls}>
                <input
                    type="text"
                    placeholder="Search by name or email..."
                    className={styles.searchBar}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <select
                    className={styles.filterDropdown}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="All">All Status</option>
                    <option value="Checked In">Checked In</option>
                    <option value="Pending">Pending</option>
                </select>
                <select
                    className={styles.filterDropdown}
                    value={ticketFilter}
                    onChange={(e) => setTicketFilter(e.target.value)}
                >
                    <option value="All">All Ticket Types</option>
                    <option value="VIP">VIP</option>
                    <option value="Standard">Standard</option>
                    <option value="Early Bird">Early Bird</option>
                </select>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th style={{ width: '40px' }}>
                                <input
                                    type="checkbox"
                                    checked={paginatedGuests.length > 0 && selectedGuests.size === paginatedGuests.length}
                                    onChange={toggleSelectAll}
                                />
                            </th>
                            <th>Guest Name</th>
                            <th>Ticket Type</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedGuests.map(guest => (
                            <tr key={guest.id} className={selectedGuests.has(guest.id) ? styles.selectedRow : ''}>
                                <td>
                                    <input
                                        type="checkbox"
                                        checked={selectedGuests.has(guest.id)}
                                        onChange={() => toggleSelectGuest(guest.id)}
                                    />
                                </td>
                                <td>
                                    <div className={styles.guestInfo}>
                                        <span className={styles.guestName}>{guest.name}</span>
                                        <span className={styles.guestEmail}>{guest.email}</span>
                                    </div>
                                </td>
                                <td><span className={styles.ticketBadge}>{guest.ticketType}</span></td>
                                <td className={styles.dateCell}>{guest.purchaseDate}</td>
                                <td>
                                    <span className={`${styles.statusBadge} ${guest.status === 'Checked In' ? styles.statusChecked : styles.statusPending}`}>
                                        {guest.status}
                                    </span>
                                </td>
                                <td>
                                    <button
                                        className={`${styles.actionBtn} ${guest.status === 'Checked In' ? styles.btnUndo : styles.btnCheckIn}`}
                                        onClick={() => toggleCheckIn(guest.id)}
                                    >
                                        {guest.status === 'Checked In' ? 'Undo' : 'Check In'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredGuests.length === 0 && (
                    <div className={styles.emptyState}>
                        No guests found matching your search.
                    </div>
                )}

                {filteredGuests.length > 0 && (
                    <div className={styles.pagination}>
                        <span className={styles.pageInfo}>
                            Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredGuests.length)} of {filteredGuests.length}
                        </span>
                        <div className={styles.pageControls}>
                            <button
                                className={styles.pageBtn}
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            >
                                Previous
                            </button>
                            <button
                                className={styles.pageBtn}
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
