"use client";

import React, { useState, useEffect, useMemo } from 'react';
import styles from './FilterPopup.module.css';
import { useFilters } from '@/context/FilterContext';

interface FilterPopupProps {
    isOpen: boolean;
    onClose: () => void;
    categoriesData?: any[];
    tagsData?: any[];
    categoryTagsMap?: any[];
}

const TwoWeekView: React.FC<{
    viewStartDate: Date;
    onToggleDate: (date: Date) => void;
    isDaySelected: (date: Date) => boolean;
    isToday: (date: Date) => boolean;
}> = ({ viewStartDate, onToggleDate, isDaySelected, isToday }) => {
    const days = [];
    for (let i = 0; i < 14; i++) {
        const date = new Date(viewStartDate);
        date.setDate(viewStartDate.getDate() + i);
        days.push(date);
    }

    const monthName = viewStartDate.toLocaleString('default', { month: 'short', year: 'numeric' });

    return (
        <div className={styles.monthContainer}>
            <div className={styles.monthNameHeader}>{monthName}</div>
            <div className={styles.calendarGrid}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayName, i) => (
                    <span key={i} className={styles.dayNameLabel}>{dayName}</span>
                ))}
                {days.map((date, index) => {
                    const isSel = isDaySelected(date);
                    const isTod = isToday(date);

                    return (
                        <div
                            key={index}
                            className={`${styles.dayCell} ${isSel ? styles.daySelected : ''} ${isTod && !isSel ? styles.dayToday : ''}`}
                            onClick={() => onToggleDate(date)}
                        >
                            <span className={styles.dayNum}>{date.getDate()}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const MonthView: React.FC<{
    month: number;
    year: number;
    onToggleDate: (date: Date) => void;
    isDaySelected: (date: Date) => boolean;
    isToday: (date: Date) => boolean;
}> = ({ month, year, onToggleDate, isDaySelected, isToday }) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();

    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

    const monthName = new Date(year, month).toLocaleString('default', { month: 'long' });

    return (
        <div className={styles.monthContainer}>
            <div className={styles.monthNameHeader}>{monthName} {year}</div>
            <div className={styles.calendarGrid}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayName, i) => (
                    <span key={i} className={styles.dayNameLabel}>{dayName}</span>
                ))}
                {days.map((date, index) => {
                    if (!date) return <div key={`empty-${index}`} className={styles.dayCellEmpty} />;
                    
                    const isSel = isDaySelected(date);
                    const isTod = isToday(date);

                    return (
                        <div
                            key={index}
                            className={`${styles.dayCell} ${isSel ? styles.daySelected : ''} ${isTod && !isSel ? styles.dayToday : ''}`}
                            onClick={() => onToggleDate(date)}
                        >
                            <span className={styles.dayNum}>{date.getDate()}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const FilterPopup: React.FC<FilterPopupProps> = ({
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

    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        dates: false,
        categories: true,
        tags: true
    });

    const [viewDate, setViewDate] = useState<Date>(new Date());
    const [numMonths, setNumMonths] = useState(1);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1200) setNumMonths(3);
            else if (window.innerWidth >= 768) setNumMonths(2);
            else setNumMonths(1);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Also need two-week logic for mobile: most recent Sunday
    const [twoWeekStart, setTwoWeekStart] = useState<Date>(new Date());
    useEffect(() => {
        const today = new Date();
        const sunday = new Date(today);
        sunday.setDate(today.getDate() - today.getDay());
        setTwoWeekStart(sunday);
    }, []);

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const nextTime = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (numMonths === 1) {
            const d = new Date(twoWeekStart);
            d.setDate(d.getDate() + 7);
            setTwoWeekStart(d);
        } else {
            setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
        }
    };

    const prevTime = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (numMonths === 1) {
            const d = new Date(twoWeekStart);
            d.setDate(d.getDate() - 7);
            setTwoWeekStart(d);
        } else {
            setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
        }
    };

    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getDate() === d2.getDate() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getFullYear() === d2.getFullYear();
    };

    const isDaySelected = (date: Date) => selectedDates.some(d => isSameDay(d, date));
    const isToday = (date: Date) => isSameDay(date, new Date());

    const toggleDate = (date: Date) => {
        if (isDaySelected(date)) setSelectedDates(selectedDates.filter(d => !isSameDay(d, date)));
        else setSelectedDates([...selectedDates, date]);
    };

    // --- Categories & Tags Logic ---
    const categoriesList = useMemo(() => {
        if (!categoriesData || categoriesData.length === 0) return [];
        return Array.from(new Set(
            categoriesData.map(c => typeof c === 'string' ? c : (c.display_name || c.name || c.id || c.text)).filter(Boolean)
        )) as string[];
    }, [categoriesData]);

    const displayCategories = categoriesList.length > 0 ? categoriesList : [
        'Arts & Entertainment', 'Music & Nightlife', 'Business & Professional',
        'Tech & Innovation', 'Sports & Games', 'Food & Drinks',
        'Education & Training', 'Health & Wellness', 'Community & Social'
    ];

    const allTagsNames = Array.from(new Set(
        (tagsData || []).map(t => typeof t === 'string' ? t : t.name).filter(Boolean)
    )) as string[];

    const _categoryTagMap: Record<string, string[]> = {};
    categoryTagsMap.forEach(ct => {
        const cat = categoriesData.find(c => c.id === ct.category_id);
        const tag = tagsData.find(t => t.id === ct.tag_id);
        if (cat && tag) {
            const catName = cat.display_name || cat.name;
            const tagName = tag.name;
            if (catName && tagName) {
                if (!_categoryTagMap[catName]) _categoryTagMap[catName] = [];
                _categoryTagMap[catName].push(tagName);
            }
        }
    });

    const utilityTagsNames = tagsData.filter(t => t.type_id === 'utility').map(t => t.name);
    const globalTagsNames = tagsData.filter(t => t.is_official && t.type_id !== 'utility').map(t => t.name);
    const utilityTagsDisplay: string[] = utilityTagsNames;

    const primaryTags = useMemo(() => {
        // 1. Get all tags that are NOT utility
        const genericTags = allTagsNames.filter(tag => !utilityTagsNames.includes(tag));

        // 2. Identify "Recommended" tags based on selected categories
        const recommendedTags = new Set<string>();
        if (selectedCategories.length > 0) {
            selectedCategories.forEach(cat => _categoryTagMap[cat]?.forEach(tag => recommendedTags.add(tag)));
        }

        // 3. Sort logic:
        // - Priority 1: Recommended tags (matching selected categories)
        // - Priority 2: Global/Official tags
        // - Priority 3: All other tags
        // Within each priority, sort alphabetically.
        return [...genericTags].sort((a, b) => {
            const aIsRec = recommendedTags.has(a);
            const bIsRec = recommendedTags.has(b);
            if (aIsRec && !bIsRec) return -1;
            if (!aIsRec && bIsRec) return 1;

            const aIsGlobal = globalTagsNames.includes(a);
            const bIsGlobal = globalTagsNames.includes(b);
            if (aIsGlobal && !bIsGlobal) return -1;
            if (!aIsGlobal && bIsGlobal) return 1;

            return a.localeCompare(b);
        });
    }, [allTagsNames, selectedCategories, _categoryTagMap, globalTagsNames, utilityTagsNames]);

    const toggleCategory = (category: string) => {
        if (selectedCategories.includes(category)) setSelectedCategories(selectedCategories.filter(c => c !== category));
        else setSelectedCategories([...selectedCategories, category]);
    };

    const toggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) setSelectedTags(selectedTags.filter(t => t !== tag));
        else setSelectedTags([...selectedTags, tag]);
    };

    if (!isOpen) return null;

    const monthsToShow = [];
    if (numMonths > 1) {
        for (let i = 0; i < numMonths; i++) {
            const d = new Date(viewDate.getFullYear(), viewDate.getMonth() + i, 1);
            monthsToShow.push({ month: d.getMonth(), year: d.getFullYear() });
        }
    }

    return (
        <>
            <div className={styles.overlay} onClick={onClose} />
            <div className={styles.popupCard}>
                <div className={styles.section}>
                    <div className={styles.sectionHeader} onClick={() => toggleSection('dates')}>
                        <span className={styles.sectionTitle}>Dates</span>
                        <svg className={`${styles.chevron} ${expandedSections.dates ? styles.chevronRotated : ''}`} width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    {expandedSections.dates && (
                        <div className={styles.sectionContent}>
                            <div className={styles.calendarNavigation}>
                                <div className={styles.arrow} onClick={prevTime}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <div className={styles.arrow} onClick={nextTime}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>
                            <div className={styles.monthsWrapper}>
                                {numMonths === 1 ? (
                                    <TwoWeekView 
                                        viewStartDate={twoWeekStart} 
                                        onToggleDate={toggleDate} 
                                        isDaySelected={isDaySelected} 
                                        isToday={isToday} 
                                    />
                                ) : (
                                    monthsToShow.map(m => (
                                        <MonthView key={`${m.year}-${m.month}`} month={m.month} year={m.year} isDaySelected={isDaySelected} isToday={isToday} onToggleDate={toggleDate} />
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <div className={styles.divider} />
                <div className={styles.section}>
                    <div className={styles.sectionHeader} onClick={() => toggleSection('categories')}>
                        <span className={styles.sectionTitle}>Categories</span>
                        <svg className={`${styles.chevron} ${expandedSections.categories ? styles.chevronRotated : ''}`} width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    {expandedSections.categories && (
                        <div className={styles.sectionContent}>
                            <div className={styles.filterList}>
                                {displayCategories.map(cat => (
                                    <div key={`cat-${cat}`} className={styles.filterItem} onClick={() => toggleCategory(cat)}>
                                        <div className={`${styles.checkbox} ${selectedCategories.includes(cat) ? styles.checkboxChecked : ''}`}>
                                            {selectedCategories.includes(cat) && (
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            )}
                                        </div>
                                        <span>{cat}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className={styles.divider} />
                <div className={styles.section}>
                    <div className={styles.sectionHeader} onClick={() => toggleSection('tags')}>
                        <span className={styles.sectionTitle}>Tags</span>
                        <svg className={`${styles.chevron} ${expandedSections.tags ? styles.chevronRotated : ''}`} width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    {expandedSections.tags && (
                        <div className={styles.sectionContent}>
                            <div className={styles.tagGrid}>
                                {primaryTags.map(tag => (
                                    <div key={tag} className={`${styles.tagPill} ${selectedTags.includes(tag) ? styles.tagPillSelected : ''}`} onClick={() => toggleTag(tag)}>{tag}</div>
                                ))}
                                {utilityTagsDisplay.map(tag => (
                                    <div key={tag} className={`${styles.tagPill} ${selectedTags.includes(tag) ? styles.tagPillSelected : ''}`} onClick={() => toggleTag(tag)}>{tag}</div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default FilterPopup;
