"use client";

import React, { useState } from 'react';
import SearchBar from "./SearchBar";
import HeroSection from "./HeroSection";
import EventGrid from "./EventGrid";
import styles from '@/app/page.module.css';
import { Event } from '@/types';
import LynkXFooter from "./LynkXFooter";
import { useFilters } from '@/context/FilterContext';

interface HomeClientProps {
    carouselEvents: Event[];
    allEvents: Event[];
    categories?: any[];
    tags?: any[];
    categoryTags?: any[];
}

const HomeClient: React.FC<HomeClientProps> = ({ carouselEvents, allEvents, categories, tags, categoryTags }) => {
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const { searchTerm, selectedCategories, selectedDates, selectedTags } = useFilters();
    const hasActiveFilters = searchTerm !== "" || selectedCategories.length > 0 || selectedDates.length > 0 || selectedTags.length > 0;

    // Base Grid: if no filters, only show everything AFTER the first 5 so we don't repeat the carousel.
    // Otherwise, search everything!
    const baseGridEvents = hasActiveFilters ? allEvents : allEvents.slice(5);

    const filteredGridEvents = baseGridEvents.filter(event => {
        // Search Filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const matchesTitle = event.title?.toLowerCase().includes(term) || false;
            const matchesDesc = event.description?.toLowerCase().includes(term) || false;
            const matchesCat = event.category?.toLowerCase().includes(term) || false;
            const matchesTags = event.tags?.some(tag => tag.toLowerCase().includes(term)) || false;
            if (!matchesTitle && !matchesDesc && !matchesCat && !matchesTags) return false;
        }

        // Category Filter
        if (selectedCategories.length > 0) {
            if (!event.category || !selectedCategories.includes(event.category)) return false;
        }

        // Tag Filter
        if (selectedTags.length > 0) {
            if (!event.tags || !selectedTags.some(tag => event.tags?.includes(tag))) return false;
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
        } else if (selectedDates.length > 0) {
            // If filtering by date but event has no date, hide it
            return false;
        }

        return true;
    });

    return (
        <>
            <div className={styles.searchWrapper}>
                <SearchBar
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    categories={categories}
                    tags={tags}
                    categoryTags={categoryTags}
                />
            </div>

            <div className={`${styles.heroWrapper} ${(isSearchFocused || hasActiveFilters) ? styles.heroHidden : ''}`}>
                <HeroSection featuredEvents={carouselEvents} />
            </div>

            <div className={styles.container}>
                <EventGrid events={filteredGridEvents} itemsPerPage={8} />

                {filteredGridEvents.length === 0 && (
                    <div style={{ 
                        padding: "100px 20px", 
                        textAlign: "center", 
                        color: "rgba(255,255,255,0.5)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        flexGrow: 1
                    }}>
                        <h3 style={{ fontSize: "20px", fontWeight: 600, color: "#fff" }}>No events found matching your filters.</h3>
                        <p style={{ fontSize: "14px", marginTop: "12px", opacity: 0.7 }}>Try adjusting your categories, dates, or search term.</p>
                    </div>
                )}
            </div>
            <LynkXFooter />
        </>
    );
};

export default HomeClient;
