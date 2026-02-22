"use client";

import React from 'react';
import styles from './SystemConfigTable.module.css';
import DataTable, { Column } from '../../shared/DataTable';

// ─── Types ───────────────────────────────────────────────────────────────────

export type { EnvVar } from '@/types/admin';
import type { EnvVar } from '@/types/admin';

/** Internal type with `id` required by DataTable. */
interface EnvVarRow extends EnvVar {
    id: string;
}

interface SystemConfigTableProps {
    config: EnvVar[];
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * System configuration key-value table.
 * Displays environment variables with a copy-to-clipboard action.
 */
const SystemConfigTable: React.FC<SystemConfigTableProps> = ({ config }) => {
    /** Map incoming config to rows with an `id` field required by DataTable. */
    const rows: EnvVarRow[] = config.map((env) => ({ ...env, id: env.key }));

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        // Toast notification could go here
    };

    /** Column definitions for the config table. */
    const columns: Column<EnvVarRow>[] = [
        {
            header: 'Variable Key',
            headerStyle: { width: '30%' },
            render: (env) => <span className={styles.keyColumn}>{env.key}</span>,
        },
        {
            header: 'Value',
            render: (env) => <span className={styles.valueColumn}>{env.value}</span>,
        },
        {
            header: 'Actions',
            headerStyle: { width: '100px', textAlign: 'right' },
            render: (env) => (
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
            ),
        },
    ];

    return (
        <DataTable<EnvVarRow>
            data={rows}
            columns={columns}
            emptyMessage="No configuration variables found."
        />
    );
};

export default SystemConfigTable;
