"use client";

import React from 'react';
import styles from './Sidebar.module.css';
import type { DashboardMode } from '@/types/shared';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ModeSwitcherProps {
    /** Currently active dashboard mode. */
    mode: DashboardMode;
    /** Called when the user clicks a different mode button. */
    onModeChange: (mode: DashboardMode) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Three-button pill that switches between Events, Ads, and Admin modes.
 *
 * Uses styles from the parent `Sidebar.module.css` so there's no visual
 * change — the component is purely a structural extraction.
 */
const ModeSwitcher: React.FC<ModeSwitcherProps> = ({ mode, onModeChange }) => {
    const modes: { key: DashboardMode; label: string }[] = [
        { key: 'events', label: 'Events' },
        { key: 'ads', label: 'Ads' },
        { key: 'admin', label: 'Admin' },
    ];

    return (
        <div className={styles.modeSwitcherPill}>
            {modes.map(({ key, label }) => (
                <button
                    key={key}
                    className={`${styles.modeBtn} ${mode === key ? styles.activeMode : ''}`}
                    onClick={() => onModeChange(key)}
                >
                    {label}
                </button>
            ))}
        </div>
    );
};

export default ModeSwitcher;
