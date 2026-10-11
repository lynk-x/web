/**
 * Dashboard layout — wraps all /dashboard/* pages in the shell (sidebar, mobile top bar and bottom tabs).
 *
 * Auth and organization providers are supplied by the parent (protected) layout,
 * so this file only mounts the shell, which picks the right chrome for the current path.
 */

import DashboardShell from '@/components/dashboard/DashboardShell';
import InactivityGuard from '@/components/dashboard/InactivityGuard';
import '@/theme/dashboard.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Workspaces',
};

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <InactivityGuard>
            <DashboardShell>{children}</DashboardShell>
        </InactivityGuard>
    );
}
