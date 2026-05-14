/**
 * Dashboard shell layout — provides the sidebar chrome for all /dashboard/* pages.
 *
 * Auth and organization providers are supplied by the parent (protected) layout,
 * so this file only handles the visual shell (sidebar + main content area).
 */

import Sidebar from '@/components/dashboard/Sidebar';
import MobileNudge from '@/components/dashboard/MobileNudge';
import InactivityGuard from '@/components/dashboard/InactivityGuard';
import '@/theme/dashboard.css';
import styles from './layout.module.css';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <InactivityGuard>
            <div className={styles.layout}>
                <Sidebar />
                <MobileNudge />
                <main className={`${styles.main} dashboard-scroll`}>
                    {children}
                </main>
            </div>
        </InactivityGuard>
    );
}
