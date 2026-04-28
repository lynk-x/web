"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './CreateForum.module.css';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';

import SubPageHeader from '@/components/shared/SubPageHeader';

interface EventOption {
    id: string;
    title: string;
    organizer: string;
}

export default function CreateForumPage() {
    const supabase = createClient();
    const router = useRouter();
    const { showToast } = useToast();

    const [events, setEvents] = useState<EventOption[]>([]);
    const [isLoadingEvents, setIsLoadingEvents] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        eventId: '',
        status: 'Open',
        hasAds: true,
        welcomeMessage: '',
    });

    useEffect(() => {
        const fetchEligibleEvents = async () => {
            setIsLoadingEvents(true);
            try {
                // Fetch events that don't have a forum yet
                // We do this by a left join where forum is null
                const { data, error } = await supabase
                    .from('events')
                    .select('id, title, profiles!organizer_id(display_name), forums(id)')
                    .filter('status', 'in', '("published","active")')
                    .order('created_at', { ascending: false });

                if (error) throw error;

                // Filter out events that already have a forum manually since Supabase 
                // doesn't support "NOT EXISTS" well in simple client queries
                const eligible = (data || [])
                    .filter((e: any) => !e.forums || e.forums.length === 0)
                    .map((e: any) => ({
                        id: e.id,
                        title: e.title,
                        organizer: e.profiles?.display_name || 'Unknown Organizer'
                    }));

                setEvents(eligible);
            } catch (err) {
                showToast('Failed to load eligible events.', 'error');
            } finally {
                setIsLoadingEvents(false);
            }
        };

        fetchEligibleEvents();
    }, [supabase, showToast]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }));
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!formData.eventId) {
            showToast('Please select an event.', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Create the forum
            const { data: forum, error: forumError } = await supabase
                .from('forums')
                .insert({
                    event_id: formData.eventId,
                    status: formData.status,
                    has_ads: formData.hasAds,
                })
                .select()
                .single();

            if (forumError) throw forumError;

            // 2. If there's a welcome message, post it as a pinned system announcement
            if (formData.welcomeMessage.trim()) {
                const { error: msgError } = await supabase
                    .from('forum_messages')
                    .insert({
                        forum_id: forum.id,
                        message_type: 'system_announcement',
                        content: formData.welcomeMessage,
                        is_pinned: true,
                    });

                if (msgError) showToast('Forum created but welcome message failed to post.', 'warning');
            }


            showToast('Forum created successfully!', 'success');
            router.push('/dashboard/admin/forums');
        } catch (err: any) {
            showToast(err.message || 'Failed to create forum.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedEvent = events.find(e => e.id === formData.eventId);

    return (
        <div className={adminStyles.container}>
            <SubPageHeader
                title="Initialize New Forum"
                subtitle="Link a dedicated community space to an existing event."
                backLabel="Back to Forums"
                primaryAction={{
                    label: isSubmitting ? 'Initializing...' : 'Initialize Forum',
                    onClick: () => handleSubmit(),
                    isLoading: isSubmitting
                }}
            />

            <div className={styles.layout}>
                <div className={styles.formColumn}>
                    <form onSubmit={handleSubmit} className={styles.formCard}>
                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>Link Event</h2>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Select Event</label>
                                <select
                                    name="eventId"
                                    className={styles.select}
                                    value={formData.eventId}
                                    onChange={handleInputChange}
                                    disabled={isLoadingEvents}
                                    required
                                >
                                    <option value="">-- Choose an event --</option>
                                    {events.map(event => (
                                        <option key={event.id} value={event.id}>
                                            {event.title} ({event.organizer})
                                        </option>
                                    ))}
                                </select>
                                {events.length === 0 && !isLoadingEvents && (
                                    <p className={styles.hint}>All active events already have linked forums.</p>
                                )}
                            </div>
                        </div>

                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>Forum Configuration</h2>
                            <div className={styles.row}>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Initial Status</label>
                                    <select
                                        name="status"
                                        className={styles.select}
                                        value={formData.status}
                                        onChange={handleInputChange}
                                    >
                                        <option value="Open">Open (Standard)</option>
                                        <option value="Read_only">Read Only (Announcements)</option>
                                    </select>
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label} style={{ marginBottom: '12px' }}>Social Settings</label>
                                    <label className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            name="hasAds"
                                            checked={formData.hasAds}
                                            onChange={handleInputChange}
                                        />
                                        <span>Enable In-Forum Ad Placements</span>
                                    </label>
                                </div>
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Admin Welcome Message (Optional)</label>
                                <textarea
                                    name="welcomeMessage"
                                    className={styles.textarea}
                                    placeholder="Welcome everyone! Guidelines: Be respectful..."
                                    value={formData.welcomeMessage}
                                    onChange={handleInputChange}
                                    rows={4}
                                />
                                <p className={styles.hint}>This will be posted as a pinned system announcement.</p>
                            </div>
                        </div>

                        <div className={styles.actions}>
                            <button
                                type="button"
                                className={adminStyles.btnSecondary}
                                onClick={() => router.back()}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className={adminStyles.btnPrimary}
                                disabled={isSubmitting || !formData.eventId}
                            >
                                {isSubmitting ? 'Initializing...' : 'Initialize Forum'}
                            </button>
                        </div>
                    </form>
                </div>

                <div className={styles.previewColumn}>
                    <h2 className={styles.previewTitle}>Live Preview</h2>
                    <div className={styles.mockDevice}>
                        <div className={styles.deviceContent}>
                            <div className={styles.forumPreview}>
                                <div className={styles.previewHeader}>
                                    <div style={{ color: 'var(--color-brand-primary)', fontSize: '10px', fontWeight: 700, letterSpacing: '1px' }}>FORUM PREVIEW</div>
                                    <div style={{ fontSize: '16px', fontWeight: 600 }}>{selectedEvent?.title || 'Event Forum'}</div>
                                    <div style={{ fontSize: '11px', opacity: 0.5 }}>{selectedEvent?.organizer || 'Social Channel'}</div>
                                </div>

                                <div className={styles.previewBody}>
                                    {formData.welcomeMessage ? (
                                        <div className={styles.previewMsgAnn}>
                                            <div className={styles.annBadge}>PINNED ANNOUNCEMENT</div>
                                            <p>{formData.welcomeMessage}</p>
                                        </div>
                                    ) : (
                                        <div className={styles.emptyState}>
                                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                                            <p>Forum is empty. Start by posting a welcome message!</p>
                                        </div>
                                    )}

                                    <div className={styles.msgBubble}>
                                        <div className={styles.msgAvatar} />
                                        <div className={styles.msgContent}>
                                            <div className={styles.msgLine} style={{ width: '40%' }} />
                                            <div className={styles.msgLine} style={{ width: '80%' }} />
                                        </div>
                                    </div>

                                    {formData.hasAds && (
                                        <div className={styles.previewAd}>
                                            <div style={{ fontSize: '9px', fontWeight: 800, marginBottom: '4px' }}>SPONSORED</div>
                                            <div className={styles.adBox} />
                                        </div>
                                    )}
                                </div>

                                <div className={styles.previewFooter}>
                                    <div className={styles.inputMock}>
                                        {formData.status === 'Read_only' ? 'Only moderators can post here' : 'Type a message...'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
