"use client";

import Link from 'next/link';
import HomeLayout from "@/components/public/HomeLayout";
import { useLocalStorage } from '@/hooks/useLocalStorage';

export default function CookiePolicyPage() {
    return (
        <HomeLayout>
            <div style={{
                maxWidth: '800px',
                margin: '0 auto',
                padding: '40px 20px',
                color: 'var(--color-utility-primaryText)',
                position: 'relative'
            }}>
                <Link href="/" style={{
                    position: 'absolute',
                    left: '20px',
                    top: '40px',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-interface-surface)',
                    border: '1px solid var(--color-interface-outline)',
                    color: 'var(--color-utility-primaryText)',
                    transition: 'all 0.2s ease'
                }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </Link>
                <h1 style={{
                    fontSize: '32px',
                    fontFamily: 'var(--font-heading)',
                    marginBottom: '24px',
                    textAlign: 'center'
                }}>Cookie Policy</h1>

                <div style={{
                    background: 'var(--color-interface-surface)',
                    padding: '32px',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--color-interface-outline)',
                    lineHeight: '1.6'
                }}>
                    <p style={{ marginBottom: '16px', opacity: 0.8 }}>Last updated: {new Date().toLocaleDateString()}</p>

                    <h2 style={{ fontSize: '20px', fontWeight: '600', marginTop: '24px', marginBottom: '12px' }}>1. What Are Cookies?</h2>
                    <p style={{ marginBottom: '16px', opacity: 0.8 }}>
                        Cookies are small text files that are placed on your computer or mobile device when you browse websites.
                        They are widely used to make websites work, or work more efficiently, as well as to provide information to the owners of the site.
                    </p>

                    <h2 style={{ fontSize: '20px', fontWeight: '600', marginTop: '24px', marginBottom: '12px' }}>2. How We Use Cookies</h2>
                    <p style={{ marginBottom: '16px', opacity: 0.8 }}>
                        We use cookies to:
                    </p>
                    <ul style={{ listStyle: 'disc', paddingLeft: '24px', marginBottom: '16px', opacity: 0.8 }}>
                        <li style={{ marginBottom: '8px' }}>Keep you signed in (Authentication).</li>
                        <li style={{ marginBottom: '8px' }}>Remember your preferences (Theme, Layout).</li>
                        <li style={{ marginBottom: '8px' }}>Analyze how our website is used (Analytics).</li>
                    </ul>

                    <h2 style={{ fontSize: '20px', fontWeight: '600', marginTop: '24px', marginBottom: '12px' }}>3. Local Storage</h2>
                    <p style={{ marginBottom: '16px', opacity: 0.8 }}>
                        In addition to cookies, we use Local Storage to save your work-in-progress data on your device, such as:
                    </p>
                    <ul style={{ listStyle: 'disc', paddingLeft: '24px', marginBottom: '16px', opacity: 0.8 }}>
                        <li style={{ marginBottom: '8px' }}>Event drafts you haven't published yet.</li>
                        <li style={{ marginBottom: '8px' }}>Your shopping cart items.</li>
                        <li style={{ marginBottom: '8px' }}>Sidebar display preferences.</li>
                    </ul>

                    <h2 style={{ fontSize: '20px', fontWeight: '600', marginTop: '24px', marginBottom: '12px' }}>4. Managing Cookies</h2>
                    <p style={{ marginBottom: '16px', opacity: 0.8 }}>
                        Most web browsers allow some control of most cookies through the browser settings.
                        To find out more about cookies, including how to see what cookies have been set, visit <a href="https://www.aboutcookies.org" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>www.aboutcookies.org</a> or <a href="https://www.allaboutcookies.org" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>www.allaboutcookies.org</a>.
                    </p>

                    <div style={{
                        marginTop: '40px',
                        padding: '24px',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-interface-outline)'
                    }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>Your Cookie Preferences</h3>
                        <p style={{ fontSize: '14px', opacity: 0.7, marginBottom: '20px' }}>
                            You can manage your consent preferences for non-essential cookies below. Essential cookies are always active.
                        </p>

                        <CookieConsentManager />
                    </div>
                </div>
            </div>
        </HomeLayout>
    );
}

function CookieConsentManager() {
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
