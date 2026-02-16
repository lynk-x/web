import React from 'react';

export default function SettingsPage() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <header>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>Settings</h1>
                <p style={{ opacity: 0.6 }}>Manage your account preferences and configurations.</p>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Section title="Account" description="Manage your personal information and profile details." />
            </div>
        </div>
    );
}

function Section({ title, description }: { title: string; description: string }) {
    return (
        <div style={{
            backgroundColor: 'var(--color-interface-surface)',
            border: '1px solid var(--color-interface-outline)',
            borderRadius: '12px',
            padding: '24px',
            cursor: 'pointer'
        }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>{title}</h3>
            <p style={{ fontSize: '14px', opacity: 0.6 }}>{description}</p>
        </div>
    );
}
