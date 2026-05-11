'use client';

import styles from './page.module.css';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import { useState } from 'react';

export default function PulseReports() {
    // Mock data for reports - In a real app, this would be fetched from a 'pulse.reports' table
    const reports = [
        { id: '1', name: 'Q1 2026 Entertainment Intent Summary', date: '2026-04-15', format: 'PDF', size: '2.4 MB' },
        { id: '2', name: 'March 2026 Music Trend Velocity - East Africa', date: '2026-04-01', format: 'CSV', size: '1.1 MB' },
        { id: '3', name: 'Global Tech Sentiment Analysis', date: '2026-03-20', format: 'JSON', size: '850 KB' },
    ];

    return (
        <div className={sharedStyles.fadeContent}>
            <PageHeader
                title="Reports & Exports"
                subtitle="Access generated market insights and download raw data snapshots."
            />

            <div className={styles.reportControls}>
                <button className={styles.primaryBtn}>Generate Custom Report</button>
                <button className={styles.secondaryBtn}>Export All Raw Data (CSV)</button>
            </div>

            <section className={styles.reportsSection}>
                <h3 className={styles.sectionTitle}>Recent Insights</h3>
                <div className={styles.reportTable}>
                    <div className={styles.tableHeader}>
                        <span>Report Name</span>
                        <span>Generated Date</span>
                        <span>Format</span>
                        <span>Action</span>
                    </div>
                    {reports.map((report) => (
                        <div key={report.id} className={styles.tableRow}>
                            <div className={styles.reportName}>
                                <span className={styles.icon}>📄</span>
                                {report.name}
                            </div>
                            <span className={styles.date}>{report.date}</span>
                            <span className={styles.format}>{report.format}</span>
                            <button className={styles.downloadBtn}>Download</button>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
