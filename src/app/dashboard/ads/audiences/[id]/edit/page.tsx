"use client";

import { use, useState } from 'react';
import AudienceForm from '@/components/ads/audiences/AudienceForm';
import BackButton from '@/components/shared/BackButton';
import styles from '@/app/dashboard/ads/page.module.css';

// Mock Data - In a real app this would come from an API/Database
const mockAudiences = [
    { id: '1', name: 'Music Lovers - NYC', size: '1.2M - 1.5M', category: 'Entertainment', tags: 'jazz, rock, concerts', details: 'Music enthusiasts in New York area', country: 'United States', city: 'New York', radius: '25' },
    { id: '2', name: 'Tech Pros - West Coast', size: '500k - 700k', category: 'Technology', tags: 'software, tech, dev', details: 'Tech professionals and developers', country: 'United States', city: 'San Francisco', radius: '50' },
    { id: '3', name: 'Website Visitors (30d)', size: '12.5k', category: 'Business', tags: 'retargeting, pixel', details: 'Source: Pixel • Duration: 30 days', country: 'United States', city: '', radius: '0' },
    { id: '4', name: 'Event Organizers', size: '25k - 40k', category: 'Lifestyle', tags: 'events, organization', details: 'Behavior: Created an event in last 90 days', country: 'United States', city: '', radius: '0' },
];

export default function EditAudiencePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [isDirty, setIsDirty] = useState(false);

    // Find audience by ID
    const audience = mockAudiences.find(a => a.id === id);

    if (!audience) {
        return (
            <div className={styles.container}>
                <h1 className={styles.title}>Audience Not Found</h1>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <BackButton label="Back to Audiences" isDirty={isDirty} />
                    <h1 className={styles.title}>Edit Audience</h1>
                    <p className={styles.subtitle}>Update targeting criteria for "{audience.name}".</p>
                </div>
            </header>

            <AudienceForm initialData={audience} isEditing={true} onDirtyChange={setIsDirty} />
        </div>
    );
}
