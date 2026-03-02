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
    className?: string; // Optional for layout adjustments
}

export default function Tabs({
    options,
    activeTab,
    onTabChange,
    className
}: TabsProps) {
    return (
        <div className={`${styles.tabs} ${className || ''}`}>
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
    );
}
