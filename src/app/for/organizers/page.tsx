"use client";

import React from 'react';
import HomeLayout from '@/components/public/HomeLayout';
import LynkXFooter from '@/components/public/LynkXFooter';
import styles from '../for.module.css';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { SlotCounterText } from '@/components/shared/SlotCounterText';
import JourneyFlowMotion from '@/components/public/JourneyFlowMotion';
import EcosystemTicker from '@/components/public/EcosystemTicker';
import FaqSection, { FaqItem } from '@/components/public/FaqSection';

const organizerFaqs: FaqItem[] = [
    {
        question: "How do I create an event?",
        answer: "Setting up an event takes just a few clicks. Sign in to your organizer dashboard, enter your event details and venue, create your custom ticket tiers and publish. Your event landing page and private forum are instantly generated and ready for ticket sales.",
    },
    {
        question: "How much does it cost to host?",
        answer: "Creating an account, publishing event pages and setting up ticket tiers is completely free. We charge a simple, transparent fee only when paid tickets are sold. The event forum is never charged for either free or paid events and comes included automatically.",
    },
    {
        question: "How does the forum help my event?",
        answer: "Unlike traditional ticketing platforms where attendee contact ends at checkout, Lynk-X gives you a direct communication channel. You can send push announcements, answer attendee questions, run polls and host audio rooms to build anticipation and engage with them.",
    },
        {
        question: "Why choose Lynk-X over traditional ticketing platforms?",
        answer: "Traditional platforms take high fees and end their relationship with your attendees at checkout. Lynk-X keeps your community connected in a dedicated forum where you build lasting loyalty for future events.",
    },
];

const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
};

const staggerContainer = {
    animate: {
        transition: {
            staggerChildren: 0.15
        }
    }
};

export default function OrganizersLandingPage() {
    return (
        <HomeLayout hideCart={true} hideMenu={true}>
            <div className={styles.landingPage}>
                <div className={styles.backgroundGlow} />
                
                <section className={styles.hero}>
                    <div className={styles.badge}>For Organizers</div>
                    <h1 className={styles.title}>
                        <SlotCounterText text="Dominate the Event Lifecycle" delay={0.5} />
                    </h1>
                    <p className={styles.subtitle}>
                        The all-in-one platform designed for organizers who care about meaningful engagement. Give your event a forum alongside your ticketing.
                    </p>
                    <div className={styles.ctaBox}>
                        <Link href="/dashboard/organize" className={styles.btnPrimary}>Create an Event</Link>
                    </div>
                </section>

                <section id="features" className={styles.section}>
                    <motion.h2 
                        className={styles.sectionTitle}
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                    >
                        Everything Your Event Actually Needs
                    </motion.h2>
                    <motion.div 
                        className={styles.grid}
                        initial="initial"
                        whileInView="animate"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={staggerContainer}
                    >
                        <motion.div className={styles.card} variants={fadeInUp}>
                            <div className={styles.cardIcon}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                                </svg>
                            </div>
                            <h3 className={styles.cardTitle}>Frictionless Setup</h3>
                            <p className={styles.cardDesc}>Launch your event page and ticket tiers in minutes. Zero upfront costs, no complicated payment setups and no developer required.</p>
                        </motion.div>

                        <motion.div className={styles.card} variants={fadeInUp}>
                            <div className={styles.cardIcon}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                </svg>
                            </div>
                            <h3 className={styles.cardTitle}>Private Event Forums</h3>
                            <p className={styles.cardDesc}>Every event includes a dedicated forum. Build hype through networking and live discussions before the first ticket is scanned.</p>
                        </motion.div>

                        {/*
                         * PLANNED REPLACEMENT: "Built-In Sponsor Revenue"
                         * Once the sponsor/ad placement product flow is finalized, replace Card 3 with:
                         * Title: Built-In Sponsor Revenue
                         * Desc: Give sponsors measurable digital exposure inside your event space. Offer interactive partner polls, pinned announcements and verified engagement instead of static logos.
                         * Icon:
                         * <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                         *     <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                         * </svg>
                         */}
                        <motion.div className={styles.card} variants={fadeInUp}>
                            <div className={styles.cardIcon}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
                                </svg>
                            </div>
                            <h3 className={styles.cardTitle}>Fast, Direct Payouts</h3>
                            <p className={styles.cardDesc}>Access your ticket revenue when you need it rather than waiting weeks after the curtains close. Transparent pricing with zero hidden deductions.</p>
                        </motion.div>
                    </motion.div>
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Your Event Lifecycle</h2>
                    <p className={styles.cardDesc} style={{ marginBottom: 24, textAlign: 'center' }}>
                        From creation to post-event insights — see how Lynk-X compares to external ticketing tools.
                    </p>
                    <JourneyFlowMotion variant="organizers" />
                </section>

                <EcosystemTicker variant="organizers" />

                <FaqSection
                    title="Frequently Asked Questions"
                    subtitle="Everything you need to know about publishing events, selling tickets and engaging your crowd."
                    items={organizerFaqs}
                />

                <LynkXFooter />
            </div>
        </HomeLayout>
    );
}
