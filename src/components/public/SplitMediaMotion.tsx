"use client";

import React, { useEffect, useRef } from 'react';
import styles from './SplitMediaMotion.module.css';

type Variant = 'constellation' | 'lineDraw';

interface SplitMediaMotionProps {
    variant: Variant;
}

// Real Lynk-X "X" mark path, reused verbatim from the brand SVG so every
// motion variant traces the actual logo geometry rather than an approximation.
const X_MARK_PATH = "M404.58 175.82 c-6.03 -1.45 -10.97 -6.55 -12.13 -12.43 -0.71 -3.72 -0.26 -7.44 1.30 -10.71 1.04 -2.23 2.23 -3.76 6.51 -8.30 2.90 -3.05 5.25 -5.69 5.25 -5.92 0 -0.19 -2.19 -2.64 -4.87 -5.47 -5.43 -5.69 -6.70 -7.81 -7.40 -12.17 -0.52 -3.35 0.04 -6.77 1.64 -10.16 3.01 -6.40 10.01 -10.01 17.08 -8.82 4.32 0.74 6.03 1.82 11.79 7.40 l5.21 5.06 5.13 -5.02 c5.39 -5.28 7.25 -6.51 11.16 -7.33 2.68 -0.56 4.72 -0.52 7.33 0.15 3.31 0.86 5.25 1.93 7.44 4.06 4.54 4.46 6.14 11.68 3.94 17.89 -0.97 2.75 -1.97 4.09 -7.07 9.49 -2.49 2.64 -4.50 4.87 -4.50 4.99 0 0.11 2.31 2.64 5.13 5.58 6.77 7.07 8.26 9.93 8.26 15.77 0 10.12 -8.89 17.78 -18.71 16.15 -4.58 -0.78 -6.14 -1.79 -12.24 -7.96 -3.01 -3.01 -5.62 -5.51 -5.84 -5.51 -0.19 0 -2.60 2.31 -5.39 5.13 -2.75 2.79 -5.88 5.62 -6.99 6.29 -3.57 2.16 -7.92 2.83 -12.02 1.82z";

