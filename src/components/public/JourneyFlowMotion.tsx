"use client";

import React, { useState } from 'react';
import { motion, useInView } from 'framer-motion';
import styles from './JourneyFlowMotion.module.css';

type ForVariant = 'organizers' | 'attendees' | 'advertisers';

type Step = {
    label: string;
    desc: string;
    icon: React.ReactNode;
};

type JourneyFlowMotionProps = {
    variant?: ForVariant;
};

const STEPS: Record<ForVariant, { lynkx: Step[]; external: Step[] }> = {
    organizers: {
        lynkx: [
            {
                label: 'Create Event',
                desc: 'Set up your event in minutes with tickets, tiers and forum access.',
                icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                ),
            },
            {
                label: 'Sell Tickets',
                desc: 'Flexible payment with instant reservation holds while people pay.',
                icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                    </svg>
                ),
            },
            {
                label: 'Forum Joins Automatically',
                desc: 'Every buyer lands in the event forum instantly — no invites, no CSV, no gap.',
                icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                ),
            },
            {
                label: 'Check-In & Insights',
                desc: 'Effortless entry. Post-event clarity on attendance, sales and engagement.',
                icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                ),
            },
        ],
        external: [
            {
                label: 'Create Event',
                desc: 'Set up your event in minutes with tickets, tiers and forum access.',
                icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                ),
            },
            {
                label: 'Sell Tickets Elsewhere',
                desc: 'Keep your existing checkout, payment provider or agency.',
                icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 6v6l4 2" />
                    </svg>
                ),
            },
            {
                label: 'Send Invites',
                desc: 'Upload a CSV or invite attendees one by one into the event forum.',
                icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                    </svg>
                ),
            },
            {
                label: 'Check-In & Insights',
                desc: 'Effortless entry. Post-event clarity on attendance and forum engagement.',
                icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                ),
            },
        ],
    },
    attendees: {
        lynkx: [
            {
                label: 'Discover',
                desc: 'Browse events by category, tag or location. No account required to explore.',
                icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <path d="M21 21l-4.35-4.35" />
                    </svg>
                ),
            },
            {
                label: 'Book Ticket',
                desc: 'Reserve your spot and get instant confirmation.',
                icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                    </svg>
                ),
            },
            {
                label: 'Connect',
                desc: 'Jump into the event forum for live chat, polls and shared media.',
                icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                ),
            },
            {
                label: 'Attend',
                desc: 'Show your QR ticket at the door. No app install, no printing.',
                icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                    </svg>
                ),
            },
        ],
        external: [],
    },
    advertisers: {
        lynkx: [
            {
                label: 'Create Campaign',
                desc: 'Upload creatives, set headline and budget in one place.',
                icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                ),
            },
            {
                label: 'Target Audience',
                desc: 'Pick an event, category, city or audience type.',
                icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 2.1l4 2v14l-4-2-6 3-4-2-4 2V4.1l4-2 6 3 4-2z" />
                        <polyline points="9 5.1 9 21.1" />
                        <polyline points="15 2.1 15 18.1" />
                    </svg>
                ),
            },
            {
                label: 'Auto-Optimize',
                desc: 'We automatically shift spend toward the best-performing variant so your budget improves over time.',
                icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                ),
            },
            {
                label: 'Measure ROI',
                desc: 'Impressions, clicks, CTR and cost per outcome in one dashboard.',
                icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                ),
            },
        ],
        external: [],
    },
};

function OrganizerComparison({ steps }: { steps: { lynkx: Step[]; external: Step[] } }) {
    const [mode, setMode] = useState<'lynkx' | 'external'>('lynkx');
    const active = steps[mode];

    return (
        <div className={styles.comparisonWrap}>
            <div className={styles.comparisonTabs}>
                <button
                    type="button"
                    className={`${styles.comparisonTab} ${mode === 'lynkx' ? styles.comparisonTabActive : ''}`}
                    onClick={() => setMode('lynkx')}
                >
                    Lynk-X Ticketing
                </button>
                <button
                    type="button"
                    className={`${styles.comparisonTab} ${mode === 'external' ? styles.comparisonTabActive : ''}`}
                    onClick={() => setMode('external')}
                >
                    External Ticketing
                </button>
            </div>

            <motion.div
                className={styles.comparisonTrack}
                key={mode}
                initial={{ opacity: 0, x: mode === 'lynkx' ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
                {active.map((step, i) => (
                    <motion.div
                        key={`${mode}-${i}`}
                        className={styles.journeyStep}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <div className={styles.stepNode}>
                            <div className={styles.stepIcon}>{step.icon}</div>
                            <div className={styles.stepConnector} />
                        </div>
                        <div className={styles.stepBody}>
                            <h4 className={styles.stepLabel}>{step.label}</h4>
                            <p className={styles.stepDesc}>{step.desc}</p>
                        </div>
                    </motion.div>
                ))}
            </motion.div>
        </div>
    );
}

export default function JourneyFlowMotion({ variant = 'organizers' }: JourneyFlowMotionProps) {
    const ref = React.useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, margin: '-80px' });

    if (variant === 'organizers') {
        return (
            <div ref={ref} className={styles.journeyRoot}>
                <OrganizerComparison steps={STEPS.organizers} />
            </div>
        );
    }

    const steps = STEPS[variant]?.lynkx || [];
    if (!steps.length) return null;

    return (
        <div ref={ref} className={styles.journeyRoot}>
            {steps.map((step, i) => (
                <motion.div
                    key={step.label}
                    className={styles.journeyStep}
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: i * 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                >
                    <div className={styles.stepNode}>
                        <div className={styles.stepIcon}>{step.icon}</div>
                        {i < steps.length - 1 && <div className={styles.stepConnector} />}
                    </div>
                    <div className={styles.stepBody}>
                        <h4 className={styles.stepLabel}>{step.label}</h4>
                        <p className={styles.stepDesc}>{step.desc}</p>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
