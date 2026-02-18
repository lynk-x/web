"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useAnimation, useMotionValue, useTransform } from 'framer-motion';

interface PullToRefreshProps {
    children: React.ReactNode;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({ children }) => {
    const router = useRouter();
    const containerRef = useRef<HTMLDivElement>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const controls = useAnimation();

    // Touch state
    const startY = useRef(0);
    const currentY = useMotionValue(0);
    const pullProgress = useTransform(currentY, [0, 100], [0, 1]);
    const rotate = useTransform(currentY, [0, 100], [0, 360]);

    // Threshold for refresh trigger
    const PULL_THRESHOLD = 120;
    const MAX_PULL = 180;

    const handleTouchStart = (e: React.TouchEvent) => {
        if (window.scrollY > 0) return; // Only enable when at top of page
        startY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (window.scrollY > 0 || isRefreshing) return;

        const touchY = e.touches[0].clientY;
        const diff = touchY - startY.current;

        if (diff > 0) {
            // Add resistance
            const damped = Math.min(diff * 0.5, MAX_PULL);
            currentY.set(damped);

            // Prevent default scroll behavior if pulling down
            if (diff > 10 && e.cancelable) {
                // e.preventDefault(); // Note: This might be too aggressive, test carefully
            }
        }
    };

    const handleTouchEnd = async () => {
        if (isRefreshing) return;

        const pulledDistance = currentY.get();

        if (pulledDistance > PULL_THRESHOLD) {
            setIsRefreshing(true);
            // Snap to loading position
            controls.start({ y: 60 });

            // Refresh Data
            router.refresh();

            // Simulate minimum loading time for better UX
            setTimeout(() => {
                setIsRefreshing(false);
                controls.start({ y: 0 });
                currentY.set(0);
            }, 1500);
        } else {
            // Snap back to top
            controls.start({ y: 0 });
            currentY.set(0);
        }
    };

    // Sync motion value with animation controls
    useEffect(() => {
        const unsubscribe = currentY.on("change", (latest) => {
            if (!isRefreshing) {
                controls.set({ y: latest });
            }
        });
        return () => unsubscribe();
    }, [currentY, isRefreshing, controls]);

    return (
        <div
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ position: 'relative' }}
        >
            {/* Loading Indicator */}
            <motion.div
                style={{
                    position: 'absolute',
                    top: -40,
                    left: 0,
                    right: 0,
                    height: 40,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    y: currentY,
                    zIndex: 10
                }}
            >
                <motion.div
                    style={{
                        rotate,
                        opacity: pullProgress
                    }}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C14.4853 3 16.7353 4.00736 18.364 5.63604L21 8.27208" stroke="var(--color-brand-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M21 3V8.27208H15.7279" stroke="var(--color-brand-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </motion.div>
            </motion.div>

            {/* Content Content */}
            <motion.div animate={controls}>
                {children}
            </motion.div>
        </div>
    );
};

export default PullToRefresh;
