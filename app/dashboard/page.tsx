'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import StatsCard from '@/components/StatsCard';
import { AlertTriangle, MessageSquare, Activity, TrendingUp, Zap, CheckCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6'];

interface DashboardStats {
    totalMessages: number;
    totalAlerts: number;
    activeAlerts: number;
    criticalAlerts: number;
    teamMembers: number;
    avgUrgency: number;
    sentimentBreakdown: { name: string; value: number }[];
    messagesOverTime: { name: string; mensagens: number }[];
    recentAlerts: any[];
}

export default function DashboardPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats>({
        totalMessages: 0,
        totalAlerts: 0,
        activeAlerts: 0,
        criticalAlerts: 0,
        teamMembers: 0,
        avgUrgency: 0,
        sentimentBreakdown: [],
        messagesOverTime: [],
        recentAlerts: [],
    });
    const [loadingStats, setLoadingStats] = useState(true);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user) {
            fetchDashboardStats();
        }
    }, [user]);

    const fetchDashboardStats = async () => {
        try {
            // Fetch messages
            const { data: messages } = await supabase
                .from('messages')
                .select('*');

            // Fetch alerts
            const { data: alerts } = await supabase
                .from('alerts')
                .select('*');

            const totalMessages = messages?.length || 0;
            const totalAlerts = alerts?.length || 0;
            const activeAlerts = alerts?.filter(a => a.status === 'active').length || 0;
            const criticalAlerts = alerts?.filter(a => a.severity === 'critical' && a.status === 'active').length || 0;

            // Calculate avg urgency
            const totalUrgency = messages?.reduce((sum, m) => sum + (m.urgency_score || 0), 0) || 0;
            const avgUrgency = totalMessages > 0 ? totalUrgency / totalMessages : 0;

            // Sentiment breakdown
            const sentiments = messages?.reduce((acc, m) => {
                acc[m.sentiment] = (acc[m.sentiment] || 0) + 1;
                return acc;
            }, {} as Record<string, number>) || {};

            const sentimentBreakdown = Object.entries(sentiments).map(([name, value]) => ({
                name: name.charAt(0).toUpperCase() + name.slice(1),
                value: value as number,
            }));

            // Team members count (use group_sender_name when available)
            const uniqueSenders = new Set(messages?.map(m => m.group_sender_name || m.sender_name) || []);
            const teamMembers = uniqueSenders.size;

            // Messages over time (last 7 days)
            const now = new Date();
            const messagesOverTime = [];
            for (let i = 6; i >= 0; i--) {
                const date = new Date(now);
                date.setDate(date.getDate() - i);
                const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' });
                const dayMessages = messages?.filter(m => {
                    const msgDate = new Date(m.created_at);
                    return msgDate.toDateString() === date.toDateString();
                }).length || 0;
                messagesOverTime.push({ name: dayName, mensagens: dayMessages });
            }

            // Recent alerts (last 5)
            const recentAlerts = alerts
                ?.filter(a => a.status === 'active')
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 5) || [];

            setStats({
                totalMessages,
                totalAlerts,
                activeAlerts,
                criticalAlerts,
                teamMembers,
                avgUrgency,
                sentimentBreakdown,
                messagesOverTime,
                recentAlerts,
            });
        } catch (error) {
            console.error('Failed to fetch dashboard stats:', error);
        } finally {
            setLoadingStats(false);
        }
    };

    if (loading || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Carregando...</p>
                </div>
            </div>
        );
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);

        if (diffMins < 60) return `${diffMins}min atrás`;
        if (diffHours < 24) return `${diffHours}h atrás`;
        return date.toLocaleDateString('pt-BR');
    };

    return (
        <div className="flex min-h-screen bg-gray-100">
            <Sidebar />

            <div className="flex-1 overflow-auto">
                <div className="p-8">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900">🤖 Dashboard MIS SENTINEL</h1>
                        <p className="mt-2 text-gray-600">
                            Sistema de Inteligência Mottivme - Monitoramento em Tempo Real
                        </p>
                    </div>

                    {loadingStats ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                                <p className="mt-4 text-gray-600">Carregando dados...</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                <StatsCard
                                    title="Total de Mensagens"
                                    value={stats.totalMessages}
                                    icon={MessageSquare}
                                    color="blue"
                                    trend={{ value: 12, isPositive: true }}
                                />
                                <StatsCard
                                    title="Alertas Ativos"
                                    value={stats.activeAlerts}
                                    icon={AlertTriangle}
                                    color="orange"
                                    trend={{ value: stats.activeAlerts, isPositive: false }}
                                />
                                <StatsCard
                                    title="Alertas Críticos"
                                    value={stats.criticalAlerts}
                                    icon={Zap}
                                    color="red"
                                    trend={{ value: stats.criticalAlerts, isPositive: false }}
                                />
                                <StatsCard
                                    title="Membros da Equipe"
                                    value={stats.teamMembers}
                                    icon={Activity}
                                    color="green"
                                    trend={{ value: 5, isPositive: true }}
                                />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                        📊 Mensagens nos Últimos 7 Dias
                                    </h3>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={stats.messagesOverTime}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" />
                                            <YAxis />
                                            <Tooltip />
                                            <Bar dataKey="mensagens" fill="#3b82f6" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="bg-white p-6 rounded-lg shadow">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                        😊 Análise de Sentimento
                                    </h3>
                                    {stats.sentimentBreakdown.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                <Pie
                                                    data={stats.sentimentBreakdown}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    label={(entry) => `${entry.name}: ${entry.value}`}
                                                    outerRadius={100}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                >
                                                    {stats.sentimentBreakdown.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex items-center justify-center h-[300px] text-gray-500">
                                            Sem dados de sentimento
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Key Metrics */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-lg shadow text-white">
                                    <h4 className="text-sm font-semibold mb-2">Score Médio de Urgência</h4>
                                    <p className="text-4xl font-bold">{stats.avgUrgency.toFixed(1)}/10</p>
                                    <div className="mt-4 bg-white bg-opacity-20 rounded-full h-3">
                                        <div
                                            className="bg-white rounded-full h-3 transition-all"
                                            style={{ width: `${(stats.avgUrgency / 10) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-lg shadow text-white">
                                    <h4 className="text-sm font-semibold mb-2">Total de Alertas</h4>
                                    <p className="text-4xl font-bold">{stats.totalAlerts}</p>
                                    <p className="text-sm mt-2 opacity-90">
                                        {stats.activeAlerts} ativos · {stats.totalAlerts - stats.activeAlerts} resolvidos
                                    </p>
                                </div>

                                <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-lg shadow text-white">
                                    <h4 className="text-sm font-semibold mb-2">Cobertura de Monitoramento</h4>
                                    <p className="text-4xl font-bold">24/7</p>
                                    <p className="text-sm mt-2 opacity-90">Sistema sempre ativo</p>
                                </div>
                            </div>

                            {/* Recent Alerts */}
                            <div className="bg-white rounded-lg shadow">
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            🚨 Alertas Recentes
                                        </h3>
                                        <Link
                                            href="/alerts"
                                            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                                        >
                                            Ver todos →
                                        </Link>
                                    </div>

                                    {stats.recentAlerts.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">
                                            <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                                            <p>Nenhum alerta ativo no momento</p>
                                            <p className="text-sm mt-1">Sistema funcionando normalmente</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {stats.recentAlerts.map((alert) => (
                                                <div key={alert.id} className="flex items-start gap-4 py-3 border-b last:border-b-0">
                                                    <div className={`p-2 rounded-lg ${alert.severity === 'critical' ? 'bg-red-100' :
                                                            alert.severity === 'high' ? 'bg-orange-100' :
                                                                alert.severity === 'medium' ? 'bg-yellow-100' :
                                                                    'bg-blue-100'
                                                        }`}>
                                                        <AlertTriangle className={`h-5 w-5 ${alert.severity === 'critical' ? 'text-red-600' :
                                                                alert.severity === 'high' ? 'text-orange-600' :
                                                                    alert.severity === 'medium' ? 'text-yellow-600' :
                                                                        'text-blue-600'
                                                            }`} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <p className="font-semibold text-gray-900">{alert.title}</p>
                                                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                                                                    alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                                                                        alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                                            'bg-blue-100 text-blue-800'
                                                                }`}>
                                                                {alert.severity}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-600">{alert.description}</p>
                                                    </div>
                                                    <span className="text-xs text-gray-400 whitespace-nowrap">
                                                        {formatDate(alert.created_at)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}