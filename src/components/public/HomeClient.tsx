"use client";

import React, { useState, useEffect, useRef } from 'react';
import SearchBar from "./SearchBar";
import HeroSection from "./HeroSection";
import EventGrid from "./EventGrid";
import styles from '@/app/page.module.css';
import { Event } from '@/types';
import LynkXFooter from "./LynkXFooter";
import { useFilters } from '@/context/FilterContext';
import { createClient } from '@/utils/supabase/client';

interface HomeClientProps {
    carouselEvents: Event[];
    allEvents: Event[];
    categories?: any[];
    tags?: any[];
    categoryTags?: any[];
}

const HomeClient: React.FC<HomeClientProps> = ({ carouselEvents, allEvents, categories, tags, categoryTags }) => {
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [rpcEvents, setRpcEvents] = useState<Event[] | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const supabase = React.useMemo(() => createClient(), []);

    const { searchTerm, selectedCategories, selectedDates, selectedTags, userLocation } = useFilters();

    const isRpcActive = searchTerm.trim() !== '' || selectedCategories.length > 0 || userLocation !== null;
    const hasActiveFilters = isRpcActive || selectedDates.length > 0 || selectedTags.length > 0;

    // Resolve category display name → UUID for the RPC
    const resolveCategoryId = (name: string): string | null =>
        (categories ?? []).find((c: any) => c.display_name === name || c.name === name)?.id ?? null;

    useEffect(() => {
        if (!isRpcActive) {
            setRpcEvents(null);
            return;
        }

        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(async () => {
            setIsSearching(true);
            try {
                // Only pass a single category to the RPC (first selected one).
                // Multiple categories require client-side union or a future RPC change.
                const categoryId = selectedCategories.length > 0
                    ? resolveCategoryId(selectedCategories[0])
                    : null;

                const params: Record<string, any> = { p_limit: 40 };
                if (searchTerm.trim()) params.p_query = searchTerm.trim();
                if (userLocation) {
                    params.p_lat = userLocation.lat;
                    params.p_lng = userLocation.lng;
                    params.p_radius_km = 50;
                }
                if (categoryId) params.p_category = categoryId;

                const { data, error } = await supabase.rpc('search_events', params);
                if (error) throw error;

                const mapped: Event[] = (data ?? []).map((r: any) => ({
                    id: r.id,
                    title: r.title,
                    description: r.description,
                    start_datetime: r.start_datetime,
                    end_datetime: r.end_datetime,
                    timezone: r.timezone,
                    location: r.location,
                    media: r.media,
                    category: r.category_name,
                    account_id: r.account_id,
                    currency: r.currency,
                    is_featured: false,
                    reference: r.reference,
                    // distance_km available for future "X km away" badge
                }));

                // If multiple categories selected, client-filter the RPC results
                const filtered = selectedCategories.length > 1
                    ? mapped.filter(e => selectedCategories.includes(e.category ?? ''))
                    : mapped;

                setRpcEvents(filtered);
            } catch {
                setRpcEvents(null);
            } finally {
                setIsSearching(false);
            }
        }, 350);

        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm, selectedCategories, userLocation]);

    // When RPC is not active, apply local filters over pre-fetched events
    const locallyFiltered = allEvents.filter(event => {
        if (selectedCategories.length > 0) {
            if (!event.category || !selectedCategories.includes(event.category)) return false;
        }
        if (selectedTags.length > 0) {
            if (!event.tags || !selectedTags.some(tag => event.tags?.includes(tag))) return false;
        }
        if (selectedDates.length > 0 && event.start_datetime) {
            const eventDate = new Date(event.start_datetime);
            const matchesDate = selectedDates.some(d =>
                d.getDate() === eventDate.getDate() &&
                d.getMonth() === eventDate.getMonth() &&
                d.getFullYear() === eventDate.getFullYear()
            );
            if (!matchesDate) return false;
        } else if (selectedDates.length > 0) {
            return false;
        }
        return true;
    });

    // Apply date/tag filters on top of RPC results too
    const displayEvents = isRpcActive
        ? (rpcEvents ?? []).filter(event => {
            if (selectedTags.length > 0) {
                if (!event.tags || !selectedTags.some(tag => event.tags?.includes(tag))) return false;
            }
            if (selectedDates.length > 0 && event.start_datetime) {
                const eventDate = new Date(event.start_datetime);
                return selectedDates.some(d =>
                    d.getDate() === eventDate.getDate() &&
                    d.getMonth() === eventDate.getMonth() &&
                    d.getFullYear() === eventDate.getFullYear()
                );
            }
            return true;
          })
        : locallyFiltered;

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
                <EventGrid events={displayEvents} itemsPerPage={8} isLoading={isSearching} />

                {!isSearching && displayEvents.length === 0 && (
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
                        <p style={{ fontSize: "14px", marginTop: "12px", opacity: 0.7 }}>Try adjusting your dates, categories or search terms.</p>
                    </div>
                )}
            </div>
            <LynkXFooter />
        </>
    );
};

export default HomeClient;
