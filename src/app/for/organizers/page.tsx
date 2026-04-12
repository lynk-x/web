"use client";

import React from 'react';
import HomeLayout from '@/components/public/HomeLayout';
import LynkXFooter from '@/components/public/LynkXFooter';
import styles from '../for.module.css';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { SlotCounterText } from '@/components/shared/SlotCounterText';

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
                        <Link href="#features" className={styles.btnSecondary}>Explore Features</Link>
                    </motion.div>
                </motion.section>

                <section id="features" className={styles.section}>
                    <motion.h2 
                        className={styles.sectionTitle}
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                    >
                        Built for Scale, Designed for Humans
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
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                            </div>
                            <h3 className={styles.cardTitle}>Direct Settlement</h3>
                            <p className={styles.cardDesc}>Receive your funds directly via MPESA or Bank Transfer. No waiting weeks for your hard-earned revenue.</p>
                        </motion.div>
                        
                        <motion.div className={styles.card} variants={fadeInUp}>
                            <div className={styles.cardIcon}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                            </div>
                            <h3 className={styles.cardTitle}>Private Event Forums</h3>
                            <p className={styles.cardDesc}>Every event includes a dedicated forum. Build hype through networking and live discussions before the first ticket is scanned.</p>
                        </motion.div>
                        
                        <motion.div className={styles.card} variants={fadeInUp}>
                            <div className={styles.cardIcon}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                            </div>
                            <h3 className={styles.cardTitle}>Automated Payouts</h3>
                            <p className={styles.cardDesc}>Streamline your cash flow. Our automated settlement system ensures your event revenue is processed and ready when you need it.</p>
                        </motion.div>
                    </motion.div>
                </section>

                <section className={styles.section}>
                    <motion.div 
                        className={styles.split}
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1 }}
                    >
                        <div className={styles.splitContent}>
                            <h2 className={styles.sectionTitle} style={{ textAlign: 'left' }}>Total Event Mastery</h2>
                            <div className={styles.valueProp}>
                                <h4 className={styles.valueTitle}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                                    Network-Wide Indexing
                                </h4>
                                <p className={styles.cardDesc}>Leverage the Lynk-X ecosystem. Your events are automatically indexed and recommended to active attendees across our entire social network.</p>
                            </div>
                            <div className={styles.valueProp}>
                                <h4 className={styles.valueTitle}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
                                    Direct Payout Routing
                                </h4>
                                <p className={styles.cardDesc}>Get paid instantly. Revenue is routed directly to your platform wallet, where you can withdraw to your local bank accounts or mobile money at any time.</p>
                            </div>
                        </div>
                        <div className={styles.splitMedia} />
                    </motion.div>

                    <motion.div 
                        className={styles.split + ' ' + styles.splitRev}
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1 }}
                    >
                        <div className={styles.splitContent}>
                            <h2 className={styles.sectionTitle} style={{ textAlign: 'left' }}>Control the Conversation</h2>
                            <div className={styles.valueProp}>
                                <h4 className={styles.valueTitle}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                                    Broadcast Notifications
                                </h4>
                                <p className={styles.cardDesc}>Pin important news to the top of your event forums. Our integrated alert system ensures that no critical update goes unseen.</p>
                            </div>
                            <div className={styles.valueProp}>
                                <h4 className={styles.valueTitle}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                                    Live Interaction Feeds
                                </h4>
                                <p className={styles.cardDesc}>From pre-event polls to mid-event reactions, our forums turn passive attendees into active ambassadors for your event’s energy.</p>
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
                    <h2 className={styles.title} style={{ fontSize: '32px' }}>Ready to Scale Your Influence?</h2>
                    <p className={styles.subtitle}>Join hundreds of organizers building the future of event interactions.</p>
                    <div className={styles.ctaBox}>
                        <Link href="/dashboard/organize" className={styles.btnPrimary}>Create Event Now</Link>
                    </div>
                </motion.section>

                <LynkXFooter />
            </div>
        </HomeLayout>
    );
}
