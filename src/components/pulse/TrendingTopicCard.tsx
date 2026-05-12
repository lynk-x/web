'use client';

import React from 'react';
import styles from './TrendingTopicCard.module.css';
import Link from 'next/link';

interface TrendingTopic {
    id: string;
    display_name: string;
    category_id: string;
    volume_count: number;
    sentiment_score: number;
    velocity: number;
}

interface TrendingTopicCardProps {
    topic: TrendingTopic;
}

export default function TrendingTopicCard({ topic }: TrendingTopicCardProps) {
    const isRising = (topic.velocity ?? 0) > 0;

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <span className={styles.category}>{topic.category_id.toUpperCase()}</span>
                <span className={`${styles.velocity} ${isRising ? styles.rising : styles.falling}`}>
                    {isRising ? '↑' : '↓'} {Math.abs(topic.velocity ?? 0).toFixed(1)}%
                </span>
            </div>
            
            <h3 className={styles.title}>{topic.display_name}</h3>
            
            <div className={styles.metrics}>
                <div className={styles.metric}>
                    <span className={styles.metricLabel}>Volume</span>
                    <span className={styles.metricValue}>{topic.volume_count?.toLocaleString() ?? '0'}</span>
                </div>
                <div className={styles.metric}>
                    <span className={styles.metricLabel}>Sentiment</span>
                    <span className={styles.metricValue}>
                        {(topic.sentiment_score != null ? (topic.sentiment_score * 100).toFixed(0) : '0')}%
                    </span>
                </div>
            </div>

            <Link href={`/dashboard/pulse/explorer?topic=${topic.id}`} className={styles.action}>
                Analyze Trend
            </Link>
        </div>
    );
}
