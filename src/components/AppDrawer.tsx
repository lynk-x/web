import React from 'react';
import styles from './AppDrawer.module.css';

interface AppDrawerProps {
    /** Whether the drawer is currently open. */
    isOpen: boolean;
    /** Callback function to close the drawer. */
    onClose: () => void;
}

/**
 * AppDrawer component that slides in from the left side of the screen.
 * It contains filters for events (Calendar, Categories, Tags) and footer links.
 *
 * @param {AppDrawerProps} props - Component properties.
 */
const AppDrawer: React.FC<AppDrawerProps> = ({ isOpen, onClose }) => {
    return (
        <>
            <div
                className={`${styles.overlay} ${isOpen ? styles.overlayOpen : ''}`}
                onClick={onClose}
            />
            <div className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''}`}>
                {/* Calendar Section */}
                <div className={styles.section}>
                    <div className={styles.calendarHeader}>
                        <span className={styles.monthYear}>February 2026</span>
                        <div className={styles.calendarControls}>
                            <svg className={styles.arrow} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M8 7V3M16 7V3M3 11H21M5 19H19C20.1046 19 21 18.1046 21 17V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V17C3 18.1046 3.89543 19 5 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <svg className={styles.arrow} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </div>
                    <div className={styles.calendarGrid}>
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                            <span key={day} className={styles.dayName}>{day}</span>
                        ))}
                        {/* Mock numbers as per screenshot */}
                        <span className={styles.dayNum}>9</span>
                        <span className={`${styles.dayNum} ${styles.today}`}>10</span>
                        <span className={styles.dayNum}>11</span>
                        <span className={styles.dayNum}>12</span>
                        <span className={styles.dayNum}>13</span>
                        <span className={styles.dayNum}>14</span>
                        <span className={styles.dayNum}>15</span>
                    </div>
                </div>

                {/* Categories Section */}
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Categories:</h3>
                    <div className={styles.filterList}>
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} className={styles.filterItem}>
                                <div className={`${styles.checkbox} ${i === 0 ? styles.checkboxChecked : ''}`}>
                                    {i === 0 && (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )}
                                </div>
                                <span>[eventcategories {i}]</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tags Section */}
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Tags:</h3>
                    <div className={styles.tagGrid}>
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} className={`${styles.tagPill} ${i === 0 ? styles.tagPillSelected : ''}`}>
                                [Sorted tagFilter(a, b) by Item in List {i}]
                            </div>
                        ))}
                    </div>
                </div>

                {/* Action Buttons */}
                <button className={styles.refreshBtn}>Refresh events</button>

                {/* Footer */}
                <footer className={styles.footer}>
                    <div className={styles.footerLinks}>
                        <span>Privacy policy</span>
                        <span>Terms & condition</span>
                    </div>
                    <span className={styles.copyright}>©Lynk-x.app</span>
                </footer>
            </div>
        </>
    );
};

export default AppDrawer;
