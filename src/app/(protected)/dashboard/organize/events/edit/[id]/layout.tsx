import EventSubNav from '@/components/features/events/EventSubNav';

/**
 * Frame for the event edit page: the same phone tab strip as the event's other pages, with Edit lit.
 */
export default function EventEditLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <EventSubNav />
            {children}
        </>
    );
}
