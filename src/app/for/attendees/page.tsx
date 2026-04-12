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
        <HomeLayout>
            <div className={styles.landingPage}>
                <div className={styles.backgroundGlow} />
                
                <motion.section 
                    className={styles.hero}
                    initial="initial"
                    animate="animate"
                    variants={staggerContainer}
                >
                    <motion.div className={styles.badge} variants={fadeInUp}>For Attendees</motion.div>
                    <motion.h1 className={styles.title} variants={fadeInUp}>Every Event. Every Connection.</motion.h1>
                    <motion.p className={styles.subtitle} variants={fadeInUp}>
                        Discover the events you love and the communities that make them special. Security, discovery and community—all in one place.
                    </motion.p>
                    <motion.div className={styles.ctaBox} variants={fadeInUp}>
                        <Link href="/" className={styles.btnPrimary}>Browse Events</Link>
                        <Link href="#why-lynk-x" className={styles.btnSecondary}>Learn More</Link>
                    </motion.div>
                </motion.section>

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
                            <h3 className={styles.cardTitle}>Find Your Tribe</h3>
                            <p className={styles.cardDesc}>Join dedicated forums for every event. Talk to organizers, meet other attendees and share photos—before, during and after the show.</p>
                        </motion.div>
                        <motion.div className={styles.card} variants={fadeInUp}>
                            <div className={styles.cardIcon}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                            </div>
                            <h3 className={styles.cardTitle}>Safe & Secure</h3>
                            <p className={styles.cardDesc}>Our cryptographic tickets are unique to you. No more worrying about fake tickets or duplicate entries at the door.</p>
                        </motion.div>
                        <motion.div className={styles.card} variants={fadeInUp}>
                            <div className={styles.cardIcon}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>
                            </div>
                            <h3 className={styles.cardTitle}>No App Required</h3>
                            <p className={styles.cardDesc}>Lynk-X works perfectly on any device without installing a bulky app. Fast, reliable and always in your pocket.</p>
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
                            <h2 className={styles.sectionTitle} style={{ textAlign: 'left' }}>Where Every Event Becomes a Community</h2>
                            <div className={styles.valueProp}>
                                <h4 className={styles.valueTitle}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                                    High-Velocity Live Chat
                                </h4>
                                <p className={styles.cardDesc}>Stay connected with real-time threads. Share the excitement, coordinate meetups, and get instant crowd-sourced answers from fellow attendees.</p>
                            </div>
                            <div className={styles.valueProp}>
                                <h4 className={styles.valueTitle}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                                    Collaborative Event Media
                                </h4>
                                <p className={styles.cardDesc}>Capture the moment together. Browse shared galleries of photos and videos uploaded by the community to see the event from every angle.</p>
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
                            <h2 className={styles.sectionTitle} style={{ textAlign: 'left' }}>Your Identity. Your Assets.</h2>
                            <div className={styles.valueProp}>
                                <h4 className={styles.valueTitle}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                    Custom Event Usernames
                                </h4>
                                <p className={styles.cardDesc}>Build your reputation. Maintain a consistent digital identity with custom usernames that move with you from one event forum to the next.</p>
                            </div>
                            <div className={styles.valueProp}>
                                <h4 className={styles.valueTitle}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
                                    Integrated Digital Wallet
                                    <span className={styles.comingSoon}>Soon</span>
                                </h4>
                                <p className={styles.cardDesc}>A unified home for your ticket refunds, forum rewards, and digital assets. We’re building a seamless way to manage your event finances across the globe.</p>
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
                    <h2 className={styles.title} style={{ fontSize: '32px' }}>Don't Just Attend. Participate.</h2>
                    <p className={styles.subtitle}>Join thousands of users discovering the best events in their city.</p>
                    <div className={styles.ctaBox}>
                        <Link href="/" className={styles.btnPrimary}>Start Exploring</Link>
                        <Link href="/auth" className={styles.btnSecondary}>Join Lynk-X</Link>
                    </div>
                </motion.section>

                <LynkXFooter />
            </div>
        </HomeLayout>
    );
}
