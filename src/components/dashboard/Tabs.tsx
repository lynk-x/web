"use client";

import React from 'react';
import styles from './DashboardShared.module.css';

interface TabOption {
    id: string;
    label: string;
}

interface TabsProps {
    options: TabOption[];
    activeTab: string;
    onTabChange: (id: string) => void;
    className?: string;
    actions?: React.ReactNode;
}

export default function Tabs({
    options,
    activeTab,
    onTabChange,
    className,
    actions
}: TabsProps) {
    return (
        <div className={`${styles.tabs} ${className || ''}`}>
            <div className={styles.tabList}>
                {options.map((tab) => (
                    <button
                        key={tab.id}
                        className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
                        onClick={() => onTabChange(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            {actions && <div className={styles.tabActions}>{actions}</div>}
        </div>
    );
}
