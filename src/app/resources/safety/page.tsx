"use client";

import React from 'react';
import styles from './SafetyPage.module.css';

const SafetySection: React.FC<{
    title: string;
    description: string;
    items: { icon: string; title: string; content: string }[];
}> = ({ title, description, items }) => (
    <div className={styles.categorySection}>
        <div className={styles.sectionHeader}>
            <h2 className={styles.categoryTitle}>{title}</h2>
            <p className={styles.categoryDesc}>{description}</p>
        </div>
        <div className={styles.itemGrid}>
            {items.map((item, idx) => (
                <div key={idx} className={styles.safetyCard}>
                    <div className={styles.cardIcon}>{item.icon}</div>
                    <div className={styles.cardText}>
                        <h3 className={styles.cardTitle}>{item.title}</h3>
                        <p className={styles.cardContent}>{item.content}</p>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export default function SafetySecurityPage() {
    const organizerItems = [
        {
            icon: '🛡️',
            title: 'Verified Identity',
            content: 'How to complete your identity verification to earn the "Pulse Verified" badge and build trust.'
        },
        {
            icon: '👮',
            title: 'On-Site Security',
            content: 'Calculating security personnel requirements based on your attendee count and venue type.'
        },
        {
            icon: '🎟️',
            title: 'Digital Validation',
            content: 'Always use our encrypted ticket scanning to prevent fraud and ensure entry for valid ticket holders only.'
        },
        {
            icon: '📋',
            title: 'Incident Reporting',
            content: 'The 15-minute response protocol for documenting and reporting safety incidents through the Organizer hub.'
        }
    ];

    const attendeeItems = [
        {
            icon: '🔒',
            title: 'Safe Ticketing',
            content: 'Why you should never buy Pulse tickets outside of our official platform to avoid scammers.'
        },
        {
            icon: '🗺️',
            title: 'Venue Familiarity',
            content: 'Accessing real-time venue maps with marked emergency exits and first-aid stations via the Pulse app.'
        },
        {
            icon: '🚨',
            title: 'Report a Concern',
            content: 'How to use our 1-click safety reporting if you feel uncomfortable or see something suspicious.'
        },
        {
            icon: '📱',
            title: 'Contact Privacy',
            content: 'How we anonymize your personal data when communicating with organizers through the messaging system.'
        }
    ];

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <h1 className={styles.title}>Safety & Security</h1>
                <p className={styles.subtitle}>Our mission is to ensure every Pulse event is a safe, inclusive, and transparent experience for everyone involved.</p>
            </header>

            <div className={styles.content}>
                <SafetySection 
                    title="For Organizers"
                    description="Protocols and tools to help you host secure events."
                    items={organizerItems}
                />
                
                <div className={styles.divider} />

                <SafetySection 
                    title="For Attendees"
                    description="Your safety is our priority. Here is how we protect your experience."
                    items={attendeeItems}
                />
            </div>
        </div>
    );
}
