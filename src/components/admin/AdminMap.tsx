"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Circle } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Custom Marker using app theme color
const createCustomIcon = () => {
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
                    background-color: var(--color-brand-primary);
                    transform: rotate(45deg);
                    border-radius: 2px;
                "></div>
                <div style="
                    position: absolute;
                    width: 20px;
                    height: 3px;
                    background-color: var(--color-brand-primary);
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

// Expanded mock data to make clustering visible
const mockLocations = [
    { id: 1, name: "Nairobi Tech Summit", lat: -1.2921, lng: 36.8219, revenue: "KES 500,000" },
    { id: 2, name: "Mombasa Music Fest", lat: -4.0435, lng: 39.6682, revenue: "KES 750,000" },
    { id: 3, name: "Kisumu Art Expo", lat: -0.0917, lng: 34.7680, revenue: "KES 200,000" },
    { id: 4, name: "Nakuru Rugby Sevens", lat: -0.3031, lng: 36.0800, revenue: "KES 350,000" },
    { id: 5, name: "Eldoret Marathon", lat: 0.5143, lng: 35.2698, revenue: "KES 300,000" },
    { id: 6, name: "Thika Motor Show", lat: -1.0388, lng: 37.0734, revenue: "KES 450,000" },
    { id: 7, name: "Nairobi Food Festival", lat: -1.3000, lng: 36.7800, revenue: "KES 600,000" }, // Close to Nairobi Tech Summit
    { id: 8, name: "Nairobi Jazz", lat: -1.2800, lng: 36.8100, revenue: "KES 550,000" }, // Close to Nairobi Tech Summit
];

export default function AdminMap() {
    const [isMounted, setIsMounted] = useState(false);
    const [zoom, setZoom] = useState(6);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return <div style={{ height: '100%', width: '100%', backgroundColor: '#1a1a1a' }}></div>;
    }

    const customIcon = createCustomIcon();

    return (
        <div style={{ height: '100%', width: '100%', overflow: 'hidden' }}>
            <MapContainer
                center={[-1.2921, 36.8219]}
                zoom={6}
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

                {zoom >= 15 && mockLocations.map(loc => (
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
                    {mockLocations.map(loc => (
                        <Marker key={loc.id} position={[loc.lat, loc.lng]} icon={customIcon}>
                            <Popup>
                                <strong>{loc.name}</strong><br />
                                Revenue: {loc.revenue}
                            </Popup>
                        </Marker>
                    ))}
                </MarkerClusterGroup>
            </MapContainer>
        </div>
    );
}
