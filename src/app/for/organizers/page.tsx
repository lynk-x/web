"use client";

import React from 'react';
import HomeLayout from '@/components/public/HomeLayout';
import LynkXFooter from '@/components/public/LynkXFooter';
import styles from '../for.module.css';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { SlotCounterText } from '@/components/shared/SlotCounterText';
import SplitMediaMotion from '@/components/public/SplitMediaMotion';

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
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                            </div>
                            <h3 className={styles.cardTitle}>Private Event Forums</h3>
                            <p className={styles.cardDesc}>Every event includes a dedicated forum. Build hype through networking and live discussions before the first ticket is scanned.</p>
                        </motion.div>

                        <motion.div className={styles.card} variants={fadeInUp}>
                            <div className={styles.cardIcon}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                            </div>
                            <h3 className={styles.cardTitle}>You Get Paid, Without Chasing Anyone</h3>
                            <p className={styles.cardDesc}>Most payouts land automatically via MPESA or bank transfer. Larger settlements get a quick review first — a safety check, not a black box.</p>
                        </motion.div>

                        <motion.div className={styles.card} variants={fadeInUp}>
                            <div className={styles.cardIcon}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM20 14v3M17 20h3" /></svg>
                            </div>
                            <h3 className={styles.cardTitle}>Instant Gate Scan</h3>
                            <p className={styles.cardDesc}>QR check-in that works even when the venue WiFi doesn’t. No manual lookups, no queues at the door.</p>
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
                            <h2 className={styles.sectionTitle} style={{ textAlign: 'left' }}>Get Found. Get Started.</h2>
                            <div className={styles.valueProp}>
                                <h4 className={styles.valueTitle}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                                    Findable, Not Just Listed
                                </h4>
                                <p className={styles.cardDesc}>Attendees search by category and tag. Your event shows up for people actually looking, not buried in a generic list.</p>
                            </div>
                            <div className={styles.valueProp}>
                                <h4 className={styles.valueTitle}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 12V8H6a2 2 0 0 1 0-4h12v4" /><path d="M4 6v12a2 2 0 0 0 2 2h14v-4" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></svg>
                                    Free to Start. Setting up is easy.
                                </h4>
                                <p className={styles.cardDesc}>List your first event at no cost and see how it runs before you commit to anything bigger.</p>
                            </div>
                        </div>
                        <div className={styles.splitMedia}>
                            <SplitMediaMotion variant="flowLines" />
                        </div>
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
                        <div className={styles.splitMedia}>
                            <SplitMediaMotion />
                        </div>
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
