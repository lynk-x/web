"use client";

import React from 'react';
import adminStyles from '../../app/dashboard/admin/page.module.css';
import styles from './DateRangeRow.module.css';

interface DateRangeRowProps {
    startDate: string;
    endDate: string;
    onStartDateChange: (date: string) => void;
    onEndDateChange: (date: string) => void;
    onClear: () => void;
}

const DateRangeRow: React.FC<DateRangeRowProps> = ({
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
    onClear
}) => {
    return (
        <div className={styles.container}>
            <div className={styles.group}>
                <div className={styles.inputWrapper}>
                    <label className={styles.label}>From</label>
                    <div className={styles.relative}>
                        <svg className={styles.calendarIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <input
                            type="date"
                            className={`${adminStyles.input} ${styles.dateInput}`}
                            value={startDate}
                            onChange={(e) => onStartDateChange(e.target.value)}
                        />
                    </div>
                </div>
                <div className={styles.inputWrapper}>
                    <label className={styles.label}>To</label>
                    <div className={styles.relative}>
                        <svg className={styles.calendarIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <input
                            type="date"
                            className={`${adminStyles.input} ${styles.dateInput}`}
                            value={endDate}
                            onChange={(e) => onEndDateChange(e.target.value)}
                        />
                    </div>
                </div>
                {(startDate || endDate) && (
                    <button className={adminStyles.btnSecondary} onClick={onClear} style={{ padding: '8px 16px', fontSize: '13px' }}>
                        Clear
                    </button>
                )}
            </div>
        </div>
    );
};

export default DateRangeRow;
