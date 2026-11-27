"use client";

import HomeLayout from '@/components/public/home/HomeLayout';
import Footer from '@/components/public/shared/Footer';
import styles from '../for.module.css';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { SlotCounterText } from '@/components/shared/SlotCounterText';
import JourneyFlowMotion from '@/components/public/shared/JourneyFlowMotion';
import EcosystemTicker from '@/components/public/shared/EcosystemTicker';
import FaqSection, { FaqItem } from '@/components/public/shared/FaqSection';

const sponsorFaqs: FaqItem[] = [
    {
        question: "How do I create a campaign?",
        answer: "From your advertiser dashboard, set your total campaign budget, define your target event categories and upload your creative assets. Once submitted, your campaign goes live immediately across matching event forums.",
    },
    {
        question: "Can I pause or edit a live campaign?",
        answer: "Yes — pause, edit budget or update creatives at any time from your dashboard. Changes apply within minutes and any unspent budget from a paused campaign stays in your account rather than being lost.",
    },
    {
        question: "What types of ad formats are supported?",
        answer: "You can run sponsored forum posts, interactive partner polls, banner placements and pinned highlights designed to fit the natural flow of community event discussions.",
    },
    {
        question: "Why advertise inside events rather than standard social media feeds?",
        answer: "Social media feeds interrupt people scrolling through unrelated posts. On Lynk-X, your campaigns appear inside curated event forums where attendees are actively participating in a specific topic, community or shared experience.",
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

/**
 * Public landing page explaining value propositions, contextual reach
 * and campaign automation for event sponsors and brand partners.
 */
export default function CommercialLandingPage() {
    return (
        <HomeLayout hideCart={true} hideMenu={true}>
            <div className={styles.landingPage}>
                <section className={styles.hero}>
                    <div className={styles.badge}>For Sponsors &amp; Advertisers</div>
                    <h1 className={styles.title}>
                        <SlotCounterText text="Sell to the right crowd." delay={0.5} />
                    </h1>
                    <p className={styles.subtitle}>
                        No more hoping your message lands in front of the right person on a feed full of strangers. Lynk-X puts your brand inside the events people already showed up for — a crowd that&apos;s already interested, not a scroll you&apos;re interrupting.
                    </p>
                    <div className={styles.ctaBox}>
                        <Link href="/dashboard/ads" className={styles.btnPrimary}>Create Campaign</Link>
                    </div>
                    <div className={styles.readMoreDivider} aria-hidden="true">
                        <span>Read more</span>
                    </div>
                </section>

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
                            <p className={styles.cardDesc}>Every person seeing your brand chose to be there — they joined the forum for that specific event. That&apos;s a world away from a social feed, where your campaign is just as likely to land in front of someone with zero interest.</p>
                        </motion.div>
                        <motion.div className={styles.card} variants={fadeInUp}>
                            <div className={styles.cardIcon}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                            </div>
                            <h3 className={styles.cardTitle}>Verified Attendee Reach</h3>
                            <p className={styles.cardDesc}>Unlike social feeds flooded with bots and accidental scrolls, every impression is delivered to a verified ticket holder or active forum member genuinely invested in the experience.</p>
                        </motion.div>
                        <motion.div className={styles.card} variants={fadeInUp}>
                            <div className={styles.cardIcon}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
                            </div>
                            <h3 className={styles.cardTitle}>Target by Theme, Genre or City</h3>
                            <p className={styles.cardDesc}>Choose the exact event categories or geographic markets where your brand belongs—from tech conferences and esports tournaments to music and food festivals.</p>
                        </motion.div>
                    </motion.div>
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Campaign Lifecycle</h2>
                    <p className={styles.cardDesc} style={{ marginBottom: 24, textAlign: 'center' }}>
                        From launch to measurement — see how Lynk-X streamlines every stage of your campaign.
                    </p>
                    <JourneyFlowMotion variant="commercial" />
                </section>

                <EcosystemTicker variant="commercial" />

                <FaqSection
                    title="Frequently Asked Questions"
                    subtitle="Everything you need to know about sponsoring events and reaching verified attendees."
                    items={sponsorFaqs}
                />

                <Footer />
            </div>
        </HomeLayout>
    );
}
