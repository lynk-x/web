"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Event } from '@/types';
import styles from './EventDetailsView.module.css';

interface EventDetailsViewProps {
    event: Event;
}

const EventDetailsView: React.FC<EventDetailsViewProps> = ({ event }) => {
    const [isAboutExpanded, setIsAboutExpanded] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<number | null>(0);

    const toggleTicket = (index: number) => {
        if (selectedTicket === index) {
            setSelectedTicket(null);
        } else {
            setSelectedTicket(index);
        }
    };

    // Format Date Range
    const startDate = new Date(event.start_time);
    const dateString = startDate.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const handleShare = async () => {
        if (typeof navigator !== 'undefined') {
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: event.title,
                        text: `Check out ${event.title} on Lynk-X!`,
                        url: window.location.href,
                    });
                } catch (error) {
                    console.log('Error sharing:', error);
                }
            } else {
                navigator.clipboard.writeText(window.location.href);
                alert('Link copied to clipboard!');
            }
        }
    };

    return (
        <motion.div
            className={styles.container}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
        >
            <header className={styles.header}>
                <Link href="/" className={styles.backBtn}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </Link>
                <div className={styles.logoWrapper}>
                    <Image
                        src="/images/lynk-x_text.png"
                        alt="Lynk-X"
                        width={200}
                        height={60}
                        style={{ objectFit: 'cover' }}
                        priority
                    />
                </div>
                <button className={styles.shareBtn} onClick={handleShare}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8.59 13.51L15.42 17.49M15.41 6.51L8.59 10.49M21 5C21 6.65685 19.6569 8 18 8C16.3431 8 15 6.65685 15 5C15 3.34315 16.3431 2 18 2C19.6569 2 21 3.34315 21 5ZM9 12C9 13.6569 7.65685 15 6 15C4.34315 15 3 13.6569 3 12C3 10.3431 4.34315 9 6 9C7.65685 9 9 10.3431 9 12ZM21 19C21 20.6569 19.6569 22 18 22C16.3431 22 15 20.6569 15 19C15 17.3431 16.3431 16 18 16C19.6569 16 21 17.3431 21 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </header>

            <div className={styles.layoutGrid}>
                <motion.div
                    className={styles.heroColumn}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                >
                    <div className={styles.hero}>
                        {event.cover_image_url ? (
                            <img src={event.cover_image_url} alt={event.title} className={styles.heroImage} />
                        ) : (
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.heroIcon}>
                                <path d="M4 16L8.586 11.414C8.96106 11.0391 9.46967 10.8284 10 10.8284C10.5303 10.8284 11.0389 11.0391 11.414 11.414L16 16M14 14L15.586 12.414C15.9611 12.0391 16.4697 11.8284 17 11.8284C17.5303 11.8284 18.0389 12.0391 18.414 12.414L20 14M14 8H14.01M6 20H18C19.1046 20 20 19.1046 20 18V6C20 4.89543 19.1046 4 18 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        )}
                    </div>
                </motion.div>

                <motion.div
                    className={styles.detailsColumn}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                >
                    <div className={styles.detailsContent}>
                        <h1 className={styles.title}>{event.title}</h1>
                        <p className={styles.location}>Location: {event.location_name || 'TBD'}</p>
                        <p className={styles.date}>Date : {dateString}</p>

                        <div className={styles.tagGrid}>
                            <span className={styles.tag}>{event.category || 'Event'}</span>
                            {/* <span className={styles.tag}>Innovation</span> */}
                        </div>

                        <div className={styles.sectionHeader} onClick={() => setIsAboutExpanded(!isAboutExpanded)}>
                            <h2 className={styles.sectionTitle}>About the event</h2>
                            <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                className={isAboutExpanded ? styles.rotate180 : ''}
                                style={{ transition: 'transform 0.2s' }}
                            >
                                <path d="M6 9L12 15L18 9" stroke="var(--color-brand-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        {isAboutExpanded && (
                            <p className={styles.readMore}>
                                {event.description || 'No description available for this event.'}
                            </p>
                        )}
                        {!isAboutExpanded && <p className={styles.readMore}>{event.description?.slice(0, 100)}... Read more</p>}

                        <h2 className={styles.ticketSectionTitle}>Tickets</h2>

                        <div className={styles.ticketItem} onClick={() => toggleTicket(0)}>
                            <div className={`${styles.checkbox} ${selectedTicket === 0 ? styles.checkboxChecked : ''}`}>
                                {selectedTicket === 0 && (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M20 6L9 17L4 12" stroke="var(--color-utility-secondaryText)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                            </div>
                            <div className={styles.ticketDetails}>
                                <div className={styles.ticketNamePrice}>Standard Ticket : {event.currency} {event.low_price}</div>
                                <div className={styles.ticketDescription}>General admission to the event.</div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.footerActions}>
                        <Link
                            href={selectedTicket !== null ? `/checkout?eventId=${event.id}&ticketIndex=${selectedTicket}` : '#'}
                            className={`${styles.getTicketBtn} ${selectedTicket === null ? styles.disabled : ''}`}
                        >
                            Get ticket {selectedTicket !== null && `(KES ${selectedTicket === 0 ? (event.low_price || 0) : /* Logic for other tickets would go here */ (event.low_price || 0) * 2})`}
                        </Link>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default EventDetailsView;
