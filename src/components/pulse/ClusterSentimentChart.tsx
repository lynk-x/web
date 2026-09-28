"use client";

import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';
import Spinner from '@/components/shared/Spinner';

interface AudienceCluster {
    id: string;
    display_name: string;
    sentiment: number;
}

function sentimentColor(score: number) {
    if (score > 0.2) return 'var(--color-interface-success)';
    if (score < -0.2) return 'var(--color-interface-error)';
    return 'rgba(255,255,255,0.3)';
}

function ClusterTooltip({ active, payload }: { active?: boolean, payload?: Array<{ payload: { name: string, sentiment: number } }> }) {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload;
    return (
        <div style={{ background: 'rgba(20,20,20,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12, padding: '8px 10px' }}>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>{row.name}</div>
            <div>{(row.sentiment * 100).toFixed(1)}% sentiment</div>
        </div>
    );
}

/** Diverging bar chart of sentiment score per audience cluster, centered on zero. */
export default function ClusterSentimentChart({ clusters, isLoading }: { clusters: AudienceCluster[], isLoading?: boolean }) {
    if (isLoading) {
        return (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Spinner label="Loading clusters..." />
            </div>
        );
    }

    if (!clusters.length) {
        return (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5, fontSize: 13 }}>
                No cluster data available.
            </div>
        );
    }

    const data = clusters.map(c => ({ name: c.display_name, sentiment: c.sentiment ?? 0 }));

    return (
        <div style={{ width: '100%', height: Math.max(220, data.length * 36), background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '16px' }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                        type="number"
                        domain={[-1, 1]}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                        tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                    />
                    <YAxis
                        type="category"
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        width={110}
                        tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                    />
                    <ReferenceLine x={0} stroke="rgba(255,255,255,0.15)" />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} content={<ClusterTooltip />} />
                    <Bar dataKey="sentiment" radius={4} maxBarSize={14}>
                        {data.map((row, i) => (
                            <Cell key={row.name || i} fill={sentimentColor(row.sentiment)} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
