"use client";

import React from 'react';
import styles from './Sidebar.module.css';
import { useAuth } from '@/context/AuthContext';

const SidebarUserProfile: React.FC = () => {
    const { user, profile, logout, isLoading } = useAuth();

    if (isLoading && !profile) {
        return (
            <div className={styles.footer}>
                <div className={styles.userProfile} style={{ opacity: 0.5 }}>
                    <div className={styles.avatar}>...</div>
                    <div className={styles.userInfo}>
                        <span className={styles.userName}>Loading...</span>
                    </div>
                </div>
            </div>
        );
    }

    // Fallback if no profile is found but user is logged in
    const displayName = profile?.full_name || profile?.user_name || user?.email?.split('@')[0] || 'User';
    const displayEmail = profile?.email || user?.email || '';
    const initials = profile?.full_name
        ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
        : displayName.slice(0, 2).toUpperCase();

    if (!user && !profile) return null;

    return (
        <div className={styles.footer}>
            <div className={styles.userProfile}>
                <div className={styles.avatar}>
                    {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt={displayName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                        initials
                    )}
                </div>
                <div className={styles.userInfo}>
                    <span className={styles.userName}>{displayName}</span>
                    <span className={styles.userEmail}>{displayEmail}</span>
                </div>
                <button
                    className={styles.logoutBtn}
                    onClick={logout}
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
