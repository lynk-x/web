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
