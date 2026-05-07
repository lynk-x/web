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
 * TimePicker — A custom, premium 12-hour time picker (AM/PM).
 */
export const TimePicker: React.FC<TimePickerProps> = ({
    value,
    onChange,
    placeholder = "HH:MM AM",
    className,
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    
    // Parse current value (always in 24h format HH:mm)
    const [hStr, mStr] = (value || "12:00").split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);

    const isPm = h >= 12;
    const displayHour = h % 12 || 12;
    const currentMinute = m.toString().padStart(2, '0');

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

    const hours = Array.from({ length: 12 }, (_, i) => i + 1);
    const minutes = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];
    const periods = ["AM", "PM"];

    const updateTime = (newHour: number, newMinute: number, newIsPm: boolean) => {
        let finalHour = newHour % 12;
        if (newIsPm) finalHour += 12;
        const timeString = `${finalHour.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`;
        onChange(timeString);
    };

    const displayValue = value ? `${displayHour}:${currentMinute} ${isPm ? 'PM' : 'AM'}` : '';

    return (
        <div className={`${styles.container} ${className}`} ref={containerRef}>
            <input
                type="text"
                className={styles.input}
                value={displayValue}
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
                                    className={`${styles.option} ${displayHour === hour ? styles.selected : ''}`}
                                    onClick={() => updateTime(hour, m, isPm)}
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
                                    onClick={() => updateTime(h, parseInt(minute, 10), isPm)}
                                >
                                    {minute}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={styles.column}>
                        <div className={styles.columnLabel}>Period</div>
                        <div className={styles.scrollArea}>
                            {periods.map(period => (
                                <div 
                                    key={period} 
                                    className={`${styles.option} ${(period === 'PM' && isPm) || (period === 'AM' && !isPm) ? styles.selected : ''}`}
                                    onClick={() => {
                                        updateTime(h, m, period === 'PM');
                                        setIsOpen(false);
                                    }}
                                >
                                    {period}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
