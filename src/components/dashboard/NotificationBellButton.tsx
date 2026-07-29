"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useOrganization } from '@/context/OrganizationContext';
import styles from './NotificationBellButton.module.css';

/**
 * Sidebar link to the full notifications page. Polls the unread count on
 * mount and on navigation (not realtime — this is a lightweight indicator,
 * not a live feed) so the badge stays reasonably fresh without an open
 * channel per dashboard session.
 *
 * Scoped to the currently active account (same default as the notifications
 * page itself) so the badge count matches what a user sees when they land
 * on the page — a notification belonging to a different account they hold
 * doesn't count toward this badge.
 */
const NotificationBellButton = () => {
    const pathname = usePathname();
    const { activeAccount } = useOrganization();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const supabase = createClient();
        let cancelled = false;

        const fetchUnreadCount = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            let query = supabase
                .schema('api')
                .from('v1_notifications')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('is_read', false);

            if (activeAccount?.id) {
                query = query.eq('data->>account_id', activeAccount.id);
            }

            const { count } = await query;

            if (!cancelled) setUnreadCount(count ?? 0);
        };

        fetchUnreadCount();

        return () => { cancelled = true; };
    }, [pathname, activeAccount?.id]);

    const isActive = pathname === '/dashboard/notifications';

    return (
        <Link
            href="/dashboard/notifications"
            className={`${styles.button} ${isActive ? styles.active : ''}`}
        >
            <span>Notifications</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {unreadCount > 0 && (
                    <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
                <svg 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    style={{ opacity: 0.8 }}
                >
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
            </div>
        </Link>
    );
};

export default NotificationBellButton;
