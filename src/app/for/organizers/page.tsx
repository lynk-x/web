"use client";

import React from 'react';
import HomeLayout from '@/components/public/HomeLayout';
import LynkXFooter from '@/components/public/LynkXFooter';
import styles from '../for.module.css';
import Link from 'next/link';

export default function OrganizersLandingPage() {
    return (
        <HomeLayout hideCart={true}>
            <div className={styles.landingPage}>
                <div className={styles.backgroundGlow} />
                
                <section className={styles.hero}>
                    <div className={styles.badge}>For Organizers</div>
                    <h1 className={styles.title}>Experience Total Event Ownership</h1>
                    <p className={styles.subtitle}>
                        Stop being a guest on your own ticketing platform. Lynk-X gives you 100% control over your data, your revenue, and your community.
                    </p>
                    <div className={styles.ctaBox}>
                        <Link href="/dashboard/organize" className={styles.btnPrimary}>Start Hosting Free</Link>
                        <Link href="#features" className={styles.btnSecondary}>Explore Features</Link>
                    </div>
                </section>

                <section id="features" className={styles.section}>
                    <h2 className={styles.sectionTitle}>Built for Scale, Designed for Humans</h2>
                    <div className={styles.grid}>
                        <div className={styles.card}>
                            <div className={styles.cardIcon}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                            </div>
                            <h3 className={styles.cardTitle}>Direct Settlement</h3>
                            <p className={styles.cardDesc}>Receive your funds directly via MPESA or Bank Transfer. No waiting weeks for your hard-earned revenue.</p>
                        </div>
                        <div className={styles.card}>
                            <div className={styles.cardIcon}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                            </div>
                            <h3 className={styles.cardTitle}>Attendee Data</h3>
                            <p className={styles.cardDesc}>You own the relationship. Access full attendee profiles, contact lists, and custom questionnaire data instantly.</p>
                        </div>
                        <div className={styles.card}>
                            <div className={styles.cardIcon}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-11.7" /><path d="M22 4L12 14.01" /><path d="M22 4l-5 5" /><path d="M17 4h5v5" /></svg>
                            </div>
                            <h3 className={styles.cardTitle}>Thompson Sampling Ads</h3>
                            <p className={styles.cardDesc}>Our Bayesian ad engine automatically finds the best performing creative for your event, maximizing your reach.</p>
                        </div>
                    </div>
                </section>

                <section className={styles.section}>
                    <div className={styles.split}>
                        <div className={styles.splitContent}>
                            <h2 className={styles.sectionTitle} style={{ textAlign: 'left' }}>Control the Conversation</h2>
                            <div className={styles.valueProp}>
                                <h4 className={styles.valueTitle}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                                    Integrated Event Forums
                                </h4>
                                <p className={styles.cardDesc}>Every event gets a dedicated forum. Build hype before the show and keep the community alive long after the lights go down.</p>
                            </div>
                            <div className={styles.valueProp}>
                                <h4 className={styles.valueTitle}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                                    Anti-Fraud Protection
                                </h4>
                                <p className={styles.cardDesc}>Our cryptographic ticketing system ensures that one ticket equals one person. Say goodbye to scalpers and fake entries.</p>
                            </div>
                        </div>
                        <div className={styles.splitMedia} />
                    </div>

                    <div className={styles.split + ' ' + styles.splitRev}>
                        <div className={styles.splitContent}>
                            <h2 className={styles.sectionTitle} style={{ textAlign: 'left' }}>Sponsorship Subsidies</h2>
                            <p className={styles.subtitle} style={{ marginLeft: 0 }}>
                                Invite sponsors to your event and earn up to 80% of their ad spend. We handle the placement; you keep the revenue.
                            </p>
                            <Link href="/for/advertisers" className={styles.btnSecondary} style={{ fontSize: '14px' }}>Learn About Sponsorships</Link>
                        </div>
                        <div className={styles.splitMedia} />
                    </div>
                </section>

                <section className={styles.hero} style={{ padding: '80px 24px' }}>
                    <h2 className={styles.title} style={{ fontSize: '32px' }}>Ready to Scale Your Influence?</h2>
                    <p className={styles.subtitle}>Join hundreds of organizers building the future of event interactions.</p>
                    <div className={styles.ctaBox}>
                        <Link href="/dashboard/organize" className={styles.btnPrimary}>Create Event Now</Link>
                    </div>
                </section>

                <LynkXFooter />
            </div>
        </HomeLayout>
    );
}
