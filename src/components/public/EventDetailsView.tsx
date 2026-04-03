"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useCart } from '@/context/CartContext';
import { Event } from '@/types';
import { formatDateTimeInTimezone } from '@/utils/format';
import styles from './EventDetailsView.module.css';
import DisclaimerModal, { Disclaimer } from './DisclaimerModal';

interface EventDetailsViewProps {
    event: Event;
    ticketTiers?: any[];
    /** Active disclaimers loaded from the DB via event_tags → tags → disclaimers */
    disclaimers?: Disclaimer[];
    /** True when every ticket tier has reached its capacity */
    isSoldOut?: boolean;
}

const EventDetailsView: React.FC<EventDetailsViewProps> = ({
    event,
    ticketTiers = [],
    disclaimers = [],
    isSoldOut = false,
}) => {
    const router = useRouter();
    const { addToCart } = useCart();
    const supabase = createClient();

    const [isAboutExpanded, setIsAboutExpanded] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);

    // Waitlist state
    const [waitlistStatus, setWaitlistStatus] = useState<'idle' | 'joining' | 'joined' | 'error'>('idle');
    const [waitlistError, setWaitlistError] = useState('');

    const toggleTicket = (id: string) => {
        setSelectedTicket(prev => (prev === id ? null : id));
        setQuantity(1);
    };

    const handleGetTicketClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (selectedTicket !== null) {
            // If there are real disclaimers from the DB, show the modal.
            // If none are configured, go straight to cart.
            if (disclaimers.length > 0) {
                setIsDisclaimerOpen(true);
            } else {
                handleAcceptDisclaimer();
            }
        }
    };

    const handleAcceptDisclaimer = () => {
        setIsDisclaimerOpen(false);

        const selectedTier = ticketTiers.find(t => t.id === selectedTicket);
        if (selectedTier) {
            addToCart({
                id: `${event.id}-ticket-${selectedTier.id}`,
                eventId: event.id,
                tierId: selectedTier.id,
                eventTitle: event.title,
                ticketType: selectedTier.display_name || selectedTier.name,
                price: selectedTier.price,
                quantity,
                currency: event.currency || 'KES',
                image: event.thumbnail_url
            });
            router.push('/checkout');
        }
    };

    // ── Waitlist join ──────────────────────────────────────────────────────────
    const handleJoinWaitlist = async () => {
        setWaitlistStatus('joining');
        setWaitlistError('');

        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                // Redirect to login with return path
                router.push(`/login?next=/event/${event.id}`);
                return;
            }

            // Insert into event_waitlists.
            // position is auto-derived from existing count + 1 on the DB side via trigger.
            const { error } = await supabase.from('event_waitlists').insert({
                event_id: event.id,
                account_id: (event as any).account_id,
                user_id: user.id,
                // ticket_tier_id: null — joins the general waitlist, not tier-specific
            });

            if (error) {
                if (error.code === '23505') {
                    // Unique constraint: user already on the waitlist
                    setWaitlistStatus('joined');
                    return;
                }
                throw error;
            }

            setWaitlistStatus('joined');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Could not join waitlist. Please try again.';
            setWaitlistError(msg);
            setWaitlistStatus('error');
        }
    };

    // Format the event date/time in the event's canonical timezone
    const dateString = formatDateTimeInTimezone(event.start_datetime, event.timezone, true);

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
                        src="/lynk-x_combined_logo.svg"
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
                        {event.thumbnail_url ? (
                            <img src={event.thumbnail_url} alt={event.title} className={styles.heroImage} />
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
                        <p className={styles.date}>Date: {dateString}</p>

                        <div className={styles.tagGrid}>
                            <span className={styles.tag}>{event.category || 'Event'}</span>
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
                        {!isAboutExpanded && (
                            <p className={styles.readMore}>{event.description?.slice(0, 100)}... Read more</p>
                        )}

                        <h2 className={styles.ticketSectionTitle}>Tickets</h2>

                        {/* ── Sold-out state: show waitlist CTA ── */}
                        {isSoldOut ? (
                            <div style={{ padding: '20px 0' }}>
                                <p style={{ opacity: 0.7, marginBottom: '12px', fontSize: '14px' }}>
                                    All tickets for this event are sold out.
                                </p>
                                {waitlistStatus === 'joined' ? (
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                        padding: '12px 16px', borderRadius: '10px',
                                        background: 'rgba(34,197,94,0.12)', color: 'var(--color-interface-success)',
                                        fontSize: '14px'
                                    }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                            <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        {"You're on the waitlist! We'll notify you if a spot opens."}
                                    </div>
                                ) : (
                                    <>
                                        <button
                                            onClick={handleJoinWaitlist}
                                            disabled={waitlistStatus === 'joining'}
                                            className={styles.getTicketBtn}
                                            style={{ opacity: waitlistStatus === 'joining' ? 0.6 : 1 }}
                                        >
                                            {waitlistStatus === 'joining' ? 'Joining…' : 'Join Waitlist'}
                                        </button>
                                        {waitlistStatus === 'error' && (
                                            <p style={{ color: 'var(--color-interface-error)', fontSize: '13px', marginTop: '8px' }}>
                                                {waitlistError}
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>
                        ) : ticketTiers.length === 0 ? (
                            <p>No tickets currently available for this event.</p>
                        ) : (
                            ticketTiers.map(tier => (
                                <div key={tier.id} className={styles.ticketItem} onClick={() => toggleTicket(tier.id)}>
                                    <div className={`${styles.checkbox} ${selectedTicket === tier.id ? styles.checkboxChecked : ''}`}>
                                        {selectedTicket === tier.id && (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M20 6L9 17L4 12" stroke="var(--color-utility-secondaryText)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        )}
                                    </div>
                                    <div className={styles.ticketDetails}>
                                        <div className={styles.ticketNamePrice}>
                                            {tier.display_name || tier.name} : {event.currency || 'KES'} {tier.price}
                                        </div>
                                        <div className={styles.ticketDescription}>{tier.description || 'General admission'}</div>
                                        {tier.capacity !== null && (
                                            <div style={{ fontSize: '11px', opacity: 0.5, marginTop: '2px' }}>
                                                {Math.max(0, tier.capacity - (tier.tickets_sold ?? 0))} remaining
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* ── Ticket action footer (hidden when sold out) ── */}
                    {!isSoldOut && (
                        <div className={styles.footerActions}>
                            {selectedTicket !== null && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '14px', opacity: 0.7 }}>Qty</span>
                                    <button
                                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                        style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'inherit', cursor: 'pointer', fontSize: '18px' }}
                                    >&minus;</button>
                                    <span style={{ minWidth: '24px', textAlign: 'center' }}>{quantity}</span>
                                    <button
                                        onClick={() => setQuantity(q => q + 1)}
                                        style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'inherit', cursor: 'pointer', fontSize: '18px' }}>+</button>
                                </div>
                            )}
                            <button
                                onClick={handleGetTicketClick}
                                className={`${styles.getTicketBtn} ${selectedTicket === null ? styles.disabled : ''}`}
                            >
                                {selectedTicket !== null
                                    ? `Get ${quantity} ticket${quantity > 1 ? 's' : ''} \u2014 ${event.currency || 'KES'} ${((ticketTiers.find(t => t.id === selectedTicket)?.price || 0) * quantity).toLocaleString()}`
                                    : 'Select a ticket'}
                            </button>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Disclaimer modal — uses real DB data, shown only if disclaimers exist */}
            {disclaimers.length > 0 && (
                <DisclaimerModal
                    isOpen={isDisclaimerOpen}
                    disclaimers={disclaimers}
                    onAccept={handleAcceptDisclaimer}
                    onClose={() => setIsDisclaimerOpen(false)}
                />
            )}
        </motion.div>
    );
};

export default EventDetailsView;
