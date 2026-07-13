"use client";
import { getErrorMessage } from '@/utils/error';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import PageHeader from '@/components/dashboard/PageHeader';
import Badge from '@/components/shared/Badge';
import SystemBannerSpotlight from '@/components/shared/SystemBannerSpotlight';
import FormRow from '@/components/shared/FormRow';
import { useConfirmModal } from '@/hooks/useConfirmModal';

export default function EditSpotlightPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const { showToast } = useToast();
    const supabase = createClient();
    const { confirm, ConfirmDialog } = useConfirmModal();

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
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

    useEffect(() => {
        async function fetchSpotlight() {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .schema('api')
                    .from('v1_spotlights')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                if (data) {
                    setTitle(data.title);
                    setSubtitle(data.subtitle || '');
                    setTarget(data.target);
                    setDisplayOrder(data.display_order);
                    setCtaText(data.cta_text || '');
                    setRedirectTo(data.redirect_to || '');
                    setBackgroundUrl(data.background_url || '');
                    setIsActive(data.is_active);
                    setIsDirty(false);
                }
            } catch (err: unknown) {
                showToast(getErrorMessage(err), 'error');
                router.push('/dashboard/system/communications?tab=spotlights');
            } finally {
                setIsLoading(false);
            }
        }
        if (id) fetchSpotlight();
    }, [id, supabase, router, showToast]);

    const handleChange = (setter: any, value: any) => {
        setter(value);
        setIsDirty(true);
    };

    const handleUpdateSpotlight = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!title) {
            showToast('Title is required', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const { error } = await supabase.schema('api').rpc('admin_upsert_comms_item', {
                p_tab: 'spotlights',
                p_id: id,
                p_data: {
                    title,
                    subtitle: subtitle || null,
                    target,
                    display_order: displayOrder,
                    cta_text: ctaText || null,
                    redirect_to: redirectTo || null,
                    background_url: backgroundUrl || null,
                    is_active: isActive
                }
            });

            if (error) throw error;

            showToast('Hero Spotlight updated successfully', 'success');
            setIsDirty(false);
            router.push('/dashboard/system/communications?tab=spotlights');
        } catch (error: unknown) {
            showToast(getErrorMessage(error) || 'Failed to update spotlight', 'error');
        } finally {
            setIsSubmitting(false);
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

    if (isLoading) {
        return <div style={{ padding: '80px', textAlign: 'center', opacity: 0.5 }}>Loading spotlight details...</div>;
    }

    const handleClose = async () => {
        if (isDirty) {
            const confirmed = await confirm('You have unsaved changes. Are you sure you want to leave?', { title: 'Unsaved Changes', confirmLabel: 'Leave', cancelLabel: 'Stay' });
            if (!confirmed) return;
        }
        router.back();
    };

    return (
        <div className={adminStyles.container}>
            {ConfirmDialog}
            <PageHeader
                title="Edit Hero Spotlight"
                subtitle={`Modifying ID: ${id}`}
                onClose={handleClose}
                primaryAction={{
                    label: 'Save Changes',
                    onClick: () => handleUpdateSpotlight(),
                    isLoading: isSubmitting
                }}
            />

            <div className={adminStyles.subPageGrid}>
                <div className={adminStyles.pageCard}>
                    <h2 className={adminStyles.sectionTitle}>Spotlight Configuration</h2>
                    <form className={adminStyles.form} onSubmit={handleUpdateSpotlight}>
                        <div className={adminStyles.formGrid}>
                            <FormRow label="Target Placement" styles={adminStyles}>
                                <select
                                    className={adminStyles.select}
                                    value={target}
                                    onChange={(e) => handleChange(setTarget, e.target.value as 'event' | 'url' | 'profile')}
                                >
                                    <option value="all">Everywhere</option>
                                    <option value="organize_dashboard">Organizer Dashboard</option>
                                    <option value="ads_dashboard">Advertiser Dashboard</option>
                                    <option value="discovery_page">Discovery Page (Home)</option>
                                </select>
                            </FormRow>
                            <FormRow label="Display Order" styles={adminStyles}>
                                <input
                                    type="number"
                                    className={adminStyles.input}
                                    value={displayOrder}
                                    onChange={(e) => handleChange(setDisplayOrder, parseInt(e.target.value))}
                                />
                            </FormRow>
                        </div>

                        <FormRow label="Headline Title" styles={adminStyles}>
                            <input
                                type="text"
                                placeholder="e.g. Early Bird Tickets Now Live!"
                                className={adminStyles.input}
                                value={title}
                                onChange={(e) => handleChange(setTitle, e.target.value)}
                                required
                            />
                        </FormRow>

                        <FormRow label="Subtitle Content" styles={adminStyles}>
                            <textarea
                                className={adminStyles.textarea}
                                placeholder="A brief description for the spotlight..."
                                value={subtitle}
                                onChange={(e) => handleChange(setSubtitle, e.target.value)}
                            />
                        </FormRow>

                        <div className={adminStyles.formGrid}>
                            <FormRow label="CTA Button Text" styles={adminStyles}>
                                <input
                                    type="text"
                                    placeholder="e.g. Register Now"
                                    className={adminStyles.input}
                                    value={ctaText}
                                    onChange={(e) => handleChange(setCtaText, e.target.value)}
                                />
                            </FormRow>
                            <FormRow label="Redirect URL" styles={adminStyles}>
                                <input
                                    type="text"
                                    placeholder="/organize/events/create"
                                    className={adminStyles.input}
                                    value={redirectTo}
                                    onChange={(e) => handleChange(setRedirectTo, e.target.value)}
                                />
                            </FormRow>
                        </div>

                        <FormRow label="Background Image URL / CSS Gradient" styles={adminStyles}>
                            <input
                                type="text"
                                placeholder="https://... or linear-gradient(...)"
                                className={adminStyles.input}
                                value={backgroundUrl}
                                onChange={(e) => handleChange(setBackgroundUrl, e.target.value)}
                            />
                        </FormRow>

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

                <div className={adminStyles.formSection}>
                    <div>
                        <h2 className={adminStyles.sectionTitle}>Live Preview</h2>
                        <SystemBannerSpotlight slides={[previewSlide]} interval={999999} />

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px' }}>
                            <Badge label={target.replace('_', ' ').toUpperCase()} variant="info" />
                            {isActive && <Badge label="ACTIVE" variant="success" showDot />}
                            {!isActive && <Badge label="HIDDEN" variant="neutral" />}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
