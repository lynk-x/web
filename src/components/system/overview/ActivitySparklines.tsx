"use client";

import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import styles from './SystemPulseTiles.module.css';

interface SeriesPoint {
    hour: string;
    events_published: number;
    tickets_sold: number;
    reports_filed: number;
}

const metrics: { key: keyof Omit<SeriesPoint, 'hour'>, label: string, color: string }[] = [
    { key: 'events_published', label: 'Events Published', color: 'var(--color-brand-primary)' },
    { key: 'tickets_sold', label: 'Tickets Sold', color: 'var(--color-brand-secondary)' },
    { key: 'reports_filed', label: 'Reports Filed', color: 'var(--color-interface-error)' },
];

function Sparkline({ data, metricKey, color, label }: { data: SeriesPoint[], metricKey: keyof Omit<SeriesPoint, 'hour'>, color: string, label: string }) {
    const total = data.reduce((sum, d) => sum + (d[metricKey] as number), 0);

    return (
        <div style={{ background: 'var(--color-interface-surface)', border: '1px solid var(--color-interface-outline)', borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', opacity: 0.6 }}>{label}</span>
                <span style={{ fontSize: '20px', fontWeight: 700 }}>{total.toLocaleString()}</span>
            </div>
            <span style={{ fontSize: '11px', opacity: 0.4 }}>Last 48 hours</span>
            <div style={{ width: '100%', height: 80, marginTop: '8px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id={`fade-${metricKey}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="hour" hide />
                        <Tooltip
                            contentStyle={{ background: 'rgba(20,20,20,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
                            labelFormatter={(v) => new Date(v).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit' })}
                            formatter={(value: number | undefined) => [(value ?? 0).toLocaleString(), label]}
                        />
                        <Area type="monotone" dataKey={metricKey} stroke={color} fillOpacity={1} fill={`url(#fade-${metricKey})`} strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

/** Hourly activity sparkline strip (events published, tickets sold, reports filed) for the last 48 hours, sourced from api.get_system_pulse(). Three small multiples instead of one combined chart, since the three metrics don't share a scale. */
export default function ActivitySparklines({ series, isLoading }: { series: SeriesPoint[], isLoading: boolean }) {
    if (isLoading) {
        return (
            <div className={styles.grid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} style={{ height: 140, background: 'var(--color-interface-surface)', border: '1px solid var(--color-interface-outline)', borderRadius: 'var(--radius-lg)', opacity: 0.4 }} />
                ))}
            </div>
        );
    }

    return (
        <div className={styles.grid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            {metrics.map(m => (
                <Sparkline key={m.key} data={series} metricKey={m.key} color={m.color} label={m.label} />
            ))}
        </div>
    );
}
