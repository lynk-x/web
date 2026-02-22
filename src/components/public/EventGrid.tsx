"use client";

import React, { useState } from 'react';
import EventCard from './EventCard';
import styles from './EventGrid.module.css';
import { Event } from "@/types";

interface EventGridProps {
    events: Event[];
    itemsPerPage?: number;
}

const EventGrid: React.FC<EventGridProps> = ({ events, itemsPerPage = 8 }) => {
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = Math.ceil(events.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentEvents = events.slice(startIndex, startIndex + itemsPerPage);

    const goToPage = (page: number) => {
        setCurrentPage(page);
        // Scroll to top of grid
        const gridElement = document.getElementById('event-grid-top');
        if (gridElement) {
            gridElement.scrollIntoView({ behavior: 'smooth' });
        }
    };

    if (!events || events.length === 0) {
        return (
            <p style={{ textAlign: 'center', marginTop: '40px', color: '#666' }}>
                <small>No events found.</small>
            </p>
        );
    }

    return (
        <div className={styles.container}>
            <div id="event-grid-top" />
            <div className={styles.grid}>
                {currentEvents.map((event) => (
                    <EventCard
                        key={event.id}
                        id={event.id}
                        name={event.title}
                        date={new Date(event.start_datetime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        category={event.category || 'General'}
                        isActive={false}
                        price={(event.low_price && event.currency) ? `${event.currency} ${event.low_price}` : 'Free'}
                        image={event.thumbnail_url}
                    />
                ))}
            </div>

            {totalPages > 1 && (
                <div className={styles.pagination}>
                    <button
                        className={styles.pageBtn}
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                    >
                        &lt; Prev
                    </button>

                    <span className={styles.pageInfo}>
                        Page {currentPage} of {totalPages}
                    </span>

                    <button
                        className={styles.pageBtn}
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                    >
                        Next &gt;
                    </button>
                </div>
            )}
        </div>
    );
};

export default EventGrid;
