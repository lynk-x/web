"use client";

import React from 'react';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';

interface FormRowProps {
    label: string;
    htmlFor?: string;
    children: React.ReactNode;
    /** Escape hatch for grid placement, e.g. `{ gridColumn: '1 / -1' }` to span a full row. */
    style?: React.CSSProperties;
    /**
     * CSS module to pull `.label` from. Defaults to `admin/page.module.css`.
     * Pass `DashboardShared.module.css` (or another module) for pages built
     * against a different admin styles module — e.g. `.select` differs
     * visually between the two (DashboardShared has a custom dropdown arrow).
     */
    styles?: { label?: string };
}

/**
 * A single labeled field within an admin form grid — pair with
 * `.formGrid` from the same styles module on the parent to lay fields out
 * two-per-row. Standardizes the label/spacing markup that admin modals and
 * full-page forms (KYC Limits, Tax Rate, Adjust Wallet, IAM roles, registry
 * tags/types/mappings, communications/users forms, ...) previously
 * duplicated inline.
 */
export default function FormRow({ label, htmlFor, children, style, styles = adminStyles }: FormRowProps) {
    return (
        <div style={style}>
            <label className={styles.label} htmlFor={htmlFor}>{label}</label>
            {children}
        </div>
    );
}

/** Helper/inherit-default copy shown under a form grid, e.g. "Leave a field blank to inherit the Global default." */
export function FormHint({ children }: { children: React.ReactNode }) {
    return (
        <p style={{ fontSize: '13px', opacity: 0.6, margin: 0 }}>
            {children}
        </p>
    );
}
