"use client";

import React from 'react';
import HomeLayout from '@/components/public/HomeLayout';
import LynkXFooter from '@/components/public/LynkXFooter';
import styles from '../for.module.css';
import Link from 'next/link';
import { motion } from 'framer-motion';

const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
};

const staggerContainer = {
    animate: {
        transition: {
            staggerChildren: 0.1
        }
    }
};

export default function AdvertisersLandingPage() {
    return (
        <HomeLayout hideCart={true}>
            <div className={styles.landingPage}>
                <div className={styles.backgroundGlow} />
                
                <motion.section 
                    className={styles.hero}
                    initial="initial"
                    animate="animate"
                    variants={staggerContainer}
                >
                    <motion.div className={styles.badge} variants={fadeInUp}>For Advertisers</motion.div>
                    <motion.h1 className={styles.title} variants={fadeInUp}>Precision Ad Placement. Zero Waste.</motion.h1>
                    <motion.p className={styles.subtitle} variants={fadeInUp}>
                        Reach your niche in the moments that matter. Lynk-X places your brand inside the event forums where your audience is already engaged.
                    </motion.p>
                    <motion.div className={styles.ctaBox} variants={fadeInUp}>
                        <Link href="/dashboard/ads" className={styles.btnPrimary}>Create Campaign</Link>
                        <Link href="#how-it-works" className={styles.btnSecondary}>See How It Works</Link>
                    </motion.div>
                </motion.section>

                <section id="how-it-works" className={styles.section}>
                    <motion.h2 
                        className={styles.sectionTitle}
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                    >
                        Built for High-Performance Brands
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
                            <h3 className={styles.cardTitle}>Hyper-Local Context</h3>
                            <p className={styles.cardDesc}>Target users based on the events they attend and the forums they participate in. Your ads appear exactly where the conversation is happening.</p>
                        </motion.div>
                        <motion.div className={styles.card} variants={fadeInUp}>
                            <div className={styles.cardIcon}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" /></svg>
                            </div>
                            <h3 className={styles.cardTitle}>Self-Optimizing Campaigns</h3>
                            <p className={styles.cardDesc}>Launch once, optimize always. Our platform automatically balances broad exploration and high performance to ensure your budget is always spent where it converts best.</p>
                        </motion.div>
                        <motion.div className={styles.card} variants={fadeInUp}>
                            <div className={styles.cardIcon}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-11.7" /><path d="M22 4L12 14.01" /><path d="M22 4l-5 5" /><path d="M17 4h5v5" /></svg>
                            </div>
                            <h3 className={styles.cardTitle}>Smart Creative Rotation</h3>
                            <p className={styles.cardDesc}>Stop guessing which ad works. Our engine runs continuous A/B testing on your creatives, automatically directing your budget to the highest-performing assets in real-time.</p>
                        </motion.div>
                    </motion.div>
                </section>

                <section className={styles.section}>
                    <motion.div 
                        className={styles.split}
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                    >
                        <div className={styles.splitContent}>
                            <h2 className={styles.sectionTitle} style={{ textAlign: 'left' }}>Scalable Brand Influence</h2>
                            <div className={styles.valueProp}>
                                <h4 className={styles.valueTitle}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 2.1l4 2v14l-4-2-6 3-4-2-4 2V4.1l4-2 6 3 4-2z" /><polyline points="9 5.1 9 21.1" /><polyline points="15 2.1 15 18.1" /></svg>
                                    Multi-Event Synchronization
                                </h4>
                                <p className={styles.cardDesc}>Dominate an entire season. Launch unified campaigns across hundreds of related events and community forums with a single click.</p>
                            </div>
                            <div className={styles.valueProp}>
                                <h4 className={styles.valueTitle}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                                    Global Frequency Capping
                                </h4>
                                <p className={styles.cardDesc}>Maintain your brand’s prestige. Ensure your audience sees your message just enough to convert, never enough to fatigue.</p>
                            </div>
                        </div>
                        <div className={styles.splitMedia} />
                    </motion.div>

                    <motion.div 
                        className={styles.split + ' ' + styles.splitRev}
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                    >
                        <div className={styles.splitContent}>
                            <h2 className={styles.sectionTitle} style={{ textAlign: 'left' }}>Enterprise Campaign Workflow</h2>
                            <div className={styles.valueProp}>
                                <h4 className={styles.valueTitle}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                                    Centralized Creative Hub
                                </h4>
                                <p className={styles.cardDesc}>Manage all your asset variations and campaign creatives from a single, high-speed command center designed for rapid iteration.</p>
                            </div>
                            <div className={styles.valueProp}>
                                <h4 className={styles.valueTitle}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                    Automated Spend Controls
                                </h4>
                                <p className={styles.cardDesc}>No more manual overhead. Sophisticated budget caps and automated billing ensure your campaigns never pause unexpectedly.</p>
                            </div>
                        </div>
                        <div className={styles.splitMedia} />
                    </motion.div>
                </section>

                <motion.section 
                    className={styles.hero} 
                    style={{ padding: '80px 24px' }}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                >
                    <h2 className={styles.title} style={{ fontSize: '32px' }}>Start Driving Real Growth</h2>
                    <p className={styles.subtitle}>Our intelligent delivery engine is ready to find your best customers.</p>
                    <div className={styles.ctaBox}>
                        <Link href="/dashboard/ads" className={styles.btnPrimary}>Launch Your First Ad</Link>
                    </div>
                </motion.section>

                <LynkXFooter />
            </div>
        </HomeLayout>
    );
}
