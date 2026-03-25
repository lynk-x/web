import React, { ReactNode } from 'react';
import Link from 'next/link';
import styles from './EmptyStateGuide.module.css';

interface EmptyStateGuideProps {
    title: string;
    description: string;
    icon?: ReactNode;
    actionLabel?: string;
    actionHref?: string;
    actionOnClick?: () => void;
}

const EmptyStateGuide: React.FC<EmptyStateGuideProps> = ({
    title,
    description,
    icon,
    actionLabel,
    actionHref,
    actionOnClick
}) => {
    return (
        <div className={styles.container}>
            <div className={styles.iconWrapper}>
                {icon || (
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                )}
            </div>
            <h3 className={styles.title}>{title}</h3>
            <p className={styles.description}>{description}</p>
            
            {actionLabel && (actionHref || actionOnClick) && (
                <div className={styles.actionWrapper}>
                    {actionHref ? (
                        <Link href={actionHref} className={styles.primaryBtn}>
                            {actionLabel}
                        </Link>
                    ) : (
                        <button onClick={actionOnClick} className={styles.primaryBtn}>
                            {actionLabel}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default EmptyStateGuide;
