"use client";

import React, { useState } from 'react';
import Navbar from "./Navbar";
import AppDrawer from "./AppDrawer";
import PullToRefresh from "./PullToRefresh";
import styles from "@/app/page.module.css";
import { FilterProvider } from "@/context/FilterContext";

interface HomeLayoutProps {
    children: React.ReactNode;
}

const HomeLayout: React.FC<HomeLayoutProps> = ({ children }) => {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    return (
        <FilterProvider>
            <div className={styles.page}>
                <Navbar onMenuClick={() => setIsDrawerOpen(true)} />
                <AppDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
                <main className={styles.main}>
                    <PullToRefresh>
                        {children}
                    </PullToRefresh>
                </main>
            </div>
        </FilterProvider>
    );
};

export default HomeLayout;
