"use client";

import React from 'react';
import HomeLayout from '@/components/public/HomeLayout';
import LynkXFooter from '@/components/public/LynkXFooter';
import styles from '../for.module.css';
import Link from 'next/link';

export default function AttendeesLandingPage() {
    return (
        <HomeLayout>
            <div className={styles.landingPage}>
                <div className={styles.backgroundGlow} />
                
                <section className={styles.hero}>
                    <div className={styles.badge}>For Attendees</div>
                    <h1 className={styles.title}>Every Event. Every Connection.</h1>
                    <p className={styles.subtitle}>
                        Discover the events you love and the communities that make them special. Security, discovery, and community—all in one place.
                    </p>
                    <div className={styles.ctaBox}>
                        <Link href="/" className={styles.btnPrimary}>Browse Events</Link>
                        <Link href="#why-lynk-x" className={styles.btnSecondary}>Learn More</Link>
                    </div>
                </section>

                <section id="why-lynk-x" className={styles.section}>
                    <h2 className={styles.sectionTitle}>The Future of Event Experiences</h2>
                    <div className={styles.grid}>
                        <div className={styles.card}>
                            <div className={styles.cardIcon}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                            </div>
                            <h3 className={styles.cardTitle}>Find Your Tribe</h3>
                            <p className={styles.cardDesc}>Join dedicated forums for every event. Talk to organizers, meet other attendees, and share photos—before, during, and after the show.</p>
                        </div>
                        <div className={styles.card}>
                            <div className={styles.cardIcon}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                            </div>
                            <h3 className={styles.cardTitle}>Safe & Secure</h3>
                            <p className={styles.cardDesc}>Our cryptographic tickets are unique to you. No more worrying about fake tickets or duplicate entries at the door.</p>
                        </div>
                        <div className={styles.card}>
                            <div className={styles.cardIcon}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>
                            </div>
                            <h3 className={styles.cardTitle}>No App Required</h3>
                            <p className={styles.cardDesc}>Lynk-X works perfectly on any device without installing a bulky app. Fast, reliable, and always in your pocket.</p>
                        </div>
                    </div>
                </section>

                <section className={styles.section}>
                    <div className={styles.split}>
                        <div className={styles.splitContent}>
                            <h2 className={styles.sectionTitle} style={{ textAlign: 'left' }}>Your Personal Event Passport</h2>
                            <div className={styles.valueProp}>
                                <h4 className={styles.valueTitle}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                                    Live Interactions
                                </h4>
                                <p className={styles.cardDesc}>Participate in live polls, Q&As, and community feedback directly from your ticket view.</p>
                            </div>
                            <div className={styles.valueProp}>
                                <h4 className={styles.valueTitle}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                                    Curated Discovery
                                </h4>
                                <p className={styles.cardDesc}>Our discovery engine learns your preferences to show you events you'll actually care about.</p>
                            </div>
                        </div>
                        <div className={styles.splitMedia} />
                    </div>
                </section>

                <section className={styles.hero} style={{ padding: '80px 24px' }}>
                    <h2 className={styles.title} style={{ fontSize: '32px' }}>Don't Just Attend. Participate.</h2>
                    <p className={styles.subtitle}>Join thousands of users discovering the best events in their city.</p>
                    <div className={styles.ctaBox}>
                        <Link href="/" className={styles.btnPrimary}>Start Exploring</Link>
                        <Link href="/auth" className={styles.btnSecondary}>Join Lynk-X</Link>
                    </div>
                </section>

                <LynkXFooter />
            </div>
        </HomeLayout>
    );
}
