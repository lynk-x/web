"use client";

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import MobileNudge from './MobileNudge';
import BottomTabBar from './BottomTabBar';
import MobileTopBar from './MobileTopBar';
import DesktopHandoff from './DesktopHandoff';
import { usesMobileShell } from './mobileReady';
import SupportFAB from './SupportFAB';
import { modeFromPathname } from './sidebarNav';
import styles from '@/app/(protected)/dashboard/layout.module.css';

/**
 * Visual shell for every /dashboard/* page: sidebar on desktop, plus top bar and bottom tabs on small screens.
 *
 * Its own component (rather than inline in layout.tsx) because it has to read the current path: the events and ads
 * workspaces get the mobile shell below 1024 px when MOBILE_DASHBOARD_ENABLED is on (it is off for now), while
 * every other case keeps the blocking "Desktop Only" notice. The workspace picker at /dashboard is a simple page and works
 * on any width.
 */
const DashboardShell = ({ children }: { children: React.ReactNode }) => {
    const pathname = usePathname();
    const mode = modeFromPathname(pathname);
    const isPicker = pathname === '/dashboard';
    const hasMobileShell = !isPicker && usesMobileShell(mode);

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
