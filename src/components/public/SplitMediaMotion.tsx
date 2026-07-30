"use client";

import React, { CSSProperties } from 'react';
import styles from './SplitMediaMotion.module.css';

type BarStyle = CSSProperties & { '--bar-min': string; '--bar-max': string };

// Real Lynk-X "X" mark path, reused verbatim from the brand SVG so every
// variant traces the actual logo geometry rather than an approximation.
const X_MARK_PATH = "M404.58 175.82 c-6.03 -1.45 -10.97 -6.55 -12.13 -12.43 -0.71 -3.72 -0.26 -7.44 1.30 -10.71 1.04 -2.23 2.23 -3.76 6.51 -8.30 2.90 -3.05 5.25 -5.69 5.25 -5.92 0 -0.19 -2.19 -2.64 -4.87 -5.47 -5.43 -5.69 -6.70 -7.81 -7.40 -12.17 -0.52 -3.35 0.04 -6.77 1.64 -10.16 3.01 -6.40 10.01 -10.01 17.08 -8.82 4.32 0.74 6.03 1.82 11.79 7.40 l5.21 5.06 5.13 -5.02 c5.39 -5.28 7.25 -6.51 11.16 -7.33 2.68 -0.56 4.72 -0.52 7.33 0.15 3.31 0.86 5.25 1.93 7.44 4.06 4.54 4.46 6.14 11.68 3.94 17.89 -0.97 2.75 -1.97 4.09 -7.07 9.49 -2.49 2.64 -4.50 4.87 -4.50 4.99 0 0.11 2.31 2.64 5.13 5.58 6.77 7.07 8.26 9.93 8.26 15.77 0 10.12 -8.89 17.78 -18.71 16.15 -4.58 -0.78 -6.14 -1.79 -12.24 -7.96 -3.01 -3.01 -5.62 -5.51 -5.84 -5.51 -0.19 0 -2.60 2.31 -5.39 5.13 -2.75 2.79 -5.88 5.62 -6.99 6.29 -3.57 2.16 -7.92 2.83 -12.02 1.82z";

type Variant = 'constellation' | 'flowLines' | 'stackingBars' | 'cardStack' | 'ticketPunch' | 'pulseWave';

interface SplitMediaMotionProps {
    variant?: Variant;
}

function ConstellationVariant() {
    return (
        <div className={styles.system}>
            <div className={styles.ring} style={{ inset: '33%' }} />
            <div className={styles.ring} style={{ inset: '22%' }} />
            <div className={styles.ring} style={{ inset: '11%' }} />
            <div className={styles.ring} style={{ inset: 0 }} />

            <div className={`${styles.orbit} ${styles.o1}`}>
                <div className={styles.dot} />
            </div>
            <div className={`${styles.orbit} ${styles.o2}`}>
                <div className={styles.dot} />
                <div className={`${styles.dot} ${styles.d2}`} />
            </div>
            <div className={`${styles.orbit} ${styles.o3}`}>
                <div className={styles.dot} />
                <div className={`${styles.dot} ${styles.d2}`} />
            </div>
            <div className={`${styles.orbit} ${styles.o4}`}>
                <div className={styles.dot} />
            </div>

            <div className={styles.center}>
                <svg viewBox="386.1 95.6 85.7 86.7" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', overflow: 'visible' }}>
                    <path fill="var(--color-brand-primary)" d={X_MARK_PATH} />
                </svg>
            </div>
        </div>
    );
}

// Curved paths between scattered nodes, each with a short moving dash
// animating along the curve — reads as signal/data flow between points,
// fitting payout-routing or broadcast-themed copy.
const FLOW_PATHS = [
    { d: 'M40,150 C90,60 160,60 210,110', color: 'primary', dur: '3.2s', delay: '0s' },
    { d: 'M40,150 C100,220 170,220 230,160', color: 'secondary', dur: '3.8s', delay: '-1.1s' },
    { d: 'M210,110 C240,150 240,180 210,220', color: 'primary', dur: '2.8s', delay: '-0.6s' },
    { d: 'M230,160 C260,120 260,90 220,60', color: 'secondary', dur: '4.2s', delay: '-2s' },
];

const FLOW_NODES = [
    { cx: 40, cy: 150, r: 4 },
    { cx: 210, cy: 110, r: 3 },
    { cx: 230, cy: 160, r: 3 },
    { cx: 210, cy: 220, r: 3 },
    { cx: 220, cy: 60, r: 3 },
];

function FlowLinesVariant() {
    return (
        <svg className={styles.flowSvg} viewBox="0 0 280 280" xmlns="http://www.w3.org/2000/svg">
            {FLOW_PATHS.map((p, i) => (
                <path
                    key={i}
                    className={`${styles.flowPath} ${p.color === 'primary' ? styles.flowPrimary : styles.flowSecondary}`}
                    d={p.d}
                    style={{ animationDuration: p.dur, animationDelay: p.delay }}
                />
            ))}
            {FLOW_NODES.map((n, i) => (
                <circle key={i} className={styles.flowNode} cx={n.cx} cy={n.cy} r={n.r} />
            ))}
            <g className={styles.flowCenter}>
                <svg x="105" y="100" width="70" height="70" viewBox="386.1 95.6 85.7 86.7">
                    <path fill="var(--color-brand-primary)" d={X_MARK_PATH} />
                </svg>
            </g>
        </svg>
    );
}

