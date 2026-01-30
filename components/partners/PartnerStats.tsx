import { LucideIcon } from 'lucide-react';

interface StatItem {
    title: string;
    value: string | number;
    icon: LucideIcon;
    color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo';
    trend?: {
        value: number;
        isPositive: boolean;
    };
}

interface PartnerStatsProps {
    stats: StatItem[];
}

const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
    indigo: 'bg-indigo-500',
};

export default function PartnerStats({ stats }: PartnerStatsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                    <div
                        key={index}
                        className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                                <p className="mt-2 text-3xl font-semibold text-gray-900">{stat.value}</p>

                                {stat.trend && (
                                    <p className={`mt-2 text-sm ${stat.trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                        {stat.trend.isPositive ? '↑' : '↓'} {Math.abs(stat.trend.value)}%
                                        <span className="text-gray-500 ml-1">vs mês anterior</span>
                                    </p>
                                )}
                            </div>

                            <div className={`${colorClasses[stat.color]} p-3 rounded-lg`}>
                                <Icon className="h-8 w-8 text-white" />
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
