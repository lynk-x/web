"use client";

import adminStyles from '../../../page.module.css';
import RegionForm from '@/components/admin/regions-compliance/RegionForm';

export default function CreateRegionPage() {
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
                    <h1 className={adminStyles.title}>Add New Region</h1>
                </div>
                <p className={adminStyles.subtitle}>Set up a new country or region for platform processing and compliance.</p>
            </header>

            <RegionForm isEditMode={false} />
        </div>
    );
}
