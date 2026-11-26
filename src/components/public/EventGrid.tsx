"use client";

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import EventCard from './EventCard';
import styles from './EventGrid.module.css';
import { Event } from "@/types";
import { formatDateInTimezone, formatTimeInTimezone } from '@/utils/format';
import { getEventImage } from '@/utils/eventImage';

interface EventGridProps {
    events: Event[];
    itemsPerPage?: number;
    isLoading?: boolean;
    basePath?: string;
    initialPage?: number;
    useUrlPagination?: boolean;
}

/**
 * Isolated reader for `?page=` wrapped in Suspense so ISR Server Component routes
 * (`/events`, `/events/[category]`) can sync pagination with the URL without opting
 * out of static generation.
 */
function UrlPageSync({
    totalPages,
    onPageChange,
}: {
    totalPages: number;
    onPageChange: (page: number) => void;
}) {
    const searchParams = useSearchParams();
    const rawPage = Number(searchParams.get('page') || '1');

    useEffect(() => {
        const safePage = Number.isFinite(rawPage) && rawPage >= 1
            ? Math.min(Math.floor(rawPage), Math.max(1, totalPages))
            : 1;
        onPageChange(safePage);
    }, [rawPage, totalPages, onPageChange]);

    return null;
}

/**
 * Renders a paginated grid of public event cards. Supports crawlable `<Link>`
 * pagination (`?page=N`) for discovery routes and falls back to client-state
 * pagination when interactive client filters are active.
 */
const EventGrid: React.FC<EventGridProps> = ({
    events,
    itemsPerPage = 8,
    isLoading = false,
    basePath = '/',
    initialPage = 1,
    useUrlPagination = true,
}) => {
    const totalPages = Math.max(1, Math.ceil(events.length / itemsPerPage));
    const clampPage = (page: number) => Math.max(1, Math.min(page, totalPages));

    const [clientPage, setClientPage] = useState(() => clampPage(initialPage));
    const [urlPage, setUrlPage] = useState(() => clampPage(initialPage));

    const currentPage = clampPage(useUrlPagination ? urlPage : clientPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentEvents = events.slice(startIndex, startIndex + itemsPerPage);

    const buildPageHref = (page: number) => {
        const target = clampPage(page);
        return target <= 1 ? basePath : `${basePath}?page=${target}`;
    };

    const goToPage = (page: number) => {
        const target = clampPage(page);
        if (useUrlPagination) {
            setUrlPage(target);
        } else {
            setClientPage(target);
        }
        const gridElement = document.getElementById('event-grid-top');
        if (gridElement) {
            gridElement.scrollIntoView({ behavior: 'smooth' });
        }
    };

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
                <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    border: '3px solid rgba(255,255,255,0.1)',
                    borderTopColor: 'var(--color-brand-primary)',
                    animation: 'spin 0.7s linear infinite',
                }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!events || events.length === 0) return null;

    return (
        <div className={styles.container}>
            {useUrlPagination && (
                <Suspense fallback={null}>
                    <UrlPageSync totalPages={totalPages} onPageChange={setUrlPage} />
                </Suspense>
            )}
            <div id="event-grid-top" />
            <div className={styles.grid}>
                {currentEvents.map((event) => {
                    const start = event.start_datetime;
                    const end = event.end_datetime;
                    const tz = event.timezone;

                    const startDateStr = formatDateInTimezone(start, tz);
                    const startTimeStr = formatTimeInTimezone(start, tz);
                    let rangeStr = `${startDateStr} • ${startTimeStr}`;

                    if (end) {
                        const endDateStr = formatDateInTimezone(end, tz);
                        const endTimeStr = formatTimeInTimezone(end, tz);
                        if (startDateStr === endDateStr) {
                            rangeStr = `${startDateStr} • ${startTimeStr} - ${endTimeStr}`;
                        } else {
                            rangeStr = `${startDateStr} - ${endDateStr}`;
                        }
                    }

                    return (
                        <EventCard
                            key={event.id}
                            id={event.id}
                            reference={event.reference}
                            name={event.title}
                            date={rangeStr}
                            category={event.category || 'General'}
                            isActive={false}
                            price={(event.low_price && event.currency) ? `${event.currency} ${event.low_price}` : 'Free'}
                            image={getEventImage(event)}
                        />
                    );
                })}
            </div>

            {totalPages > 1 && (
                <nav className={styles.pagination} aria-label="Event pagination">
                    {useUrlPagination ? (
                        currentPage > 1 ? (
                            <Link
                                href={buildPageHref(currentPage - 1)}
                                rel="prev"
                                className={styles.pageBtn}
                                onClick={() => goToPage(currentPage - 1)}
                            >
                                &lt; Prev
                            </Link>
                        ) : (
                            <span
                                className={styles.pageBtn}
                                aria-disabled="true"
                                style={{ opacity: 0.5, cursor: 'not-allowed' }}
                            >
                                &lt; Prev
                            </span>
                        )
                    ) : (
                        <button
                            type="button"
                            className={styles.pageBtn}
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            &lt; Prev
                        </button>
                    )}

                    <span className={styles.pageInfo}>
                        Page {currentPage} of {totalPages}
                    </span>

                    {useUrlPagination ? (
                        currentPage < totalPages ? (
                            <Link
                                href={buildPageHref(currentPage + 1)}
                                rel="next"
                                className={styles.pageBtn}
                                onClick={() => goToPage(currentPage + 1)}
                            >
                                Next &gt;
                            </Link>
                        ) : (
                            <span
                                className={styles.pageBtn}
                                aria-disabled="true"
                                style={{ opacity: 0.5, cursor: 'not-allowed' }}
                            >
                                Next &gt;
                            </span>
                        )
                    ) : (
                        <button
                            type="button"
                            className={styles.pageBtn}
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        >
                            Next &gt;
                        </button>
                    )}
                </nav>
            )}
        </div>
    );
};

export default EventGrid;
