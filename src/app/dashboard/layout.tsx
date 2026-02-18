import Sidebar from '@/components/dashboard/Sidebar';
import MobileNudge from '@/components/dashboard/MobileNudge';
import styles from './layout.module.css';
import { ToastProvider } from '@/components/ui/Toast';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ToastProvider>
            <div className={styles.layout}>
                <Sidebar />
                <MobileNudge />
                <main className={styles.main}>
                    {children}
                </main>
            </div>
        </ToastProvider>
    );
}
