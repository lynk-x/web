"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import SubPageHeader from '@/components/shared/SubPageHeader';
import RichTextEditor from '@/components/ui/RichTextEditor';
import OutreachPreview from '@/components/admin/outreach/OutreachPreview';

export default function CreateBroadcastPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const supabase = createClient();
    const { enabled: isBroadcastEnabled, isLoading: isFlagLoading } = useFeatureFlag('enable_admin_broadcast');

    const [isLoading, setIsLoading] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [fcmTokens, setFcmTokens] = useState('');
    const [notificationType, setNotificationType] = useState<any>('system');

    const handleChange = (setter: any, value: any) => {
        setter(value);
        setIsDirty(true);
    };

    const handleSendNotification = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!subject || !message) {
            showToast('Subject and message are required', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const providedTokens = fcmTokens.trim().split('\n').map(t => t.trim()).filter(Boolean);
            const isSegmented = providedTokens.length > 0;
            const targetingType = isSegmented ? 'segmented' : 'global';

            // 1. Resolve FCM token list
            let targetTokens: string[];
            if (isSegmented) {
                targetTokens = providedTokens;
            } else {
                // Global broadcast: fetch all registered device tokens
                const { data: devices, error: devErr } = await supabase
                    .from('user_devices')
                    .select('fcm_token');
                if (devErr) throw devErr;
                targetTokens = (devices || []).map((d: any) => d.fcm_token);
            }

            // 2. Log the broadcast intent
            const { error: logError } = await supabase
                .from('notification_broadcast_logs')
                .insert([{
                    type: notificationType,
                    subject,
                    message,
                    image_url: imageUrl || null,
                    fcm_tokens_count: targetTokens.length,
                    targeting_type: targetingType,
                }]);
            if (logError) throw logError;

            // 3. Enqueue push notifications in batches of 100
            const BATCH_SIZE = 100;
            const queueEntries = targetTokens.map(token => ({
                channel: 'push',
                recipient: token,
                priority: notificationType === 'system' ? 'high' : 'medium',
                info: {
                    subject,
                    body: message,
                    data: {
                        type: notificationType,
                        ...(imageUrl ? { image_url: imageUrl } : {}),
                    },
                },
            }));

            for (let i = 0; i < queueEntries.length; i += BATCH_SIZE) {
                const { error: qErr } = await supabase
                    .from('delivery_queue')
                    .insert(queueEntries.slice(i, i + BATCH_SIZE));
                if (qErr) throw qErr;
            }

            showToast(
                `Broadcast dispatched to ${targetTokens.length} device${targetTokens.length !== 1 ? 's' : ''}`,
                'success',
            );
            setIsDirty(false);
            router.push('/dashboard/admin/communications?tab=broadcast');
        } catch (error: any) {
            showToast(error.message || 'Failed to send broadcast', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isFlagLoading && isBroadcastEnabled === false) {
        return (
            <div className={adminStyles.container} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '16px' }}>Admin broadcast is not available yet.</p>
            </div>
        );
    }

    return (
        <div className={adminStyles.container}>
            <SubPageHeader
                title="Create Broadcast Notification"
                subtitle="Send a platform-wide alert or targeted notification."
                isDirty={isDirty}
                primaryAction={{
                    label: 'Send Broadcast',
                    onClick: () => handleSendNotification(),
                    isLoading: isLoading
                }}
            />

            <div className={adminStyles.subPageGrid}>
                <div className={adminStyles.pageCard}>
                    <h2 className={adminStyles.sectionTitle}>Notification Details</h2>
                    <form className={adminStyles.form} onSubmit={handleSendNotification}>
                        <div className={adminStyles.inputGroup}>
                            <label className={adminStyles.label}>Notification Type</label>
                            <select
                                className={adminStyles.select}
                                value={notificationType}
                                onChange={(e) => handleChange(setNotificationType, e.target.value)}
                            >
                                <option value="system">System Notification</option>
                                <option value="social">Social Interaction</option>
                                <option value="marketing">Marketing Campaign</option>
                                <option value="event_update">Event Update</option>
                                <option value="money_in">Billing (Income)</option>
                                <option value="money_out">Billing (Payout)</option>
                            </select>
                        </div>
                        <div className={adminStyles.inputGroup}>
                            <label className={adminStyles.label}>Subject Line</label>
                            <input
                                type="text"
                                placeholder="Headline for the push notification"
                                className={adminStyles.input}
                                value={subject}
                                onChange={(e) => handleChange(setSubject, e.target.value)}
                                required
                            />
                        </div>
                        <div className={adminStyles.inputGroup}>
                            <label className={adminStyles.label}>Target FCM Tokens (Optional)</label>
                            <textarea
                                className={adminStyles.textarea}
                                placeholder="One token per line to target specific devices..."
                                value={fcmTokens}
                                onChange={(e) => handleChange(setFcmTokens, e.target.value)}
                            />
                        </div>
                        <div className={adminStyles.inputGroup}>
                            <label className={adminStyles.label}>Image Attachment URL (Optional)</label>
                            <input
                                type="text"
                                placeholder="https://example.com/asset.jpg"
                                className={adminStyles.input}
                                value={imageUrl}
                                onChange={(e) => handleChange(setImageUrl, e.target.value)}
                            />
                        </div>
                        <div className={adminStyles.inputGroup}>
                            <label className={adminStyles.label}>Message Content</label>
                            <RichTextEditor
                                value={message}
                                onChange={(val) => handleChange(setMessage, val)}
                                placeholder="Write the body of your alert..."
                            />
                        </div>
                    </form>
                </div>

                <div className={adminStyles.formSection}>
                    <div>
                        <h2 className={adminStyles.sectionTitle}>Live Preview</h2>
                        <OutreachPreview
                            subject={subject}
                            message={message}
                            imageUrl={imageUrl}
                            audience={notificationType}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
