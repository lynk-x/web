"use client";

import AudienceForm from '@/components/ads/audiences/AudienceForm';
import BackButton from '@/components/shared/BackButton';
import styles from '@/app/dashboard/ads/page.module.css';
import { useState } from 'react';

export default function CreateAudiencePage() {
    const [isDirty, setIsDirty] = useState(false);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <BackButton label="Back to Audiences" isDirty={isDirty} />
                    <h1 className={styles.title}>Create Audience</h1>
                    <p className={styles.subtitle}>Define a new target segment for your campaigns.</p>
                </div>
            </header>

            <AudienceForm onDirtyChange={setIsDirty} />
        </div>
    );
}
