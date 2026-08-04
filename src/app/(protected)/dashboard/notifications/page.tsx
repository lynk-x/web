"use client";

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { createNotificationsRepository } from '@/lib/repositories';
import type { Notification } from '@/lib/repositories/notifications.repository';
import { formatRelativeTime } from '@/utils/format';
import { useOrganization } from '@/context/OrganizationContext';
import { useRepoMutation } from '@/hooks/useRepoMutation';
import PageHeader from '@/components/dashboard/PageHeader';
import EmptyStateGuide from '@/components/dashboard/EmptyStateGuide';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import styles from './page.module.css';

export default function NotificationsPage() {
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);
    const notificationsRepo = useMemo(() => createNotificationsRepository(supabase), [supabase]);
    const { activeAccount } = useOrganization();

    const [userId, setUserId] = useState<string | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchNotifications = useCallback(async (uid: string, accountId?: string) => {
        setIsLoading(true);
        const { data } = await notificationsRepo.getForUser(uid, { page: 1, pageSize: 50, accountId });
        setNotifications(data || []);
        setIsLoading(false);
    }, [notificationsRepo]);

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                fetchNotifications(user.id, activeAccount?.id);
            } else {
                setIsLoading(false);
            }
        };
        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [supabase, fetchNotifications, activeAccount?.id]);

    // Idempotent (set-to-value / delete-by-id) — safe to retry on a transient failure.
    // On error, roll the optimistic UI update back to what the server last confirmed
    // rather than leaving the (already-applied) optimistic state stuck and unreported.
    const markReadMutation = useRepoMutation(
        (notification: Notification) => notificationsRepo.markRead(notification.id, notification.created_at),
        {
            errorMessage: 'Could not mark notification as read',
            onError: (_err, notification) => {
                setNotifications(prev =>
                    prev.map(n => (n.id === notification.id ? { ...n, is_read: false } : n))
                );
            },
        }
    );

    const markAllReadMutation = useRepoMutation(
        () => notificationsRepo.markAllRead(userId ?? ''),
        {
            errorMessage: 'Could not mark all notifications as read',
            onError: () => {
                if (userId) fetchNotifications(userId, activeAccount?.id);
            },
        }
    );

    const deleteMutation = useRepoMutation(
        (notification: Notification) => notificationsRepo.delete(notification.id, notification.created_at),
        {
            errorMessage: 'Could not delete notification',
            onError: (_err, notification) => {
                setNotifications(prev =>
                    prev.some(n => n.id === notification.id) ? prev : [...prev, notification].sort(
                        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    )
                );
            },
        }
    );

    const handleMarkRead = (notification: Notification) => {
        if (notification.is_read) return;
        setNotifications(prev =>
            prev.map(n => (n.id === notification.id ? { ...n, is_read: true } : n))
        );
        markReadMutation.mutate(notification);
    };

    const handleMarkAllRead = () => {
        if (!userId) return;
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        markAllReadMutation.mutate();
    };

    const handleDelete = (notification: Notification) => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
        deleteMutation.mutate(notification);
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <div className={styles.page}>
            <PageHeader
                title="Notifications"
                subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'You\'re all caught up'}
                primaryAction={unreadCount > 0 ? {
                    label: markAllReadMutation.isPending ? 'Marking...' : 'Mark all as read',
                    onClick: handleMarkAllRead,
                    disabled: markAllReadMutation.isPending,
                } : undefined}
                onClose={() => router.back()}
            />



            <div className={sharedStyles.pageCard}>
                {isLoading ? (
                    <div className={styles.loadingState}>Loading notifications...</div>
                ) : notifications.length === 0 ? (
                    <EmptyStateGuide
                        title="No notifications yet"
                        description="Updates about your account, events, and transactions will show up here."
                    />
                ) : (
                    <div className={styles.list}>
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={styles.item}
                                onClick={() => handleMarkRead(notification)}
                            >
                                {!notification.is_read && <span className={styles.dot} />}
                                <div className={styles.itemBody}>
                                    <div className={styles.itemHeader}>
                                        <span className={styles.itemTitle}>{notification.title}</span>
                                        <span className={styles.itemTime}>{formatRelativeTime(notification.created_at)}</span>
                                    </div>
                                    {notification.body && (
                                        <p className={styles.itemText}>{notification.body}</p>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    className={styles.deleteBtn}
                                    onClick={(e) => { e.stopPropagation(); handleDelete(notification); }}
                                    aria-label="Delete notification"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                        <line x1="10" y1="11" x2="10" y2="17"></line>
                                        <line x1="14" y1="11" x2="14" y2="17"></line>
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
