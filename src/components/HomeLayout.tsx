"use client";

import React, { useState } from 'react';
import Navbar from "@/components/Navbar";
import AppDrawer from "@/components/AppDrawer";
import PullToRefresh from "@/components/PullToRefresh";
import styles from "@/app/page.module.css";

interface HomeLayoutProps {
    children: React.ReactNode;
}

const HomeLayout: React.FC<HomeLayoutProps> = ({ children }) => {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    return (
        <div className={styles.page}>
            <Navbar onMenuClick={() => setIsDrawerOpen(true)} />
            <AppDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
            <main className={styles.main}>
                <PullToRefresh>
                    {children}
                </PullToRefresh>
            </main>
        </div>
    );
};

export default HomeLayout;
