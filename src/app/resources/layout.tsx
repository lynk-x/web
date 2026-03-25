"use client";

import React, { useState } from 'react';
import Navbar from "@/components/public/Navbar";
import AppDrawer from "@/components/public/AppDrawer";
import ResourceSidebar from "./ResourceSidebar";
import styles from "./layout.module.css";
import { FilterProvider } from "@/context/FilterContext";
import { AuthProvider } from '@/context/AuthContext';

export default function ResourceLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    return (
        <AuthProvider>
            <FilterProvider>
                <div className={styles.page}>
                    <Navbar 
                        onMenuClick={() => setIsDrawerOpen(true)} 
                        hideCart={true} 
                        showBack={true} 
                    />
                    <AppDrawer
                        isOpen={isDrawerOpen}
                        onClose={() => setIsDrawerOpen(false)}
                    />
                    <div className={styles.layoutWrapper}>
                        <div className={styles.container}>
                            <ResourceSidebar />
                            <main className={styles.mainContent}>
                                <div className={styles.contentInner}>
                                    {children}
                                </div>
                            </main>
                        </div>
                    </div>
                </div>
            </FilterProvider>
        </AuthProvider>
    );
}
