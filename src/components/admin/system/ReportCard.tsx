"use client";

import React from 'react';
import styles from './ReportCard.module.css';

export type { Report } from '@/types/admin';
import type { Report } from '@/types/admin';

interface ReportCardProps {
    report: Report;
}

const ReportCard: React.FC<ReportCardProps> = ({ report }) => {
    const getTypeClass = (type: string) => {
        switch (type) {
            case 'content': return styles.typeContent;
            case 'bug': return styles.typeBug;
            case 'user': return styles.typeUser;
            case 'system': return styles.typeSystem;
            default: return '';
        }
    };

    const getStatusIndicatorClass = (status: string) => {
        switch (status) {
            case 'open': return styles.statusOpen;
            case 'in_review': return styles.statusReview;
            case 'resolved': return styles.statusResolved;
            default: return '';
        }
    };

    const getStatusLabel = (status: string) => {
        return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <span className={`${styles.typeBadge} ${getTypeClass(report.type)}`}>
                    {report.type}
                </span>
                <span className={styles.date}>{report.date}</span>
            </div>

            <h3 className={styles.title}>{report.title}</h3>
            <p className={styles.description}>{report.description}</p>

            <div className={styles.footer}>
                <div className={styles.reporter}>
                    <span>By: {report.reporter}</span>
                </div>
                <div className={styles.status}>
                    <span className={`${styles.statusIndicator} ${getStatusIndicatorClass(report.status)}`}></span>
                    {getStatusLabel(report.status)}
                </div>
            </div>
        </div>
    );
};

export default ReportCard;
