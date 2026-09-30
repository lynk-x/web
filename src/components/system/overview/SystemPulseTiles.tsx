"use client";

import styles from './SystemPulseTiles.module.css';

interface PulseTilesData {
    payment_failure_rate_pct: number;
    open_reports: number;
    dead_letters_24h: number;
    max_toxicity: number;
    kyc_pending: number;
    active_campaigns: number;
}

type Status = 'good' | 'warning' | 'critical' | 'neutral';

const statusClass: Record<Status, string> = {
    good: styles.statusGood,
    warning: styles.statusWarning,
    critical: styles.statusCritical,
    neutral: styles.statusNeutral,
};

function Tile({ label, value, status }: { label: string, value: string, status: Status }) {
    return (
        <div className={styles.tile}>
            <div className={styles.tileHead}>
                <span className={styles.tileLabel}>{label}</span>
                <span className={`${styles.statusDot} ${statusClass[status]}`} />
            </div>
            <span className={styles.tileValue}>{value}</span>
        </div>
    );
}

/** System-health tile grid for the System Overview dashboard, sourced from api.get_system_pulse(). Each health tile carries a status dot (good/warning/critical) derived from the same thresholds used elsewhere in the admin dashboards. */
export default function SystemPulseTiles({ data, isLoading }: { data: PulseTilesData | null, isLoading: boolean }) {
    if (isLoading || !data) {
        return (
            <div className={styles.grid}>
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className={styles.tile} style={{ opacity: 0.4 }}>
                        <span className={styles.tileLabel}>Loading...</span>
                        <span className={styles.tileValue}>—</span>
                    </div>
                ))}
            </div>
        );
    }

    const failureStatus: Status = data.payment_failure_rate_pct > 5 ? 'critical' : data.payment_failure_rate_pct > 2 ? 'warning' : 'good';
    const reportsStatus: Status = data.open_reports > 20 ? 'critical' : data.open_reports > 0 ? 'warning' : 'good';
    const deadLetterStatus: Status = data.dead_letters_24h > 5 ? 'critical' : data.dead_letters_24h > 0 ? 'warning' : 'good';
    const toxicityStatus: Status = data.max_toxicity > 15 ? 'critical' : data.max_toxicity > 5 ? 'warning' : 'good';

    return (
        <div className={styles.grid}>
            <Tile label="Payment Failure Rate" value={`${data.payment_failure_rate_pct.toFixed(1)}%`} status={failureStatus} />
            <Tile label="Open Reports" value={data.open_reports.toLocaleString()} status={reportsStatus} />
            <Tile label="Dead-Lettered Jobs (24h)" value={data.dead_letters_24h.toLocaleString()} status={deadLetterStatus} />
            <Tile label="Peak Toxicity Index" value={`${data.max_toxicity.toFixed(1)}%`} status={toxicityStatus} />
            <Tile label="KYC Pending" value={data.kyc_pending.toLocaleString()} status="neutral" />
            <Tile label="Active Campaigns" value={data.active_campaigns.toLocaleString()} status="neutral" />
        </div>
    );
}
