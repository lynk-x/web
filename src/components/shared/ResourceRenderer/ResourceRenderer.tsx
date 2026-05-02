"use client";

import React from 'react';
import styles from './ResourceRenderer.module.css';

interface ResourceItem {
    icon: string;
    title: string;
    content: string;
    details?: string[];
    imageUrl?: string;
    downloadUrl?: string;
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
        case 'shield-alert':
            return <svg {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
        case 'shield-off':
            return <svg {...props}><path d="m2 2 20 20"/><path d="M5 5a1 1 0 0 0-1 .5c0 6 8 10 8 10"/><path d="M12 22s8-4 8-10V5l-8-3-3.16 1.18"/></svg>;
        case 'lock':
            return <svg {...props}><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
        case 'user-plus':
            return <svg {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg>;
        case 'user-check':
            return <svg {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>;
        case 'user-x':
            return <svg {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="17" y1="8" x2="22" y2="13"/><line x1="22" y1="8" x2="17" y2="13"/></svg>;
        case 'users':
            return <svg {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
        case 'calendar-plus':
            return <svg {...props}><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M10 16h4"/><path d="M12 14v4"/></svg>;
        case 'help-circle':
            return <svg {...props}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
        case 'refresh-cw':
            return <svg {...props}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>;
        case 'link':
            return <svg {...props}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;
        case 'wifi-off':
            return <svg {...props}><line x1="2" y1="2" x2="22" y2="22"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.58 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><path d="M12 20h.01"/></svg>;
        case 'qr-code':
            return <svg {...props}><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>;
        case 'message-square':
            return <svg {...props}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
        case 'wallet':
            return <svg {...props}><path d="M21 12V7H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16v-5"/><path d="M3 10a2 2 0 0 1 2-2h16"/><path d="M18 11h.01"/></svg>;
        case 'arrow-up-right':
            return <svg {...props}><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>;
        case 'activity':
            return <svg {...props}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
        case 'globe':
            return <svg {...props}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
        case 'scale':
            return <svg {...props}><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/></svg>;
        case 'eye-off':
            return <svg {...props}><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>;
        case 'eye':
            return <svg {...props}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>;
        case 'smile':
            return <svg {...props}><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>;
        case 'zap':
            return <svg {...props}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
        case 'megaphone':
            return <svg {...props}><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>;
        case 'flag':
            return <svg {...props}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>;
        case 'heart':
            return <svg {...props}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>;
        case 'alert-triangle':
            return <svg {...props}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
        case 'gift':
            return <svg {...props}><polyline points="20 12 20 22 4 22 4 12"/><rect width="20" height="5" x="2" y="7"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>;
        case 'image':
            return <svg {...props}><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>;
        case 'box':
            return <svg {...props}><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>;
        case 'download':
            return <svg {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
        case 'maximize':
            return <svg {...props}><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>;
        case 'slash':
            return <svg {...props}><line x1="19" y1="5" x2="5" y2="19"/></svg>;
        case 'palette':
            return <svg {...props}><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.92 0 1.7-.39 2.3-1 .6-.6 1-1.45 1-2.4 0-1.5 1.5-3 3-3 1.23 0 2.25.98 2.3 2.21l.33-1.07C21.61 12.02 22 11.23 22 10.4 22 5.76 17.52 2 12 2z"/></svg>;
        case 'award':
            return <svg {...props}><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>;
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
                        
                        {item.imageUrl && (
                            <div className={styles.assetPreview}>
                                <img src={item.imageUrl} alt={item.title} className={styles.assetImage} />
                            </div>
                        )}

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

                        {item.downloadUrl && (
                            <div className={styles.downloadSection}>
                                <div className={styles.detailsDivider} />
                                <a 
                                    href={item.downloadUrl} 
                                    download 
                                    className={styles.downloadButton}
                                >
                                    {getIcon('download')}
                                    Download Asset
                                </a>
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
