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

const getIcon = (name: string) => {
    const props = {
        width: "24",
        height: "24",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round" as const,
        strokeLinejoin: "round" as const
    };

    switch (name) {
        case 'ticket':
            return <svg {...props}><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>;
        case 'credit-card':
            return <svg {...props}><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>;
        case 'bar-chart':
            return <svg {...props}><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></svg>;
        case 'banknote':
            return <svg {...props}><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><line x1="6" y1="12" x2="6.01" y2="12"/><line x1="18" y1="12" x2="18.01" y2="12"/></svg>;
        case 'shield-check':
            return <svg {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>;
        case 'lock':
            return <svg {...props}><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
        case 'user-plus':
            return <svg {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg>;
        case 'user-check':
            return <svg {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>;
        case 'calendar-plus':
            return <svg {...props}><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M10 16h4"/><path d="M12 14v4"/></svg>;
        case 'help-circle':
            return <svg {...props}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
        case 'refresh-cw':
            return <svg {...props}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>;
        case 'link':
            return <svg {...props}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;
        default:
            // Fallback for emojis or unknown strings
            return <span>{name}</span>;
    }
};

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
                            <div className={styles.cardIcon}>
                                {getIcon(item.icon)}
                            </div>
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
