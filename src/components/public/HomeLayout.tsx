"use client";

import React, { useState } from 'react';
import Navbar from "./Navbar";
import AppDrawer from "./AppDrawer";
import PullToRefresh from "./PullToRefresh";
import styles from "@/app/page.module.css";
import { FilterProvider } from "@/context/FilterContext";

interface HomeLayoutProps {
    children: React.ReactNode;
    categories?: any[];
    tags?: any[];
    categoryTags?: any[];
    hideCart?: boolean;
    showBack?: boolean;
}

const HomeLayout: React.FC<HomeLayoutProps> = ({ children, categories, tags, categoryTags, hideCart = false, showBack = false }) => {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    return (
        <FilterProvider>
            <div className={styles.page}>
                <Navbar onMenuClick={() => setIsDrawerOpen(true)} hideCart={hideCart} showBack={showBack} />
                <AppDrawer
                    isOpen={isDrawerOpen}
                    onClose={() => setIsDrawerOpen(false)}
                    categoriesData={categories}
                    tagsData={tags}
                    categoryTagsMap={categoryTags}
                />
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
