'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import {
    Clock,
    CheckCircle,
    AlertTriangle,
    TrendingUp,
    Users,
    Zap,
    Target,
    Timer,
    Star,
    ArrowUp,
    ArrowDown,
} from 'lucide-react';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from 'recharts';

interface CRTMetrics {
    issues_today: number;
    resolved_today: number;
    currently_open: number;
    currently_escalated: number;
    avg_response_time_today: number;
    avg_resolution_time_today: number;
    avg_response_time_7d: number;
    avg_resolution_time_7d: number;
    avg_satisfaction_7d: number;
    resolution_rate_7d: number;
}

interface Issue {
    id: string;
    issue_type: string;
    customer_name: string;
    customer_phone: string;
    detected_at: string;
    first_response_at: string | null;
    resolved_at: string | null;
    status: string;
    priority: string;
    assigned_to: string | null;
    time_to_first_response: number | null;
    time_to_resolution: number | null;
    customer_satisfaction: number | null;
}

interface TopIssue {
    issue_type: string;
    occurrences: number;
    avg_resolution_time: number;
    currently_open: number;
    avg_satisfaction: number;
}

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];

export default function CRTPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [metrics, setMetrics] = useState<CRTMetrics | null>(null);
    const [openIssues, setOpenIssues] = useState<Issue[]>([]);
    const [topIssues, setTopIssues] = useState<TopIssue[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user) {
            fetchCRTData();
        }
    }, [user]);

    const fetchCRTData = async () => {
        try {
            // Fetch CRT metrics
            const { data: metricsData } = await supabase
                .from('crt_metrics')
                .select('*')
                .single();

            setMetrics(metricsData);

            // Fetch open issues
            const { data: issuesData } = await supabase
                .from('issues')
                .select('*')
                .in('status', ['open', 'in_progress', 'escalated'])
                .order('detected_at', { ascending: false })
                .limit(10);

            setOpenIssues(issuesData || []);

            // Fetch top issues
            const { data: topIssuesData } = await supabase.from('top_issues').select('*');

            setTopIssues(topIssuesData || []);
        } catch (error) {
            console.error('Failed to fetch CRT data:', error);
        } finally {
            setLoadingData(false);
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

    const formatMinutes = (minutes: number | null) => {
        if (!minutes) return '-';
        if (minutes < 60) return `${Math.round(minutes)}min`;
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return `${hours}h ${mins}min`;
    };

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

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'critical':
                return 'bg-red-100 text-red-800';
            case 'high':
                return 'bg-orange-100 text-orange-800';
            case 'medium':
                return 'bg-yellow-100 text-yellow-800';
            default:
                return 'bg-blue-100 text-blue-800';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'resolved':
                return 'bg-green-100 text-green-800';
            case 'escalated':
                return 'bg-red-100 text-red-800';
            case 'in_progress':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-100">
            <Sidebar />

            <div className="flex-1 overflow-auto">
                <div className="p-8">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900">⏱️ Customer Resolution Time (CRT)</h1>
                        <p className="mt-2 text-gray-600">
                            Dashboard focado em resolver problemas, não apenas monitorá-los
                        </p>
                    </div>

                    {loadingData ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                                <p className="mt-4 text-gray-600">Carregando métricas...</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Key Metrics */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-lg shadow text-white">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-sm font-semibold">Tempo Médio de Resposta</h4>
                                        <Timer className="h-8 w-8 opacity-80" />
                                    </div>
                                    <p className="text-4xl font-bold">
                                        {formatMinutes(metrics?.avg_response_time_7d || 0)}
                                    </p>
                                    <p className="text-sm mt-2 opacity-90">Últimos 7 dias</p>
                                    <div className="mt-4 flex items-center gap-2">
                                        {(metrics?.avg_response_time_7d || 0) < 60 ? (
                                            <>
                                                <ArrowDown className="h-4 w-4" />
                                                <span className="text-sm">Meta: &lt;60min ✅</span>
                                            </>
                                        ) : (
                                            <>
                                                <ArrowUp className="h-4 w-4" />
                                                <span className="text-sm">Meta: &lt;60min ⚠️</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-lg shadow text-white">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-sm font-semibold">Tempo Médio de Resolução</h4>
                                        <CheckCircle className="h-8 w-8 opacity-80" />
                                    </div>
                                    <p className="text-4xl font-bold">
                                        {formatMinutes(metrics?.avg_resolution_time_7d || 0)}
                                    </p>
                                    <p className="text-sm mt-2 opacity-90">Últimos 7 dias</p>
                                    <div className="mt-4 flex items-center gap-2">
                                        {(metrics?.avg_resolution_time_7d || 0) < 240 ? (
                                            <>
                                                <ArrowDown className="h-4 w-4" />
                                                <span className="text-sm">Meta: &lt;4h ✅</span>
                                            </>
                                        ) : (
                                            <>
                                                <ArrowUp className="h-4 w-4" />
                                                <span className="text-sm">Meta: &lt;4h ⚠️</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-lg shadow text-white">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-sm font-semibold">Taxa de Resolução</h4>
                                        <Target className="h-8 w-8 opacity-80" />
                                    </div>
                                    <p className="text-4xl font-bold">
                                        {Math.round(metrics?.resolution_rate_7d || 0)}%
                                    </p>
                                    <p className="text-sm mt-2 opacity-90">Últimos 7 dias</p>
                                    <div className="mt-4 flex items-center gap-2">
                                        {(metrics?.resolution_rate_7d || 0) >= 90 ? (
                                            <>
                                                <TrendingUp className="h-4 w-4" />
                                                <span className="text-sm">Meta: ≥90% ✅</span>
                                            </>
                                        ) : (
                                            <>
                                                <AlertTriangle className="h-4 w-4" />
                                                <span className="text-sm">Meta: ≥90% ⚠️</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-lg shadow text-white">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-sm font-semibold">Satisfação do Cliente</h4>
                                        <Star className="h-8 w-8 opacity-80" />
                                    </div>
                                    <p className="text-4xl font-bold">
                                        {(metrics?.avg_satisfaction_7d || 0).toFixed(1)}/5
                                    </p>
                                    <p className="text-sm mt-2 opacity-90">Últimos 7 dias</p>
                                    <div className="mt-4 flex items-center gap-2">
                                        {'★'.repeat(Math.round(metrics?.avg_satisfaction_7d || 0))}
                                        {'☆'.repeat(5 - Math.round(metrics?.avg_satisfaction_7d || 0))}
                                    </div>
                                </div>
                            </div>

                            {/* Today's Performance */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600">Issues Hoje</p>
                                            <p className="text-3xl font-bold text-gray-900 mt-1">
                                                {metrics?.issues_today || 0}
                                            </p>
                                        </div>
                                        <AlertTriangle className="h-12 w-12 text-orange-500" />
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-lg shadow">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600">Resolvidos Hoje</p>
                                            <p className="text-3xl font-bold text-green-600 mt-1">
                                                {metrics?.resolved_today || 0}
                                            </p>
                                        </div>
                                        <CheckCircle className="h-12 w-12 text-green-500" />
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-lg shadow">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600">Atualmente Abertos</p>
                                            <p className="text-3xl font-bold text-blue-600 mt-1">
                                                {metrics?.currently_open || 0}
                                            </p>
                                        </div>
                                        <Clock className="h-12 w-12 text-blue-500" />
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-lg shadow">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600">Escalados</p>
                                            <p className="text-3xl font-bold text-red-600 mt-1">
                                                {metrics?.currently_escalated || 0}
                                            </p>
                                        </div>
                                        <Zap className="h-12 w-12 text-red-500" />
                                    </div>
                                </div>
                            </div>

                            {/* Top Issues */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                        📊 Top Tipos de Problemas (30 dias)
                                    </h3>
                                    {topIssues.length > 0 ? (
                                        <div className="space-y-3">
                                            {topIssues.map((issue, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                                    <div className="flex-1">
                                                        <p className="font-semibold text-gray-900">{issue.issue_type}</p>
                                                        <p className="text-sm text-gray-600">
                                                            {issue.occurrences} ocorrências • {formatMinutes(issue.avg_resolution_time)} avg
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-semibold text-orange-600">
                                                            {issue.currently_open} abertos
                                                        </p>
                                                        {issue.avg_satisfaction > 0 && (
                                                            <p className="text-xs text-gray-500">
                                                                {issue.avg_satisfaction.toFixed(1)}★
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-center py-8">Nenhum issue registrado ainda</p>
                                    )}
                                </div>

                                <div className="bg-white p-6 rounded-lg shadow">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                        🎯 Metas vs Realidade
                                    </h3>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <span className="text-sm text-gray-600">Tempo de Resposta</span>
                                                <span className="text-sm font-semibold">
                                                    {formatMinutes(metrics?.avg_response_time_7d || 0)} / 60min
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-3">
                                                <div
                                                    className={`h-3 rounded-full ${(metrics?.avg_response_time_7d || 0) <= 60
                                                            ? 'bg-green-500'
                                                            : 'bg-red-500'
                                                        }`}
                                                    style={{
                                                        width: `${Math.min(((metrics?.avg_response_time_7d || 0) / 60) * 100, 100)}%`,
                                                    }}
                                                ></div>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <span className="text-sm text-gray-600">Tempo de Resolução</span>
                                                <span className="text-sm font-semibold">
                                                    {formatMinutes(metrics?.avg_resolution_time_7d || 0)} / 4h
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-3">
                                                <div
                                                    className={`h-3 rounded-full ${(metrics?.avg_resolution_time_7d || 0) <= 240
                                                            ? 'bg-green-500'
                                                            : 'bg-red-500'
                                                        }`}
                                                    style={{
                                                        width: `${Math.min(((metrics?.avg_resolution_time_7d || 0) / 240) * 100, 100)}%`,
                                                    }}
                                                ></div>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <span className="text-sm text-gray-600">Taxa de Resolução</span>
                                                <span className="text-sm font-semibold">
                                                    {Math.round(metrics?.resolution_rate_7d || 0)}% / 90%
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-3">
                                                <div
                                                    className={`h-3 rounded-full ${(metrics?.resolution_rate_7d || 0) >= 90 ? 'bg-green-500' : 'bg-orange-500'
                                                        }`}
                                                    style={{
                                                        width: `${Math.min(metrics?.resolution_rate_7d || 0, 100)}%`,
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Open Issues */}
                            <div className="bg-white rounded-lg shadow">
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            🚨 Issues Abertos - Ação Necessária
                                        </h3>
                                        <Link
                                            href="/issues"
                                            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                                        >
                                            Ver todos →
                                        </Link>
                                    </div>

                                    {openIssues.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">
                                            <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                                            <p>Nenhum issue aberto!</p>
                                            <p className="text-sm mt-1">Todos os problemas foram resolvidos 🎉</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {openIssues.map((issue) => (
                                                <div
                                                    key={issue.id}
                                                    className="flex items-start gap-4 py-3 border-b last:border-b-0"
                                                >
                                                    <div
                                                        className={`p-2 rounded-lg ${issue.priority === 'critical'
                                                                ? 'bg-red-100'
                                                                : issue.priority === 'high'
                                                                    ? 'bg-orange-100'
                                                                    : 'bg-yellow-100'
                                                            }`}
                                                    >
                                                        <AlertTriangle
                                                            className={`h-5 w-5 ${issue.priority === 'critical'
                                                                    ? 'text-red-600'
                                                                    : issue.priority === 'high'
                                                                        ? 'text-orange-600'
                                                                        : 'text-yellow-600'
                                                                }`}
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <p className="font-semibold text-gray-900">{issue.issue_type}</p>
                                                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getPriorityColor(issue.priority)}`}>
                                                                {issue.priority}
                                                            </span>
                                                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(issue.status)}`}>
                                                                {issue.status}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-600">
                                                            Cliente: {issue.customer_name || 'N/A'}
                                                            {issue.assigned_to && ` • Assigned: ${issue.assigned_to}`}
                                                        </p>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            Detectado: {formatDate(issue.detected_at)}
                                                            {issue.first_response_at && ` • Resposta: ${formatMinutes(issue.time_to_first_response)}`}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <Clock className="h-5 w-5 text-gray-400 ml-auto" />
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            {formatDate(issue.detected_at)}
                                                        </p>
                                                    </div>
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