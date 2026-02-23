"use client";

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import TicketForm from '@/components/admin/support/Form/TicketForm';
import BackButton from '@/components/shared/BackButton';
import styles from '@/app/dashboard/admin/page.module.css';

// Mock data fetch
const mockTickets = [
    { id: '1024', subject: 'Unable to withdraw funds', requester: 'Alice Walker', priority: 'high', status: 'open', assignedTo: 'John Doe', lastUpdated: '1 hour ago' },
    { id: '1023', subject: 'Event banner not uploading', requester: 'EventPro Ltd', priority: 'medium', status: 'in_progress', assignedTo: 'Sarah Smith', lastUpdated: '3 hours ago' },
];

export default function AdminEditTicketPage() {
    const params = useParams();
    const id = params.id as string;
    const [isDirty, setIsDirty] = useState(false);

    const ticket = mockTickets.find(t => t.id === id) || mockTickets[0];

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <BackButton label="Back to Support" isDirty={isDirty} />
                    <h1 className={styles.title}>Edit Ticket #{id}</h1>
                    <p className={styles.subtitle}>Updating support request from {ticket.requester}.</p>
                </div>
            </header>

            <TicketForm initialData={ticket as any} isEditing={true} onDirtyChange={setIsDirty} />
        </div>
    );
}
