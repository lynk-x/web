'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

export interface RegionalData {
    country_code: string;
    volume: number;
    sentiment: number;
}

export interface PulseExplorerMapProps {
    data: RegionalData[];
    isLoading: boolean;
}

// Country coordinates mapping (Simplified for demonstration)
const countryCoords: Record<string, [number, number]> = {
    'KE': [-1.2921, 36.8219],
    'NG': [9.0820, 8.6753],
    'GH': [7.9465, -1.0232],
    'ZA': [-30.5595, 22.9375],
    'RW': [-1.9403, 29.8739],
    'UG': [1.3733, 32.2903],
    'TZ': [-6.3690, 34.8888],
    'ET': [9.1450, 40.4897],
};

function ChangeView({ center }: { center: [number, number] }) {
    const map = useMap();
    map.setView(center);
    return null;
}

export default function PulseExplorerMap({ data, isLoading }: PulseExplorerMapProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) return <div style={{ height: '100%', background: '#1a1a1a' }} />;

    return (
        <div style={{ height: '100%', width: '100%', position: 'relative', borderRadius: '16px', overflow: 'hidden' }}>
            {isLoading && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 1000,
                    background: 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                }}>
                    Syncing Regional Intent...
                </div>
            )}
            
            <MapContainer
                center={[1.3733, 32.2903]}
                zoom={4}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
                />

                {data.map((reg) => {
                    const coords = countryCoords[reg.country_code];
                    if (!coords) return null;

// Calculate radius based on volume
                     const radius = Math.max(10, Math.min(50, Math.sqrt(reg.volume) / 2));
                     // Color based on sentiment (Red to Green)
                     const sentiment = reg.sentiment ?? 0;
                     const hue = ((sentiment + 1) / 2) * 120; // -1 -> 0 (Red), 0 -> 60 (Yellow), 1 -> 120 (Green)
                    const color = `hsl(${hue}, 80%, 50%)`;

                    return (
                        <CircleMarker
                            key={reg.country_code}
                            center={coords}
                            radius={radius}
                            pathOptions={{
                                fillColor: color,
                                color: color,
                                weight: 1,
                                opacity: 0.8,
                                fillOpacity: 0.3
                            }}
                        >
                            <Popup>
                                <div style={{ minWidth: '120px' }}>
                                    <div style={{ fontWeight: 700, marginBottom: '4px' }}>{reg.country_code} Market</div>
                                    <div style={{ fontSize: '13px' }}>Volume: {reg.volume.toLocaleString()}</div>
                                    <div style={{ fontSize: '13px' }}>Sentiment: {(sentiment * 100).toFixed(1)}%</div>
                                </div>
                            </Popup>
                        </CircleMarker>
                    );
                })}
            </MapContainer>
        </div>
    );
}
