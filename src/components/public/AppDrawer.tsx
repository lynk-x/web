"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import styles from './AppDrawer.module.css';

interface AppDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

const AppDrawer: React.FC<AppDrawerProps> = ({
    isOpen,
    onClose
}) => {
    const [language, setLanguage] = useState('English');
    const [region, setRegion] = useState('Global');

    return (
        <>
            <div
                className={`${styles.overlay} ${isOpen ? styles.overlayOpen : ''}`}
                onClick={onClose}
            />
            <div className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''}`}>
                <div className={styles.drawerHeader}>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                    <span className={styles.headerTitle}>Menu</span>
                </div>

                <div className={styles.drawerContent}>
                    {/* Dashboard Portals Section */}
                    <div className={styles.menuSection}>
                        <h3 className={styles.menuSectionTitle}>Dashboards</h3>
                        <div className={styles.portalGrid}>
                            <Link href="/dashboard/organize" className={styles.portalItem} onClick={onClose}>
                                <div className={`${styles.portalIcon} ${styles.organizerIcon}`}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                        <circle cx="9" cy="7" r="4" />
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                    </svg>
                                </div>
                                <div className={styles.portalText}>
                                    <span className={styles.portalTitle}>Organizers</span>
                                    <span className={styles.portalDesc}>Manage your events</span>
                                </div>
                            </Link>

                            <Link href="/dashboard/ads" className={styles.portalItem} onClick={onClose}>
                                <div className={`${styles.portalIcon} ${styles.adsIcon}`}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                                        <line x1="8" y1="21" x2="16" y2="21" />
                                        <line x1="12" y1="17" x2="12" y2="21" />
                                    </svg>
                                </div>
                                <div className={styles.portalText}>
                                    <span className={styles.portalTitle}>Ad Center</span>
                                    <span className={styles.portalDesc}>Manage your ads</span>
                                </div>
                            </Link>
                        </div>
                    </div>

                    <div className={styles.menuDivider} />

                    {/* Resources Section */}
                    <div className={styles.menuSection}>
                        <h3 className={styles.menuSectionTitle}>Organizer Resources</h3>
                        <ul className={styles.resourceList}>
                            <li className={styles.resourceItem}>
                                <Link href="/resources/guide" onClick={onClose}>
                                    Hosting Guide
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                </Link>
                            </li>
                            <li className={styles.resourceItem}>
                                <Link href="/resources/pricing" onClick={onClose}>
                                    Pricing & Fees
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                </Link>
                            </li>
                            <li className={styles.resourceItem}>
                                <Link href="/resources/safety" onClick={onClose}>
                                    Safety & Security
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                </Link>
                            </li>
                            <li className={styles.resourceItem}>
                                <Link href="/help" onClick={onClose}>
                                    Help Center
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div className={styles.spacer} />

                    <div className={styles.menuDivider} />

                    {/* Preferences Section */}
                    <div className={styles.menuSection}>
                        <h3 className={styles.menuSectionTitle}>Preferences</h3>
                        <div className={styles.preferenceItem}>
                            <div className={styles.preferenceInfo}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="2" y1="12" x2="22" y2="12" />
                                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10" />
                                </svg>
                                <span>Language</span>
                            </div>
                            <select 
                                className={styles.preferenceSelect}
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                            >
                                <option>English</option>
                                <option>Spanish</option>
                                <option>French</option>
                                <option>German</option>
                            </select>
                        </div>

                        <div className={styles.preferenceItem}>
                            <div className={styles.preferenceInfo}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                    <circle cx="12" cy="10" r="3" />
                                </svg>
                                <span>Region</span>
                            </div>
                            <select 
                                className={styles.preferenceSelect}
                                value={region}
                                onChange={(e) => setRegion(e.target.value)}
                            >
                                <option>Global</option>
                                <option>North America</option>
                                <option>Europe</option>
                                <option>Africa</option>
                                <option>Asia</option>
                            </select>
                        </div>
                    </div>
                </div>

            </div>
        </>
    );
};

export default AppDrawer;
