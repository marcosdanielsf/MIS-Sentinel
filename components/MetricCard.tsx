'use client';

import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
    title: string;
    value: string | number;
    icon?: LucideIcon;
    description?: string;
    trend?: {
        value: number;
        isPositive: boolean;
        label?: string;
    };
    variant?: 'default' | 'success' | 'warning' | 'error' | 'primary';
    className?: string;
}

export default function MetricCard({
    title,
    value,
    icon: Icon,
    description,
    trend,
    variant = 'default',
    className = '',
}: MetricCardProps) {
    const variantStyles = {
        default: 'border-border-default',
        success: 'border-accent-success/30',
        warning: 'border-accent-warning/30',
        error: 'border-accent-error/30',
        primary: 'border-accent-primary/30',
    };

    const iconStyles = {
        default: 'text-text-muted',
        success: 'text-accent-success',
        warning: 'text-accent-warning',
        error: 'text-accent-error',
        primary: 'text-accent-primary',
    };

    return (
        <div
            className={`
                bg-bg-secondary border rounded-lg p-4 
                transition-all duration-200 hover:bg-bg-tertiary hover:border-border-hover
                ${variantStyles[variant]}
                ${className}
            `}
        >
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-text-secondary">{title}</span>
                {Icon && <Icon className={`h-5 w-5 ${iconStyles[variant]}`} />}
            </div>

            <div className="flex items-end justify-between">
                <div>
                    <p className="text-2xl font-bold text-text-primary">{value}</p>
                    {description && (
                        <p className="text-xs text-text-muted mt-1">{description}</p>
                    )}
                </div>

                {trend && (
                    <div
                        className={`
                            flex items-center gap-1 text-xs font-medium px-2 py-1 rounded
                            ${trend.isPositive
                                ? 'bg-accent-success/10 text-accent-success'
                                : 'bg-accent-error/10 text-accent-error'
                            }
                        `}
                    >
                        <span>{trend.isPositive ? '↑' : '↓'}</span>
                        <span>{trend.value}%</span>
                        {trend.label && <span className="text-text-muted ml-1">{trend.label}</span>}
                    </div>
                )}
            </div>
        </div>
    );
}

// Skeleton version for loading states
export function MetricCardSkeleton() {
    return (
        <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
                <div className="h-4 w-24 bg-bg-tertiary rounded animate-shimmer" />
                <div className="h-5 w-5 bg-bg-tertiary rounded animate-shimmer" />
            </div>
            <div className="h-8 w-20 bg-bg-tertiary rounded animate-shimmer" />
        </div>
    );
}
