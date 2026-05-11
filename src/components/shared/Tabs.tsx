"use client";

import React from 'react';
import styles from './Tabs.module.css';

interface TabsProps {
    defaultValue: string;
    children: React.ReactNode;
    className?: string;
}

interface TabsListProps {
    children: React.ReactNode;
    className?: string;
}

interface TabsTriggerProps {
    value: string;
    children: React.ReactNode;
    className?: string;
}

interface TabsContentProps {
    value: string;
    children: React.ReactNode;
    className?: string;
}

const TabsContext = React.createContext<{
    value: string;
    setValue: (val: string) => void;
} | null>(null);

export const Tabs: React.FC<TabsProps> = ({ defaultValue, children, className }) => {
    const [value, setValue] = React.useState(defaultValue);
    return (
        <TabsContext.Provider value={{ value, setValue }}>
            <div className={className}>{children}</div>
        </TabsContext.Provider>
    );
};

export const TabsList: React.FC<TabsListProps> = ({ children, className }) => {
    return <div className={className || styles.tabsList}>{children}</div>;
};

export const TabsTrigger: React.FC<TabsTriggerProps> = ({ value, children, className }) => {
    const context = React.useContext(TabsContext);
    if (!context) return null;

    const isActive = context.value === value;
    return (
        <button
            type="button"
            className={`${className || styles.tab} ${isActive ? styles.tabActive : ''}`}
            onClick={() => context.setValue(value)}
        >
            {children}
        </button>
    );
};

export const TabsContent: React.FC<TabsContentProps> = ({ value, children, className }) => {
    const context = React.useContext(TabsContext);
    if (!context || context.value !== value) return null;

    return <div className={className}>{children}</div>;
};
