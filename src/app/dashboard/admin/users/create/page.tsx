"use client";

import UserForm from '@/components/admin/users/UserForm';
import BackButton from '@/components/shared/BackButton';
import styles from '@/app/dashboard/admin/page.module.css';
import { useState } from 'react';

export default function CreateUserPage() {
    const [isDirty, setIsDirty] = useState(false);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <BackButton label="Back to Users" isDirty={isDirty} />
                    <h1 className={styles.title}>Create New User</h1>
                    <p className={styles.subtitle}>Add a new member to the platform.</p>
                </div>
            </header>
            <UserForm onDirtyChange={setIsDirty} />
        </div>
    );
}
