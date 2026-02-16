"use client";

import React, { useState } from 'react';
import SearchBar from "@/components/SearchBar";
import HeroSection from "@/components/HeroSection";
import EventGrid from "@/components/EventGrid";
import styles from "@/app/page.module.css";
import { Event } from "@/types";
import PulseFooter from "@/components/PulseFooter";

interface HomeClientProps {
    carouselEvents: Event[];
    gridEvents: Event[];
}

const HomeClient: React.FC<HomeClientProps> = ({ carouselEvents, gridEvents }) => {
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    return (
        <>
            <div style={{ marginTop: '20px', marginBottom: '20px' }}>
                <SearchBar
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                />
            </div>

            <div style={{
                height: isSearchFocused ? '0px' : 'auto',
                overflow: 'hidden',
                opacity: isSearchFocused ? 0 : 1,
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                marginBottom: isSearchFocused ? '0px' : '40px'
            }}>
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
