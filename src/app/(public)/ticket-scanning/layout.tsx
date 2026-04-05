import { ToastProvider } from '@/components/ui/Toast';

export default function TicketScanningLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div style={{ width: '100%', height: '100dvh', backgroundColor: '#0f1014', overflow: 'hidden' }}>
            <ToastProvider>
                {children}
            </ToastProvider>
        </div>
    );
}
