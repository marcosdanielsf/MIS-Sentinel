import { LucideIcon } from 'lucide-react';

interface StatItem {
    title: string;
    value: string | number;
    icon: LucideIcon;
    color: 'cyan' | 'green' | 'purple' | 'orange' | 'red' | 'blue';
    trend?: {
        value: number;
        isPositive: boolean;
    };
}

interface PartnerStatsProps {
    stats: StatItem[];
}

const colorClasses = {
    cyan: {
        bg: 'bg-cyan-500/20',
        border: 'border-cyan-500/30',
        icon: 'bg-cyan-500/30 text-cyan-400',
        text: 'text-cyan-400',
    },
    green: {
        bg: 'bg-emerald-500/20',
        border: 'border-emerald-500/30',
        icon: 'bg-emerald-500/30 text-emerald-400',
        text: 'text-emerald-400',
    },
    purple: {
        bg: 'bg-purple-500/20',
        border: 'border-purple-500/30',
        icon: 'bg-purple-500/30 text-purple-400',
        text: 'text-purple-400',
    },
    orange: {
        bg: 'bg-orange-500/20',
        border: 'border-orange-500/30',
        icon: 'bg-orange-500/30 text-orange-400',
        text: 'text-orange-400',
    },
    red: {
        bg: 'bg-red-500/20',
        border: 'border-red-500/30',
        icon: 'bg-red-500/30 text-red-400',
        text: 'text-red-400',
    },
    blue: {
        bg: 'bg-blue-500/20',
        border: 'border-blue-500/30',
        icon: 'bg-blue-500/30 text-blue-400',
        text: 'text-blue-400',
    },
};

export default function PartnerStats({ stats }: PartnerStatsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => {
                const Icon = stat.icon;
                const colors = colorClasses[stat.color];
                return (
                    <div
                        key={index}
                        className={`${colors.bg} border ${colors.border} rounded-xl p-6 hover:scale-[1.02] transition-transform`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-400">{stat.title}</p>
                                <p className="mt-2 text-3xl font-semibold text-white">{stat.value}</p>

                                {stat.trend && (
                                    <p className={`mt-2 text-sm ${stat.trend.isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {stat.trend.isPositive ? '↑' : '↓'} {Math.abs(stat.trend.value)}%
                                        <span className="text-gray-500 ml-1">vs mês anterior</span>
                                    </p>
                                )}
                            </div>

                            <div className={`${colors.icon} p-3 rounded-lg`}>
                                <Icon className="h-8 w-8" />
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
