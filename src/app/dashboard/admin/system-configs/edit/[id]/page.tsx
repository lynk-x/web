"use client";

import { useParams } from 'next/navigation';
import adminStyles from '../../../page.module.css';
import SystemConfigForm from '@/components/admin/system-configs/SystemConfigForm';

export default function EditSystemConfigPage() {
    const params = useParams(); // e.g. params.id

    // Mock initial data based on ID
    const initialData = {
        key: 'MOCK_CONFIG_KEY_' + params.id,
        description: 'Edit this configuration to manage platform mechanics.',
        value: 'CURRENT_VALUE',
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
                    <h1 className={adminStyles.title}>Edit Configuration</h1>
                </div>
                <p className={adminStyles.subtitle}>Update the value or status of this global platform setting.</p>
            </header>

            <SystemConfigForm initialData={initialData} isEditMode={true} />
        </div>
    );
}
