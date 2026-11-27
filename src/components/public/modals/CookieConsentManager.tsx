"use client";

import React from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export default function CookieConsentManager() {
    const [consent, setConsent] = useLocalStorage<{ analytics: boolean, preferences: boolean }>('cookie_consent', {
        analytics: true,
        preferences: true
    });

    const toggle = (key: keyof typeof consent) => {
        setConsent(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ fontWeight: '500' }}>Strictly Necessary</div>
                    <div style={{ fontSize: '12px', opacity: 0.5 }}>Required for the site to function</div>
                </div>
                <div style={{
                    padding: '6px 12px',
                    background: 'var(--color-brand-primary)',
                    color: 'white',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    opacity: 0.5
                }}>Always Active</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ fontWeight: '500' }}>Analytics</div>
                    <div style={{ fontSize: '12px', opacity: 0.5 }}>Help us improve our website</div>
                </div>
                <label className="toggle" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={consent.analytics}
                        onChange={() => toggle('analytics')}
                        style={{ marginRight: '8px' }}
                    />
                    <span style={{ fontSize: '14px' }}>{consent.analytics ? 'Active' : 'Inactive'}</span>
                </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ fontWeight: '500' }}>Preferences</div>
                    <div style={{ fontSize: '12px', opacity: 0.5 }}>Remember your settings</div>
                </div>
                <label className="toggle" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={consent.preferences}
                        onChange={() => toggle('preferences')}
                        style={{ marginRight: '8px' }}
                    />
                    <span style={{ fontSize: '14px' }}>{consent.preferences ? 'Active' : 'Inactive'}</span>
                </label>
            </div>
        </div>
    );
}
