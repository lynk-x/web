"use client";

import React from 'react';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';
import styles from './DateRangeRow.module.css';

import { formatDate } from '@/utils/format';

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
    const [focusedField, setFocusedField] = React.useState<string | null>(null);

    return (
        <div className={styles.container}>
            <div className={styles.group}>
                <div className={styles.inputWrapper}>
                    <label className={styles.label}>From</label>
                    <div className={styles.relative}>

                        <input
                            type={focusedField === 'start' || !startDate ? "date" : "text"}
                            lang="en-GB"
                            className={`${adminStyles.input} ${styles.dateInput}`}
                            value={focusedField !== 'start' && startDate ? formatDate(startDate) : startDate}
                            onChange={(e) => onStartDateChange(e.target.value)}
                            placeholder="dd/mm/yyyy"
                            onFocus={(e) => {
                                setFocusedField('start');
                                e.target.type = "date";
                            }}
                            onBlur={(e) => {
                                setFocusedField(null);
                                if (!e.target.value) e.target.type = "text";
                            }}
                        />
                    </div>
                </div>
                <div className={styles.inputWrapper}>
                    <label className={styles.label}>To</label>
                    <div className={styles.relative}>

                        <input
                            type={focusedField === 'end' || !endDate ? "date" : "text"}
                            lang="en-GB"
                            className={`${adminStyles.input} ${styles.dateInput}`}
                            value={focusedField !== 'end' && endDate ? formatDate(endDate) : endDate}
                            onChange={(e) => onEndDateChange(e.target.value)}
                            placeholder="dd/mm/yyyy"
                            onFocus={(e) => {
                                setFocusedField('end');
                                e.target.type = "date";
                            }}
                            onBlur={(e) => {
                                setFocusedField(null);
                                if (!e.target.value) e.target.type = "text";
                            }}
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
