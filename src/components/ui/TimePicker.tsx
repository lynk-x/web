"use client";

import React, { useState, useRef, useEffect } from 'react';
import styles from './TimePicker.module.css';

interface TimePickerProps {
    value: string; // Expected in HH:mm (24h) format
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

/**
 * TimePicker — A custom, premium time picker that provides a unified UI 
 * experience across all browsers and devices.
 */
export const TimePicker: React.FC<TimePickerProps> = ({
    value,
    onChange,
    placeholder = "HH:MM",
    className,
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    
    // Parse current value
    const [h, m] = (value || "00:00").split(':').map(String);
    const currentHour = h.padStart(2, '0');
    const currentMinute = m.padStart(2, '0');

    // Handle clicks outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
    const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

    const selectHour = (hour: string) => {
        onChange(`${hour}:${currentMinute}`);
    };

    const selectMinute = (minute: string) => {
        onChange(`${currentHour}:${minute}`);
        setIsOpen(false);
    };

    return (
        <div className={`${styles.container} ${className}`} ref={containerRef}>
            <input
                type="text"
                className={styles.input}
                value={value || ''}
                readOnly
                placeholder={placeholder}
                onClick={() => setIsOpen(!isOpen)}
                onFocus={() => setIsOpen(true)}
                disabled={disabled}
                autoComplete="off"
            />
            <div className={styles.icon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
            </div>

            {isOpen && (
                <div className={styles.dropdown}>
                    <div className={styles.column}>
                        <div className={styles.columnLabel}>Hour</div>
                        <div className={styles.scrollArea}>
                            {hours.map(hour => (
                                <div 
                                    key={hour} 
                                    className={`${styles.option} ${currentHour === hour ? styles.selected : ''}`}
                                    onClick={() => selectHour(hour)}
                                >
                                    {hour}
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className={styles.separator}>:</div>

                    <div className={styles.column}>
                        <div className={styles.columnLabel}>Min</div>
                        <div className={styles.scrollArea}>
                            {minutes.map(minute => (
                                <div 
                                    key={minute} 
                                    className={`${styles.option} ${currentMinute === minute ? styles.selected : ''}`}
                                    onClick={() => selectMinute(minute)}
                                >
                                    {minute}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
