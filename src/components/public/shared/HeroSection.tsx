"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './HeroSection.module.css';
import { Event } from "@/types";
import { getEventImage } from "@/utils/eventImage";

interface HeroProps {
    featuredEvents: Event[];
}

/**
 * Displays the featured-events spotlight carousel at the top of the discovery
 * homepage. Uses `h2` headings so the page keeps a single stable `h1`.
 */
const HeroSection: React.FC<HeroProps> = ({ featuredEvents }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Auto-play
    useEffect(() => {
        if (!featuredEvents || featuredEvents.length <= 1) return;
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % featuredEvents.length);
        }, 6000);

        return () => clearInterval(timer);
    }, [currentIndex, featuredEvents]);

    if (!featuredEvents || featuredEvents.length === 0) return null;

    const currentEvent = featuredEvents[currentIndex];
    const coverUrl = getEventImage(currentEvent);

    return (
        <div className={styles.hero}>
            <AnimatePresence initial={false} mode="wait">
                <motion.div
                    key={currentIndex}
                    className={styles.backdrop}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    {coverUrl && (
                        <Image
                            src={coverUrl}
                            alt={currentEvent.title}
                            fill
                            priority={currentIndex === 0}
                            sizes="100vw"
                            className={styles.backdropImage}
                        />
                    )}
                    <div className={styles.overlay} />
                </motion.div>
            </AnimatePresence>

            <div className={styles.contentWrapper}>
                <AnimatePresence initial={false} mode="wait">
                    <motion.div
                        key={currentIndex}
                        className={styles.content}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.4 }}
                    >
                        <span className={styles.tag}>Trending</span>
                        <h2 className={styles.title}>{currentEvent.title}</h2>
                        <p className={styles.description}>
                            {currentEvent.description || "Join us for an unforgettable experience."}
                        </p>
                        <div className={styles.actions}>
                            <Link href={`/event/${currentEvent.reference}`} className={styles.primaryBtn}>
                                Get Tickets
                            </Link>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {featuredEvents.length > 1 && (
                <div className={styles.controls}>
                    <div className={styles.dots}>
                        {featuredEvents.map((_, index) => (
                            <button
                                key={index}
                                type="button"
                                aria-label={`View featured event ${index + 1}`}
                                aria-current={index === currentIndex ? 'true' : undefined}
                                className={`${styles.dot} ${index === currentIndex ? styles.activeDot : ''}`}
                                onClick={() => setCurrentIndex(index)}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default HeroSection;
