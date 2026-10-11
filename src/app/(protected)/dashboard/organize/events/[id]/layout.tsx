import EventSubNav from '@/components/features/events/EventSubNav';

/**
 * Shared frame for an event's overview and sub-pages: adds the phone tab strip above whichever page is open.
 */
export default function EventLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <EventSubNav />
            {children}
        </>
    );
}
