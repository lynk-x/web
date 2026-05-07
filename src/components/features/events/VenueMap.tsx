"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import styles from './VenueMap.module.css';

interface VenueMapProps {
    lat: number;
    lng: number;
    className?: string;
}

/**
 * VenueMap — A secure, high-performance map visualization.
 * Proxies Mapbox Static Images through a Supabase Edge Function to avoid key exposure.
 */
export const VenueMap: React.FC<VenueMapProps> = ({ lat, lng, className }) => {
    const [mapUrl, setMapUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();

    useEffect(() => {
        let isMounted = true;
        
        async function fetchMap() {
            setIsLoading(true);
            setError(null);
            try {
                const { data, error: funcError } = await supabase.functions.invoke('venue-map', {
                    body: { lat, lng, width: 600, height: 300, zoom: 15 }
                });

                if (funcError) throw funcError;

                // The edge function returns the image blob
                const url = URL.createObjectURL(data);
                if (isMounted) setMapUrl(url);
            } catch (err) {
                console.error('Failed to fetch venue map:', err);
                if (isMounted) setError('Failed to load map visualization');
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }

        fetchMap();

        return () => {
            isMounted = false;
            if (mapUrl) URL.revokeObjectURL(mapUrl);
        };
    }, [lat, lng, supabase]);

    return (
        <div className={`${styles.mapContainer} ${className}`}>
            {isLoading ? (
                <div className={styles.loading}>
                    <div className={styles.spinner}></div>
                    <span>Generating preview...</span>
                </div>
            ) : error ? (
                <div className={styles.error}>{error}</div>
            ) : mapUrl ? (
                <img src={mapUrl} alt="Venue Location" className={styles.mapImage} />
            ) : null}
        </div>
    );
};
