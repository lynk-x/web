"use client";

import TicketForm from '@/components/admin/support/Form/TicketForm';
import BackButton from '@/components/shared/BackButton';
import styles from '@/app/dashboard/admin/page.module.css';
import { useState } from 'react';

export default function AdminCreateTicketPage() {
    const [isDirty, setIsDirty] = useState(false);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <BackButton label="Back to Support" isDirty={isDirty} />
                    <h1 className={styles.title}>Create New Ticket</h1>
                    <p className={styles.subtitle}>Manually log a new support request.</p>
                </div>
            </header>

            <TicketForm onDirtyChange={setIsDirty} />
        </div>
    );
}
