import { AuthProvider } from '@/context/AuthContext';
import { OrganizationProvider } from '@/context/OrganizationContext';
import { ToastProvider } from '@/components/ui/Toast';

export default function OnboardingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthProvider>
            <OrganizationProvider>
                <ToastProvider>
                    {children}
                </ToastProvider>
            </OrganizationProvider>
        </AuthProvider>
    );
}
