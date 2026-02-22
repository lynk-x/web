"use client";

import AudienceForm from '@/components/ads/audiences/AudienceForm';
import styles from '../page.module.css';

export default function CreateAudiencePage() {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Create Audience</h1>
                    <p className={styles.subtitle}>Define a new target segment for your campaigns.</p>
                </div>
            </header>

            <AudienceForm />
        </div>
    );
}
