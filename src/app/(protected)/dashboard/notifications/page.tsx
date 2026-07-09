"use client";

import { useEffect, useMemo, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { createNotificationsRepository } from '@/lib/repositories';
import type { Notification } from '@/lib/repositories/notifications.repository';
import { formatRelativeTime } from '@/utils/format';
import PageHeader from '@/components/dashboard/PageHeader';
import EmptyStateGuide from '@/components/dashboard/EmptyStateGuide';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import styles from './page.module.css';

export default function NotificationsPage() {
    const supabase = useMemo(() => createClient(), []);
    const notificationsRepo = useMemo(() => createNotificationsRepository(supabase), [supabase]);

    const [userId, setUserId] = useState<string | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMarkingAll, setIsMarkingAll] = useState(false);

    const fetchNotifications = useCallback(async (uid: string) => {
        setIsLoading(true);
        const { data } = await notificationsRepo.getForUser(uid, { page: 1, pageSize: 50 });
        setNotifications(data || []);
        setIsLoading(false);
    }, [notificationsRepo]);

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                fetchNotifications(user.id);
            } else {
                setIsLoading(false);
            }
        };
        init();
    }, [supabase, fetchNotifications]);

    const handleMarkRead = async (notification: Notification) => {
        if (notification.is_read) return;
        setNotifications(prev =>
            prev.map(n => (n.id === notification.id ? { ...n, is_read: true } : n))
        );
        await notificationsRepo.markRead(notification.id, notification.created_at);
    };

    const handleMarkAllRead = async () => {
        if (!userId) return;
        setIsMarkingAll(true);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        await notificationsRepo.markAllRead(userId);
        setIsMarkingAll(false);
    };

    const handleDelete = async (notification: Notification) => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
        await notificationsRepo.delete(notification.id, notification.created_at);
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <div>
            <PageHeader
                title="Notifications"
                subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'You\'re all caught up'}
                actionLabel={unreadCount > 0 ? (isMarkingAll ? 'Marking...' : 'Mark all as read') : undefined}
                onActionClick={unreadCount > 0 ? handleMarkAllRead : undefined}
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
                                className={`${styles.item} ${!notification.is_read ? styles.unread : ''}`}
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
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
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