// Five bars rising and falling on independent, offset timers — reads as
// activity/growth, fitting analytics or spend-themed copy.
const BAR_CONFIG = [
    { min: 22, max: 58, dur: '2.4s', delay: '0s' },
    { min: 30, max: 82, dur: '3.1s', delay: '-0.6s' },
    { min: 18, max: 70, dur: '2.7s', delay: '-1.4s' },
    { min: 35, max: 92, dur: '3.6s', delay: '-0.3s' },
    { min: 24, max: 64, dur: '2.9s', delay: '-2s' },
];

function StackingBarsVariant() {
    return (
        <div className={styles.bars}>
            {BAR_CONFIG.map((b, i) => (
                <div
                    key={i}
                    className={styles.bar}
                    style={{
                        '--bar-min': `${b.min}%`,
                        '--bar-max': `${b.max}%`,
                        animationDuration: b.dur,
                        animationDelay: b.delay,
                    } as BarStyle}
                />
            ))}
        </div>
    );
}

// Four cards take turns sliding through center on a shared timeline — each
// enters from the right, holds centered, then exits left as the next card
// enters. A real carousel pass, not a depth shuffle. Reads as browsable
// objects (photos, campaigns, events) rather than abstract data, fitting
// media/creative-themed copy.
const CARD_COUNT = 4;
const CARD_CYCLE_S = 8;

function CardStackVariant() {
    return (
        <div className={styles.cardStack}>
            {Array.from({ length: CARD_COUNT }).map((_, i) => (
                <div
                    key={i}
                    className={`${styles.card} ${styles[`cardTint${i}` as keyof typeof styles]}`}
                    style={{ animationDelay: `${i * (CARD_CYCLE_S / CARD_COUNT)}s` }}
                />
            ))}
        </div>
    );
}

// A ticket stub with a real row of perforation notches along its stub
// line — a small bright punch travels along that line, lighting each
// notch as it passes. Domain-specific to ticketing, distinct from the
// abstract network/flow/bar motifs used elsewhere.
const TICKET_NOTCH_COUNT = 9;

function TicketPunchVariant() {
    const notches = Array.from({ length: TICKET_NOTCH_COUNT });
    return (
        <div className={styles.ticketWrap}>
            <svg className={styles.ticketSvg} viewBox="0 0 260 140" xmlns="http://www.w3.org/2000/svg">
                <rect x="6" y="6" width="248" height="128" rx="14" className={styles.ticketBody} />
                <circle cx="176" cy="6" r="10" className={styles.ticketNotchCut} />
                <circle cx="176" cy="134" r="10" className={styles.ticketNotchCut} />
                <line x1="176" y1="20" x2="176" y2="120" className={styles.ticketStubLine} />
                {notches.map((_, i) => {
                    const y = 22 + (i * (98 / (TICKET_NOTCH_COUNT - 1)));
                    return <circle key={i} cx="176" cy={y} r="2.4" className={styles.ticketNotch} />;
                })}
                <circle cx="176" cy="22" r="4.5" className={styles.ticketPunchDot} />
            </svg>
        </div>
    );
}

// Concentric rings expand outward from the center X mark and fade — the
// universal "broadcast/notification going out" visual. Direct fit for
// broadcast/announcement-themed copy.
const PULSE_RING_COUNT = 3;

function PulseWaveVariant() {
    return (
        <div className={styles.pulseWrap}>
            {Array.from({ length: PULSE_RING_COUNT }).map((_, i) => (
                <div
                    key={i}
                    className={styles.pulseRing}
                    style={{ animationDelay: `${i * 1.1}s` }}
                />
            ))}
            <div className={styles.pulseCore}>
                <svg viewBox="386.1 95.6 85.7 86.7" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', overflow: 'visible' }}>
                    <path fill="var(--color-brand-primary)" d={X_MARK_PATH} />
                </svg>
            </div>
        </div>
    );
}

/**
 * Fills the `.splitMedia` slot on the /for/* landing pages with a looping,
 * wordless motion piece instead of a static screenshot — avoids the
 * maintenance burden of product screenshots going stale as the UI evolves.
 *
 * Pure CSS/SVG animation for every variant, no JS animation loop, so
 * there's nothing to desync or leak on unmount.
 */
export default function SplitMediaMotion({ variant = 'constellation' }: SplitMediaMotionProps) {
    return (
        <div className={styles.mediaFrame}>
            <div className={styles.ambient} />
            {variant === 'flowLines' && <FlowLinesVariant />}
            {variant === 'stackingBars' && <StackingBarsVariant />}
            {variant === 'cardStack' && <CardStackVariant />}
            {variant === 'ticketPunch' && <TicketPunchVariant />}
            {variant === 'pulseWave' && <PulseWaveVariant />}
            {variant === 'constellation' && <ConstellationVariant />}
        </div>
    );
}
