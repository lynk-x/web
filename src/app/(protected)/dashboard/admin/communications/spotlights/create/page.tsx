"use client";
import { getErrorMessage } from '@/utils/error';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import SubPageHeader from '@/components/shared/SubPageHeader';
import Badge from '@/components/shared/Badge';
import SystemBannerSpotlight from '@/components/shared/SystemBannerSpotlight';

export default function CreateSpotlightPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const supabase = createClient();

    const [isLoading, setIsLoading] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [target, setTarget] = useState<'all' | 'organize_dashboard' | 'ads_dashboard' | 'discovery_page'>('all');
    const [displayOrder, setDisplayOrder] = useState(0);
    const [ctaText, setCtaText] = useState('');
    const [redirectTo, setRedirectTo] = useState('');
    const [backgroundUrl, setBackgroundUrl] = useState('');
    const [isActive, setIsActive] = useState(true);

    const handleChange = (setter: any, value: any) => {
        setter(value);
        setIsDirty(true);
    };

    const handleCreateSpotlight = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!title) {
            showToast('Title is required', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await supabase
                .from('spotlights')
                .insert([{
                    title,
                    subtitle: subtitle || null,
                    target,
                    display_order: displayOrder,
                    cta_text: ctaText || null,
                    redirect_to: redirectTo || null,
                    background_url: backgroundUrl || null,
                    is_active: isActive
                }]);

            if (error) throw error;

            showToast('Hero Spotlight created successfully', 'success');
            setIsDirty(false);
            router.push('/dashboard/admin/communications?tab=spotlights');
        } catch (error: unknown) {
            showToast(getErrorMessage(error) || 'Failed to create spotlight', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const previewSlide = {
        id: 'preview',
        title: title || 'Spotlight Title',
        subtitle: subtitle || 'Spotlight subtitle will appear here...',
        backgroundImage: backgroundUrl || 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
        ctaLabel: ctaText,
        ctaHref: redirectTo
    };

    return (
        <div className={adminStyles.container}>
            <SubPageHeader
                title="Create Hero Spotlight"
                subtitle="Design a high-impact carousel item for dashboards."
                isDirty={isDirty}
                primaryAction={{
                    label: 'Create Spotlight',
                    onClick: () => handleCreateSpotlight(),
                    isLoading: isLoading
                }}
            />

            <div className={adminStyles.subPageGrid}>
                <div className={adminStyles.pageCard}>
                    <h2 className={adminStyles.sectionTitle}>Spotlight Configuration</h2>
                    <form className={adminStyles.form} onSubmit={handleCreateSpotlight}>
                        <div className={adminStyles.formGrid}>
                            <div className={adminStyles.inputGroup}>
                                <label className={adminStyles.label}>Target Placement</label>
                                <select
                                    className={adminStyles.select}
                                    value={target}
                                    onChange={(e) => handleChange(setTarget, e.target.value)}
                                >
                                    <option value="all">Everywhere</option>
                                    <option value="organize_dashboard">Organizer Dashboard</option>
                                    <option value="ads_dashboard">Advertiser Dashboard</option>
                                    <option value="discovery_page">Discovery Page (Home)</option>
                                </select>
                            </div>
                            <div className={adminStyles.inputGroup}>
                                <label className={adminStyles.label}>Display Order</label>
                                <input
                                    type="number"
                                    className={adminStyles.input}
                                    value={displayOrder}
                                    onChange={(e) => handleChange(setDisplayOrder, parseInt(e.target.value))}
                                />
                            </div>
                        </div>

                        <div className={adminStyles.inputGroup}>
                            <label className={adminStyles.label}>Headline Title</label>
                            <input
                                type="text"
                                placeholder="e.g. Early Bird Tickets Now Live!"
                                className={adminStyles.input}
                                value={title}
                                onChange={(e) => handleChange(setTitle, e.target.value)}
                                required
                            />
                        </div>

                        <div className={adminStyles.inputGroup}>
                            <label className={adminStyles.label}>Subtitle Content</label>
                            <textarea
                                className={adminStyles.textarea}
                                placeholder="A brief description for the spotlight..."
                                value={subtitle}
                                onChange={(e) => handleChange(setSubtitle, e.target.value)}
                            />
                        </div>

                        <div className={adminStyles.formGrid}>
                            <div className={adminStyles.inputGroup}>
                                <label className={adminStyles.label}>CTA Button Text</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Register Now"
                                    className={adminStyles.input}
                                    value={ctaText}
                                    onChange={(e) => handleChange(setCtaText, e.target.value)}
                                />
                            </div>
                            <div className={adminStyles.inputGroup}>
                                <label className={adminStyles.label}>Redirect URL</label>
                                <input
                                    type="text"
                                    placeholder="/organize/events/create"
                                    className={adminStyles.input}
                                    value={redirectTo}
                                    onChange={(e) => handleChange(setRedirectTo, e.target.value)}
                                />
                            </div>
                        </div>

                        <div className={adminStyles.inputGroup}>
                            <label className={adminStyles.label}>Background Image URL / CSS Gradient</label>
                            <input
                                type="text"
                                placeholder="https://... or linear-gradient(...)"
                                className={adminStyles.input}
                                value={backgroundUrl}
                                onChange={(e) => handleChange(setBackgroundUrl, e.target.value)}
                            />
                        </div>

                        <div className={adminStyles.inputGroup}>
                            <label className={adminStyles.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={isActive}
                                    onChange={(e) => handleChange(setIsActive, e.target.checked)}
                                />
                                Visible to users
                            </label>
                        </div>
                    </form>
                </div>

                <div className={adminStyles.formSection} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div>
                        <h2 className={adminStyles.sectionTitle}>Live Preview</h2>
                        <SystemBannerSpotlight slides={[previewSlide]} interval={999999} />

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px' }}>
                            <Badge label={target.replace('_', ' ').toUpperCase()} variant="info" />
                            {isActive && <Badge label="ACTIVE" variant="success" showDot />}
                            {!isActive && <Badge label="HIDDEN" variant="neutral" />}
                        </div>
                    </div>


                    <div className={adminStyles.pageCard}>
                        <h2 className={adminStyles.sectionTitle}>Targeting Rules</h2>
                        <ul style={{ paddingLeft: '20px', fontSize: '14px', opacity: 0.8, display: 'flex', flexDirection: 'column', gap: '12px', color: 'var(--color-utility-primaryText)' }}>
                            <li>"Everywhere" shows on all hero-enabled dashboards.</li>
                            <li>Multiple spotlights on one target will alternate.</li>
                            <li>Use "Display Order" to control the first-shown slide.</li>
                            <li>External links should include full protocol (https://).</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
