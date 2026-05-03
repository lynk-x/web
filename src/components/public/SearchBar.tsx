"use client";

import React, { useState, useRef } from 'react';
import styles from './SearchBar.module.css';
import { useFilters } from '@/context/FilterContext';
import FilterPopup from './FilterPopup';

interface SearchBarProps {
    onFocus?: () => void;
    onBlur?: () => void;
    categories?: any[];
    tags?: any[];
    categoryTags?: any[];
}

const SearchBar: React.FC<SearchBarProps> = ({ onFocus, onBlur, categories, tags, categoryTags }) => {
    const {
        searchTerm, setSearchTerm,
        selectedCategories, selectedTags, selectedDates,
        userLocation, setUserLocation,
    } = useFilters();
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const isFilterActive = selectedCategories.length > 0 || selectedTags.length > 0 || selectedDates.length > 0;

    const handleNearMe = () => {
        if (userLocation) {
            setUserLocation(null);
            return;
        }
        if (!navigator.geolocation) return;
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setIsLocating(false);
            },
            () => setIsLocating(false),
            { timeout: 8000 }
        );
    };

    return (
        <div className={styles.searchContainer} ref={containerRef}>
            <div
                className={`${styles.filterIcon} ${isFilterActive ? styles.filterIconActive : ''}`}
                onClick={() => setIsPopupOpen(!isPopupOpen)}
                title="Filters"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 4H14M10 4H3M21 12H12M8 12H3M21 20H16M12 20H3M14 2v4M8 10v4M16 18v4" />
                </svg>
            </div>

            <div
                className={styles.locationIcon}
                onClick={handleNearMe}
                title={userLocation ? 'Clear location filter' : 'Find events near me'}
                style={{
                    color: userLocation ? 'var(--color-brand-primary)' : undefined,
                    opacity: isLocating ? 0.5 : 1,
                }}
            >
                {isLocating ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" strokeDasharray="31.4" strokeDashoffset="10"
                            style={{ animation: 'spin 0.8s linear infinite', transformOrigin: '12px 12px' }} />
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </svg>
                ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                        <circle cx="12" cy="12" r="8" strokeOpacity="0.3" />
                    </svg>
                )}
            </div>

            <input
                type="text"
                placeholder="Search for an event"
                className={styles.input}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={onFocus}
                onBlur={onBlur}
            />

            <div className={styles.searchIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
            </div>

            <FilterPopup
                isOpen={isPopupOpen}
                onClose={() => setIsPopupOpen(false)}
                categoriesData={categories}
                tagsData={tags}
                categoryTagsMap={categoryTags}
            />
        </div>
    );
};

export default SearchBar;
