"use client";

import React, { useState } from 'react';
import Navbar from "../nav/Navbar";
import AppDrawer from "../nav/AppDrawer";
import PullToRefresh from "../nav/PullToRefresh";
import styles from "@/app/page.module.css";
import { FilterProvider } from "@/context/FilterContext";

interface CategoryItem {
    id?: string;
    display_name?: string;
    name?: string;
    text?: string;
}

interface TagItem {
    id?: string;
    name?: string;
    type_id?: string | null;
    is_official?: boolean;
}

interface CategoryTagItem {
    category_id?: string;
    tag_id?: string;
}

interface HomeLayoutProps {
    children: React.ReactNode;
    categories?: (string | CategoryItem)[];
    tags?: (string | TagItem)[];
    categoryTags?: CategoryTagItem[];
    hideCart?: boolean;
    showBack?: boolean;
    hideMenu?: boolean;
}

const HomeLayout: React.FC<HomeLayoutProps> = ({ children, categories, tags, categoryTags, hideCart = false, showBack = false, hideMenu = false }) => {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    return (
        <FilterProvider>
            <div className={styles.page}>
                <Navbar onMenuClick={() => setIsDrawerOpen(true)} hideCart={hideCart} showBack={showBack} hideMenu={hideMenu} />
                <AppDrawer
                    isOpen={isDrawerOpen}
                    onClose={() => setIsDrawerOpen(false)}
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
