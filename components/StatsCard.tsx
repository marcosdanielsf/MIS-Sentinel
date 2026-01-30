'use client';

import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    color?: 'blue' | 'orange' | 'red' | 'green' | 'purple';
    trend?: {
        value: number;
        isPositive: boolean;
    };
    className?: string;
}

const colorMap = {
    blue: {
        border: 'border-accent-primary/30',
        icon: 'text-accent-primary',
        iconBg: 'bg-accent-primary/10',
    },
    orange: {
        border: 'border-accent-warning/30',
        icon: 'text-accent-warning',
        iconBg: 'bg-accent-warning/10',
    },
    red: {
        border: 'border-accent-error/30',
        icon: 'text-accent-error',
        iconBg: 'bg-accent-error/10',
    },
    green: {
        border: 'border-accent-success/30',
        icon: 'text-accent-success',
        iconBg: 'bg-accent-success/10',
    },
    purple: {
        border: 'border-purple-500/30',
        icon: 'text-purple-500',
        iconBg: 'bg-purple-500/10',
    },
};

export default function StatsCard({
    title,
    value,
    icon: Icon,
    color = 'blue',
    trend,
    className = '',
}: StatsCardProps) {
    const colors = colorMap[color];

    return (
        <div
            className={`
                bg-bg-secondary border rounded-lg p-4 
                transition-all duration-200 hover:bg-bg-tertiary hover:border-border-hover
                ${colors.border}
                ${className}
            `}
        >
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-text-secondary">{title}</p>
                    <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>

                    {trend && (
                        <div className="flex items-center gap-1 mt-2">
                            <span
                                className={`
                                    text-xs font-medium
                                    ${trend.isPositive ? 'text-accent-success' : 'text-accent-error'}
                                `}
                            >
                                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                            </span>
                            <span className="text-xs text-text-muted">vs período anterior</span>
                        </div>
                    )}
                </div>

                <div className={`p-3 rounded-lg ${colors.iconBg}`}>
                    <Icon className={`h-6 w-6 ${colors.icon}`} />
                </div>
            </div>
        </div>
    );
}

// Skeleton version for loading states
export function StatsCardSkeleton() {
    return (
        <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <div className="h-4 w-24 bg-bg-tertiary rounded animate-shimmer" />
                    <div className="h-8 w-16 bg-bg-tertiary rounded animate-shimmer mt-2" />
                </div>
                <div className="h-12 w-12 bg-bg-tertiary rounded-lg animate-shimmer" />
            </div>
        </div>
    );
}
