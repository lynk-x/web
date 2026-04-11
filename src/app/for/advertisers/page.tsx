"use client";

import React from 'react';
import HomeLayout from '@/components/public/HomeLayout';
import LynkXFooter from '@/components/public/LynkXFooter';
import styles from '../for.module.css';
import Link from 'next/link';

export default function AdvertisersLandingPage() {
    return (
        <HomeLayout hideCart={true}>
            <div className={styles.landingPage}>
                <div className={styles.backgroundGlow} />
                
                <section className={styles.hero}>
                    <div className={styles.badge}>For Advertisers</div>
                    <h1 className={styles.title}>Precision Ad Placement. Zero Waste.</h1>
                    <p className={styles.subtitle}>
                        Reach your niche in the moments that matter. Lynk-X places your brand inside the event forums where your audience is already engaged.
                    </p>
                    <div className={styles.ctaBox}>
                        <Link href="/dashboard/ads" className={styles.btnPrimary}>Create Campaign</Link>
                        <Link href="#how-it-works" className={styles.btnSecondary}>See How It Works</Link>
                    </div>
                </section>

                <section id="how-it-works" className={styles.section}>
                    <h2 className={styles.sectionTitle}>Built for High-Performance Brands</h2>
                    <div className={styles.grid}>
                        <div className={styles.card}>
                            <div className={styles.cardIcon}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" /></svg>
                            </div>
                            <h3 className={styles.cardTitle}>Bayesian Optimization</h3>
                            <p className={styles.cardDesc}>Our Thompson Sampling engine runs real-time A/B testing on your creatives, automatically shifting budget to the highest-converting assets.</p>
                        </div>
                        <div className={styles.card}>
                            <div className={styles.cardIcon}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10h-5.58l3.94-3.94A1 1 0 1 0 18 4.64l-3.94 3.94V3a1 1 0 0 0-2 0v5.58L8.12 4.64a1 1 0 0 0-1.41 1.41l3.94 3.94H5a1 1 0 0 0 0 2h5.58L6.64 15.94a1 1 0 1 0 1.42 1.41l3.94-3.94V19a1 1 0 0 0 2 0v-5.58l3.94 3.94a1 1 0 0 0 1.41-1.41l-3.94-3.94H19a1 1 0 0 0 0-2z" /></svg>
                            </div>
                            <h3 className={styles.cardTitle}>Hyper-Local Context</h3>
                            <p className={styles.cardDesc}>Target users based on the events they attend and the forums they participate in. Your ads appear exactly where the conversation is happening.</p>
                        </div>
                        <div className={styles.card}>
                            <div className={styles.cardIcon}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                            </div>
                            <h3 className={styles.cardTitle}>Transparent Attribution</h3>
                            <p className={styles.cardDesc}>No hidden metrics. Track conversion rate, click-through rate, and actual ad spend in real-time on your dashboard.</p>
                        </div>
                    </div>
                </section>

                <section className={styles.section}>
                    <div className={styles.split}>
                        <div className={styles.splitContent}>
                            <h2 className={styles.sectionTitle} style={{ textAlign: 'left' }}>Unlock Exclusive Sponsorships</h2>
                            <div className={styles.valueProp}>
                                <h4 className={styles.valueTitle}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                                    Premium Inventory
                                </h4>
                                <p className={styles.cardDesc}>Get guaranteed placement in high-growth events. Outbid the rest by securing direct sponsorship deals with organizers.</p>
                            </div>
                            <div className={styles.valueProp}>
                                <h4 className={styles.valueTitle}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
                                    Interactive Formats
                                </h4>
                                <p className={styles.cardDesc}>Choose from high-impact interstitial banners or full-screen video ads that command attention.</p>
                            </div>
                        </div>
                        <div className={styles.splitMedia} />
                    </div>
                </section>

                <section className={styles.hero} style={{ padding: '80px 24px' }}>
                    <h2 className={styles.title} style={{ fontSize: '32px' }}>Start Driving Real Growth</h2>
                    <p className={styles.subtitle}>Our Bayesian algorithms are waiting to find your best customers.</p>
                    <div className={styles.ctaBox}>
                        <Link href="/dashboard/ads" className={styles.btnPrimary}>Launch Your First Ad</Link>
                    </div>
                </section>

                <LynkXFooter />
            </div>
        </HomeLayout>
    );
}
