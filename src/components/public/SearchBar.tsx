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
        selectedCategories, selectedTags, selectedDates 
    } = useFilters();
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const isFilterActive = selectedCategories.length > 0 || selectedTags.length > 0 || selectedDates.length > 0;

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

            <input
                type="text"
                placeholder="Search for an event"
                className={styles.input}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={onFocus}
                onBlur={onBlur}
            />
            
            <div className={styles.icon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
