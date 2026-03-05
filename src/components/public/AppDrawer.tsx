"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './AppDrawer.module.css';
import { useFilters } from '@/context/FilterContext';

interface AppDrawerProps {
    /** Whether the drawer is currently open. */
    isOpen: boolean;
    /** Callback function to close the drawer. */
    onClose: () => void;
    /** Dynamic categories from the database */
    categoriesData?: any[];
    /** Dynamic tags from the database */
    tagsData?: any[];
    /** Category to Tags mapping from the database */
    categoryTagsMap?: any[];
}

/**
 * AppDrawer component that slides in from the left side of the screen.
 * It contains filters for events (Calendar, Categories, Tags) and footer links.
 *
 * @param {AppDrawerProps} props - Component properties.
 */
const AppDrawer: React.FC<AppDrawerProps> = ({
    isOpen,
    onClose,
    categoriesData = [],
    tagsData = [],
    categoryTagsMap = []
}) => {
    const {
        selectedCategories, setSelectedCategories,
        selectedTags, setSelectedTags,
        selectedDates, setSelectedDates
    } = useFilters();

    const [viewStartDate, setViewStartDate] = useState<Date>(new Date());
    const [calendarDays, setCalendarDays] = useState<Date[]>([]);

    useEffect(() => {
        // Initialize viewStartDate to the most recent Sunday
        const today = new Date();
        const sunday = new Date(today);
        const day = today.getDay(); // Sunday is 0
        sunday.setDate(today.getDate() - day);
        setViewStartDate(sunday);
    }, []);

    useEffect(() => {
        // Generate 14 days based on viewStartDate
        const days = [];
        for (let i = 0; i < 14; i++) {
            const date = new Date(viewStartDate);
            date.setDate(viewStartDate.getDate() + i);
            days.push(date);
        }
        setCalendarDays(days);
    }, [viewStartDate]);

    const nextWeek = () => {
        const newStart = new Date(viewStartDate);
        newStart.setDate(viewStartDate.getDate() + 7);
        setViewStartDate(newStart);
    };

    const prevWeek = () => {
        const newStart = new Date(viewStartDate);
        newStart.setDate(viewStartDate.getDate() - 7);
        setViewStartDate(newStart);
    };

    const toggleCategory = (category: string) => {
        if (selectedCategories.includes(category)) {
            setSelectedCategories(selectedCategories.filter(c => c !== category));
        } else {
            setSelectedCategories([...selectedCategories, category]);
        }
    };

    const toggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter(t => t !== tag));
        } else {
            setSelectedTags([...selectedTags, tag]);
        }
    };

    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getDate() === d2.getDate() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getFullYear() === d2.getFullYear();
    };

    const toggleDate = (date: Date) => {
        const isSelected = selectedDates.some(d => isSameDay(d, date));
        if (isSelected) {
            setSelectedDates(selectedDates.filter(d => !isSameDay(d, date)));
        } else {
            setSelectedDates([...selectedDates, date]);
        }
    };

    // Format DB objects into expected string arrays
    const categories = Array.from(new Set(categoriesData.map(c => c.name)));
    const allTags = Array.from(new Set(tagsData.map(t => t.name)));

    // Map the relationships
    const _categoryTagMap: Record<string, string[]> = {};

    // Fallback logic removed as requested


    // Build map from category_tags junction and corresponding names
    categoryTagsMap.forEach(ct => {
        const cat = categoriesData.find(c => c.id === ct.category_id);
        const tag = tagsData.find(t => t.id === ct.tag_id);
        if (cat && tag) {
            if (!_categoryTagMap[cat.name]) {
                _categoryTagMap[cat.name] = [];
            }
            _categoryTagMap[cat.name].push(tag.name);
        }
    });

    // Global tags (fallback logic if no specific global tag flag exists)
    // We'll treat standard amenities as global or just return none if unspecified.
    const globalTagsNames = tagsData.filter(t => t.is_official).map(t => t.name);

    // Determine which tags to display
    let categorizedTags: string[] = [];
    const generalTagsDisplay: string[] = globalTagsNames;

    if (selectedCategories.length > 0) {
        const recommendedTags = new Set<string>();
        selectedCategories.forEach(cat => {
            _categoryTagMap[cat]?.forEach(tag => recommendedTags.add(tag));
        });
        categorizedTags = allTags.filter(tag => recommendedTags.has(tag) && !globalTagsNames.includes(tag));
    } else {
        categorizedTags = allTags.filter(tag => !globalTagsNames.includes(tag));
    }

    return (
        <>
            <div
                className={`${styles.overlay} ${isOpen ? styles.overlayOpen : ''}`}
                onClick={onClose}
            />
            <div className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''}`}>
                {/* Calendar Section (Custom 2-Week View) */}
                <div className={styles.section}>
                    <div className={styles.calendarHeader}>
                        <div className={styles.arrow} onClick={prevWeek}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <span className={styles.monthYear}>
                            {viewStartDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </span>
                        <div className={styles.arrow} onClick={nextWeek}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </div>

                    <div className={styles.calendarGrid}>
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName) => (
                            <span key={dayName} className={styles.dayName}>{dayName}</span>
                        ))}

                        {calendarDays.map((date, index) => {
                            const isToday = isSameDay(date, new Date());
                            const isSelected = selectedDates.some(d => isSameDay(d, date));

                            return (
                                <div
                                    key={index}
                                    className={`${styles.dayCell} ${isSelected ? styles.daySelected : ''} ${isToday && !isSelected ? styles.dayToday : ''}`}
                                    onClick={() => toggleDate(date)}
                                >
                                    <span className={styles.dayNum}>{date.getDate()}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Categories Section */}
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Categories:</h3>
                    <div className={styles.filterList}>
                        {categories.map((cat) => (
                            <div
                                key={cat}
                                className={styles.filterItem}
                                onClick={() => toggleCategory(cat)}
                            >
                                <div className={`${styles.checkbox} ${selectedCategories.includes(cat) ? styles.checkboxChecked : ''}`}>
                                    {selectedCategories.includes(cat) && (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )}
                                </div>
                                <span>{cat}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tags Section */}
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Tags:</h3>

                    {/* Categorized / Recommended Tags */}
                    <div className={styles.tagGrid}>
                        {categorizedTags.map((tag: string) => (
                            <div
                                key={tag}
                                className={`${styles.tagPill} ${selectedTags.includes(tag) ? styles.tagPillSelected : ''}`}
                                onClick={() => toggleTag(tag)}
                            >
                                {tag}
                            </div>
                        ))}
                    </div>

                    {/* Gap line between categorized and general tags */}
                    {categorizedTags.length > 0 && generalTagsDisplay.length > 0 && (
                        <div className={styles.tagDivider} />
                    )}

                    {/* General / Amenity Tags at the bottom */}
                    <div className={styles.tagGrid}>
                        {generalTagsDisplay.map((tag: string) => (
                            <div
                                key={tag}
                                className={`${styles.tagPill} ${selectedTags.includes(tag) ? styles.tagPillSelected : ''}`}
                                onClick={() => toggleTag(tag)}
                            >
                                {tag}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Action Buttons */}
                <Link href="/dashboard/organize" className={styles.refreshBtn}>
                    <span>Dashboard</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </Link>

            </div>
        </>
    );
};

export default AppDrawer;
