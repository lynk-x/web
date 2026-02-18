"use client";

import React, { useState } from 'react';
import SearchBar from "./SearchBar";
import HeroSection from "./HeroSection";
import EventGrid from "./EventGrid";
import styles from '@/app/page.module.css';
import { Event } from '@/types';
import PulseFooter from "./PulseFooter";

interface HomeClientProps {
    carouselEvents: Event[];
    gridEvents: Event[];
}

const HomeClient: React.FC<HomeClientProps> = ({ carouselEvents, gridEvents }) => {
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    return (
        <>
            <div className={styles.searchWrapper}>
                <SearchBar
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                />
            </div>

            <div className={`${styles.heroWrapper} ${isSearchFocused ? styles.heroHidden : ''}`}>
                <HeroSection featuredEvents={carouselEvents} />
            </div>

            <div className={styles.container}>
                <EventGrid events={gridEvents} itemsPerPage={8} />
            </div>
            <PulseFooter />
        </>
    );
};

export default HomeClient;
