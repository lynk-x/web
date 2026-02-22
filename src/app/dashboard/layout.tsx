import Sidebar from '@/components/dashboard/Sidebar';
import MobileNudge from '@/components/dashboard/MobileNudge';
import styles from './layout.module.css';
import { ToastProvider } from '@/components/ui/Toast';
import { OrganizationProvider } from '@/context/OrganizationContext';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <OrganizationProvider>
            <ToastProvider>
                <div className={styles.layout}>
                    <Sidebar />
                    <MobileNudge />
                    <main className={styles.main}>
                        {children}
                    </main>
                </div>
            </ToastProvider>
        </OrganizationProvider>
    );
}
