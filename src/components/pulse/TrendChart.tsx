"use client";

import React from 'react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, LineChart, Line 
} from 'recharts';

interface DataPoint {
    date: string;
    volume?: number;
    sentiment?: number;
    engagement?: number;
}

interface TrendChartProps {
    data: DataPoint[];
    type?: 'volume' | 'sentiment' | 'engagement';
}

const TrendChart: React.FC<TrendChartProps> = ({ data, type = 'volume' }) => {
    const colorMap = {
        volume: 'var(--color-brand-primary)',
        sentiment: '#3b82f6',
        engagement: '#f9c920'
    };

    const dataKeyMap = {
        volume: 'volume',
        sentiment: 'sentiment',
        engagement: 'engagement'
    };

    return (
        <div style={{ width: '100%', height: 300, background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '16px' }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={colorMap[type]} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={colorMap[type]} stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                        tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    />
                    <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                    />
                    <Tooltip 
                        contentStyle={{ 
                            background: 'rgba(20,20,20,0.9)', 
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            fontSize: '12px'
                        }}
                    />
                    <Area 
                        type="monotone" 
                        dataKey={dataKeyMap[type]} 
                        stroke={colorMap[type]} 
                        fillOpacity={1} 
                        fill="url(#colorArea)" 
                        strokeWidth={2}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default TrendChart;
