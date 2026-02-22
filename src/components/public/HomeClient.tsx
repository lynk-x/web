"use client";

import React, { useState } from 'react';
import SearchBar from "./SearchBar";
import HeroSection from "./HeroSection";
import EventGrid from "./EventGrid";
import styles from '@/app/page.module.css';
import { Event } from '@/types';
import PulseFooter from "./PulseFooter";
import { useFilters } from '@/context/FilterContext';

interface HomeClientProps {
    carouselEvents: Event[];
    gridEvents: Event[];
}

const HomeClient: React.FC<HomeClientProps> = ({ carouselEvents, gridEvents }) => {
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const { searchTerm, selectedCategories, selectedDates } = useFilters();

    const filteredGridEvents = gridEvents.filter(event => {
        // Search Filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const matchesTitle = event.title.toLowerCase().includes(term);
            const matchesDesc = event.description?.toLowerCase().includes(term);
            const matchesCat = event.category?.toLowerCase().includes(term);
            if (!matchesTitle && !matchesDesc && !matchesCat) return false;
        }

        // Category Filter
        if (selectedCategories.length > 0) {
            if (!event.category || !selectedCategories.includes(event.category)) return false;
        }

        // Date Filter
        if (selectedDates.length > 0 && event.start_datetime) {
            const eventDate = new Date(event.start_datetime);
            const matchesDate = selectedDates.some(d =>
                d.getDate() === eventDate.getDate() &&
                d.getMonth() === eventDate.getMonth() &&
                d.getFullYear() === eventDate.getFullYear()
            );
            if (!matchesDate) return false;
        }

        return true;
    });

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
                <EventGrid events={filteredGridEvents} itemsPerPage={8} />

                {filteredGridEvents.length === 0 && (
                    <div style={{ padding: '60px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                        <h3>No events found matching your filters.</h3>
                        <p style={{ fontSize: '14px', marginTop: '8px' }}>Try adjusting your categories, dates, or search term.</p>
                    </div>
                )}
            </div>
            <PulseFooter />
        </>
    );
};

export default HomeClient;
