"use client";

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import MobileNudge from './MobileNudge';
import BottomTabBar from './BottomTabBar';
import MobileTopBar from './MobileTopBar';
import DesktopHandoff from './DesktopHandoff';
import SupportFAB from './SupportFAB';
import { modeFromPathname } from './sidebarNav';
import styles from '@/app/(protected)/dashboard/layout.module.css';

/**
 * Visual shell for every /dashboard/* page: sidebar on desktop, plus top bar and bottom tabs on small screens.
 *
 * Its own component (rather than inline in layout.tsx) because it has to read the current path: the events and ads
 * workspaces get the mobile shell below 1024 px, while the admin, Pulse and system workspaces keep the blocking
 * "Desktop Only" notice until they are redesigned. The workspace picker at /dashboard is a simple page and works
 * on any width.
 */
const DashboardShell = ({ children }: { children: React.ReactNode }) => {
    const pathname = usePathname();
    const mode = modeFromPathname(pathname);
    const isPicker = pathname === '/dashboard';
    const hasMobileShell = !isPicker && (mode === 'events' || mode === 'ads');

    if (hasMobileShell) {
        return (
            <div className={styles.layout}>
                <Sidebar />
                <div className={styles.column}>
                    <MobileTopBar />
                    <main className={`${styles.mainInColumn} dashboard-scroll`}>
                        <DesktopHandoff />
                        {children}
                    </main>
                </div>
                <BottomTabBar />
                <SupportFAB />
            </div>
        );
    }

    return (
        <div className={styles.layout}>
            <Sidebar />
            {!isPicker && <MobileNudge />}
            <main className={`${styles.main} dashboard-scroll`}>{children}</main>
            <SupportFAB />
        </div>
    );
};

export default DashboardShell;
