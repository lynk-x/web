"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Circle } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { createClient } from '@/utils/supabase/client';

// Custom Marker using app theme color
const createCustomIcon = (isReported: boolean = false) => {
    const color = isReported ? 'var(--color-interface-error)' : 'var(--color-brand-primary)';
    return L.divIcon({
        className: 'custom-marker',
        html: `
            <div style="
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
            ">
                <div style="
                    position: absolute;
                    width: 20px;
                    height: 3px;
                    background-color: ${color};
                    transform: rotate(45deg);
                    border-radius: 2px;
                "></div>
                <div style="
                    position: absolute;
                    width: 20px;
                    height: 3px;
                    background-color: ${color};
                    transform: rotate(-45deg);
                    border-radius: 2px;
                "></div>
            </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
    });
};

function ZoomTracker({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
    useMapEvents({
        zoomend: (e) => {
            onZoomChange(e.target.getZoom());
        },
    });
    return null;
}

interface EventLocation {
    id: string;
    name: string;
    lat: number;
    lng: number;
    revenue: number;
    isReported: boolean;
}

const supabase = createClient();

export default function AdminMap() {
    const [isMounted, setIsMounted] = useState(false);
    const [zoom, setZoom] = useState(6);
    const [locations, setLocations] = useState<EventLocation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setIsMounted(true);

        async function fetchLocations() {
            try {
                setIsLoading(true);
                const { data, error: queryError } = await supabase
                    .schema('analytics')
                    .from('mv_event_performance')
                    .select('id, event_title, coordinates, revenue, reports_count')
                    .eq('status', 'published');

                if (queryError) {
                    console.error('AdminMap: Error fetching event performance data:', queryError);
                    setError(queryError.message);
                    return;
                }

                if (data) {
                    const mapped: EventLocation[] = data
                        .filter(item => item.coordinates)
                        .map(item => {
                            try {
                                // Supabase returns GeoJSON for PostGIS types
                                const coords = item.coordinates as any;
                                if (!coords || !coords.coordinates || coords.coordinates.length < 2) {
                                    return null;
                                }
                                return {
                                    id: item.id,
                                    name: item.event_title,
                                    // GeoJSON is [lng, lat]
                                    lat: coords.coordinates[1],
                                    lng: coords.coordinates[0],
                                    revenue: Number(item.revenue) || 0,
                                    isReported: (Number(item.reports_count) || 0) > 0
                                };
                            } catch (err) {
                                console.error('AdminMap: Failed to parse coordinates for item', item.id, err);
                                return null;
                            }
                        })
                        .filter((item): item is EventLocation => item !== null);
                    
                    setLocations(mapped);
                }
            } catch (err) {
                console.error('AdminMap: Unexpected error in fetchLocations:', err);
                setError('An unexpected error occurred while loading map data.');
            } finally {
                setIsLoading(false);
            }
        }

        fetchLocations();
    }, []);

    if (!isMounted) return <div style={{ height: '100%', width: '100%', backgroundColor: '#1a1a1a' }}></div>;

    return (
        <div style={{ height: '100%', width: '100%', overflow: 'hidden', position: 'relative' }}>
            {isLoading && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 1000,
                    background: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-brand-primary)',
                    backdropFilter: 'blur(4px)',
                    fontSize: '14px',
                    fontWeight: 500
                }}>
                    <span style={{ marginRight: '10px' }}>⚡</span> Syncing live activity...
                </div>
            )}
            {error && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 1001,
                    background: 'rgba(255, 59, 48, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-interface-error)',
                    padding: '20px',
                    textAlign: 'center',
                    backdropFilter: 'blur(8px)'
                }}>
                    <span style={{ fontSize: '24px', marginBottom: '10px' }}>⚠️</span>
                    <div style={{ fontWeight: 600 }}>Sync Failed</div>
                    <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>{error}</div>
                </div>
            )}
            <MapContainer
                center={[-1.2921, 36.8219]}
                zoom={5}
                minZoom={3}
                maxBounds={[[-90, -180], [90, 180]]}
                maxBoundsViscosity={1.0}
                worldCopyJump={false}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
            >
                <ZoomTracker onZoomChange={setZoom} />
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
                    noWrap={true}
                    bounds={[[-90, -180], [90, 180]]}
                />

                {zoom >= 15 && locations.map(loc => (
                    <Circle
                        key={`halo-${loc.id}`}
                        center={[loc.lat, loc.lng]}
                        radius={100}
                        pathOptions={{
                            fillColor: 'var(--color-brand-secondary)',
                            color: 'var(--color-brand-secondary)',
                            weight: 1,
                            opacity: 0.3,
                            fillOpacity: 0.2
                        }}
                    />
                ))}

                <MarkerClusterGroup
                    chunkedLoading
                    polygonOptions={{
                        fillColor: 'var(--color-brand-primary)',
                        color: 'var(--color-brand-primary)',
                        weight: 1,
                        opacity: 1,
                        fillOpacity: 0.3,
                    }}
                >
                    {locations.map(loc => (
                        <Marker key={loc.id} position={[loc.lat, loc.lng]} icon={createCustomIcon(loc.isReported)}>
                            <Popup>
                                <div style={{ minWidth: '150px' }}>
                                    <div style={{ fontWeight: 700, marginBottom: '4px', color: loc.isReported ? 'var(--color-interface-error)' : 'inherit' }}>
                                        {loc.name}
                                        {loc.isReported && <span style={{ marginLeft: '8px', fontSize: '10px', background: 'rgba(255, 0, 0, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>FLAGGED</span>}
                                    </div>
                                    <div style={{ fontSize: '13px', opacity: 0.8 }}>
                                        Revenue: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KES' }).format(loc.revenue)}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MarkerClusterGroup>
            </MapContainer>
        </div>
    );
}
