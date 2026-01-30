'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import { User, TrendingUp, MessageSquare, Clock, Award, BarChart3, Users } from 'lucide-react';
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

// Factor AI accent colors for charts
const CHART_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];
const SENTIMENT_COLORS = {
    positive: '#22c55e',
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
            <div className="flex items-center justify-center min-h-screen bg-bg-primary">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-primary mx-auto"></div>
                    <p className="mt-4 text-text-secondary">Carregando...</p>
                </div>
            </div>
        );
    }

    const totalMessages = teamData.reduce((sum, member) => sum + member.messageCount, 0);

    const messageChartData = teamData.slice(0, 8).map(member => ({
        name: member.name.length > 10 ? member.name.substring(0, 10) + '...' : member.name,
        mensagens: member.messageCount,
    }));

    const avgUrgencyData = teamData.slice(0, 8).map(member => ({
        name: member.name.length > 10 ? member.name.substring(0, 10) + '...' : member.name,
        urgencia: Number(member.avgUrgency.toFixed(1)),
    }));

    return (
        <div className="flex min-h-screen bg-bg-primary">
            <Sidebar />

            <div className="flex-1 overflow-auto">
                <div className="p-8">
                    {/* Header */}
                    <div className="mb-8 flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-text-primary flex items-center gap-3">
                                <Users className="h-8 w-8 text-accent-primary" />
                                Atividade da Equipe
                            </h1>
                            <p className="mt-2 text-text-secondary">
                                Monitoramento de performance e engajamento
                            </p>
                        </div>

                        <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value)}
                            className="px-4 py-2 bg-bg-secondary border border-border-default rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                        >
                            <option value="24h">Últimas 24h</option>
                            <option value="7d">Últimos 7 dias</option>
                            <option value="30d">Últimos 30 dias</option>
                        </select>
                    </div>

                    {/* Overview Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-bg-secondary p-6 rounded-xl border border-border-default">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-text-secondary">Total de Membros</p>
                                    <p className="text-3xl font-bold text-text-primary mt-1">{teamData.length}</p>
                                </div>
                                <div className="p-3 bg-accent-primary/10 rounded-lg">
                                    <User className="h-6 w-6 text-accent-primary" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-bg-secondary p-6 rounded-xl border border-border-default">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-text-secondary">Total de Mensagens</p>
                                    <p className="text-3xl font-bold text-accent-success mt-1">{totalMessages}</p>
                                </div>
                                <div className="p-3 bg-accent-success/10 rounded-lg">
                                    <MessageSquare className="h-6 w-6 text-accent-success" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-bg-secondary p-6 rounded-xl border border-border-default">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-text-secondary">Média por Membro</p>
                                    <p className="text-3xl font-bold text-accent-primary mt-1">
                                        {teamData.length > 0 ? Math.round(totalMessages / teamData.length) : 0}
                                    </p>
                                </div>
                                <div className="p-3 bg-accent-primary/10 rounded-lg">
                                    <TrendingUp className="h-6 w-6 text-accent-primary" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-bg-secondary p-6 rounded-xl border border-border-default">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-text-secondary">Membro Mais Ativo</p>
                                    <p className="text-lg font-bold text-accent-warning mt-1 truncate max-w-[120px]">
                                        {teamData[0]?.name || '-'}
                                    </p>
                                    <p className="text-sm text-text-muted">{teamData[0]?.messageCount || 0} msgs</p>
                                </div>
                                <div className="p-3 bg-accent-warning/10 rounded-lg">
                                    <Award className="h-6 w-6 text-accent-warning" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        <div className="bg-bg-secondary p-6 rounded-xl border border-border-default">
                            <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-accent-primary" />
                                Mensagens por Membro
                            </h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={messageChartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#2d323c" />
                                    <XAxis 
                                        dataKey="name" 
                                        angle={-45} 
                                        textAnchor="end" 
                                        height={80}
                                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                                    />
                                    <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                    <Tooltip 
                                        contentStyle={{ 
                                            backgroundColor: '#1a1d24', 
                                            border: '1px solid #2d323c',
                                            borderRadius: '8px',
                                            color: '#f0f2f5'
                                        }}
                                    />
                                    <Bar dataKey="mensagens" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="bg-bg-secondary p-6 rounded-xl border border-border-default">
                            <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-accent-warning" />
                                Score Médio de Urgência
                            </h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={avgUrgencyData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#2d323c" />
                                    <XAxis 
                                        dataKey="name" 
                                        angle={-45} 
                                        textAnchor="end" 
                                        height={80}
                                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                                    />
                                    <YAxis 
                                        domain={[0, 10]} 
                                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                                    />
                                    <Tooltip 
                                        contentStyle={{ 
                                            backgroundColor: '#1a1d24', 
                                            border: '1px solid #2d323c',
                                            borderRadius: '8px',
                                            color: '#f0f2f5'
                                        }}
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="urgencia" 
                                        stroke="#f59e0b" 
                                        strokeWidth={2}
                                        dot={{ fill: '#f59e0b', strokeWidth: 2 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Team Members Details */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold text-text-primary flex items-center gap-2">
                            <User className="h-5 w-5 text-accent-primary" />
                            Detalhes por Membro
                        </h3>

                        {loadingData ? (
                            <div className="bg-bg-secondary p-12 rounded-xl border border-border-default text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-primary mx-auto"></div>
                                <p className="mt-4 text-text-secondary">Carregando dados...</p>
                            </div>
                        ) : teamData.length === 0 ? (
                            <div className="bg-bg-secondary p-12 rounded-xl border border-border-default text-center">
                                <User className="h-12 w-12 text-text-muted mx-auto mb-4" />
                                <p className="text-text-secondary">Nenhum dado de atividade encontrado para este período</p>
                            </div>
                        ) : (
                            teamData.map((member, index) => {
                                const sentimentData = [
                                    { name: 'Positivo', value: member.sentimentBreakdown.positive, color: SENTIMENT_COLORS.positive },
                                    { name: 'Neutro', value: member.sentimentBreakdown.neutral, color: SENTIMENT_COLORS.neutral },
                                    { name: 'Negativo', value: member.sentimentBreakdown.negative, color: SENTIMENT_COLORS.negative },
                                    { name: 'Urgente', value: member.sentimentBreakdown.urgent, color: SENTIMENT_COLORS.urgent },
                                ].filter(item => item.value > 0);

                                // Generate avatar color based on name
                                const avatarColors = ['bg-accent-primary', 'bg-accent-success', 'bg-accent-warning', 'bg-purple-500', 'bg-pink-500', 'bg-cyan-500'];
                                const avatarColor = avatarColors[index % avatarColors.length];

                                return (
                                    <div key={member.name} className="bg-bg-secondary rounded-xl border border-border-default p-6 hover:border-border-hover transition-colors">
                                        <div className="flex items-start justify-between mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-14 h-14 rounded-full ${avatarColor} flex items-center justify-center text-white font-bold text-xl shadow-lg`}>
                                                    {member.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h4 className="text-xl font-semibold text-text-primary">{member.name}</h4>
                                                    <p className="text-sm text-text-muted flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        Última atividade: {formatDate(member.lastActive)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <p className="text-3xl font-bold text-accent-primary">{member.messageCount}</p>
                                                <p className="text-sm text-text-muted">mensagens</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-4">
                                            <div className="lg:col-span-1">
                                                <h5 className="font-semibold text-text-secondary mb-3 text-sm uppercase tracking-wide">Sentimento</h5>
                                                {sentimentData.length > 0 ? (
                                                    <ResponsiveContainer width="100%" height={180}>
                                                        <PieChart>
                                                            <Pie
                                                                data={sentimentData}
                                                                cx="50%"
                                                                cy="50%"
                                                                innerRadius={35}
                                                                outerRadius={70}
                                                                fill="#8884d8"
                                                                dataKey="value"
                                                                label={false}
                                                            >
                                                                {sentimentData.map((entry, idx) => (
                                                                    <Cell key={`cell-${idx}`} fill={entry.color} />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip 
                                                                contentStyle={{ 
                                                                    backgroundColor: '#1a1d24', 
                                                                    border: '1px solid #2d323c',
                                                                    borderRadius: '8px',
                                                                    color: '#f0f2f5'
                                                                }}
                                                            />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                ) : (
                                                    <p className="text-sm text-text-muted">Sem dados</p>
                                                )}
                                                {/* Legend */}
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {sentimentData.map((item) => (
                                                        <span 
                                                            key={item.name} 
                                                            className="inline-flex items-center gap-1 text-xs text-text-secondary"
                                                        >
                                                            <span 
                                                                className="w-2 h-2 rounded-full" 
                                                                style={{ backgroundColor: item.color }}
                                                            />
                                                            {item.name}: {item.value}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="lg:col-span-1">
                                                <h5 className="font-semibold text-text-secondary mb-3 text-sm uppercase tracking-wide">Métricas</h5>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between">
                                                        <span className="text-sm text-text-secondary">Score Urgência Médio:</span>
                                                        <span className="font-semibold text-text-primary">
                                                            {member.avgUrgency.toFixed(1)}/10
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-bg-tertiary rounded-full h-2">
                                                        <div
                                                            className="bg-accent-warning h-2 rounded-full transition-all duration-300"
                                                            style={{ width: `${(member.avgUrgency / 10) * 100}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="lg:col-span-1">
                                                <h5 className="font-semibold text-text-secondary mb-3 text-sm uppercase tracking-wide">Categorias</h5>
                                                <div className="space-y-2">
                                                    {Object.entries(member.categories)
                                                        .sort((a, b) => b[1] - a[1])
                                                        .slice(0, 3)
                                                        .map(([category, count]) => (
                                                            <div key={category} className="flex justify-between text-sm">
                                                                <span className="text-text-secondary">{category}:</span>
                                                                <span className="font-semibold text-text-primary px-2 py-0.5 bg-bg-tertiary rounded">
                                                                    {count}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    {Object.keys(member.categories).length === 0 && (
                                                        <p className="text-sm text-text-muted">Sem categorias</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4 p-4 bg-bg-tertiary rounded-lg border border-border-default">
                                            <p className="text-sm text-text-muted mb-1">Última mensagem:</p>
                                            <p className="text-sm text-text-secondary italic">&ldquo;{member.recentActivity}&rdquo;</p>
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
