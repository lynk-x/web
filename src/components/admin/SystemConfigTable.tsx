"use client";

import React from 'react';
import styles from './SystemConfigTable.module.css';

interface EnvVar {
    key: string;
    value: string;
}

interface SystemConfigTableProps {
    config: EnvVar[];
}

const SystemConfigTable: React.FC<SystemConfigTableProps> = ({ config }) => {
    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        // Toast notification could go here
    };

    return (
        <div className={styles.tableContainer}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th style={{ width: '30%' }}>Variable Key</th>
                        <th>Value</th>
                        <th style={{ width: '100px', textAlign: 'right' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {config.map((env) => (
                        <tr key={env.key}>
                            <td className={styles.keyColumn}>{env.key}</td>
                            <td className={styles.valueColumn}>{env.value}</td>
                            <td>
                                <div className={styles.actions}>
                                    <button
                                        className={styles.actionBtn}
                                        onClick={() => handleCopy(env.value)}
                                        title="Copy Value"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                        </svg>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {config.length === 0 && (
                        <tr>
                            <td colSpan={3} style={{ textAlign: 'center', padding: '32px', opacity: 0.5 }}>
                                No configuration variables found.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default SystemConfigTable;
