"use client";

import React, { use, useState } from 'react';
import UserForm, { UserFormData } from '@/components/admin/users/UserForm';
import BackButton from '@/components/shared/BackButton';
import styles from '@/app/dashboard/admin/page.module.css';

// Mock Data (In a real app, this would be fetched)
const mockUsers: UserFormData[] = [
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'organizer', status: 'active', bio: 'Long-time event organizer.' },
    { id: '2', name: 'Alice Smith', email: 'alice@business.com', role: 'advertiser', status: 'active', bio: 'Marketing specialist.' },
    { id: '3', name: 'Robert Admin', email: 'admin@lynk-x.com', role: 'admin', status: 'active', bio: 'System administrator.' },
];

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [isDirty, setIsDirty] = useState(false);

    // Find user from mock data or provide a default for demo
    const user = mockUsers.find(u => u.id === id) || {
        id,
        name: 'Demo User',
        email: 'demo@example.com',
        role: 'user' as const,
        status: 'active' as const,
        bio: 'Placeholder for user data.'
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <BackButton label="Back to Users" isDirty={isDirty} />
                    <h1 className={styles.title}>Edit User</h1>
                    <p className={styles.subtitle}>Updating information for {user.name}.</p>
                </div>
            </header>
            <UserForm initialData={user as UserFormData} isEditing onDirtyChange={setIsDirty} />
        </div>
    );
}
