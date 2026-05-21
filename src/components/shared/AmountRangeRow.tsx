"use client";

import React from 'react';
import styles from './AmountRangeRow.module.css';

interface AmountRangeRowProps {
    minAmount: string;
    maxAmount: string;
    onMinAmountChange: (value: string) => void;
    onMaxAmountChange: (value: string) => void;
    onClear: () => void;
}

const AmountRangeRow: React.FC<AmountRangeRowProps> = ({
    minAmount,
    maxAmount,
    onMinAmountChange,
    onMaxAmountChange,
    onClear
}) => {

    return (
        <div className={styles.container}>
            <div className={styles.group}>
                <div className={styles.inputWrapper}>
                    <label className={styles.label}>Min</label>
                    <div className={styles.relative}>
                        <input
                            type="number"
                            placeholder="0.00"
                            value={minAmount}
                            onChange={e => onMinAmountChange(e.target.value)}
                            className={styles.amountInput}
                            min="0"
                            step="0.01"
                        />
                    </div>
                </div>
                <div className={styles.inputWrapper}>
                    <label className={styles.label}>Max</label>
                    <div className={styles.relative}>
                        <input
                            type="number"
                            placeholder="0.00"
                            value={maxAmount}
                            onChange={e => onMaxAmountChange(e.target.value)}
                            className={styles.amountInput}
                            min="0"
                            step="0.01"
                        />
                    </div>
                </div>
                {(minAmount || maxAmount) && (
                    <button className={styles.clearBtn} onClick={onClear}>
                        Clear
                    </button>
                )}
            </div>
        </div>
    );
};

export default AmountRangeRow;