const WORD_PATHS = [
    "M125 190.59 c0.04 -1.90 1.15 -8.44 1.64 -9.34 0.71 -1.34 2.38 -2.90 3.76 -3.50 0.82 -0.33 5.06 -0.52 16.63 -0.67 l15.55 -0.19 0.93 -0.97 c0.93 -0.93 1.64 -2.94 1.67 -4.69 l0 -0.86 -15.89 0 c-9.86 0 -16.44 -0.15 -17.30 -0.37 -1.97 -0.56 -3.35 -2.49 -3.53 -4.95 -0.11 -1.19 0.86 -9.11 2.46 -20.16 3.53 -24.81 3.35 -22.58 1.93 -24.55 -0.67 -0.93 -1.08 -1.67 -0.89 -1.71 0.15 0 3.24 0 6.77 0.04 7.14 0.07 8.15 0.30 9.15 2.23 0.82 1.60 0.71 3.42 -0.93 14.40 -2.57 17.56 -2.90 20.01 -2.72 20.31 0.07 0.15 4.99 0.26 10.86 0.26 9.67 0 10.83 -0.07 11.53 -0.63 0.71 -0.60 1.04 -2.49 3.20 -17.60 1.34 -9.30 2.53 -17.37 2.64 -17.97 l0.22 -1 5.32 0 c5.21 0 5.36 0.04 6.47 0.97 1.93 1.64 2.05 2.94 0.97 10.86 -2.94 21.32 -7.70 54.06 -8.07 55.47 -0.52 1.97 -1.79 3.57 -3.68 4.50 -1.38 0.71 -2.34 0.74 -25.07 0.74 -22.25 0 -23.62 -0.04 -23.62 -0.63z",
    "M93.38 169.94 c0.04 -0.26 0.67 -0.93 1.49 -1.49 0.78 -0.56 1.71 -1.38 2.01 -1.86 0.33 -0.52 1 -4.09 1.64 -8.85 0.63 -4.39 2.64 -18.64 4.54 -31.62 3.68 -25.60 3.79 -26.15 6.29 -27.79 1.15 -0.78 1.67 -0.86 6.81 -0.86 l5.54 0 -0.22 1.23 c-0.22 1.30 -3.31 22.62 -7.11 49 -2.68 18.82 -2.83 19.42 -5.65 21.39 l-1.64 1.12 -6.85 0.11 c-5.51 0.11 -6.85 0.04 -6.85 -0.37z",
    "M192.71 170.09 c0 -0.19 0.67 -0.86 1.53 -1.53 0.82 -0.67 1.75 -1.75 2.05 -2.38 0.30 -0.67 1.86 -10.45 3.50 -21.80 3.31 -23.18 3.35 -23.33 6.32 -24.96 l1.67 -0.93 21.95 0.15 c23.92 0.15 23.44 0.07 24.55 2.27 0.89 1.71 0.71 3.98 -1.67 20.83 -1.23 8.71 -2.49 17.52 -2.79 19.61 -0.63 4.54 -1.53 6.44 -3.61 7.81 -1.49 1 -1.79 1.04 -6.92 1.15 l-5.36 0.15 0.22 -1.45 c0.41 -2.60 5.06 -35.75 5.06 -35.97 0 -0.11 -5.02 -0.22 -11.16 -0.22 l-11.16 0 -0.56 0.89 c-0.63 0.97 -0.74 1.56 -3.16 19.20 -1.53 11.09 -2.01 13.28 -3.42 15.10 -1.60 2.01 -3.16 2.38 -10.42 2.38 -3.65 0 -6.62 -0.15 -6.62 -0.30z",
    "M261.16 170.28 c0 -0.07 0.89 -1.04 1.97 -2.16 l2.01 -2.01 2.68 -19.35 c1.49 -10.64 3.68 -26.04 4.84 -34.23 l2.12 -14.88 5.28 -0.11 c6.58 -0.11 7.48 0.30 8.30 3.98 0.26 1.23 0 3.42 -3.42 27.49 -0.60 4.35 -1 8.07 -0.89 8.26 0.15 0.22 4.61 0.37 11.38 0.37 l11.12 0 0.37 -0.82 c0.19 -0.48 0.71 -3.53 1.15 -6.81 1.41 -10.53 2.23 -11.35 11.05 -11.35 l5.17 0 -0.48 3.09 c-0.26 1.67 -0.93 6.25 -1.45 10.12 -1.12 8 -1.86 10.23 -4.09 11.90 l-1.38 1.08 1.15 1.04 c1.93 1.82 2.05 3.13 0.97 10.60 -1.15 7.92 -1.45 9.19 -2.60 10.94 -1.53 2.34 -3.35 2.94 -9.04 2.94 -2.72 0 -4.91 -0.07 -4.91 -0.15 0 -0.26 2.19 -15.66 2.42 -16.85 l0.22 -1.23 -11.76 0 c-6.88 0 -11.72 0.15 -11.72 0.33 0 1 -1.56 11.24 -1.90 12.50 -0.56 2.08 -2.01 3.87 -3.83 4.69 -1.30 0.60 -2.49 0.71 -8.11 0.71 -3.65 0 -6.62 -0.04 -6.62 -0.11z",
    "M332.96 139.51 c0 -1.82 1.23 -8.15 1.82 -9.49 0.82 -1.82 2.38 -3.27 4.09 -3.87 0.89 -0.30 7.96 -0.41 23.85 -0.41 l22.58 0 -0.67 4.46 c-0.93 6.06 -2.08 8.15 -5.25 9.49 -1.19 0.48 -4.43 0.56 -23.92 0.56 -22.28 0 -22.51 0 -22.51 -0.74z",
];

function LineDrawVariant() {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        const svg = svgRef.current;
        if (!svg) return;
        const paths = svg.querySelectorAll<SVGPathElement>('.drawPath');

        paths.forEach((p) => {
            const len = p.getTotalLength();
            p.style.setProperty('--len', String(len));
        });

        let cancelled = false;

        async function playCycle() {
            svg?.classList.remove(styles.drawing, styles.filled, styles.hiddenOut);
            void svg?.getBoundingClientRect();
            svg?.classList.add(styles.drawing);
            await new Promise((r) => setTimeout(r, 2400));
            if (cancelled) return;
            svg?.classList.add(styles.filled);
            await new Promise((r) => setTimeout(r, 2400));
            if (cancelled) return;
            svg?.classList.add(styles.hiddenOut);
            await new Promise((r) => setTimeout(r, 800));
        }

        async function loop() {
            while (!cancelled) {
                await playCycle();
            }
        }
        loop();

        return () => { cancelled = true; };
    }, []);

    return (
        <svg
            ref={svgRef}
            className={styles.lineDrawSvg}
            viewBox="1 72 465 138"
            xmlns="http://www.w3.org/2000/svg"
        >
            <g>
                {WORD_PATHS.map((d, i) => (
                    <path key={i} className={`${styles.drawPath} ${styles.wordPath}`} d={d} />
                ))}
            </g>
            <g>
                <path className={`${styles.drawPath} ${styles.xPath}`} d={X_MARK_PATH} />
            </g>
        </svg>
    );
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

/**
 * Fills the `.splitMedia` slot on the /for/* landing pages with a looping,
 * wordless motion piece instead of a static screenshot — avoids the
 * maintenance burden of product screenshots going stale as the UI evolves.
 */
export default function SplitMediaMotion({ variant }: SplitMediaMotionProps) {
    return (
        <div className={styles.mediaFrame}>
            <div className={styles.ambient} />
            {variant === 'lineDraw' ? <LineDrawVariant /> : <ConstellationVariant />}
        </div>
    );
}
