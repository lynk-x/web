"use client";

import React, { useState, useEffect } from 'react';
import styles from './SystemBannerSpotlight.module.css';

interface SpotlightSlide {
    id: string;
    title: string;
    subtitle: string;
    backgroundImage?: string;
    ctaLabel?: string;
    ctaHref?: string;
    badge?: string;
}

interface SystemBannerSpotlightProps {
    slides: SpotlightSlide[];
    interval?: number;
}

const SystemBannerSpotlight: React.FC<SystemBannerSpotlightProps> = ({
    slides,
    interval = 5000
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (slides.length <= 1) return;

        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % slides.length);
        }, interval);

        return () => clearInterval(timer);
    }, [slides.length, interval]);

    if (!slides.length) return null;

    const currentSlide = slides[currentIndex];

    return (
        <div className={styles.container}>
            {slides.map((slide, index) => (
                <div
                    key={slide.id}
                    className={`${styles.slide} ${index === currentIndex ? styles.active : ''}`}
                    style={{
                        backgroundImage: slide.backgroundImage
                            ? (slide.backgroundImage.includes('linear-gradient') || slide.backgroundImage.startsWith('data:')
                                ? slide.backgroundImage
                                : `url(${slide.backgroundImage})`)
                            : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                    }}
                >
                    <div className={styles.overlay} />
                    <div className={styles.content}>
                        {slide.badge && <span className={styles.badge}>{slide.badge}</span>}
                        <h2 className={styles.title}>{slide.title}</h2>
                        <p className={styles.subtitle}>{slide.subtitle}</p>
                        {slide.ctaLabel && (
                            <a href={slide.ctaHref} className={styles.ctaButton}>
                                {slide.ctaLabel}
                            </a>
                        )}
                    </div>
                </div>
            ))}

            {slides.length > 1 && (
                <div className={styles.dots}>
                    {slides.map((_, index) => (
                        <button
                            key={index}
                            className={`${styles.dot} ${index === currentIndex ? styles.dotActive : ''}`}
                            onClick={() => setCurrentIndex(index)}
                            aria-label={`Go to slide ${index + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default SystemBannerSpotlight;
