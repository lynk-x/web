import React from 'react';
import HomeLayout from "@/components/public/HomeLayout";
import SkeletonEventCard from "@/components/public/SkeletonEventCard";
import styles from "./page.module.css";
import SearchBar from "@/components/public/SearchBar";

export default function Loading() {
    return (
        <HomeLayout>
            <div style={{ marginTop: '20px', marginBottom: '20px' }}>
                <SearchBar />
            </div>

            {/* Hero Skeleton (Simple Placeholder) */}
            <div style={{
                width: '100%',
                height: '70vh',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '0 0 24px 24px',
                marginBottom: '24px',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'linear-gradient(90deg, transparent 25%, rgba(255, 255, 255, 0.08) 50%, transparent 75%)',
                    backgroundSize: '200% 100%',
                    animation: 'loading 2s infinite linear'
                }} />
            </div>

            <div className={styles.container}>
                <div className={styles.grid}>
                    {Array.from({ length: 8 }).map((_, i) => (
                        <SkeletonEventCard key={i} />
                    ))}
                </div>
            </div>

            <style>{`
                @keyframes loading {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
            `}</style>
        </HomeLayout>
    );
}
