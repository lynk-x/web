"use client";

import React from 'react';
import styles from './ResourcePage.module.css';

const GuideSection: React.FC<{
    title: string;
    description: string;
    items: { icon: string; title: string; content: string; details: string[] }[];
}> = ({ title, description, items }) => {
    return (
        <div className={styles.categorySection}>
            <div className={styles.sectionHeader}>
                <h2 className={styles.categoryTitle}>{title}</h2>
                <p className={styles.categoryDesc}>{description}</p>
            </div>
            <div className={styles.itemGrid}>
                {items.map((item, idx) => {
                    return (
                        <div 
                            key={idx} 
                            className={styles.safetyCard}
                        >
                            <div className={styles.cardHeader}>
                                <div className={styles.cardIcon}>{item.icon}</div>
                                <div className={styles.cardText}>
                                    <h3 className={styles.cardTitle}>{item.title}</h3>
                                    <p className={styles.cardContent}>{item.content}</p>
                                </div>
                            </div>
                            
                            <div className={styles.cardDetails}>
                                <div className={styles.detailsDivider} />
                                <ul className={styles.detailsList}>
                                    {item.details.map((detail, dIdx) => (
                                        <li key={dIdx} className={styles.detailItem}>
                                            <span className={styles.detailDot} />
                                            {detail}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default function HostingGuidePage() {
    const creationItems = [
        {
            icon: '🏗️',
            title: 'Event Creation',
            content: 'Set up your event page with high-quality media, clear descriptions, and automated ticket tiers.',
            details: [
                'Log in to your Organizer Dashboard.',
                'Select "New Event" from the top menu.',
                'Define ticket types (Early Bird, Standard, VIP).',
                'Set your event status to "Published" once ready.'
            ]
        },
        {
            icon: '🎨',
            title: 'Brand Customization',
            content: 'Personalize your layout, colors, and banners to match your event theme.',
            details: [
                'Upload a high-resolution banner (16:9 recommended).',
                'Choose a custom accent color for your event page.',
                'Link your official social media profiles for better trust.'
            ]
        },
        {
            icon: '📍',
            title: 'Location Mapping',
            content: 'How to use our integrated location picker and geofencing for easy venue discovery.',
            details: [
                'Use the interactive map to pin your exact entrance.',
                'Add "Helpful Notes" like parking instructions.',
                'Enable ticket-based geofencing for exclusive entry access.'
            ]
        },
        {
            icon: '📢',
            title: 'Promotion & Ads',
            content: 'Using Lynk-X Ad Center to put your event in front of the right audience.',
            details: [
                'Purchase ad credits directly via your dashboard wallet.',
                'Select target demographics based on user interests.',
                'Boost your event visibility in the global feed.'
            ]
        }
    ];

    const adItems = [
        {
            icon: '👁️',
            title: 'Ad Campaigns',
            content: 'Create high-impact banners or interstitial ads that appear throughout the Lynk-X network.',
            details: [
                'Choose between Feed Cards, Interstitials, or Banners.',
                'Define your campaign start and end dates.',
                'Preview your ad on mobile and desktop before launching.'
            ]
        },
        {
            icon: '🎯',
            title: 'Precision Targeting',
            content: 'Reach your ideal demographic by targeting specific event categories, regions, or user interests.',
            details: [
                'Target users by geographic regions (e.g. Nairobi, London).',
                'Select interests matching your brand category.',
                'Adjust targeting mid-campaign to optimize performance.'
            ]
        },
        {
            icon: '💹',
            title: 'Performance Tracking',
            content: 'Access real-time impression data, click-through rates (CTR), and conversion analytics.',
            details: [
                'Monitor CTR (Click-Through Rate) in real-time.',
                'View verified visit data to see actual venue traction.',
                'Export detailed PDF reports for and your team.'
            ]
        },
        {
            icon: '💰',
            title: 'Budget Controls',
            content: 'Set daily limits and monitor your ad spend with our fully integrated advertiser wallet.',
            details: [
                'Set a strict daily budget to control spend.',
                'Stop or pause campaigns instantly if needed.',
                'Receive notifications when your wallet balance is low.'
            ]
        }
    ];

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <h1 className={styles.title}>Hosting Guide</h1>
                <p className={styles.subtitle}>Our platform allows you to scale your presence by either hosting immersive events or powerful ad campaigns.</p>
            </header>

            <div className={styles.content}>
                <div id="events">
                    <GuideSection 
                        title="Hosting Events"
                        description="Everything you need to create, launch, and manage ticketed experiences."
                        items={creationItems}
                    />
                </div>
                
                <div className={styles.divider} />

                <div id="ads">
                    <GuideSection 
                        title="Hosting Ads"
                        description="Promote your brand or business by hosting high-conversion ad campaigns."
                        items={adItems}
                    />
                </div>
            </div>
        </div>
    );
}
