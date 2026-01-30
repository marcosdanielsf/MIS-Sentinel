'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import { Heart, Users, MessageSquare, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock, Search, Filter, ArrowUp, ArrowDown, Minus, Activity, Shield, XCircle } from 'lucide-react';

interface CustomerEngagement {
    id: string;
    customer_id: string;
    customer_name: string;
    date: string;
    messages_sent: number;
    messages_received: number;
    response_time_avg_hours: number;
    engagement_score: number;
    health_status: 'healthy' | 'at_risk' | 'critical';
    churn_risk_score: number;
    last_interaction: string;
    days_since_last_contact: number;
    nps_score: number | null;
    created_at: string;
}

interface CustomerSummary {
    customer_name: string;
    customer_id: string;
    totalMessages: number;
    avgEngagementScore: number;
    healthStatus: 'healthy' | 'at_risk' | 'critical';
    churnRisk: number;
    daysSinceContact: number;
    trend: 'up' | 'down' | 'stable';
}

const healthStatusConfig = {
    healthy: { color: 'bg-green-500/20 text-green-400 border border-green-500/30', icon: CheckCircle, label: 'Saudável' },
    at_risk: { color: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30', icon: AlertTriangle, label: 'Em Risco' },
    critical: { color: 'bg-red-500/20 text-red-400 border border-red-500/30', icon: XCircle, label: 'Crítico' },
};

const dateRanges = [
    { value: '7', label: 'Últimos 7 dias' },
    { value: '14', label: 'Últimos 14 dias' },
    { value: '30', label: 'Últimos 30 dias' },
    { value: '90', label: 'Últimos 90 dias' },
];

export default function EngagementPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [engagements, setEngagements] = useState<CustomerEngagement[]>([]);
    const [customerSummaries, setCustomerSummaries] = useState<CustomerSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('30');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [activeTab, setActiveTab] = useState<'overview' | 'customers' | 'alerts'>('overview');

    const [stats, setStats] = useState({
        totalCustomers: 0,
        healthyCustomers: 0,
        atRiskCustomers: 0,
        criticalCustomers: 0,
        avgEngagementScore: 0,
        avgChurnRisk: 0,
        totalMessages: 0,
        avgResponseTime: 0,
    });

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (user) {
            fetchEngagements();
        }
    }, [dateRange, user]);

    async function fetchEngagements() {
        setLoading(true);
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - parseInt(dateRange));

            const { data, error } = await supabase
                .from('customer_engagement')
                .select('*')
                .gte('date', startDate.toISOString().split('T')[0])
                .order('date', { ascending: false });

            if (error) throw error;

            setEngagements(data || []);
            calculateStats(data || []);
        } catch (error) {
            console.error('Error fetching engagements:', error);
        } finally {
            setLoading(false);
        }
    }

    function calculateStats(data: CustomerEngagement[]) {
        const customerGroups: Record<string, CustomerEngagement[]> = {};
        data.forEach(engagement => {
            const key = engagement.customer_id || engagement.customer_name;
            if (!customerGroups[key]) {
                customerGroups[key] = [];
            }
            customerGroups[key].push(engagement);
        });

        const summaries: CustomerSummary[] = Object.entries(customerGroups).map(([key, records]) => {
            const latestRecord = records[0];
            const totalMessages = records.reduce((acc, r) => acc + (r.messages_sent || 0) + (r.messages_received || 0), 0);
            const avgEngagement = records.reduce((acc, r) => acc + (r.engagement_score || 0), 0) / records.length;

            const midPoint = Math.floor(records.length / 2);
            const recentAvg = records.slice(0, midPoint).reduce((acc, r) => acc + (r.engagement_score || 0), 0) / midPoint || 0;
            const olderAvg = records.slice(midPoint).reduce((acc, r) => acc + (r.engagement_score || 0), 0) / (records.length - midPoint) || 0;
            const trend: 'up' | 'down' | 'stable' = recentAvg > olderAvg * 1.05 ? 'up' : recentAvg < olderAvg * 0.95 ? 'down' : 'stable';

            return {
                customer_name: latestRecord.customer_name,
                customer_id: latestRecord.customer_id,
                totalMessages,
                avgEngagementScore: avgEngagement,
                healthStatus: latestRecord.health_status,
                churnRisk: latestRecord.churn_risk_score || 0,
                daysSinceContact: latestRecord.days_since_last_contact || 0,
                trend,
            };
        });

        setCustomerSummaries(summaries.sort((a, b) => b.churnRisk - a.churnRisk));

        const uniqueCustomers = Object.keys(customerGroups).length;
        const healthy = summaries.filter(s => s.healthStatus === 'healthy').length;
        const atRisk = summaries.filter(s => s.healthStatus === 'at_risk').length;
        const critical = summaries.filter(s => s.healthStatus === 'critical').length;
        const avgEngagement = summaries.length > 0
            ? summaries.reduce((acc, s) => acc + s.avgEngagementScore, 0) / summaries.length
            : 0;
        const avgChurn = summaries.length > 0
            ? summaries.reduce((acc, s) => acc + s.churnRisk, 0) / summaries.length
            : 0;
        const totalMsgs = data.reduce((acc, d) => acc + (d.messages_sent || 0) + (d.messages_received || 0), 0);
        const avgResponse = data.length > 0
            ? data.reduce((acc, d) => acc + (d.response_time_avg_hours || 0), 0) / data.length
            : 0;

        setStats({
            totalCustomers: uniqueCustomers,
            healthyCustomers: healthy,
            atRiskCustomers: atRisk,
            criticalCustomers: critical,
            avgEngagementScore: avgEngagement,
            avgChurnRisk: avgChurn,
            totalMessages: totalMsgs,
            avgResponseTime: avgResponse,
        });
    }

    const filteredSummaries = customerSummaries.filter(summary => {
        const matchesSearch = summary.customer_name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || summary.healthStatus === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const alertCustomers = customerSummaries.filter(s => s.healthStatus === 'critical' || s.healthStatus === 'at_risk');

    const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
        if (trend === 'up') return <ArrowUp className="h-4 w-4 text-green-400" />;
        if (trend === 'down') return <ArrowDown className="h-4 w-4 text-red-400" />;
        return <Minus className="h-4 w-4 text-gray-500" />;
    };

    const getRiskColor = (risk: number) => {
        if (risk >= 70) return 'text-red-400 bg-red-500/20';
        if (risk >= 40) return 'text-yellow-400 bg-yellow-500/20';
        return 'text-green-400 bg-green-500/20';
    };

    if (authLoading || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-[#0a0a0a]">
            <Sidebar />
            <div className="flex-1 overflow-auto">
                <div className="p-6 max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                                <Heart className="h-7 w-7 text-pink-500" />
                                CS - Engajamento de Clientes
                            </h1>
                            <p className="text-gray-500 mt-1">
                                Monitoramento de saúde e engajamento da base de clientes
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <select
                                value={dateRange}
                                onChange={(e) => setDateRange(e.target.value)}
                                className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                            >
                                {dateRanges.map(range => (
                                    <option key={range.value} value={range.value}>{range.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
                        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                            <div className="flex flex-col">
                                <p className="text-xs text-gray-500">Total Clientes</p>
                                <p className="text-2xl font-bold text-white">{stats.totalCustomers}</p>
                            </div>
                        </div>
                        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                            <div className="flex flex-col">
                                <p className="text-xs text-gray-500">Saudáveis</p>
                                <p className="text-2xl font-bold text-green-400">{stats.healthyCustomers}</p>
                            </div>
                        </div>
                        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                            <div className="flex flex-col">
                                <p className="text-xs text-gray-500">Em Risco</p>
                                <p className="text-2xl font-bold text-yellow-400">{stats.atRiskCustomers}</p>
                            </div>
                        </div>
                        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                            <div className="flex flex-col">
                                <p className="text-xs text-gray-500">Críticos</p>
                                <p className="text-2xl font-bold text-red-400">{stats.criticalCustomers}</p>
                            </div>
                        </div>
                        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                            <div className="flex flex-col">
                                <p className="text-xs text-gray-500">Engajamento Médio</p>
                                <p className="text-2xl font-bold text-pink-400">{stats.avgEngagementScore.toFixed(1)}</p>
                            </div>
                        </div>
                        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                            <div className="flex flex-col">
                                <p className="text-xs text-gray-500">Risco Churn Médio</p>
                                <p className="text-2xl font-bold text-orange-400">{stats.avgChurnRisk.toFixed(1)}%</p>
                            </div>
                        </div>
                        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                            <div className="flex flex-col">
                                <p className="text-xs text-gray-500">Total Mensagens</p>
                                <p className="text-2xl font-bold text-blue-400">{stats.totalMessages}</p>
                            </div>
                        </div>
                        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                            <div className="flex flex-col">
                                <p className="text-xs text-gray-500">Tempo Resposta</p>
                                <p className="text-2xl font-bold text-purple-400">{stats.avgResponseTime.toFixed(1)}h</p>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mb-4">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                activeTab === 'overview'
                                    ? 'bg-pink-600 text-white'
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                        >
                            Visão Geral
                        </button>
                        <button
                            onClick={() => setActiveTab('customers')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                activeTab === 'customers'
                                    ? 'bg-pink-600 text-white'
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                        >
                            Clientes
                        </button>
                        <button
                            onClick={() => setActiveTab('alerts')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                                activeTab === 'alerts'
                                    ? 'bg-pink-600 text-white'
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                        >
                            Alertas
                            {alertCustomers.length > 0 && (
                                <span className={`px-2 py-0.5 rounded-full text-xs ${
                                    activeTab === 'alerts' ? 'bg-white text-pink-600' : 'bg-red-500 text-white'
                                }`}>
                                    {alertCustomers.length}
                                </span>
                            )}
                        </button>
                    </div>

                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Health Distribution */}
                            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                                    <Shield className="h-5 w-5 text-pink-400" />
                                    Distribuição de Saúde
                                </h3>
                                {loading ? (
                                    <div className="flex justify-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                                    </div>
                                ) : stats.totalCustomers === 0 ? (
                                    <p className="text-gray-500 text-center py-8">Nenhum dado disponível</p>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1">
                                                <div className="flex justify-between mb-1">
                                                    <span className="text-sm text-gray-400">Saudáveis</span>
                                                    <span className="text-sm font-medium text-green-400">{stats.healthyCustomers}</span>
                                                </div>
                                                <div className="w-full bg-gray-800 rounded-full h-3">
                                                    <div
                                                        className="bg-green-500 h-3 rounded-full transition-all"
                                                        style={{ width: `${(stats.healthyCustomers / stats.totalCustomers) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1">
                                                <div className="flex justify-between mb-1">
                                                    <span className="text-sm text-gray-400">Em Risco</span>
                                                    <span className="text-sm font-medium text-yellow-400">{stats.atRiskCustomers}</span>
                                                </div>
                                                <div className="w-full bg-gray-800 rounded-full h-3">
                                                    <div
                                                        className="bg-yellow-500 h-3 rounded-full transition-all"
                                                        style={{ width: `${(stats.atRiskCustomers / stats.totalCustomers) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1">
                                                <div className="flex justify-between mb-1">
                                                    <span className="text-sm text-gray-400">Críticos</span>
                                                    <span className="text-sm font-medium text-red-400">{stats.criticalCustomers}</span>
                                                </div>
                                                <div className="w-full bg-gray-800 rounded-full h-3">
                                                    <div
                                                        className="bg-red-500 h-3 rounded-full transition-all"
                                                        style={{ width: `${(stats.criticalCustomers / stats.totalCustomers) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Top Engagers */}
                            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-blue-400" />
                                    Mais Engajados
                                </h3>
                                {loading ? (
                                    <div className="flex justify-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                                    </div>
                                ) : customerSummaries.length === 0 ? (
                                    <p className="text-gray-500 text-center py-8">Nenhum dado disponível</p>
                                ) : (
                                    <div className="space-y-2">
                                        {customerSummaries
                                            .sort((a, b) => b.avgEngagementScore - a.avgEngagementScore)
                                            .slice(0, 5)
                                            .map((customer, idx) => {
                                                const StatusIcon = healthStatusConfig[customer.healthStatus].icon;
                                                return (
                                                    <div key={customer.customer_id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                                                        <div className="flex items-center gap-3">
                                                            <span className="w-6 h-6 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center text-xs font-bold border border-pink-500/30">
                                                                {idx + 1}
                                                            </span>
                                                            <div>
                                                                <p className="font-medium text-white">{customer.customer_name}</p>
                                                                <p className="text-xs text-gray-500">{customer.totalMessages} mensagens</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-semibold text-pink-400">{customer.avgEngagementScore.toFixed(1)}</span>
                                                            <StatusIcon className={`h-4 w-4 ${
                                                                customer.healthStatus === 'healthy' ? 'text-green-400' :
                                                                customer.healthStatus === 'at_risk' ? 'text-yellow-400' : 'text-red-400'
                                                            }`} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'customers' && (
                        <>
                            {/* Filters */}
                            <div className="flex flex-col md:flex-row gap-4 mb-6">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                                    <input
                                        type="text"
                                        placeholder="Buscar cliente..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Filter className="h-5 w-5 text-gray-500" />
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                                    >
                                        <option value="all">Todos Status</option>
                                        <option value="healthy">Saudáveis</option>
                                        <option value="at_risk">Em Risco</option>
                                        <option value="critical">Críticos</option>
                                    </select>
                                </div>
                            </div>

                            {/* Customers Table */}
                            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                                {loading ? (
                                    <div className="flex justify-center py-12">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                                    </div>
                                ) : filteredSummaries.length === 0 ? (
                                    <div className="p-12 text-center">
                                        <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                                        <h4 className="text-lg font-medium text-white mb-2">Nenhum cliente encontrado</h4>
                                        <p className="text-gray-500">Os dados de engajamento aparecerão aqui quando forem registrados.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-800/50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Cliente</th>
                                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Status</th>
                                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Engajamento</th>
                                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Risco Churn</th>
                                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Mensagens</th>
                                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Dias s/ Contato</th>
                                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Trend</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-800">
                                                {filteredSummaries.map((customer) => {
                                                    const statusConfig = healthStatusConfig[customer.healthStatus];
                                                    const StatusIcon = statusConfig.icon;
                                                    return (
                                                        <tr key={customer.customer_id} className="hover:bg-gray-800/50 transition-colors">
                                                            <td className="px-4 py-3">
                                                                <span className="font-medium text-white">{customer.customer_name}</span>
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                                                                    <StatusIcon className="h-3 w-3" />
                                                                    {statusConfig.label}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <span className="font-semibold text-pink-400">{customer.avgEngagementScore.toFixed(1)}</span>
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(customer.churnRisk)}`}>
                                                                    {customer.churnRisk.toFixed(1)}%
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-center text-white">
                                                                {customer.totalMessages}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <span className={customer.daysSinceContact > 14 ? 'text-red-400 font-medium' : 'text-gray-400'}>
                                                                    {customer.daysSinceContact} dias
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <TrendIcon trend={customer.trend} />
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {activeTab === 'alerts' && (
                        <div className="bg-gray-900 rounded-xl border border-gray-800">
                            <div className="p-4 border-b border-gray-800">
                                <h3 className="font-semibold text-white flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                                    Clientes que Precisam de Atenção
                                </h3>
                                <p className="text-sm text-gray-500">Clientes em risco ou críticos que necessitam acompanhamento</p>
                            </div>
                            {loading ? (
                                <div className="flex justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                                </div>
                            ) : alertCustomers.length === 0 ? (
                                <div className="p-12 text-center">
                                    <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                                    <h4 className="text-lg font-medium text-white mb-2">Tudo certo!</h4>
                                    <p className="text-gray-500">Não há clientes em situação crítica ou de risco no momento.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-800">
                                    {alertCustomers.map((customer) => {
                                        const statusConfig = healthStatusConfig[customer.healthStatus];
                                        const StatusIcon = statusConfig.icon;
                                        return (
                                            <div key={customer.customer_id} className="p-4 hover:bg-gray-800/50 transition-colors">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-start gap-3">
                                                        <div className={`p-2 rounded-full ${
                                                            customer.healthStatus === 'critical' ? 'bg-red-500/20' : 'bg-yellow-500/20'
                                                        }`}>
                                                            <StatusIcon className={`h-5 w-5 ${
                                                                customer.healthStatus === 'critical' ? 'text-red-400' : 'text-yellow-400'
                                                            }`} />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-white">{customer.customer_name}</p>
                                                            <div className="flex items-center gap-4 mt-1 text-sm">
                                                                <span className="text-gray-500">
                                                                    Risco de Churn: <span className={`font-medium ${
                                                                        customer.churnRisk >= 70 ? 'text-red-400' : 'text-yellow-400'
                                                                    }`}>{customer.churnRisk.toFixed(1)}%</span>
                                                                </span>
                                                                <span className="text-gray-500">
                                                                    Engajamento: <span className="font-medium text-white">{customer.avgEngagementScore.toFixed(1)}</span>
                                                                </span>
                                                                {customer.daysSinceContact > 7 && (
                                                                    <span className="text-red-400 flex items-center gap-1">
                                                                        <Clock className="h-4 w-4" />
                                                                        {customer.daysSinceContact} dias sem contato
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                                                        {statusConfig.label}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Insights Box */}
                    <div className="mt-6 bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded-xl p-6 border border-pink-500/20">
                        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                            <Heart className="h-5 w-5 text-pink-400" />
                            Insights de Engajamento
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
                                <p className="text-sm text-gray-400 mb-1">Saúde da Base</p>
                                <p className="text-lg font-semibold text-white">
                                    <span className={stats.healthyCustomers / stats.totalCustomers >= 0.7 ? 'text-green-400' : 'text-yellow-400'}>
                                        {stats.totalCustomers > 0 ? ((stats.healthyCustomers / stats.totalCustomers) * 100).toFixed(1) : 0}%
                                    </span> dos clientes estão saudáveis
                                </p>
                            </div>
                            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
                                <p className="text-sm text-gray-400 mb-1">Atenção Necessária</p>
                                <p className="text-lg font-semibold text-white">
                                    <span className="text-red-400">{stats.criticalCustomers + stats.atRiskCustomers}</span> clientes precisam de atenção
                                </p>
                            </div>
                            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
                                <p className="text-sm text-gray-400 mb-1">Tempo de Resposta</p>
                                <p className="text-lg font-semibold text-white">
                                    Média de <span className={stats.avgResponseTime <= 4 ? 'text-green-400' : 'text-yellow-400'}>
                                        {stats.avgResponseTime.toFixed(1)}h
                                    </span> para responder
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
