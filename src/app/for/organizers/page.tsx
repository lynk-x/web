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
                
                <motion.section 
                    className={styles.hero}
                    initial="initial"
                    animate="animate"
                    variants={staggerContainer}
                >
                    <motion.div className={styles.badge} variants={fadeInUp}>For Organizers</motion.div>
                    <motion.h1 className={styles.title} variants={fadeInUp}>
                        <SlotCounterText text="Dominate the Event Lifecycle" delay={0.5} />
                    </motion.h1>
                    <motion.p className={styles.subtitle} variants={fadeInUp}>
                        The all-in-one platform designed for organizers who care about meaningful engagement. Secure ticketing, verified payouts and a thriving social ecosystem.
                    </motion.p>
                    <motion.div className={styles.ctaBox} variants={fadeInUp}>
                        <Link href="/dashboard/organize" className={styles.btnPrimary}>Start Hosting Free</Link>
                    </motion.div>
                </motion.section>

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

                <LynkXFooter />
            </div>
        </HomeLayout>
    );
}
