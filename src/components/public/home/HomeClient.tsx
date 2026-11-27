"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import SearchBar from "../nav/SearchBar";
import HeroSection from "../shared/HeroSection";
import EventGrid from "../event/Grid";
import styles from '@/app/page.module.css';
import { Event } from '@/types';
import Footer from "../shared/Footer";
import { useFilters } from '@/context/FilterContext';
import { createClient } from '@/utils/supabase/client';

interface CategoryItem {
    id: string;
    display_name: string;
    name?: string;
}

interface TagItem {
    id: string;
    name: string;
    type_id?: string | null;
}

interface CategoryTagItem {
    category_id: string;
    tag_id: string;
}

interface SearchEventRpcRow {
    id: string;
    title: string;
    description: string;
    start_datetime: string;
    end_datetime: string;
    timezone?: string;
    location: Record<string, unknown>;
    media: Record<string, unknown>;
    category_name?: string;
    account_id?: string;
    currency?: string;
    reference: string;
}

interface HomeClientProps {
    carouselEvents: Event[];
    allEvents: Event[];
    categories?: CategoryItem[];
    tags?: TagItem[];
    categoryTags?: CategoryTagItem[];
    basePath?: string;
}

/**
 * Interactive event discovery shell for `/events`. Syncs `?q=` and `?page=` URL
 * parameters with search/pagination state and renders the filtered event grid.
 */
const HomeClient: React.FC<HomeClientProps> = ({
    carouselEvents,
    allEvents,
    categories,
    tags,
    categoryTags,
    basePath = '/events',
}) => {
    const searchParams = useSearchParams();
    const urlQ = searchParams.get('q') ?? '';
    const rawPage = Number(searchParams.get('page') || '1');
    const parsedPage = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;

    const [rpcEvents, setRpcEvents] = useState<Event[] | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const prevUrlQRef = useRef<string | null>(null);
    const supabase = React.useMemo(() => createClient(), []);

    const { searchTerm, setSearchTerm, selectedCategories, selectedDates, selectedTags, userLocation } = useFilters();

    useEffect(() => {
        if (prevUrlQRef.current !== urlQ) {
            prevUrlQRef.current = urlQ;
            if (urlQ) {
                setSearchTerm(urlQ);
            }
        }
    }, [urlQ, setSearchTerm]);

    const isRpcActive = searchTerm.trim() !== '' || selectedCategories.length > 0 || userLocation !== null;
    const hasActiveFilters = isRpcActive || selectedDates.length > 0 || selectedTags.length > 0;

    // Resolve category display name → UUID for the RPC
    const resolveCategoryId = (name: string): string | null =>
        (categories ?? []).find((c) => c.display_name === name || c.name === name)?.id ?? null;

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

                const params: Record<string, string | number> = { p_limit: 40 };
                if (searchTerm.trim()) params.p_query = searchTerm.trim();
                if (userLocation) {
                    params.p_lat = userLocation.lat;
                    params.p_lng = userLocation.lng;
                    params.p_radius_km = 50;
                }
                if (categoryId) params.p_category = categoryId;

                const { data, error } = await supabase.schema('api').rpc('search_events', params);
                if (error) throw error;

                const mapped: Event[] = ((data ?? []) as SearchEventRpcRow[]).map((r) => ({
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

    const finalCarouselEvents = React.useMemo(() => {
        const unique = carouselEvents.filter((event, index, self) =>
            self.findIndex(e => e.id === event.id || e.reference === event.reference) === index
        );
        return unique;
    }, [carouselEvents]);

    const finalGridEvents = React.useMemo(() => {
        return allEvents;
    }, [allEvents]);

    // When RPC is not active, apply local filters over pre-fetched events
    const locallyFiltered = finalGridEvents.filter(event => {
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

    // Apply search/tags/dates filters dynamically
    const displayEvents = React.useMemo(() => {
        if (isRpcActive) {
            let base = rpcEvents;
            if (base === null) {
                // Client-side search fallback over all grid and carousel events when RPC fails/empty
                const searchLower = searchTerm.toLowerCase();
                base = [
                    ...finalGridEvents,
                    ...finalCarouselEvents
                ].filter(e =>
                    e.title.toLowerCase().includes(searchLower) ||
                    e.description?.toLowerCase().includes(searchLower) ||
                    e.category?.toLowerCase().includes(searchLower)
                );
            }

            return base.filter(event => {
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
            });
        }
        return locallyFiltered;
    }, [isRpcActive, rpcEvents, searchTerm, finalGridEvents, finalCarouselEvents, locallyFiltered, selectedTags, selectedDates]);

    return (
        <>
            <h1 className={styles.srOnly}>Upcoming Events &amp; Tickets on Lynk-X</h1>
            <div className={styles.searchWrapper}>
                <SearchBar
                    categories={categories}
                    tags={tags}
                    categoryTags={categoryTags}
                />
            </div>

            <div className={styles.heroWrapper}>
                <HeroSection featuredEvents={finalCarouselEvents} />
            </div>

            <div className={styles.container}>
                <EventGrid
                    events={displayEvents}
                    itemsPerPage={12}
                    isLoading={isSearching}
                    basePath={basePath}
                    initialPage={parsedPage}
                    useUrlPagination={!hasActiveFilters}
                />

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
            <Footer />
        </>
    );
};

export default HomeClient;
