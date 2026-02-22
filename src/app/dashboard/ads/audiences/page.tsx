"use client";

import Link from 'next/link';
import styles from '../../page.module.css';
import localStyles from './page.module.css';

const mockAudiences = [
    { id: '1', name: 'Music Lovers - NYC', size: '1.2M - 1.5M', category: 'Entertainment', tags: 'jazz, rock, concerts', details: 'Interests: Jazz, Rock, Concerts • Location: New York, NY' },
    { id: '2', name: 'Tech Pros - West Coast', size: '500k - 700k', category: 'Technology', tags: 'software, tech, dev', details: 'Titles: Software Engineer, CTO • Location: CA, WA' },
    { id: '3', name: 'Website Visitors (30d)', size: '12.5k', category: 'Business', tags: 'retargeting, pixel', details: 'Source: Pixel • Duration: 30 days' },
    { id: '4', name: 'Event Organizers', size: '25k - 40k', category: 'Lifestyle', tags: 'events, organization', details: 'Behavior: Created an event in last 90 days' },
];

export default function AdsAudiencesPage() {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Audiences</h1>
                    <p className={styles.subtitle}>Define and manage your target audience segments.</p>
                </div>
                <Link href="/dashboard/ads/audiences/create" className={styles.btnPrimary} style={{ textDecoration: 'none' }}>
                    + Create Audience
                </Link>
            </header>

            <div className={localStyles.grid}>
                {mockAudiences.map((audience) => (
                    <section key={audience.id} className={localStyles.audienceCard}>
                        <div className={localStyles.audienceInfo}>
                            <div className={localStyles.audienceName}>{audience.name}</div>
                            <div className={localStyles.audienceDetails}>{audience.details}</div>
                            <div className={localStyles.tags}>
                                <span className={localStyles.typeTag}>
                                    {audience.category}
                                </span>
                                <span className={localStyles.sizeInfo}>
                                    Est. Size: <strong>{audience.size}</strong>
                                </span>
                            </div>
                        </div>
                        <Link href={`/dashboard/ads/audiences/${audience.id}/edit`} className={localStyles.editBtn} style={{ textDecoration: 'none', textAlign: 'center' }}>
                            Edit
                        </Link>
                    </section>
                ))}
            </div>
        </div>
    );
}
