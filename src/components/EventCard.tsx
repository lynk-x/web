import React from 'react';
import Link from 'next/link';
import styles from './EventCard.module.css';

interface EventCardProps {
    /** The name of the event. */
    name: string;
    /** The date of the event. */
    date: string;
    /** The category of the event. */
    category: string;
    /** Whether the event card is currently active or selected. */
    isActive?: boolean;
}

/**
 * EventCard component representing a single event in a grid or list.
 * Displays the event's image placeholder, details, and a link to the full details page.
 *
 * @param {EventCardProps} props - Component properties.
 */
const EventCard: React.FC<EventCardProps> = ({ name, date, category, isActive }) => {
    return (
        <div className={`${styles.card} ${isActive ? styles.active : ''}`}>
            <div className={styles.imagePlaceholder}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.placeholderIcon}>
                    <path d="M4 16L8.586 11.414C8.96106 11.0391 9.46967 10.8284 10 10.8284C10.5303 10.8284 11.0389 11.0391 11.414 11.414L16 16M14 14L15.586 12.414C15.9611 12.0391 16.4697 11.8284 17 11.8284C17.5303 11.8284 18.0389 12.0391 18.414 12.414L20 14M14 8H14.01M6 20H18C19.1046 20 20 19.1046 20 18V6C20 4.89543 19.1046 4 18 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
            <div className={styles.info}>
                <div className={styles.textGroup}>
                    <h3 className={styles.name}>Event name : {name}</h3>
                    <p className={styles.date}>Date : {date}</p>
                    <p className={styles.category}>[{category}]</p>
                </div>
                <Link href="/event-details" className={styles.detailsBtn}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 11C12.5523 11 13 10.5523 13 10C13 9.44772 12.5523 9 12 9C11.4477 9 11 9.44772 11 10C11 10.5523 11.4477 11 12 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M12 13V15M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Details
                </Link>
            </div>
        </div>
    );
};

export default EventCard;
