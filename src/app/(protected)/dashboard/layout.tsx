/**
 * Dashboard shell layout — provides the sidebar chrome for all /dashboard/* pages.
 *
 * Auth and organization providers are supplied by the parent (protected) layout,
 * so this file only handles the visual shell (sidebar + main content area).
 */

import Sidebar from '@/components/dashboard/Sidebar';
import MobileNudge from '@/components/dashboard/MobileNudge';
import styles from './layout.module.css';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className={styles.layout}>
            <Sidebar />
            <MobileNudge />
            <main className={styles.main}>
                {children}
            </main>
        </div>
    );
}
