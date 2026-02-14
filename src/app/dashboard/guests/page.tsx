"use client";

import React, { useState } from 'react';
import styles from './page.module.css';

interface Guest {
    id: string;
    name: string;
    email: string;
    ticketType: string;
    status: 'Checked In' | 'Pending';
    purchaseDate: string;
}

const initialGuests: Guest[] = [
    { id: '1', name: 'Alex M.', email: 'alex@example.com', ticketType: 'VIP', status: 'Checked In', purchaseDate: 'Oct 10' },
    { id: '2', name: 'Sarah J.', email: 'sarah@example.com', ticketType: 'Standard', status: 'Pending', purchaseDate: 'Oct 11' },
    { id: '3', name: 'Michael B.', email: 'mike@example.com', ticketType: 'Standard', status: 'Pending', purchaseDate: 'Oct 12' },
    { id: '4', name: 'Emma W.', email: 'emma@example.com', ticketType: 'Early Bird', status: 'Checked In', purchaseDate: 'Sept 28' },
    { id: '5', name: 'David L.', email: 'david@example.com', ticketType: 'VIP', status: 'Pending', purchaseDate: 'Oct 05' },
    { id: '6', name: 'Lisa K.', email: 'lisa@example.com', ticketType: 'Standard', status: 'Pending', purchaseDate: 'Oct 12' },
];

export default function GuestListPage() {
    const [guests, setGuests] = useState<Guest[]>(initialGuests);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('All');

    const filteredGuests = guests.filter(guest => {
        const matchesSearch = guest.name.toLowerCase().includes(search.toLowerCase()) ||
            guest.email.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === 'All' || guest.status === filter;
        return matchesSearch && matchesFilter;
    });

    const toggleCheckIn = (id: string) => {
        setGuests(guests.map(g => {
            if (g.id === id) {
                return { ...g, status: g.status === 'Checked In' ? 'Pending' : 'Checked In' };
            }
            return g;
        }));
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Guest List</h1>
                    <p className={styles.subtitle}>Manage attendees and manual check-ins.</p>
                </div>
                <div className={styles.actions}>
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
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                >
                    <option value="All">All Status</option>
                    <option value="Checked In">Checked In</option>
                    <option value="Pending">Pending</option>
                </select>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Guest Name</th>
                            <th>Ticket Type</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredGuests.map(guest => (
                            <tr key={guest.id}>
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
            </div>
        </div>
    );
}
