"use client";

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import styles from './TicketView.module.css';
import adminStyles from '../../../page.module.css';
import { useToast } from '@/components/ui/Toast';
import Badge from '@/components/shared/Badge';
import BackButton from '@/components/shared/BackButton';
import { formatString } from '@/utils/format';

// Mock data fetch
const mockTickets = [
    { id: '1024', subject: 'Unable to withdraw funds', requester: 'Alice Walker', priority: 'high', status: 'open', assignedTo: 'John Doe', lastUpdated: '1 hour ago', description: 'User reports that the withdrawal button remains disabled even after completing all verification steps.' },
    { id: '1023', subject: 'Event banner not uploading', requester: 'EventPro Ltd', priority: 'medium', status: 'in_progress', assignedTo: 'Sarah Smith', lastUpdated: '3 hours ago', description: 'Organizer is getting a 413 Payload Too Large error when uploading a 3MB banner.' },
];

export default function AdminTicketDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { showToast } = useToast();
    const id = params.id as string;

    const ticket = mockTickets.find(t => t.id === id) || mockTickets[0];

    const handleResolve = () => {
        showToast('Marking ticket as resolved...', 'info');
        setTimeout(() => {
            showToast('Ticket resolved.', 'success');
            router.push('/dashboard/admin/support');
        }, 1000);
    };

    return (
        <div className={adminStyles.container}>
            <header className={adminStyles.header}>
                <BackButton />
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                    <Badge label={`Ticket #${id}`} variant="neutral" className={styles.largeBadge} />
                </div>
                <div>
                    <h1 className={adminStyles.title}>{ticket.subject}</h1>
                    <p className={adminStyles.subtitle}>Requested by {ticket.requester} • Updated {ticket.lastUpdated}</p>
                </div>
            </header>

            <div className={styles.detailCard}>
                <div className={styles.metaGrid}>
                    <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Status</span>
                        <Badge label={formatString(ticket.status)} variant={ticket.status === 'open' ? 'success' : 'warning'} showDot className={styles.largeBadge} />
                    </div>
                    <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Priority</span>
                        <Badge label={ticket.priority} variant={ticket.priority === 'high' ? 'error' : 'warning'} className={styles.largeBadge} />
                    </div>
                    <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Assigned Agent</span>
                        <span className={styles.metaValue}>{ticket.assignedTo || 'Unassigned'}</span>
                    </div>
                </div>

                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Issue Description</h3>
                    <p className={styles.descriptionText}>{ticket.description}</p>
                </div>

                <div className={styles.actions}>
                    <button className={adminStyles.btnPrimary} onClick={handleResolve}>
                        Resolve Ticket
                    </button>
                    <button className={adminStyles.btnSecondary} onClick={() => router.push(`/dashboard/admin/support/edit/${id}`)}>
                        Edit Status
                    </button>
                </div>
            </div>
        </div>
    );
}
