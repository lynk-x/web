"use client";

import React, { useState, useEffect, useMemo } from 'react';
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

    // Extract categories list
    const categoriesList = useMemo(() => {
        if (!categoriesData || categoriesData.length === 0) return [];
        return Array.from(new Set(
            categoriesData
                .map(c => typeof c === 'string' ? c : (c.display_name || c.name || c.id || c.text))
                .filter(Boolean)
        )) as string[];
    }, [categoriesData]);

    // Ensure we ALWAYS have categories to display
    const fallbackCategories = [
        'Arts & Entertainment', 'Music & Nightlife', 'Business & Professional',
        'Tech & Innovation', 'Sports & Games', 'Food & Drinks',
        'Education & Training', 'Health & Wellness', 'Community & Social'
    ];

    const displayCategories = (categoriesList && categoriesList.length > 0) ? categoriesList : fallbackCategories;

    const allTagsNames = Array.from(new Set(
        (tagsData || []).map(t => typeof t === 'string' ? t : t.name).filter(Boolean)
    )) as string[];

    // Map the relationships
    const _categoryTagMap: Record<string, string[]> = {};

    // Fallback logic removed as requested


    // Build map from category_tags junction and corresponding names (Handling both name and display_name)
    categoryTagsMap.forEach(ct => {
        const cat = categoriesData.find(c => c.id === ct.category_id);
        const tag = tagsData.find(t => t.id === ct.tag_id);
        if (cat && tag) {
            const catName = cat.display_name || cat.name;
            const tagName = tag.name;
            if (catName && tagName) {
                if (!_categoryTagMap[catName]) {
                    _categoryTagMap[catName] = [];
                }
                _categoryTagMap[catName].push(tagName);
            }
        }
    });

    // Define Utility tags vs Normal tags
    const utilityTagsNames = tagsData.filter(t => t.type_id === 'utility').map(t => t.name);
    const globalTagsNames = tagsData.filter(t => t.is_official && t.type_id !== 'utility').map(t => t.name);

    // Determine which tags to display
    let primaryTags: string[] = [];
    const utilityTagsDisplay: string[] = utilityTagsNames;

    if (selectedCategories.length > 0) {
        const recommendedTags = new Set<string>();
        selectedCategories.forEach(cat => {
            _categoryTagMap[cat]?.forEach(tag => recommendedTags.add(tag));
        });
        // Show recommended tags plus other official (non-utility) tags
        primaryTags = allTagsNames.filter(tag =>
            (recommendedTags.has(tag) || globalTagsNames.includes(tag)) &&
            !utilityTagsNames.includes(tag)
        );
    } else {
        // Show all non-utility tags
        primaryTags = allTagsNames.filter(tag => !utilityTagsNames.includes(tag));
    }

    return (
        <>
            <div
                className={`${styles.overlay} ${isOpen ? styles.overlayOpen : ''}`}
                onClick={onClose}
            />
            <div className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''}`}>
                <div className={styles.drawerContent}>
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
                            {displayCategories.map((cat: string) => (
                                <div
                                    key={`cat-${cat}`}
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
                                    <span style={{ color: 'var(--color-utility-primaryText)' }}>{cat}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Tags Section */}
                    <div className={styles.section} style={{ marginBottom: 0 }}>
                        <h3 className={styles.sectionTitle}>Tags:</h3>

                        {/* Normal / Recommended Tags */}
                        <div className={styles.tagGrid}>
                            {primaryTags.map((tag: string) => (
                                <div
                                    key={tag}
                                    className={`${styles.tagPill} ${selectedTags.includes(tag) ? styles.tagPillSelected : ''}`}
                                    onClick={() => toggleTag(tag)}
                                >
                                    {tag}
                                </div>
                            ))}
                        </div>

                        {/* Divider between categorized and utility tags */}
                        {primaryTags.length > 0 && utilityTagsDisplay.length > 0 && (
                            <div className={styles.tagDivider} />
                        )}

                        {/* Utility / Amenity Tags at the bottom */}
                        <div className={styles.tagGrid}>
                            {utilityTagsDisplay.map((tag: string) => (
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
                </div>

                {/* Fixed Footer for Dashboard Button */}
                <footer className={styles.drawerFooter}>
                    <Link href="/dashboard/organize" className={styles.refreshBtn}>
                        <span>Dashboard</span>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </Link>
                </footer>
            </div>
        </>
    );
};

export default AppDrawer;
