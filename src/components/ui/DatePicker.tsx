"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import styles from './DatePicker.module.css';

interface DatePickerProps {
    value: string; // Expected in YYYY-MM-DD format
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

/**
 * DatePicker — A custom, premium date picker that avoids the regional pitfalls 
 * of native browser inputs. It forces DD/MM/YYYY display while maintaining 
 * ISO (YYYY-MM-DD) values internally.
 */
export const DatePicker: React.FC<DatePickerProps> = ({ 
    value, 
    onChange, 
    placeholder = "DD/MM/YYYY", 
    className,
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(() => value ? new Date(value) : new Date());
    const [inputValue, setInputValue] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    // Sync external value to internal text display (DD/MM/YYYY)
    useEffect(() => {
        if (value) {
            const [y, m, d] = value.split('-');
            if (y && m && d) {
                setInputValue(`${d}/${m}/${y}`);
            }
        } else {
            setInputValue('');
        }
    }, [value]);

    // Handle clicks outside to close calendar
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Manual text input handling (allows typing DD/MM/YYYY)
    const handleTextInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, ''); // Keep only digits
        
        // Auto-insert slashes
        if (val.length > 2) val = val.slice(0, 2) + '/' + val.slice(2);
        if (val.length > 5) val = val.slice(0, 5) + '/' + val.slice(5, 9);
        
        setInputValue(val);

        // If it's a complete valid-looking date, try to propagate it
        if (val.length === 10) {
            const [d, m, y] = val.split('/').map(Number);
            const date = new Date(y, m - 1, d);
            if (!isNaN(date.getTime()) && date.getFullYear() === y && (date.getMonth() + 1) === m) {
                const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                onChange(iso);
                setViewDate(date);
            }
        }
    };

    // Calendar navigation
    const prevMonth = () => {
        const d = new Date(viewDate);
        d.setMonth(d.getMonth() - 1);
        setViewDate(d);
    };

    const nextMonth = () => {
        const d = new Date(viewDate);
        d.setMonth(d.getMonth() + 1);
        setViewDate(d);
    };

    const selectDate = (d: number, m: number, y: number) => {
        const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        onChange(iso);
        setIsOpen(false);
    };

    // Calendar generation
    const calendarDays = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Day index adjustment (0 is Sunday, let's make it Monday-start if preferred, or keep standard)
        // We'll stick to standard Sunday start (0)
        
        const days = [];
        
        // Days from previous month
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = firstDayOfMonth - 1; i >= 0; i--) {
            days.push({ day: prevMonthLastDay - i, month: month - 1, year, type: 'prev' });
        }
        
        // Days of current month
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({ day: i, month, year, type: 'current' });
        }
        
        // Days of next month to fill the grid (6 rows of 7 = 42)
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            days.push({ day: i, month: month + 1, year, type: 'next' });
        }
        
        return days;
    }, [viewDate]);

    const monthName = viewDate.toLocaleString('default', { month: 'long' });

    return (
        <div className={`${styles.container} ${className}`} ref={containerRef}>
            <input 
                type="text"
                className={styles.input}
                value={inputValue}
                onChange={handleTextInput}
                placeholder={placeholder}
                onFocus={() => setIsOpen(true)}
                disabled={disabled}
                autoComplete="off"
            />
            <div className={styles.icon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
            </div>

            {isOpen && (
                <div className={styles.calendarPortal}>
                    <div className={styles.calendarHeader}>
                        <button type="button" className={styles.navBtn} onClick={prevMonth}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        </button>
                        <div className={styles.monthYear}>{monthName} {viewDate.getFullYear()}</div>
                        <button type="button" className={styles.navBtn} onClick={nextMonth}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </button>
                    </div>
                    
                    <div className={styles.daysGrid}>
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                            <div key={d} className={styles.dayLabel}>{d}</div>
                        ))}
                        
                        {calendarDays.map((d, i) => {
                            const isSelected = value && 
                                new Date(value).getDate() === d.day && 
                                new Date(value).getMonth() === d.month && 
                                new Date(value).getFullYear() === d.year;
                            
                            const isToday = new Date().getDate() === d.day && 
                                new Date().getMonth() === d.month && 
                                new Date().getFullYear() === d.year;

                            return (
                                <div 
                                    key={i} 
                                    className={`
                                        ${styles.day} 
                                        ${d.type !== 'current' ? styles.otherMonth : ''} 
                                        ${isSelected ? styles.selected : ''}
                                        ${isToday ? styles.today : ''}
                                    `}
                                    onClick={() => selectDate(d.day, d.month, d.year)}
                                >
                                    {d.day}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
