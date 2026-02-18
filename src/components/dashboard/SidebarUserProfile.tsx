"use client";

import React from 'react';
import styles from './Sidebar.module.css';

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Sidebar footer showing the logged-in user's avatar, name, email,
 * and a logout button.
 *
 * Currently hardcoded — connect to auth context when available.
 */
const SidebarUserProfile: React.FC = () => {
    return (
        <div className={styles.footer}>
            <div className={styles.userProfile}>
                <div className={styles.avatar}>JD</div>
                <div className={styles.userInfo}>
                    <span className={styles.userName}>John Doe</span>
                    <span className={styles.userEmail}>john@doe.com</span>
                </div>
                <button
                    className={styles.logoutBtn}
                    onClick={() => console.log('Logout clicked')}
                    aria-label="Log out"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default SidebarUserProfile;
