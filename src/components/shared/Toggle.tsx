"use client";

import React from 'react';
import styles from './Toggle.module.css';

interface ToggleProps {
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    disabled?: boolean;
    label?: string;
}

const Toggle: React.FC<ToggleProps> = ({ enabled, onChange, disabled = false, label }) => {
    return (
        <label className={`${styles.toggleContainer} ${disabled ? styles.disabled : ''}`}>
            {label && <span className={styles.label}>{label}</span>}
            <div className={styles.switch}>
                <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => !disabled && onChange(e.target.checked)}
                    disabled={disabled}
                />
                <span className={styles.slider}></span>
            </div>
        </label>
    );
};

export default Toggle;
