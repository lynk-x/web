"use client";

import React, { useState, useEffect } from 'react';
import styles from './MobileNudge.module.css';

const MobileNudge: React.FC = () => {
    return (
        <div className={styles.backdrop}>
            <div className={styles.nudge}>
                <div className={styles.icon}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <div className={styles.content}>
                    <h4 className={styles.title}>Desktop Only</h4>
                    <p className={styles.message}>The organizer dashboard is optimized for large screens. Please switch to a desktop browser to manage your events.</p>
                </div>
            </div>
        </div>
    );
};

export default MobileNudge;
