"use client";

import React from 'react';
import styles from './ResourceRenderer.module.css';

interface ResourceItem {
    icon: string;
    title: string;
    content: string;
    details?: string[];
}

interface ResourceSection {
    id: string;
    title: string;
    description: string;
    items: ResourceItem[];
}

interface ResourceMetadata {
    description?: string;
    subtitle?: string;
    sections: ResourceSection[];
}

interface ResourceRendererProps {
    title: string;
    info: ResourceMetadata;
}

const ResourceSectionComponent: React.FC<ResourceSection> = ({ title, description, items }) => {
    return (
        <div className={styles.categorySection}>
            <div className={styles.sectionHeader}>
                <h2 className={styles.categoryTitle}>{title}</h2>
                <p className={styles.categoryDesc}>{description}</p>
            </div>
            <div className={styles.itemGrid}>
                {items.map((item, idx) => (
                    <div key={idx} className={styles.safetyCard}>
                        <div className={styles.cardHeader}>
                            <div className={styles.cardIcon}>{item.icon}</div>
                            <div className={styles.cardText}>
                                <h3 className={styles.cardTitle}>{item.title}</h3>
                                <p className={styles.cardContent}>{item.content}</p>
                            </div>
                        </div>
                        
                        {item.details && item.details.length > 0 && (
                            <div className={styles.cardDetails}>
                                <div className={styles.detailsDivider} />
                                <ul className={styles.detailsList}>
                                    {item.details.map((detail, dIdx) => (
                                        <li key={dIdx} className={styles.detailItem}>
                                            <span className={styles.detailDot} />
                                            {detail}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default function ResourceRenderer({ title, info }: ResourceRendererProps) {
    if (!info || !info.sections) return null;

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <h1 className={styles.title}>{title}</h1>
                {info.subtitle && <p className={styles.subtitle}>{info.subtitle}</p>}
            </header>

            <div className={styles.content}>
                {info.sections.map((section, idx) => (
                    <React.Fragment key={section.id || idx}>
                        <div id={section.id}>
                            <ResourceSectionComponent {...section} />
                        </div>
                        {idx < info.sections.length - 1 && <div className={styles.divider} />}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}
