import React from 'react';
import Skeleton from './Skeleton';
import styles from './EventCard.module.css'; // Reuse EventCard styles for layout

/**
 * SkeletonEventCard component that mimics the structure of the EventCard.
 * Used to display a loading state for a list of events.
 */
const SkeletonEventCard = () => {
    return (
        <div className={styles.card}>
            <div className={styles.imagePlaceholder}>
                <Skeleton width="100%" height="100%" borderRadius="12px 12px 0 0" />
            </div>
            <div className={styles.info}>
                <div className={styles.textGroup}>
                    <Skeleton width="80%" height="24px" className={styles.name} style={{ marginBottom: 8 }} />
                    <Skeleton width="60%" height="16px" className={styles.date} style={{ marginBottom: 8 }} />
                    <Skeleton width="40%" height="16px" className={styles.category} />
                </div>
                <div className={styles.detailsBtn}>
                    <Skeleton width="80px" height="20px" />
                </div>
            </div>
        </div>
    );
};

export default SkeletonEventCard;
