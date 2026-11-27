import React from 'react';
import styles from './SkeletonEventCard.module.css';

const SkeletonEventCard: React.FC = () => {
    return (
        <div className={styles.card}>
            <div className={`${styles.imagePlaceholder} ${styles.shimmer}`} />
            <div className={styles.info}>
                <div className={styles.textGroup}>
                    <div className={`${styles.line} ${styles.lineLong} ${styles.shimmer}`} />
                    <div className={`${styles.line} ${styles.lineShort} ${styles.shimmer}`} />
                </div>
                <div className={`${styles.buttonPlaceholder} ${styles.shimmer}`} />
            </div>
        </div>
    );
};

export default SkeletonEventCard;
