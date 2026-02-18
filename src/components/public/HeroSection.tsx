"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './HeroSection.module.css';
import { Event } from "@/types";

interface HeroProps {
    featuredEvents: Event[];
}

const HeroSection: React.FC<HeroProps> = ({ featuredEvents }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Auto-play
    useEffect(() => {
        const timer = setInterval(() => {
            nextSlide();
        }, 6000); // 6 seconds per slide

        return () => clearInterval(timer);
    }, [currentIndex]);

    const nextSlide = () => {
        setCurrentIndex((prev) => (prev + 1) % featuredEvents.length);
    };

    if (!featuredEvents || featuredEvents.length === 0) return null;

    const currentEvent = featuredEvents[currentIndex];

    return (
        <div className={styles.hero}>
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentIndex}
                    className={styles.backdrop}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <img
                        src={currentEvent.cover_image_url || "https://images.unsplash.com/photo-1540575467063-178a50c2df87"}
                        alt="Hero Backdrop"
                        className={styles.backdropImage}
                    />
                    <div className={styles.overlay} />
                </motion.div>
            </AnimatePresence>

            <div className={styles.contentWrapper}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        className={styles.content}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5 }}
                    >
                        <span className={styles.tag}>Pulsing Now</span>
                        <h1 className={styles.title}>{currentEvent.title}</h1>
                        <p className={styles.description}>
                            {currentEvent.description || "Join us for an unforgettable experience."}
                        </p>
                        <div className={styles.actions}>
                            <Link href={`/event/${currentEvent.id}`} className={styles.primaryBtn}>
                                Get Tickets
                            </Link>
                            <button className={styles.secondaryBtn}>
                                More Info
                            </button>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Navigation Controls */}
            <div className={styles.controls}>
                <div className={styles.dots}>
                    {featuredEvents.map((_, index) => (
                        <div
                            key={index}
                            className={`${styles.dot} ${index === currentIndex ? styles.activeDot : ''}`}
                            onClick={() => setCurrentIndex(index)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default HeroSection;
