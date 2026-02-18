"use client";

import React from 'react';
import styles from './TableCheckbox.module.css';

interface TableCheckboxProps {
    checked: boolean;
    onChange: () => void;
    disabled?: boolean;
    indeterminate?: boolean; // For "Select All" state when some but not all are selected
    title?: string;
}

/**
 * Standardized checkbox for table row selection and "Select All" actions.
 */
const TableCheckbox: React.FC<TableCheckboxProps> = ({
    checked,
    onChange,
    disabled = false,
    indeterminate = false,
    title = ''
}) => {
    const checkboxRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (checkboxRef.current) {
            checkboxRef.current.indeterminate = indeterminate;
        }
    }, [indeterminate]);

    return (
        <label className={styles.checkboxContainer} title={title}>
            <input
                ref={checkboxRef}
                type="checkbox"
                checked={checked}
                onChange={onChange}
                disabled={disabled}
                className={styles.input}
            />
            <span className={styles.checkmark}></span>
        </label>
    );
};

export default TableCheckbox;
