"use client";

import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell
} from 'recharts';

interface RegionalRow {
    country_code: string;
    volume: number;
    sentiment: number;
}

function sentimentColor(score: number) {
    if (score > 0.2) return 'var(--color-interface-success)';
    if (score < -0.2) return 'var(--color-interface-error)';
    return 'rgba(255,255,255,0.3)';
}

function RegionalTooltip({ active, payload }: { active?: boolean, payload?: Array<{ payload: RegionalRow }> }) {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload;
    return (
        <div style={{ background: 'rgba(20,20,20,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12, padding: '8px 10px' }}>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>{row.country_code}</div>
            <div>{row.volume.toLocaleString()} volume · {(row.sentiment * 100).toFixed(1)}% sentiment</div>
        </div>
    );
}

/** Ranked horizontal bar chart of demand volume by country, with a sentiment-colored bar per region instead of a second axis. */
export default function RegionalDemandChart({ data }: { data: RegionalRow[] }) {
    if (!data.length) {
        return (
            <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5, fontSize: 13 }}>
                No regional data available for the current filters.
            </div>
        );
    }

    return (
        <div style={{ width: '100%', height: Math.max(200, data.length * 40), background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '16px' }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                    <YAxis
                        type="category"
                        dataKey="country_code"
                        axisLine={false}
                        tickLine={false}
                        width={48}
                        tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 500 }}
                    />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} content={<RegionalTooltip />} />
                    <Bar dataKey="volume" radius={[0, 4, 4, 0]} maxBarSize={16}>
                        {data.map((row, i) => (
                            <Cell key={row.country_code || i} fill={sentimentColor(row.sentiment)} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
