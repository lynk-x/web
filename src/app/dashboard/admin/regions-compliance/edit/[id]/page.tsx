"use client";

import { useParams } from 'next/navigation';
import adminStyles from '../../../page.module.css';
import RegionForm from '@/components/admin/regions-compliance/RegionForm';

export default function EditRegionPage() {
    const params = useParams(); // e.g. params.id

    // Mock initial data based on ID
    const initialData = {
        name: 'United States',
        code: 'US',
        currency: 'USD',
        platformFee: '5.0%',
        taxConfig: 'State/Local (Dynamic)',
        status: 'active' as const,
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <header>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <button
                        onClick={() => window.history.back()}
                        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', padding: 0 }}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                    </button>
                    <h1 className={adminStyles.title}>Edit Region</h1>
                </div>
                <p className={adminStyles.subtitle}>Update compliance tracking, pricing frameworks, and status for this territory.</p>
            </header>

            <RegionForm initialData={initialData} isEditMode={true} />
        </div>
    );
}
