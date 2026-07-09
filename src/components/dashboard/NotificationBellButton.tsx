"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import styles from './NotificationBellButton.module.css';

/**
 * Sidebar link to the full notifications page. Polls the unread count on
 * mount and on navigation (not realtime — this is a lightweight indicator,
 * not a live feed) so the badge stays reasonably fresh without an open
 * channel per dashboard session.
 */
const NotificationBellButton = () => {
    const pathname = usePathname();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const supabase = createClient();
        let cancelled = false;

        const fetchUnreadCount = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { count } = await supabase
                .schema('api')
                .from('v1_notifications')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('is_read', false);

            if (!cancelled) setUnreadCount(count ?? 0);
        };

        fetchUnreadCount();

        return () => { cancelled = true; };
    }, [pathname]);

    const isActive = pathname === '/dashboard/notifications';

    return (
        <Link
            href="/dashboard/notifications"
            className={`${styles.button} ${isActive ? styles.active : ''}`}
        >
            <span>Notifications</span>
            {unreadCount > 0 && (
                <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
        </Link>
    );
};

export default NotificationBellButton;
