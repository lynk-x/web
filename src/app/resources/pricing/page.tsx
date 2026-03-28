"use client";

import React from 'react';
import styles from './ResourcePage.module.css';

const PricingSection: React.FC<{
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

export default function PricingFeesPage() {
    const feeItems = [
        {
            icon: '🎟️',
            title: 'Paid Event Commission',
            content: 'We take a simple 5% commission on every paid ticket sale. For free events, our platform is free.'
        },
        {
            icon: '💳',
            title: 'Payment Processing',
            content: 'Standard credit card and M-Pesa processing fees apply depending on your payout region.'
        },
        {
            icon: '✅',
            title: 'No Fixed Fees',
            content: 'There are no monthly subscriptions for standard organizers. You only pay when you sell.'
        }
    ];

    const payoutItems = [
        {
            icon: '⏱️',
            title: 'Payout Schedule',
            content: 'Funds are typically released 72 hours after the successful completion of your event.'
        },
        {
            icon: '💸',
            title: 'Direct Transfers',
            content: 'Get paid directly via M-Pesa or bank transfer according to your account configuration.'
        },
        {
            icon: '🛡️',
            title: 'Escrow Protection',
            content: 'Attendee funds are held in secure escrow to ensure trust and transparency for both sides.'
        },
        {
            icon: '📉',
            title: 'Detailed Audits',
            content: 'Access full financial reports, VAT breakdowns, and transaction history in the Organizer hub.'
        }
    ];

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <h1 className={styles.title}>Pricing & Fees</h1>
                <p className={styles.subtitle}>Transparent fees that grow with you. Our goal is to provide a world-class platform with clear financial visibility.</p>
            </header>

            <div className={styles.content}>
                <div id="fees">
                    <PricingSection 
                        title="Platform Fees"
                        description="Understand our commission structure and payment processing costs."
                        items={feeItems}
                    />
                </div>
                
                <div className={styles.divider} />

                <div id="payouts">
                    <PricingSection 
                        title="Payouts & Settlements"
                        description="How and when you receive funds after your event concludes."
                        items={payoutItems}
                    />
                </div>
            </div>
        </div>
    );
}
