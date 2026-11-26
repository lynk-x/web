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

const attendeeFaqs: FaqItem[] = [
    {
        question: "How do I buy tickets?",
        answer: "Buying tickets on Lynk-X takes less than a minute. Simply browse events, choose your preferred ticket and complete checkout. Your ticket will appear in your ticket page inside the event forum.",
    },
    {
        question: "Can I apply a discount code at checkout?",
        answer: "Yes — there's a discount code field on the checkout page before you finalize payment. Simply enter the code and click apply to see the reduced total reflected immediately.",
    },
    {
        question: "What is an event forum and who can join it?",
        answer: "Every event has a dedicated community space for ticket holders and organizers. You can chat with other attendees, check announcements and share photos before, during and after the event.",
    },
    {
        question: "Do I need to download an app from Google Play or Apple App Store?",
        answer: "Not at all. The forum app works directly in your web browser on any phone, tablet or computer. You just open the link, sign in and your tickets and event communities are right there ready to go.",
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

export default function AttendeesLandingPage() {
    return (
        <HomeLayout hideCart={true} hideMenu={true}>
            <div className={styles.landingPage}>
                <div className={styles.backgroundGlow} />
                
                <section className={styles.hero}>
                    <div className={styles.badge}>For Attendees</div>
                    <h1 className={styles.title}>
                        <SlotCounterText text="Every Event. Every Connection." delay={0.5} />
                    </h1>
                    <p className={styles.subtitle}>
                        Discover the events you love and the communities that make them special. From ticket to the connection to the community — all in one place.
                    </p>
                    <div className={styles.ctaBox}>
                        <Link href="/" className={styles.btnPrimary}>Browse Events</Link>
                    </div>
                </section>

                <section id="why-lynk-x" className={styles.section}>
                    <motion.h2 
                        className={styles.sectionTitle}
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                    >
                        The Future of Event Experiences
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
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                            </div>
                            <h3 className={styles.cardTitle}>Join the Conversation</h3>
                            <p className={styles.cardDesc}>Join dedicated forums for every event. Talk to organizers, meet other attendees and share photos—before, during and after the show.</p>
                        </motion.div>
                        <motion.div className={styles.card} variants={fadeInUp}>
                            <div className={styles.cardIcon}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                            </div>
                            <h3 className={styles.cardTitle}>Fraud-Proof Ticketing</h3>
                            <p className={styles.cardDesc}>Each ticket is unique to your identity. No fake screenshots, duplicate entries or unauthorized reselling.</p>
                        </motion.div>
                        <motion.div className={styles.card} variants={fadeInUp}>
                            <div className={styles.cardIcon}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>
                            </div>
                            <h3 className={styles.cardTitle}>No App Store Required</h3>
                            <p className={styles.cardDesc}>Lynk-X works perfectly on any device without app store downloads. Fast, reliable and always in your pocket.</p>
                        </motion.div>
                    </motion.div>
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Your Event Experience</h2>
                    <p className={styles.cardDesc} style={{ marginBottom: 24, textAlign: 'center' }}>
                        From discovery to connection — see how Lynk-X turns a single ticket into an event community.
                    </p>
                    <JourneyFlowMotion variant="attendees" />
                </section>

                <EcosystemTicker variant="attendees" />

                <FaqSection
                    title="Frequently Asked Questions"
                    subtitle="Everything you need to know about discovering events and getting your tickets."
                    items={attendeeFaqs}
                />

                <LynkXFooter />
            </div>
        </HomeLayout>
    );
}
