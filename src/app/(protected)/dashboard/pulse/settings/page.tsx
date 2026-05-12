"use client";
import { Suspense } from "react";
import { PulseDashboardContent } from "../Overview";
import styles from "../page.module.css";

export default function Page() {
    return (
        <Suspense fallback={<div className={styles.loading}>Loading Intelligence...</div>}>
            <PulseDashboardContent initialTab="settings" />
        </Suspense>
    );
}
