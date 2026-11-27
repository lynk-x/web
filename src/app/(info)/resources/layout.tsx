"use client";

import React, { useState } from 'react';
import Navbar from "@/components/public/nav/Navbar";
import AppDrawer from "@/components/public/nav/AppDrawer";
import Footer from "@/components/public/shared/Footer";
import styles from "./layout.module.css";
import { FilterProvider } from "@/context/FilterContext";

/**
 * Shared layout shell for the public Resource Hub and individual resource pages.
 */
export default function ResourceLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    return (
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
                    <main className={styles.mainContent}>
                        <div className={styles.contentInner}>
                            {children}
                        </div>
                    </main>
                </div>
                <Footer />
            </div>
        </FilterProvider>
    );
}
