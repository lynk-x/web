"use client";

import React from 'react';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';
import styles from './DateRangeRow.module.css';
import { DatePicker } from '@/components/ui/DatePicker';

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
                        <DatePicker
                            value={startDate}
                            onChange={onStartDateChange}
                            placeholder="dd/mm/yyyy"
                            className={styles.dateInput}
                        />
                    </div>
                </div>
                <div className={styles.inputWrapper}>
                    <label className={styles.label}>To</label>
                    <div className={styles.relative}>
                        <DatePicker
                            value={endDate}
                            onChange={onEndDateChange}
                            placeholder="dd/mm/yyyy"
                            className={styles.dateInput}
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
