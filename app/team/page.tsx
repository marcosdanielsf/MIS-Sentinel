'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import { User, TrendingUp, MessageSquare, Clock, Award, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface TeamMember {
    name: string;
    messageCount: number;
    avgUrgency: number;
    sentimentBreakdown: {
        positive: number;
        neutral: number;
        negative: number;
        urgent: number;
    };
    categories: Record<string, number>;
    recentActivity: string;
    lastActive: string;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];
const SENTIMENT_COLORS = {
    positive: '#10b981',
    neutral: '#3b82f6',
    negative: '#ef4444',
    urgent: '#f59e0b',
};

export default function TeamPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [teamData, setTeamData] = useState<TeamMember[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [timeRange, setTimeRange] = useState('7d');

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user) {
            fetchTeamData();
        }
    }, [user, timeRange]);

    const fetchTeamData = async () => {
        try {
            // Calculate date range
            const now = new Date();
            const daysAgo = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : 30;
            const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

            const { data: messages, error } = await supabase
                .from('messages')
                .select('*')
                .gte('created_at', startDate.toISOString());

            if (error || !messages) {
                console.error('Error fetching messages:', error);
                setTeamData([]);
                setLoadingData(false);
                return;
            }

            // Group messages by sender (use group_sender_name if available, otherwise sender_name)
            const memberMap: Record<string, any[]> = {};
            messages.forEach(msg => {
                const senderName = msg.group_sender_name || msg.sender_name;
                if (!memberMap[senderName]) {
                    memberMap[senderName] = [];
                }
                memberMap[senderName].push(msg);
            });

            // Calculate stats for each team member
            const teamStats: TeamMember[] = Object.entries(memberMap).map(([name, msgs]) => {
                const totalUrgency = msgs.reduce((sum, m) => sum + (m.urgency_score || 0), 0);
                const avgUrgency = msgs.length > 0 ? totalUrgency / msgs.length : 0;

                const sentimentBreakdown = {
                    positive: msgs.filter(m => m.sentiment === 'positive').length,
                    neutral: msgs.filter(m => m.sentiment === 'neutral').length,
                    negative: msgs.filter(m => m.sentiment === 'negative').length,
                    urgent: msgs.filter(m => m.sentiment === 'urgent').length,
                };

                const categories: Record<string, number> = {};
                msgs.forEach(m => {
                    if (m.category) {
                        categories[m.category] = (categories[m.category] || 0) + 1;
                    }
                });

                const sortedMsgs = msgs.sort((a, b) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );

                const lastMsg = sortedMsgs[0];
                const lastActive = lastMsg ? new Date(lastMsg.created_at).toISOString() : new Date().toISOString();
                const recentActivity = lastMsg ? lastMsg.message_body.substring(0, 60) + '...' : 'Sem atividade recente';

                return {
                    name,
                    messageCount: msgs.length,
                    avgUrgency,
                    sentimentBreakdown,
                    categories,
                    recentActivity,
                    lastActive,
                };
            });

            // Sort by message count
            teamStats.sort((a, b) => b.messageCount - a.messageCount);

            setTeamData(teamStats);
        } catch (error) {
            console.error('Failed to fetch team data:', error);
            setTeamData([]);
        } finally {
            setLoadingData(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins}min atrás`;
        if (diffHours < 24) return `${diffHours}h atrás`;
        if (diffDays < 7) return `${diffDays}d atrás`;
        return date.toLocaleDateString('pt-BR');
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

    const totalMessages = teamData.reduce((sum, member) => sum + member.messageCount, 0);

    const messageChartData = teamData.map(member => ({
        name: member.name,
        mensagens: member.messageCount,
    }));

    const avgUrgencyData = teamData.map(member => ({
        name: member.name,
        urgencia: Number(member.avgUrgency.toFixed(1)),
    }));

    return (
        <div className="flex min-h-screen bg-gray-100">
            <Sidebar />

            <div className="flex-1 overflow-auto">
                <div className="p-8">
                    <div className="mb-8 flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">👥 Atividade da Equipe</h1>
                            <p className="mt-2 text-gray-600">
                                Monitoramento de performance e engajamento
                            </p>
                        </div>

                        <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="24h">Últimas 24h</option>
                            <option value="7d">Últimos 7 dias</option>
                            <option value="30d">Últimos 30 dias</option>
                        </select>
                    </div>

                    {/* Overview Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-lg shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Total de Membros</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-1">{teamData.length}</p>
                                </div>
                                <User className="h-12 w-12 text-blue-500" />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Total de Mensagens</p>
                                    <p className="text-3xl font-bold text-green-600 mt-1">{totalMessages}</p>
                                </div>
                                <MessageSquare className="h-12 w-12 text-green-500" />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Média por Membro</p>
                                    <p className="text-3xl font-bold text-purple-600 mt-1">
                                        {teamData.length > 0 ? Math.round(totalMessages / teamData.length) : 0}
                                    </p>
                                </div>
                                <TrendingUp className="h-12 w-12 text-purple-500" />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Membro Mais Ativo</p>
                                    <p className="text-lg font-bold text-orange-600 mt-1">
                                        {teamData[0]?.name || '-'}
                                    </p>
                                    <p className="text-sm text-gray-500">{teamData[0]?.messageCount || 0} msgs</p>
                                </div>
                                <Award className="h-12 w-12 text-orange-500" />
                            </div>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                📊 Mensagens por Membro
                            </h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={messageChartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="mensagens" fill="#3b82f6" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                🎯 Score Médio de Urgência
                            </h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={avgUrgencyData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                                    <YAxis domain={[0, 10]} />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="urgencia" stroke="#f59e0b" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Team Members Details */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold text-gray-900">Detalhes por Membro</h3>

                        {loadingData ? (
                            <div className="bg-white p-12 rounded-lg shadow text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                                <p className="mt-4 text-gray-600">Carregando dados...</p>
                            </div>
                        ) : teamData.length === 0 ? (
                            <div className="bg-white p-12 rounded-lg shadow text-center">
                                <p className="text-gray-500">Nenhum dado de atividade encontrado para este período</p>
                            </div>
                        ) : (
                            teamData.map((member) => {
                                const sentimentData = [
                                    { name: 'Positivo', value: member.sentimentBreakdown.positive },
                                    { name: 'Neutro', value: member.sentimentBreakdown.neutral },
                                    { name: 'Negativo', value: member.sentimentBreakdown.negative },
                                    { name: 'Urgente', value: member.sentimentBreakdown.urgent },
                                ].filter(item => item.value > 0);

                                return (
                                    <div key={member.name} className="bg-white rounded-lg shadow p-6">
                                        <div className="flex items-start justify-between mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xl">
                                                    {member.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h4 className="text-xl font-semibold text-gray-900">{member.name}</h4>
                                                    <p className="text-sm text-gray-500">
                                                        Última atividade: {formatDate(member.lastActive)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <p className="text-3xl font-bold text-indigo-600">{member.messageCount}</p>
                                                <p className="text-sm text-gray-500">mensagens</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-4">
                                            <div className="lg:col-span-1">
                                                <h5 className="font-semibold text-gray-700 mb-3">Sentimento</h5>
                                                {sentimentData.length > 0 ? (
                                                    <ResponsiveContainer width="100%" height={200}>
                                                        <PieChart>
                                                            <Pie
                                                                data={sentimentData}
                                                                cx="50%"
                                                                cy="50%"
                                                                innerRadius={40}
                                                                outerRadius={80}
                                                                fill="#8884d8"
                                                                dataKey="value"
                                                                label={(entry) => `${entry.name}: ${entry.value}`}
                                                            >
                                                                {sentimentData.map((entry, index) => (
                                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                ) : (
                                                    <p className="text-sm text-gray-500">Sem dados</p>
                                                )}
                                            </div>

                                            <div className="lg:col-span-1">
                                                <h5 className="font-semibold text-gray-700 mb-3">Métricas</h5>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between">
                                                        <span className="text-sm text-gray-600">Score Urgência Médio:</span>
                                                        <span className="font-semibold text-gray-900">
                                                            {member.avgUrgency.toFixed(1)}/10
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                                        <div
                                                            className="bg-orange-500 h-2 rounded-full"
                                                            style={{ width: `${(member.avgUrgency / 10) * 100}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="lg:col-span-1">
                                                <h5 className="font-semibold text-gray-700 mb-3">Categorias</h5>
                                                <div className="space-y-2">
                                                    {Object.entries(member.categories)
                                                        .sort((a, b) => b[1] - a[1])
                                                        .slice(0, 3)
                                                        .map(([category, count]) => (
                                                            <div key={category} className="flex justify-between text-sm">
                                                                <span className="text-gray-600">{category}:</span>
                                                                <span className="font-semibold text-gray-900">{count}</span>
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                            <p className="text-sm text-gray-600 mb-1">Última mensagem:</p>
                                            <p className="text-sm text-gray-900 italic">&ldquo;{member.recentActivity}&rdquo;</p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}