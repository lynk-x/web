"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import NotificationBellButton from './NotificationBellButton';
import OrganizationSwitcher from './OrganizationSwitcher';
import styles from './MobileTopBar.module.css';

/**
 * Top bar for the events and ads workspaces below 1024 px.
 *
 * Carries what the sidebar's footer and banner hold on desktop: the account switcher, the notification bell and
 * the unverified-email reminder. The square logo stands in for the sidebar's combined logo, which is too wide here.
 */
const MobileTopBar = () => {
    const { user } = useAuth();
    const isUnverified = user && !user.email_confirmed_at;

    return (
        <header className={styles.bar}>
            {isUnverified && (
                <div className={styles.verify}>Verify your email to unlock all features</div>
            )}
            <div className={styles.row}>
                <Link href="/" className={styles.logo} aria-label="Lynk-X home">
                    <Image src="/lynk-x_logo.svg" alt="" width={40} height={40} priority />
                </Link>
                <div className={styles.switcher}>
                    <OrganizationSwitcher pos="top" variant="compact" />
                </div>
                <NotificationBellButton variant="icon" />
            </div>
        </header>
    );
};

export default MobileTopBar;
