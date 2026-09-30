"use client";

import { useMemo, useState } from 'react';
import styles from './ActivityHeatmapCalendar.module.css';

interface DayCount {
    day: string; // 'YYYY-MM-DD'
    count: number;
}

interface CellData {
    date: Date;
    dateKey: string;
    count: number;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Sequential scale, one hue (brand green), light -> dark. Bucket edges chosen
// as simple fixed thresholds rather than data-driven quantiles, since this is
// a small-N daily count (event publishes/day) where a handful of fixed steps
// reads clearly without needing to be recomputed per data pull.
function bucketFor(count: number, max: number): number {
    if (count === 0) return 0;
    if (max <= 4) return count; // small ranges: 1 count = 1 bucket, capped below
    const ratio = count / max;
    if (ratio > 0.75) return 4;
    if (ratio > 0.5) return 3;
    if (ratio > 0.25) return 2;
    return 1;
}

const BUCKET_COLORS = [
    'var(--color-interface-surface-hover)', // 0 — empty
    'rgba(32, 249, 40, 0.25)',
    'rgba(32, 249, 40, 0.45)',
    'rgba(32, 249, 40, 0.7)',
    'var(--color-brand-primary)',
];

function buildCells(counts: Map<string, number>): CellData[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(start.getDate() - 89);
    // Align to the start of that week (Sunday) so the grid's week columns are consistent.
    start.setDate(start.getDate() - start.getDay());

    const cells: CellData[] = [];
    const cursor = new Date(start);
    while (cursor <= today) {
        const dateKey = cursor.toISOString().slice(0, 10);
        cells.push({ date: new Date(cursor), dateKey, count: counts.get(dateKey) ?? 0 });
        cursor.setDate(cursor.getDate() + 1);
    }
    return cells;
}

/** GitHub-contributions-style heatmap calendar of daily event-publish counts over the last 90 days, sourced from api.get_events_daily_heatmap(). Sequential single-hue scale (brand green), five buckets, per-cell hover tooltip. */
export default function ActivityHeatmapCalendar({ data, isLoading }: { data: DayCount[], isLoading: boolean }) {
    const [hovered, setHovered] = useState<{ cell: CellData, x: number, y: number } | null>(null);

    const { cells, maxCount, weekCount } = useMemo(() => {
        const counts = new Map(data.map(d => [d.day, d.count]));
        const built = buildCells(counts);
        const max = Math.max(1, ...built.map(c => c.count));
        return { cells: built, maxCount: max, weekCount: Math.ceil(built.length / 7) };
    }, [data]);

    const monthLabels = useMemo(() => {
        const labels: { label: string, colIndex: number }[] = [];
        let lastMonth = -1;
        for (let week = 0; week < weekCount; week++) {
            const firstDayOfWeek = cells[week * 7];
            if (!firstDayOfWeek) continue;
            const month = firstDayOfWeek.date.getMonth();
            if (month !== lastMonth) {
                labels.push({ label: MONTH_NAMES[month], colIndex: week });
                lastMonth = month;
            }
        }
        return labels;
    }, [cells, weekCount]);

    if (isLoading) {
        return (
            <div className={styles.wrapper} style={{ height: 140, opacity: 0.4 }} />
        );
    }

    return (
        <div className={styles.wrapper}>
            <div className={styles.monthLabels} style={{ gridTemplateColumns: `repeat(${weekCount}, 12px)` }}>
                {Array.from({ length: weekCount }).map((_, i) => {
                    const label = monthLabels.find(m => m.colIndex === i);
                    return <span key={i}>{label?.label ?? ''}</span>;
                })}
            </div>

            <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${weekCount}, 12px)` }}>
                {cells.map(cell => (
                    <div
                        key={cell.dateKey}
                        className={styles.cell}
                        style={{ background: BUCKET_COLORS[bucketFor(cell.count, maxCount)] }}
                        onMouseEnter={(e) => setHovered({ cell, x: e.clientX, y: e.clientY })}
                        onMouseMove={(e) => setHovered({ cell, x: e.clientX, y: e.clientY })}
                        onMouseLeave={() => setHovered(null)}
                    />
                ))}
            </div>

            <div className={styles.footer}>
                <span>Less</span>
                {BUCKET_COLORS.map((color, i) => (
                    <div key={i} className={styles.scaleCell} style={{ background: color }} />
                ))}
                <span>More</span>
            </div>

            {hovered && (
                <div className={styles.tooltip} style={{ left: hovered.x + 12, top: hovered.y + 12 }}>
                    <strong>{hovered.cell.count}</strong> event{hovered.cell.count === 1 ? '' : 's'} published
                    <br />
                    {hovered.cell.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
            )}
        </div>
    );
}
