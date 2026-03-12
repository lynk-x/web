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

export default function AdminMap() {
    const supabase = createClient();
    const [isMounted, setIsMounted] = useState(false);
    const [zoom, setZoom] = useState(6);
    const [locations, setLocations] = useState<EventLocation[]>([]);

    useEffect(() => {
        setIsMounted(true);

        async function fetchLocations() {
            const { data } = await supabase
                .schema('analytics')
                .from('mv_event_performance')
                .select('id, event_title, coordinates, revenue, reports_count')
                .eq('status', 'published');

            if (data) {
                const mapped: EventLocation[] = data
                    .filter(item => item.coordinates)
                    .map(item => {
                        // Supabase returns GeoJSON for PostGIS types
                        const coords = item.coordinates as any;
                        return {
                            id: item.id,
                            name: item.event_title,
                            // GeoJSON is [lng, lat]
                            lat: coords.coordinates[1],
                            lng: coords.coordinates[0],
                            revenue: Number(item.revenue) || 0,
                            isReported: (Number(item.reports_count) || 0) > 0
                        };
                    });
                setLocations(mapped);
            }
        }

        fetchLocations();
    }, []);

    if (!isMounted) {
        return <div style={{ height: '100%', width: '100%', backgroundColor: '#1a1a1a' }}></div>;
    }

    return (
        <div style={{ height: '100%', width: '100%', overflow: 'hidden' }}>
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
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
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
