"use client";

import React from 'react';
import HomeLayout from '@/components/public/HomeLayout';
import LynkXFooter from '@/components/public/LynkXFooter';
import styles from '../for.module.css';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { SlotCounterText } from '@/components/shared/SlotCounterText';
import JourneyFlowMotion from '@/components/public/JourneyFlowMotion';

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

export default function AdvertisersLandingPage() {
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
                    <motion.div className={styles.badge} variants={fadeInUp}>For Advertisers</motion.div>
                    <motion.h1 className={styles.title} variants={fadeInUp}>
                        <SlotCounterText text="Sell to the right crowd." delay={0.5} />
                    </motion.h1>
                    <motion.p className={styles.subtitle} variants={fadeInUp}>
                        No more hoping your ad lands in front of the right person on a feed full of strangers. Lynk-X puts your brand inside the events people already showed up for — a crowd that&apos;s already interested, not a scroll you&apos;re interrupting.
                    </motion.p>
                    <motion.div className={styles.ctaBox} variants={fadeInUp}>
                        <Link href="/dashboard/ads" className={styles.btnPrimary}>Create Campaign</Link>
                    </motion.div>
                </motion.section>

                <section id="how-it-works" className={styles.section}>
                    <motion.h2
                        className={styles.sectionTitle}
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                    >
                        Not Social Media. A Room Full of the Right People.
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
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10h-5.58l3.94-3.94A1 1 0 1 0 18 4.64l-3.94 3.94V3a1 1 0 0 0-2 0v5.58L8.12 4.64a1 1 0 0 0-1.41 1.41l3.94 3.94H5a1 1 0 0 0 0 2h5.58L6.64 15.94a1 1 0 1 0 1.42 1.41l3.94-3.94V19a1 1 0 0 0 2 0v-5.58l3.94 3.94a1 1 0 0 0 1.41-1.41l-3.94-3.94H19a1 1 0 0 0 0-2z" /></svg>
                            </div>
                            <h3 className={styles.cardTitle}>You Know Who You&apos;re Reaching</h3>
                            <p className={styles.cardDesc}>Every person seeing your ad chose to be there — they bought a ticket or joined the forum for that specific event. That&apos;s a world away from a social feed, where your ad is just as likely to land in front of someone with zero interest.</p>
                        </motion.div>
                        <motion.div className={styles.card} variants={fadeInUp}>
                            <div className={styles.cardIcon}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" /></svg>
                            </div>
                            <h3 className={styles.cardTitle}>Your Budget Finds What Works</h3>
                            <p className={styles.cardDesc}>Set your campaign once and Lynk-X keeps shifting your spend toward whatever&apos;s actually converting — no daily babysitting, no guessing which version of your ad is pulling its weight.</p>
                        </motion.div>
                        <motion.div className={styles.card} variants={fadeInUp}>
                            <div className={styles.cardIcon}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-11.7" /><path d="M22 4L12 14.01" /><path d="M22 4l-5 5" /><path d="M17 4h5v5" /></svg>
                            </div>
                            <h3 className={styles.cardTitle}>No More Guessing Which Ad Works</h3>
                            <p className={styles.cardDesc}>Upload a few versions of your ad and we&apos;ll quietly test them against each other, sending more of your budget to whichever one people actually respond to.</p>
                        </motion.div>
                    </motion.div>
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Campaign Lifecycle</h2>
                    <p className={styles.cardDesc} style={{ marginBottom: 24, textAlign: 'center' }}>
                        From launch to measurement — see how Lynk-X streamlines every stage of your ad campaign.
                    </p>
                    <JourneyFlowMotion variant="advertisers" />
                </section>

                <motion.section 
                    className={`${styles.hero} ${styles.closingHero}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                >
                    <h2 className={`${styles.title} ${styles.closingTitle}`}>Stop Guessing Who Sees Your Ad</h2>
                    <p className={styles.subtitle}>Put your brand in front of people who already showed up for something they care about.</p>
                    <div className={styles.ctaBox}>
                        <Link href="/dashboard/ads" className={styles.btnPrimary}>Launch Your First Ad</Link>
                    </div>
                </motion.section>

                <LynkXFooter />
            </div>
        </HomeLayout>
    );
}
