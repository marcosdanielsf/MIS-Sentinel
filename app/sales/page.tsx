'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import { TrendingUp, Users, Clock, Target, Calendar, ChevronDown, Award, Zap, Phone, MessageSquare, ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface SalesMetric {
    id: string;
    team_member: string;
    date: string;
    prospections_count: number;
    contacts_made: number;
    meetings_scheduled: number;
    proposals_sent: number;
    deals_closed: number;
    avg_time_between_prospections: number;
    total_prospection_time_minutes: number;
    conversion_rate: number;
    created_at: string;
}

interface TeamMemberStats {
    name: string;
    totalProspections: number;
    avgProspectionsPerDay: number;
    avgTimeBetweenProspections: number;
    totalContacts: number;
    totalMeetings: number;
    conversionRate: number;
    trend: 'up' | 'down' | 'stable';
}

const dateRanges = [
    { value: '7', label: 'Últimos 7 dias' },
    { value: '14', label: 'Últimos 14 dias' },
    { value: '30', label: 'Últimos 30 dias' },
    { value: '90', label: 'Últimos 90 dias' },
];

export default function SalesPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [metrics, setMetrics] = useState<SalesMetric[]>([]);
    const [teamStats, setTeamStats] = useState<TeamMemberStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('30');
    const [selectedMember, setSelectedMember] = useState<string>('all');

    // Global stats
    const [globalStats, setGlobalStats] = useState({
        totalProspections: 0,
        avgProspectionsPerBDR: 0,
        avgTimeBetweenProspections: 0,
        totalContacts: 0,
        totalMeetings: 0,
        avgConversionRate: 0,
        bestPerformer: '',
    });

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (user) {
            fetchMetrics();
        }
    }, [dateRange, user]);

    async function fetchMetrics() {
        setLoading(true);
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - parseInt(dateRange));

            const { data, error } = await supabase
                .from('sales_metrics')
                .select('*')
                .gte('date', startDate.toISOString().split('T')[0])
                .order('date', { ascending: false });

            if (error) throw error;

            setMetrics(data || []);
            calculateStats(data || []);
        } catch (error) {
            console.error('Error fetching metrics:', error);
        } finally {
            setLoading(false);
        }
    }

    function calculateStats(data: SalesMetric[]) {
        // Group by team member
        const memberGroups: Record<string, SalesMetric[]> = {};
        data.forEach(metric => {
            if (!memberGroups[metric.team_member]) {
                memberGroups[metric.team_member] = [];
            }
            memberGroups[metric.team_member].push(metric);
        });

        // Calculate team member stats
        const memberStats: TeamMemberStats[] = Object.entries(memberGroups).map(([name, metrics]) => {
            const totalProspections = metrics.reduce((acc, m) => acc + (m.prospections_count || 0), 0);
            const totalContacts = metrics.reduce((acc, m) => acc + (m.contacts_made || 0), 0);
            const totalMeetings = metrics.reduce((acc, m) => acc + (m.meetings_scheduled || 0), 0);
            const avgTime = metrics.reduce((acc, m) => acc + (m.avg_time_between_prospections || 0), 0) / metrics.length;
            const conversionRate = metrics.reduce((acc, m) => acc + (m.conversion_rate || 0), 0) / metrics.length;

            // Calculate trend (compare first half vs second half)
            const midPoint = Math.floor(metrics.length / 2);
            const recentAvg = metrics.slice(0, midPoint).reduce((acc, m) => acc + m.prospections_count, 0) / midPoint || 0;
            const olderAvg = metrics.slice(midPoint).reduce((acc, m) => acc + m.prospections_count, 0) / (metrics.length - midPoint) || 0;
            const trend: 'up' | 'down' | 'stable' = recentAvg > olderAvg * 1.1 ? 'up' : recentAvg < olderAvg * 0.9 ? 'down' : 'stable';

            return {
                name,
                totalProspections,
                avgProspectionsPerDay: totalProspections / metrics.length || 0,
                avgTimeBetweenProspections: avgTime,
                totalContacts,
                totalMeetings,
                conversionRate,
                trend,
            };
        });

        setTeamStats(memberStats.sort((a, b) => b.totalProspections - a.totalProspections));

        // Calculate global stats
        const totalProspections = data.reduce((acc, m) => acc + (m.prospections_count || 0), 0);
        const totalContacts = data.reduce((acc, m) => acc + (m.contacts_made || 0), 0);
        const totalMeetings = data.reduce((acc, m) => acc + (m.meetings_scheduled || 0), 0);
        const avgTime = data.length > 0
            ? data.reduce((acc, m) => acc + (m.avg_time_between_prospections || 0), 0) / data.length
            : 0;
        const avgConversion = data.length > 0
            ? data.reduce((acc, m) => acc + (m.conversion_rate || 0), 0) / data.length
            : 0;
        const uniqueMembers = new Set(data.map(m => m.team_member)).size;

        setGlobalStats({
            totalProspections,
            avgProspectionsPerBDR: uniqueMembers > 0 ? totalProspections / uniqueMembers : 0,
            avgTimeBetweenProspections: avgTime,
            totalContacts,
            totalMeetings,
            avgConversionRate: avgConversion,
            bestPerformer: memberStats[0]?.name || '-',
        });
    }

    const filteredMetrics = selectedMember === 'all'
        ? metrics
        : metrics.filter(m => m.team_member === selectedMember);

    const uniqueMembers = [...new Set(metrics.map(m => m.team_member))];

    const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
        if (trend === 'up') return <ArrowUp className="h-4 w-4 text-green-500" />;
        if (trend === 'down') return <ArrowDown className="h-4 w-4 text-red-500" />;
        return <Minus className="h-4 w-4 text-gray-400" />;
    };

    if (authLoading || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-gray-100">
            <Sidebar />
            <div className="flex-1 overflow-auto">
                <div className="p-6 max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <TrendingUp className="h-7 w-7 text-green-600" />
                                Comercial - Métricas BDR
                            </h1>
                            <p className="text-gray-500 mt-1">
                                Acompanhamento de prospecções e performance da equipe comercial
                            </p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                        {dateRanges.map(range => (
                            <option key={range.value} value={range.value}>{range.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Global Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Total Prospecções</p>
                            <p className="text-2xl font-bold text-gray-900">{globalStats.totalProspections}</p>
                        </div>
                        <Target className="h-8 w-8 text-green-500" />
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Média/BDR</p>
                            <p className="text-2xl font-bold text-blue-600">{globalStats.avgProspectionsPerBDR.toFixed(1)}</p>
                        </div>
                        <Users className="h-8 w-8 text-blue-500" />
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Tempo Médio</p>
                            <p className="text-2xl font-bold text-purple-600">{globalStats.avgTimeBetweenProspections.toFixed(1)}min</p>
                        </div>
                        <Clock className="h-8 w-8 text-purple-500" />
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Contatos</p>
                            <p className="text-2xl font-bold text-orange-600">{globalStats.totalContacts}</p>
                        </div>
                        <Phone className="h-8 w-8 text-orange-500" />
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Reuniões</p>
                            <p className="text-2xl font-bold text-indigo-600">{globalStats.totalMeetings}</p>
                        </div>
                        <MessageSquare className="h-8 w-8 text-indigo-500" />
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Conversão</p>
                            <p className="text-2xl font-bold text-green-600">{globalStats.avgConversionRate.toFixed(1)}%</p>
                        </div>
                        <Zap className="h-8 w-8 text-green-500" />
                    </div>
                </div>
            </div>

            {/* Team Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Ranking */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Award className="h-5 w-5 text-yellow-500" />
                        Ranking BDR
                    </h3>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                        </div>
                    ) : teamStats.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">Nenhum dado disponível</p>
                    ) : (
                        <div className="space-y-3">
                            {teamStats.map((member, idx) => (
                                <div
                                    key={member.name}
                                    className={`flex items-center justify-between p-3 rounded-lg ${
                                        idx === 0 ? 'bg-yellow-50 border border-yellow-200' :
                                        idx === 1 ? 'bg-gray-50 border border-gray-200' :
                                        idx === 2 ? 'bg-orange-50 border border-orange-200' :
                                        'bg-white border border-gray-100'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                            idx === 0 ? 'bg-yellow-500 text-white' :
                                            idx === 1 ? 'bg-gray-400 text-white' :
                                            idx === 2 ? 'bg-orange-400 text-white' :
                                            'bg-gray-200 text-gray-600'
                                        }`}>
                                            {idx + 1}
                                        </span>
                                        <div>
                                            <p className="font-medium text-gray-900">{member.name}</p>
                                            <p className="text-xs text-gray-500">
                                                {member.avgProspectionsPerDay.toFixed(1)} prosp/dia
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-gray-900">{member.totalProspections}</span>
                                        <TrendIcon trend={member.trend} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Performance Details */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900">Detalhes de Performance</h3>
                        <select
                            value={selectedMember}
                            onChange={(e) => setSelectedMember(e.target.value)}
                            className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                        >
                            <option value="all">Todos os BDRs</option>
                            {uniqueMembers.map(member => (
                                <option key={member} value={member}>{member}</option>
                            ))}
                        </select>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                        </div>
                    ) : teamStats.length === 0 ? (
                        <div className="text-center py-12">
                            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h4 className="text-lg font-medium text-gray-900 mb-2">Nenhuma métrica registrada</h4>
                            <p className="text-gray-500">As métricas de prospecção aparecerão aqui quando forem registradas.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">BDR</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Prospecções</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tempo Médio</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Contatos</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Reuniões</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Conversão</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Trend</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {(selectedMember === 'all' ? teamStats : teamStats.filter(t => t.name === selectedMember)).map((member) => (
                                        <tr key={member.name} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                <span className="font-medium text-gray-900">{member.name}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="font-semibold text-green-600">{member.totalProspections}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="text-purple-600">{member.avgTimeBetweenProspections.toFixed(1)}min</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="text-gray-900">{member.totalContacts}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="text-indigo-600">{member.totalMeetings}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                    member.conversionRate >= 15 ? 'bg-green-100 text-green-800' :
                                                    member.conversionRate >= 10 ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                    {member.conversionRate.toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <TrendIcon trend={member.trend} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Daily Metrics */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-gray-500" />
                        Métricas Diárias
                    </h3>
                </div>
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                    </div>
                ) : filteredMetrics.length === 0 ? (
                    <div className="p-12 text-center">
                        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h4 className="text-lg font-medium text-gray-900 mb-2">Nenhum registro diário</h4>
                        <p className="text-gray-500">Os registros diários de prospecção aparecerão aqui.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">BDR</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Prospecções</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tempo/Prosp</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tempo Total</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Contatos</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Reuniões</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Conversão</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredMetrics.map((metric) => (
                                    <tr key={metric.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                            {new Date(metric.date).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="font-medium text-gray-900">{metric.team_member}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="font-semibold text-green-600">{metric.prospections_count}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center text-purple-600">
                                            {metric.avg_time_between_prospections?.toFixed(1) || '-'}min
                                        </td>
                                        <td className="px-4 py-3 text-center text-gray-600">
                                            {metric.total_prospection_time_minutes ? `${Math.floor(metric.total_prospection_time_minutes / 60)}h${metric.total_prospection_time_minutes % 60}m` : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-center text-gray-900">
                                            {metric.contacts_made || 0}
                                        </td>
                                        <td className="px-4 py-3 text-center text-indigo-600">
                                            {metric.meetings_scheduled || 0}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                (metric.conversion_rate || 0) >= 15 ? 'bg-green-100 text-green-800' :
                                                (metric.conversion_rate || 0) >= 10 ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                                {metric.conversion_rate?.toFixed(1) || 0}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Insights Box */}
            <div className="mt-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border border-green-100">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-green-600" />
                    Insights de Performance
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Benchmark de Prospecção</p>
                        <p className="text-lg font-semibold text-gray-900">
                            Um BDR consegue prospectar em média <span className="text-green-600">{globalStats.avgProspectionsPerBDR.toFixed(0)} pessoas</span> em {dateRange} dias
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            Tempo médio entre prospecções: {globalStats.avgTimeBetweenProspections.toFixed(1)} minutos
                        </p>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Melhor Performance</p>
                        <p className="text-lg font-semibold text-gray-900">
                            <span className="text-indigo-600">{globalStats.bestPerformer || 'N/A'}</span> lidera o ranking
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            Taxa de conversão média da equipe: {globalStats.avgConversionRate.toFixed(1)}%
                        </p>
                    </div>
                </div>
            </div>
                </div>
            </div>
        </div>
    );
}
