/**
 * Protected layout — shared provider tree for all authenticated routes.
 *
 * Wraps /dashboard/*, /onboarding, and /setup-profile with a single
 * AuthProvider → OrganizationProvider → ToastProvider tree. This ensures
 * auth and account state is preserved when navigating between these routes
 * (e.g. onboarding → dashboard) without unmounting/remounting providers.
 *
 * Route-level protection (redirect to /login when unauthenticated) is
 * handled by the proxy in src/proxy.ts.
 */

import { OrganizationProvider } from '@/context/OrganizationContext';
import { ToastProvider } from '@/components/ui/Toast';

export default function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <OrganizationProvider>
            <ToastProvider>
                {children}
            </ToastProvider>
        </OrganizationProvider>
    );
}
